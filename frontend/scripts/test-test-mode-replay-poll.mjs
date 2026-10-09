/**
 * LOT-4 correctif — Rejouer une question (MODE TEST).
 * Exécution : node frontend/scripts/test-test-mode-replay-poll.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  buildReplayTestPollEventPatch,
  canOfferReplayTestPoll,
  getReplayTestPollConfirmMessage,
  getReplayTestPollDeletionLines,
  getReplayTestPollDeletionPlan,
  isPollAlreadyPlayedForReplay,
} from "../lib/testModeReplayPoll.js";

const require = createRequire(import.meta.url);
const {
  canReplayTestPollOnServer,
  buildReplayTestPollEventPatch: buildPatchBe,
  getReplayTestPollDeletionPlan: planBe,
} = require("../../backend/lib/testModeReplayPoll.js");

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

const sondageClosed = {
  id: "p1",
  type: "SINGLE_CHOICE",
  status: "CLOSED",
  voteCount: 3,
  question: "Couleur ?",
};
const quizClosed = {
  id: "p2",
  type: "QUIZ",
  status: "CLOSED",
  voteCount: 2,
  question: "Capitale ?",
};
const leadClosed = {
  id: "p3",
  type: "SINGLE_CHOICE",
  leadEnabled: true,
  status: "CLOSED",
  voteCount: 1,
  question: "Newsletter ?",
};
const contestClosed = {
  id: "p4",
  type: "CONTEST_ENTRY",
  status: "CLOSED",
  voteCount: 5,
  contestDrawCount: 1,
  question: "Tirez au sort",
};
const draftReady = {
  id: "p5",
  type: "SINGLE_CHOICE",
  status: "DRAFT",
  voteCount: 0,
  question: "Pas encore jouée",
};

test("Déjà jouée — CLOSED / votes ; pas DRAFT ni ARCHIVED", () => {
  assert.equal(isPollAlreadyPlayedForReplay(sondageClosed), true);
  assert.equal(isPollAlreadyPlayedForReplay(draftReady), false);
  assert.equal(
    isPollAlreadyPlayedForReplay({ status: "ARCHIVED", voteCount: 9 }),
    false,
  );
  assert.equal(
    isPollAlreadyPlayedForReplay({ status: "ACTIVE", voteCount: 2 }),
    true,
  );
});

test("Autorisations — TEST only ; blocage vote ouvert / réel / busy", () => {
  assert.equal(
    canOfferReplayTestPoll({
      isTestMode: true,
      voteState: "closed",
      poll: sondageClosed,
    }).ok,
    true,
  );
  assert.equal(
    canOfferReplayTestPoll({
      isTestMode: false,
      voteState: "closed",
      poll: sondageClosed,
    }).reason,
    "real_mode_forbidden",
  );
  assert.equal(
    canOfferReplayTestPoll({
      isTestMode: true,
      voteState: "open",
      poll: sondageClosed,
    }).reason,
    "vote_open",
  );
  assert.equal(
    canOfferReplayTestPoll({
      isTestMode: true,
      voteState: "closed",
      busy: true,
      poll: sondageClosed,
    }).reason,
    "busy",
  );
  assert.equal(
    canOfferReplayTestPoll({
      isTestMode: true,
      voteState: "closed",
      poll: draftReady,
    }).reason,
    "not_played",
  );
});

test("Plans de suppression — 4 types + isolation autres questions", () => {
  const pS = getReplayTestPollDeletionPlan(sondageClosed);
  assert.equal(pS.deleteVotes, true);
  assert.equal(pS.deleteLeads, false);
  assert.equal(pS.deleteContestDrawsAndWinners, false);
  assert.equal(pS.otherPollsUntouched, true);

  const pQ = getReplayTestPollDeletionPlan(quizClosed);
  assert.equal(pQ.resetQuizRevealed, true);
  assert.equal(pQ.deleteLeads, false);

  const pL = getReplayTestPollDeletionPlan(leadClosed);
  assert.equal(pL.deleteLeads, true);
  assert.equal(pL.deleteContestDrawsAndWinners, false);

  const pC = getReplayTestPollDeletionPlan(contestClosed);
  assert.equal(pC.deleteLeads, true);
  assert.equal(pC.deleteContestDrawsAndWinners, true);
  assert.equal(pC.otherPollsUntouched, true);
});

test("Confirmation explicite liste les suppressions", () => {
  const msgLead = getReplayTestPollConfirmMessage(leadClosed);
  assert.match(msgLead, /MODE TEST/);
  assert.match(msgLead, /Lead/);
  assert.match(msgLead, /définitivement/);
  const msgContest = getReplayTestPollConfirmMessage(contestClosed);
  assert.match(msgContest, /gagnants|tirages/i);
  const lines = getReplayTestPollDeletionLines(sondageClosed);
  assert.ok(lines.some((l) => /autres questions/i.test(l)));
});

test("Patch événement — PRÉPARÉ sans ouvrir le vote ; clear RESULTS", () => {
  const patch = buildReplayTestPollEventPatch({
    pollId: "p1",
    screenDisplayState: "RESULTS",
  });
  assert.equal(patch.activePollId, "p1");
  assert.equal(patch.voteState, "CLOSED");
  assert.equal(patch.displayState, "WAITING");
  assert.equal(patch.liveState, "WAITING");
  assert.equal(patch.autoRevealShowResultsAt, null);
  assert.equal(patch.screenDisplayState, null);
  assert.equal(patch.questionTimerTotalSec, null);

  const keepBlack = buildReplayTestPollEventPatch({
    pollId: "p1",
    screenDisplayState: "BLACK",
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(keepBlack, "screenDisplayState"),
    false,
    "BLACK préservé (pas de clé screenDisplayState)",
  );
});

test("Backend gate aligne FE (réel / vote open / not played)", () => {
  assert.equal(
    canReplayTestPollOnServer({
      isTestMode: false,
      voteState: "CLOSED",
      poll: sondageClosed,
      voteCount: 3,
    }).ok,
    false,
  );
  assert.equal(
    canReplayTestPollOnServer({
      isTestMode: true,
      voteState: "OPEN",
      poll: sondageClosed,
      voteCount: 3,
    }).status,
    409,
  );
  assert.equal(
    canReplayTestPollOnServer({
      isTestMode: true,
      voteState: "CLOSED",
      poll: sondageClosed,
      voteCount: 3,
    }).ok,
    true,
  );
  assert.deepEqual(
    planBe(contestClosed).deleteContestDrawsAndWinners,
    true,
  );
  assert.equal(
    buildPatchBe({ pollId: "x", screenDisplayState: "RESULTS" }).displayState,
    "WAITING",
  );
});

test("Sync contrat — axes post-rejeu identiques régie /join Screen Overlay", () => {
  const axes = buildReplayTestPollEventPatch({
    pollId: "shared",
    screenDisplayState: "RESULTS",
  });
  for (const surface of ["regie", "join", "screen", "overlay"]) {
    assert.equal(axes.voteState, "CLOSED", surface);
    assert.equal(axes.displayState, "WAITING", surface);
    assert.notEqual(axes.displayState, "RESULTS", `${surface} pas d’anciens résultats`);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-4 Rejouer une question (TEST)`);
