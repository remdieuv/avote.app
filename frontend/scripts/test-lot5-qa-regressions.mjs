/**
 * LOT-5 — Non-régression QA finale Live V1.
 * Exécution : node frontend/scripts/test-lot5-qa-regressions.mjs
 */
import assert from "node:assert/strict";
import {
  LIVE_UX_STATE,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";
import {
  getRegieOpenVoteButtonCopy,
  getRegiePrimaryLiveAction,
} from "../lib/regieDesktopLayout.js";
import {
  canOfferReplayTestPoll,
  getReplayTestPollDeletionPlan,
} from "../lib/testModeReplayPoll.js";
import { normalizeLiveAxes } from "../lib/normalizeLivePayload.js";

let failed = 0;
/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

test("Suivante PRÉPARÉ — ACTIVE × WAITING × closed → WAITING (pas CLOSED stale)", () => {
  assert.equal(
    resolveLiveUxState({
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
      pastPolls: [{ id: "p0" }],
    }),
    LIVE_UX_STATE.WAITING,
  );
  // Stale CLOSED status (bug pré-LOT5) → CLOSED UX incorrect
  assert.equal(
    resolveLiveUxState({
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: true,
    }),
    LIVE_UX_STATE.CLOSED,
  );
});

test("Socket axes portent isLiveConsumed pour badge MODE TEST Join", () => {
  const axes = normalizeLiveAxes({
    liveState: "waiting",
    voteState: "closed",
    displayState: "waiting",
    isLiveConsumed: false,
  });
  assert.equal(axes.isLiveConsumed, false);
});

test("Ouvrir CLOSED = réouverture sans wipe ; distinct de Rejouer TEST", () => {
  const copy = getRegieOpenVoteButtonCopy({ pollStatus: "CLOSED" });
  assert.equal(copy.isReopenWithoutWipe, true);
  assert.match(copy.title, /Rejouer/);
  const replay = canOfferReplayTestPoll({
    isTestMode: true,
    voteState: "closed",
    poll: { status: "CLOSED", voteCount: 2, type: "SINGLE_CHOICE" },
  });
  assert.equal(replay.ok, true);
  const plan = getReplayTestPollDeletionPlan({ type: "SINGLE_CHOICE" });
  assert.equal(plan.deleteVotes, true);
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollStatus: "CLOSED",
      pollType: "SINGLE_CHOICE",
    }),
    "show-results",
    "Après Fermer : Afficher reste primaire (Rouvrir secondaire)",
  );
});

test("Overlay / Screen — screenDisplayState prioritaire dans axes", () => {
  const axes = normalizeLiveAxes({
    eventDisplayState: "waiting",
    eventScreenDisplayState: "results",
  });
  assert.equal(axes.displayState, "waiting");
  assert.equal(axes.screenDisplayState, "results");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-5 QA regressions`);
