/**
 * LOT-2 — Lead CRM + Concours (tirage / affichage public).
 * Exécution : node frontend/scripts/test-lead-contest-live-flow.mjs
 */
import assert from "node:assert/strict";
import {
  CONTEST_AWAITING_DRAW_LABEL,
  CONTEST_DRAW_DONE_LABEL,
  CONTEST_WINNER_SELF_CONGRATS,
  CONTEST_WINNER_STATUS_ACTIVE,
  CONTEST_WINNER_STATUS_REPLACED,
  LEAD_SUBMIT_SUCCESS_MESSAGE,
  activeContestWinnersWithinQuota,
  buildPublicContestStatusFromWinners,
  canDrawContestWinners,
  canOfferContestWinnerReplace,
  canStartLeadCapture,
  canSubmitLeadCapture,
  filterActiveContestWinners,
  formatPublicContestWinnerDisplayName,
  getContestParticipantPhaseLabel,
  getLeadContestClosedAwaitingLabel,
  getRegieResultsProjectionLabel,
  isContestEntryPoll,
  isLeadCrmPoll,
  leadDraftStorageKey,
  parseLeadDraft,
  resolveContestDrawPublicDisplayPatch,
  serializeLeadDraft,
  shouldOfferShowResultsInPrimaryPath,
  shouldScheduleAutoRevealForPoll,
  shouldShowClosedAwaitingResultsCard,
  shouldShowLeadCaptureForm,
  shouldShowPublicResponseDistribution,
  toPublicContestWinnerPayload,
} from "../lib/leadContestLiveFlow.js";
import {
  resolveEventPatchAfterVoteClose,
  shouldShowParticipantLiveResultsBlock,
} from "../lib/participantLiveFlow.js";
import { getRegieDisplayStateLabel } from "../lib/regieProjectionLabels.js";
import { getScreenClosedAwaitingResultsLabel } from "../lib/diffusionUx.js";

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

test("Correctifs QA : messages Lead / Concours + régie", () => {
  assert.equal(
    LEAD_SUBMIT_SUCCESS_MESSAGE,
    "Merci, tes coordonnées ont bien été enregistrées.",
  );
  assert.equal(
    shouldShowClosedAwaitingResultsCard({
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    false,
  );
  assert.equal(
    shouldShowClosedAwaitingResultsCard({ pollType: "CONTEST_ENTRY" }),
    true,
  );
  assert.equal(
    getLeadContestClosedAwaitingLabel({ pollType: "CONTEST_ENTRY" }),
    CONTEST_AWAITING_DRAW_LABEL,
  );
  assert.equal(
    getLeadContestClosedAwaitingLabel({
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    null,
  );
  assert.equal(
    getContestParticipantPhaseLabel({ hasWinners: false }),
    CONTEST_AWAITING_DRAW_LABEL,
  );
  assert.equal(
    getContestParticipantPhaseLabel({ hasWinners: true }),
    CONTEST_DRAW_DONE_LABEL,
  );
  assert.equal(
    getScreenClosedAwaitingResultsLabel({ pollType: "CONTEST_ENTRY" }),
    "Tirage au sort à venir",
  );
  assert.equal(
    getScreenClosedAwaitingResultsLabel({
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    null,
  );
  assert.equal(
    getRegieResultsProjectionLabel({ pollType: "CONTEST_ENTRY" }),
    "Tirage terminé (gagnants)",
  );
  assert.equal(
    getRegieDisplayStateLabel("results", { pollType: "CONTEST_ENTRY" }),
    "Tirage terminé (gagnants)",
  );
  assert.equal(
    getRegieDisplayStateLabel("results", {
      leadEnabled: true,
      pollType: "SINGLE_CHOICE",
    }),
    "Collecte",
  );
  assert.equal(
    getRegieDisplayStateLabel("results"),
    "Résultats (barres)",
  );
});

test("Remplacement gagnant : actifs, historique, sync publique, confidentialité", () => {
  const mixed = [
    {
      id: "w-old",
      status: CONTEST_WINNER_STATUS_REPLACED,
      voterSessionId: "s-old",
      firstName: "Marie",
      lastName: "Dupont",
      phone: "0601020304",
      email: "m@x.fr",
      position: 1,
    },
    {
      id: "w-new",
      status: CONTEST_WINNER_STATUS_ACTIVE,
      voterSessionId: "s-new",
      firstName: "Paul",
      lastName: "Martin",
      phone: "0600000000",
      email: "p@x.fr",
      position: 1,
    },
    {
      id: "w2",
      status: CONTEST_WINNER_STATUS_ACTIVE,
      voterSessionId: "s2",
      firstName: "Léa",
      lastName: "Bernard",
      position: 2,
    },
  ];
  assert.equal(filterActiveContestWinners(mixed).length, 2);
  assert.equal(canOfferContestWinnerReplace({ winners: mixed }), true);
  assert.equal(canOfferContestWinnerReplace({ winners: [] }), false);
  assert.equal(
    activeContestWinnersWithinQuota({ activeCount: 2, quota: 2 }),
    true,
  );
  assert.equal(
    activeContestWinnersWithinQuota({ activeCount: 3, quota: 2 }),
    false,
  );

  const forOld = buildPublicContestStatusFromWinners({
    winners: mixed,
    voterSessionId: "s-old",
  });
  assert.equal(forOld.isCurrentVoterWinner, false, "remplacé : plus de félicitations");
  assert.equal(forOld.totalWinners, 2);

  const forNew = buildPublicContestStatusFromWinners({
    winners: mixed,
    voterSessionId: "s-new",
  });
  assert.equal(forNew.isCurrentVoterWinner, true, "nouveau : félicitations");
  assert.equal(forNew.winners[0].displayName, "Paul M.");
  assert.equal(
    Object.prototype.hasOwnProperty.call(forNew.winners[0], "phone"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(forNew.winners[0], "email"),
    false,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-2 Lead / Concours helpers`);
