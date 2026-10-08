/**
 * LOT-2 — Lead CRM + Concours (tirage / affichage public).
 * Exécution : node frontend/scripts/test-lead-contest-live-flow.mjs
 */
import assert from "node:assert/strict";
import {
  CONTEST_WINNER_SELF_CONGRATS,
  canDrawContestWinners,
  canStartLeadCapture,
  canSubmitLeadCapture,
  formatPublicContestWinnerDisplayName,
  isContestEntryPoll,
  isLeadCrmPoll,
  leadDraftStorageKey,
  parseLeadDraft,
  resolveContestDrawPublicDisplayPatch,
  serializeLeadDraft,
  shouldOfferShowResultsInPrimaryPath,
  shouldScheduleAutoRevealForPoll,
  shouldShowLeadCaptureForm,
  shouldShowPublicResponseDistribution,
  toPublicContestWinnerPayload,
} from "../lib/leadContestLiveFlow.js";
import {
  resolveEventPatchAfterVoteClose,
  shouldShowParticipantLiveResultsBlock,
} from "../lib/participantLiveFlow.js";

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

test("Lead CRM vs Concours typing", () => {
  assert.equal(
    isLeadCrmPoll({ leadEnabled: true, pollType: "SINGLE_CHOICE" }),
    true,
  );
  assert.equal(
    isLeadCrmPoll({ leadEnabled: true, pollType: "CONTEST_ENTRY" }),
    false,
  );
  assert.equal(isContestEntryPoll({ pollType: "CONTEST_ENTRY" }), true);
});

test("Lead : start refusé si CLOSED ; submit OK si commencé", () => {
  assert.equal(canStartLeadCapture({ voteState: "OPEN", pollStatus: "ACTIVE" }), true);
  assert.equal(
    canStartLeadCapture({ voteState: "CLOSED", pollStatus: "ACTIVE" }),
    false,
  );
  assert.equal(
    canSubmitLeadCapture({ hasVotedTrigger: true, leadSubmitted: false }),
    true,
  );
  assert.equal(
    canSubmitLeadCapture({ hasVotedTrigger: false, leadSubmitted: false }),
    false,
  );
  assert.equal(
    shouldShowLeadCaptureForm({
      leadEnabled: true,
      hasVotedTrigger: true,
      leadSubmitted: false,
    }),
    true,
  );
  assert.equal(
    shouldShowLeadCaptureForm({
      leadEnabled: true,
      hasVotedTrigger: true,
      leadSubmitted: true,
    }),
    false,
  );
});

test("Lead : pas de répartition publique ; Concours non plus", () => {
  assert.equal(
    shouldShowPublicResponseDistribution({
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    false,
  );
  assert.equal(
    shouldShowPublicResponseDistribution({ pollType: "CONTEST_ENTRY" }),
    false,
  );
  assert.equal(
    shouldShowPublicResponseDistribution({ pollType: "SINGLE_CHOICE" }),
    true,
  );
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: true,
      voteState: "open",
      pollStatus: "ACTIVE",
      liveScene: "voting",
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    false,
    "Lead CRM : pas de barres participant",
  );
});

test("Auto-reveal skip Lead / Concours ; OK sondage", () => {
  assert.equal(
    shouldScheduleAutoRevealForPoll({
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    false,
  );
  assert.equal(
    shouldScheduleAutoRevealForPoll({ pollType: "CONTEST_ENTRY" }),
    false,
  );
  assert.equal(
    shouldScheduleAutoRevealForPoll({ pollType: "QUIZ" }),
    true,
  );
  assert.equal(
    shouldOfferShowResultsInPrimaryPath({ pollType: "CONTEST_ENTRY" }),
    false,
  );
  const closeLead = resolveEventPatchAfterVoteClose({
    autoReveal: true,
    leadEnabled: true,
    pollType: "SINGLE_CHOICE",
  });
  assert.equal(closeLead.schedulesAutoReveal, false);
  const closeQuiz = resolveEventPatchAfterVoteClose({
    autoReveal: true,
    pollType: "QUIZ",
  });
  assert.equal(closeQuiz.schedulesAutoReveal, true);
});

test("Concours : tirage seulement si CLOSED", () => {
  assert.equal(canDrawContestWinners({ voteState: "OPEN" }), false);
  assert.equal(canDrawContestWinners({ voteState: "CLOSED" }), true);
  const patch = resolveContestDrawPublicDisplayPatch();
  assert.equal(patch.displayState, "RESULTS");
  assert.equal(patch.screenDisplayState, "RESULTS");
});

test("Affichage public : Prénom + initiale ; sinon non-identifiant ; pas de contact", () => {
  assert.equal(
    formatPublicContestWinnerDisplayName({
      firstName: "Marie",
      lastName: "Dupont",
      position: 1,
    }),
    "Marie D.",
  );
  assert.equal(
    formatPublicContestWinnerDisplayName({
      firstName: "Marie",
      lastName: "",
      position: 2,
    }),
    "Gagnant 2",
    "sans nom : pas d’initiale inventée",
  );
  const pub = toPublicContestWinnerPayload({
    id: "w1",
    firstName: "Marie",
    lastName: "Dupont",
    position: 1,
    phone: "0601020304",
    email: "m@x.fr",
  });
  assert.equal(pub.displayName, "Marie D.");
  assert.equal(
    Object.prototype.hasOwnProperty.call(pub, "displayContact"),
    false,
  );
  assert.ok(/gagné/i.test(CONTEST_WINNER_SELF_CONGRATS));
});

test("Draft Lead serialisation (refresh)", () => {
  const raw = serializeLeadDraft({
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "0600000000",
    email: "a@b.c",
  });
  const parsed = parseLeadDraft(raw);
  assert.equal(parsed?.firstName, "Ada");
  assert.equal(parsed?.lastName, "Lovelace");
  assert.ok(leadDraftStorageKey("p1", "v1").includes("p1"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-2 Lead / Concours helpers`);
