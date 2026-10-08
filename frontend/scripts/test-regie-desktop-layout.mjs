/**
 * LOT-3 — Architecture régie desktop (zones + CTA primaire + libellés).
 * Exécution : node frontend/scripts/test-regie-desktop-layout.mjs
 */
import assert from "node:assert/strict";
import {
  REGIE_ZONE_PARTAGE,
  REGIE_ZONE_PILOTAGE,
  REGIE_ZONE_PROJECTION_AVANCEE,
  REGIE_ZONE_QUESTIONS,
  getRegiePollStatusLabel,
  getRegiePollTypeLabel,
  getRegiePrimaryLiveAction,
  getRegiePrimaryLiveActionLabel,
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
    "Fermée",
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

test("CTA primaire §2.6 — Sondage / Lead / Concours", () => {
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollType: "SINGLE_CHOICE",
    }),
    "show-results",
  );
  assert.equal(
    getRegiePrimaryLiveActionLabel("show-results"),
    "Afficher les résultats",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "open",
      pollType: "QUIZ",
    }),
    "close",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
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
      pollType: "CONTEST_ENTRY",
    }),
    "draw",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "results",
      pollType: "CONTEST_ENTRY",
      contestQuotaReached: true,
    }),
    "next",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "waiting",
      pollType: "SINGLE_CHOICE",
    }),
    "show-results",
    "Sondage CLOSED sans RESULTS → Afficher (Ouvrir reste visible à côté)",
  );
  assert.equal(
    getRegiePrimaryLiveAction({
      hasActivePoll: true,
      voteState: "closed",
      displayState: "results",
      pollType: "QUIZ",
    }),
    "next",
  );
  assert.equal(getRegiePrimaryLiveActionLabel("next"), "Suivante");
  assert.equal(getRegiePrimaryLiveActionLabel("draw"), "Tirer au sort");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-3 régie desktop layout`);
