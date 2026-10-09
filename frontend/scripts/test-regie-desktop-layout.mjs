/**
 * LOT-3 — Architecture régie desktop (zones + CTA + sélection ≠ antenne).
 * Exécution : node frontend/scripts/test-regie-desktop-layout.mjs
 */
import assert from "node:assert/strict";
import {
  REGIE_ZONE_PARTAGE,
  REGIE_ZONE_PILOTAGE,
  REGIE_ZONE_PROJECTION_AVANCEE,
  REGIE_ZONE_QUESTIONS,
  getRegieAllowedLiveActions,
  getRegieOpenVoteButtonCopy,
  getRegiePollStatusLabel,
  getRegiePollTypeLabel,
  getRegiePrimaryLiveAction,
  getRegiePrimaryLiveActionLabel,
  getRegieQuestionNumberLabel,
  isRegieConsultSelectionOnly,
  sortPollsByPlaylistOrder,
} from "../lib/regieDesktopLayout.js";

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

test("Zones LOT-3 nommées", () => {
  assert.equal(REGIE_ZONE_QUESTIONS, "Questions");
  assert.equal(REGIE_ZONE_PILOTAGE, "Pilotage du direct");
  assert.equal(REGIE_ZONE_PARTAGE, "Partage & accès");
  assert.equal(REGIE_ZONE_PROJECTION_AVANCEE, "Projection avancée");
});

test("Types lisibles (pas de jargon Prisma)", () => {
  assert.equal(getRegiePollTypeLabel({ type: "SINGLE_CHOICE" }), "Sondage");
  assert.equal(getRegiePollTypeLabel({ type: "MULTIPLE_CHOICE" }), "Multiple");
  assert.equal(getRegiePollTypeLabel({ type: "QUIZ" }), "Quiz");
  assert.equal(
    getRegiePollTypeLabel({ type: "SINGLE_CHOICE", leadEnabled: true }),
    "Lead",
  );
  assert.equal(getRegiePollTypeLabel({ type: "CONTEST_ENTRY" }), "Concours");
});

test("Numérotation playlist Question N/Total par order réel", () => {
  const polls = [
    { id: "c", order: 3 },
    { id: "a", order: 1 },
    { id: "b", order: 2 },
  ];
  const ordered = sortPollsByPlaylistOrder(polls);
  assert.deepEqual(
    ordered.map((p) => p.id),
    ["a", "b", "c"],
  );
  assert.equal(getRegieQuestionNumberLabel(0, 3), "Question 1/3");
  assert.equal(getRegieQuestionNumberLabel(1, 3), "Question 2/3");
  assert.equal(getRegieQuestionNumberLabel(2, 5), "Question 3/5");
  // Réorganisation : l’antenne ne doit pas altérer le tri
  const withActiveFirstTemptation = sortPollsByPlaylistOrder([
    { id: "active", order: 4 },
    { id: "first", order: 1 },
  ]);
  assert.equal(withActiveFirstTemptation[0].id, "first");
  assert.equal(withActiveFirstTemptation[1].id, "active");
});

test("Sélection playlist ≠ antenne (consultation seule)", () => {
  assert.equal(isRegieConsultSelectionOnly("q2", "q1"), true);
  assert.equal(isRegieConsultSelectionOnly("q1", "q1"), false);
  assert.equal(isRegieConsultSelectionOnly(null, "q1"), false);
  assert.equal(isRegieConsultSelectionOnly("q2", null), true);
});

test("Statuts métier carte question", () => {
  assert.equal(
    getRegiePollStatusLabel({ pollStatus: "DRAFT", isActive: false }),
    "Prête",
  );
  assert.equal(
    getRegiePollStatusLabel({
      pollStatus: "ACTIVE",
      isActive: true,
      voteState: "open",
    }),
    "En cours",
  );
  assert.equal(
    getRegiePollStatusLabel({
      pollStatus: "ACTIVE",
      isActive: true,
      voteState: "closed",
      displayState: "waiting",
    }),
    "En attente d'ouverture",
    "Après Suivante (poll ACTIVE) → En attente d'ouverture",
  );
  assert.equal(
    getRegiePollStatusLabel({
      pollStatus: "CLOSED",
      isActive: true,
      voteState: "closed",
      displayState: "waiting",
    }),
    "Fermée",
    "Après Fermer (poll CLOSED) → Fermée",
  );
  assert.equal(
    getRegiePollStatusLabel({
      pollStatus: "ACTIVE",
      isActive: true,
      voteState: "closed",
      displayState: "results",
      pollType: "SINGLE_CHOICE",
    }),
    "Résultats",
  );
  assert.equal(
    getRegiePollStatusLabel({
      pollStatus: "ACTIVE",
      isActive: true,
      voteState: "closed",
      displayState: "results",
      pollType: "CONTEST_ENTRY",
    }),
    "Tirage",
  );
  assert.equal(
    getRegiePollStatusLabel({ pollStatus: "ARCHIVED", isActive: false }),
    "Terminée",
  );
});

test("CTA primaire — WAITING préparée → Ouvrir (pas Afficher)", () => {
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollStatus: "ACTIVE",
      pollType: "SINGLE_CHOICE",
    }),
    "open",
    "Après Suivante : ACTIVE × WAITING → Ouvrir",
  );
  assert.equal(getRegiePrimaryLiveActionLabel("open"), "Ouvrir");
  const allowedPrepared = getRegieAllowedLiveActions({
    hasActivePoll: true,
    voteState: "closed",
    displayState: "waiting",
    pollStatus: "ACTIVE",
    pollType: "SINGLE_CHOICE",
  });
  assert.equal(allowedPrepared.open, true);
  assert.equal(allowedPrepared.close, false);
  assert.equal(
    allowedPrepared.showResults,
    false,
    "Afficher interdit sur question préparée",
  );
});

test("CTA primaire — VOTING → Fermer", () => {
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "open",
      pollType: "QUIZ",
      pollStatus: "ACTIVE",
    }),
    "close",
  );
  assert.equal(getRegiePrimaryLiveActionLabel("close"), "Fermer");
  const allowedVoting = getRegieAllowedLiveActions({
    hasActivePoll: true,
    voteState: "open",
    pollStatus: "ACTIVE",
    pollType: "QUIZ",
  });
  assert.equal(allowedVoting.close, true);
  assert.equal(allowedVoting.open, false);
  assert.equal(allowedVoting.showResults, false);
  assert.equal(allowedVoting.next, false, "Suivante bloquée pendant le vote");
});

test("CTA primaire — CLOSED après Fermer → Afficher / Tirage / Suivante", () => {
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollStatus: "CLOSED",
      pollType: "SINGLE_CHOICE",
    }),
    "show-results",
    "Sondage CLOSED → Afficher",
  );
  assert.equal(
    getRegiePrimaryLiveActionLabel("show-results"),
    "Afficher les résultats",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollStatus: "CLOSED",
      pollType: "SINGLE_CHOICE",
      leadEnabled: true,
    }),
    "next",
    "Lead CLOSED → Suivante (pas Afficher)",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollStatus: "CLOSED",
      pollType: "CONTEST_ENTRY",
    }),
    "draw",
  );
  const allowedClosed = getRegieAllowedLiveActions({
    hasActivePoll: true,
    voteState: "closed",
    displayState: "waiting",
    pollStatus: "CLOSED",
    pollType: "SINGLE_CHOICE",
  });
  assert.equal(allowedClosed.showResults, true);
  assert.equal(allowedClosed.open, true, "Rouvrir reste possible");
});

test("CTA primaire — RESULTS → Suivante ou Terminer", () => {
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "results",
      pollStatus: "CLOSED",
      pollType: "QUIZ",
      hasNextPoll: true,
    }),
    "next",
  );
  assert.equal(getRegiePrimaryLiveActionLabel("next"), "Suivante");
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "results",
      pollStatus: "CLOSED",
      pollType: "QUIZ",
      hasNextPoll: false,
    }),
    "finish",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "results",
      pollType: "CONTEST_ENTRY",
      contestQuotaReached: true,
      hasNextPoll: true,
    }),
    "next",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "results",
      pollType: "CONTEST_ENTRY",
      contestQuotaReached: false,
    }),
    "draw",
  );
  assert.equal(getRegiePrimaryLiveActionLabel("draw"), "Tirer au sort");
});

test("CTA — événement terminé / sans antenne", () => {
  assert.equal(
    getRegiePrimaryLiveAction({ eventFinished: true, hasActivePoll: true }),
    null,
  );
  assert.equal(
    getRegiePrimaryLiveAction({ hasActivePoll: false, eventFinished: false }),
    "finish",
  );
});

test("LOT-5 — Ouvrir vs Rouvrir (sans wipe) vs Rejouer TEST", () => {
  const prepared = getRegieOpenVoteButtonCopy({ pollStatus: "ACTIVE" });
  assert.equal(prepared.label, "Ouvrir");
  assert.equal(prepared.isReopenWithoutWipe, false);
  const closed = getRegieOpenVoteButtonCopy({ pollStatus: "CLOSED" });
  assert.equal(closed.label, "Rouvrir le vote");
  assert.equal(closed.isReopenWithoutWipe, true);
  assert.match(closed.title, /sans effacer/i);
  assert.match(closed.title, /Rejouer/i);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-3 régie desktop layout`);
