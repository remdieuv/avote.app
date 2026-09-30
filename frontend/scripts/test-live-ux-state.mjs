/**
 * LOT-0 — matrice anti-régression resolveLiveUxState (H.3 plan V1).
 * Exécution : node frontend/scripts/test-live-ux-state.mjs
 */
import assert from "node:assert/strict";
import {
  LIVE_UX_STATE,
  getLiveStateLabel,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";

/** @type {{ name: string; ctx: Parameters<typeof resolveLiveUxState>[0]; expect: string }[]} */
const cases = [
  {
    name: "CLOSED + WAITING sans poll actif → WAITING",
    ctx: {
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: null,
      hasActivePoll: false,
    },
    expect: LIVE_UX_STATE.WAITING,
  },
  {
    name: "CLOSED + WAITING avec poll actif (Join, pollStatus vide) → CLOSED",
    ctx: {
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: null,
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.CLOSED,
  },
  {
    name: "CLOSED + WAITING + poll CLOSED → CLOSED",
    ctx: {
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.CLOSED,
  },
  {
    name: "OPEN + QUESTION → VOTING",
    ctx: {
      liveScene: "voting",
      displayState: "question",
      voteState: "open",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.VOTING,
  },
  {
    name: "CLOSED + QUESTION → CLOSED (confirmation, pas RESULTS)",
    ctx: {
      liveScene: "waiting",
      displayState: "question",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.CLOSED,
  },
  {
    name: "CLOSED + QUESTION sans pollStatus (Join) → CLOSED",
    ctx: {
      liveScene: "waiting",
      displayState: "question",
      voteState: "closed",
      pollStatus: null,
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.CLOSED,
  },
  {
    name: "CLOSED + RESULTS → RESULTS",
    ctx: {
      liveScene: "results",
      displayState: "results",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.RESULTS,
  },
  {
    name: "OPEN + RESULTS → RESULTS (pill en direct côté screen)",
    ctx: {
      liveScene: "results",
      displayState: "results",
      voteState: "open",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.RESULTS,
  },
  {
    name: "BLACK → PAUSED",
    ctx: {
      liveScene: "waiting",
      displayState: "black",
      voteState: "closed",
      pollStatus: null,
      hasActivePoll: false,
    },
    expect: LIVE_UX_STATE.PAUSED,
  },
  {
    name: "liveState PAUSED → PAUSED",
    ctx: {
      liveScene: "paused",
      displayState: "question",
      voteState: "open",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.PAUSED,
  },
  {
    name: "FINISHED prioritaire",
    ctx: {
      liveScene: "finished",
      displayState: "results",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: false,
    },
    expect: LIVE_UX_STATE.FINISHED,
  },
  {
    name: "OPEN + WAITING (hors scène question) → WAITING",
    ctx: {
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "open",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.WAITING,
  },
];

let failed = 0;
for (const c of cases) {
  const got = resolveLiveUxState(c.ctx);
  try {
    assert.equal(got, c.expect, c.name);
    console.log(`ok  ${c.name} → ${got}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${c.name}: got ${got}, expected ${c.expect}`);
    console.error(e.message);
  }
}

/** Copy minimale : pas de jargon « régie » dans les labels canoniques */
for (const ux of Object.values(LIVE_UX_STATE)) {
  const label = getLiveStateLabel(ux);
  assert.ok(label && label.length > 0, `label vide pour ${ux}`);
  assert.ok(
    !/régie|console|overlay|slug/i.test(label),
    `jargon dans label ${ux}: ${label}`,
  );
}
console.log("ok  labels sans jargon orga");

if (failed > 0) {
  console.error(`\n${failed} cas en échec`);
  process.exit(1);
}
console.log(`\n${cases.length + 1} assertions OK — LOT-0 live UX`);
