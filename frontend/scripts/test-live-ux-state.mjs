/**
 * LOT-0 — matrice anti-régression resolveLiveUxState (H.3 plan V1).
 * Exécution : node frontend/scripts/test-live-ux-state.mjs
 */
import assert from "node:assert/strict";
import {
  LIVE_UX_LABEL_VOTE_CONFIRMED,
  LIVE_UX_STATE,
  getClosedParticipantTitle,
  getLiveStateLabel,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";
import {
  applyTestModeResultsVoteMask,
  formatTestModeVoteCountLabel,
  maskTestModeOptionVoteCount,
  shouldShowTestModeApproxPrefix,
} from "../lib/testModeResultsMask.js";

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
    name: "CLOSED + WAITING + poll ACTIVE (copie jamais lancée) → WAITING",
    ctx: {
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
    },
    expect: LIVE_UX_STATE.WAITING,
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

/** A0 — MODE TEST : 1 vote ne devient jamais 0 ; cohérence totaux */
{
  assert.equal(maskTestModeOptionVoteCount(1), 1);
  assert.equal(maskTestModeOptionVoteCount(4), 4);
  assert.equal(maskTestModeOptionVoteCount(5), 5);
  assert.equal(maskTestModeOptionVoteCount(9), 9);
  assert.equal(maskTestModeOptionVoteCount(10), 10);
  assert.equal(maskTestModeOptionVoteCount(12), 10);
  assert.equal(maskTestModeOptionVoteCount(15), 20);
  assert.equal(maskTestModeOptionVoteCount(0), 0);

  const masked = applyTestModeResultsVoteMask(
    { a: 1, b: 0, c: 12 },
    { isTestMode: true, displayState: "RESULTS" },
  );
  assert.equal(masked.a, 1, "TEST+RESULTS 1 vote reste 1 (≠ régie 1 / screen 0)");
  assert.equal(masked.b, 0);
  assert.equal(masked.c, 10);

  const rawQuestion = applyTestModeResultsVoteMask(
    { a: 1 },
    { isTestMode: true, displayState: "QUESTION" },
  );
  assert.equal(rawQuestion.a, 1, "hors RESULTS : pas de mask");

  const realResults = applyTestModeResultsVoteMask(
    { a: 1 },
    { isTestMode: false, displayState: "RESULTS" },
  );
  assert.equal(realResults.a, 1, "MODE RÉEL : exact");

  assert.equal(shouldShowTestModeApproxPrefix(0), false);
  assert.equal(shouldShowTestModeApproxPrefix(1), false);
  assert.equal(shouldShowTestModeApproxPrefix(2), false);
  assert.equal(shouldShowTestModeApproxPrefix(9), false);
  assert.equal(shouldShowTestModeApproxPrefix(10), true);
  assert.equal(shouldShowTestModeApproxPrefix(12), true);
  assert.equal(formatTestModeVoteCountLabel(1), "1 vote");
  assert.equal(formatTestModeVoteCountLabel(2), "2 votes");
  assert.equal(formatTestModeVoteCountLabel(0), "0 vote");
  assert.equal(formatTestModeVoteCountLabel(10), "≈ 10 votes");
  assert.equal(formatTestModeVoteCountLabel(12, { withUnit: false }), "≈ 12");
  assert.equal(formatTestModeVoteCountLabel(2, { withUnit: false }), "2");
  console.log("ok  A0 MODE TEST mask 1 vote ≠ 0 + ≈ UI seulement si ≥ bucket");
}

/** A1/A2 — CLOSED Merci seulement si voté ; label CLOSED vote-agnostique */
{
  assert.equal(
    getLiveStateLabel(LIVE_UX_STATE.CLOSED),
    "Vote fermé — les résultats arrivent bientôt",
  );
  assert.ok(
    !/Merci ! Ton vote/i.test(getLiveStateLabel(LIVE_UX_STATE.CLOSED)),
    "label CLOSED ne doit pas être une ack personnelle",
  );
  assert.equal(getClosedParticipantTitle(false), getLiveStateLabel(LIVE_UX_STATE.CLOSED));
  assert.equal(getClosedParticipantTitle(true), LIVE_UX_LABEL_VOTE_CONFIRMED);
  assert.equal(
    getLiveStateLabel(LIVE_UX_STATE.WAITING),
    "Ça va bientôt commencer",
  );
  assert.ok(
    !/Merci ! Ton vote/i.test(getLiveStateLabel(LIVE_UX_STATE.WAITING)),
  );
  console.log("ok  A1/A2 WAITING/CLOSED sans Merci non-votant");
}

if (failed > 0) {
  console.error(`\n${failed} cas en échec`);
  process.exit(1);
}
console.log(`\n${cases.length + 3} assertions OK — LOT-0 live UX`);
