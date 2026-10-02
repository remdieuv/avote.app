/**
 * LOT-2 — Diffusion Screen / Overlay (scènes grand écran + P8 + guide OBS).
 * Exécution : node frontend/scripts/test-diffusion-ux.mjs
 */
import assert from "node:assert/strict";
import {
  DIFFUSION_SCREEN_VS_OVERLAY_HINT,
  OBS_GUIDE_STEPS,
  SCREEN_QR_CTA_JOIN,
  SCREEN_QR_CTA_VOTE,
  countScreenVotesReceived,
  formatScreenOptionLine,
  formatScreenQuestionProgressLabel,
  getScreenClosedAwaitingResultsLabel,
  getScreenDiffusionLabel,
  isScreenQuizAnswerRevealed,
  overlayMustStayTransparent,
  resolveScreenQuestionProgress,
  screenOptionLetter,
  shouldShowScreenClosedVoteCount,
  shouldShowScreenCornerQr,
  sortScreenOptions,
} from "../lib/diffusionUx.js";
import {
  formatTestModeVoteCountLabel,
} from "../lib/testModeResultsMask.js";

/** @type {{ name: string; input: Parameters<typeof shouldShowScreenCornerQr>[0]; expect: boolean }[]} */
const screenQrCases = [
  {
    name: "A. WAITING → pas de QR coin (héros dans la scène)",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "waiting",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
      uxState: "WAITING",
    },
    expect: false,
  },
  {
    name: "B. VOTING / question → pas de QR coin (QR secondaire dans scène)",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "voting",
      displayState: "question",
      surface: "question",
      projectionMode: "standard",
      uxState: "VOTING",
    },
    expect: false,
  },
  {
    name: "C. CLOSED → pas de QR coin",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "waiting",
      displayState: "question",
      surface: "other",
      projectionMode: "standard",
      uxState: "CLOSED",
    },
    expect: false,
  },
  {
    name: "D. RESULTS → pas de QR coin (focus barres)",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "results",
      displayState: "results",
      surface: "results",
      projectionMode: "standard",
      uxState: "RESULTS",
    },
    expect: false,
  },
  {
    name: "Dbis. RESULTS focus → pas de QR coin",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "results",
      displayState: "results",
      surface: "results",
      projectionMode: "results_focus",
      uxState: "RESULTS",
    },
    expect: false,
  },
  {
    name: "E. FINISHED → pas de QR",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "finished",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
      uxState: "FINISHED",
    },
    expect: false,
  },
  {
    name: "F. événement invalide → pas de QR (P8)",
    input: {
      loading: false,
      error: "Ce lien ne correspond à aucun événement.",
      eventInvalid: true,
      liveScene: null,
      displayState: null,
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "G. absence de données / loading → pas de QR",
    input: {
      loading: true,
      error: null,
      eventInvalid: false,
      liveScene: null,
      displayState: null,
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "H. erreur API (sans invalid flag) → pas de QR",
    input: {
      loading: false,
      error: "Impossible de joindre l’API (port 4000 ?).",
      eventInvalid: false,
      liveScene: "waiting",
      displayState: "waiting",
      surface: "other",
      projectionMode: "standard",
    },
    expect: false,
  },
  {
    name: "I. pause / black → pas de QR",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      liveScene: "paused",
      displayState: "black",
      surface: "other",
      projectionMode: "standard",
      uxState: "PAUSED",
    },
    expect: false,
  },
];

/** @type {{ name: string; input: Parameters<typeof overlayMustStayTransparent>[0]; expect: boolean }[]} */
const overlayCases = [
  {
    name: "J. attente / idle (no poll) → transparent",
    input: { noPollIdle: true, effectivePanel: "empty" },
    expect: true,
  },
  {
    name: "K. question panel → pas forcé transparent",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      noPollIdle: false,
      effectivePanel: "question",
      displayState: "question",
    },
    expect: false,
  },
  {
    name: "L. résultats → pas forcé transparent",
    input: {
      loading: false,
      error: null,
      eventInvalid: false,
      noPollIdle: false,
      effectivePanel: "results",
      displayState: "results",
    },
    expect: false,
  },
  {
    name: "M. empty / finished idle → transparent",
    input: { effectivePanel: "empty", displayState: "waiting" },
    expect: true,
  },
  {
    name: "N. événement invalide → transparent (P8, pas de glass blanc)",
    input: {
      eventInvalid: true,
      error: "Ce lien ne correspond à aucun événement.",
      effectivePanel: "question",
    },
    expect: true,
  },
  {
    name: "O. absence de données / loading → transparent",
    input: { loading: true },
    expect: true,
  },
  {
    name: "P. blackout → transparent",
    input: { displayState: "black", effectivePanel: "empty" },
    expect: true,
  },
  {
    name: "Q. erreur générique → transparent (aucun fallback blanc opaque)",
    input: { error: "Impossible de joindre l’API." },
    expect: true,
  },
];

let failed = 0;

for (const c of screenQrCases) {
  const got = shouldShowScreenCornerQr(c.input);
  try {
    assert.equal(got, c.expect, c.name);
    console.log(`ok  SCREEN ${c.name} → ${got}`);
  } catch {
    failed += 1;
    console.error(`FAIL SCREEN ${c.name}: got ${got}, expected ${c.expect}`);
  }
}

for (const c of overlayCases) {
  const got = overlayMustStayTransparent(c.input);
  try {
    assert.equal(got, c.expect, c.name);
    console.log(`ok  OVERLAY ${c.name} → ${got}`);
  } catch {
    failed += 1;
    console.error(`FAIL OVERLAY ${c.name}: got ${got}, expected ${c.expect}`);
  }
}

assert.ok(
  /salle|TV/i.test(DIFFUSION_SCREEN_VS_OVERLAY_HINT) &&
    /OBS/i.test(DIFFUSION_SCREEN_VS_OVERLAY_HINT),
  "hint Screen vs Overlay",
);
assert.equal(OBS_GUIDE_STEPS.length, 3, "guide OBS 3 gestes");
assert.ok(/Overlay|URL/i.test(OBS_GUIDE_STEPS[0]));
assert.ok(/OBS|Navigateur/i.test(OBS_GUIDE_STEPS[1]));
assert.ok(/transparence|blanc/i.test(OBS_GUIDE_STEPS[2]));
console.log("ok  guide OBS 3 gestes + hint Screen≠Overlay");

// --- Labels Screen ≠ Participant ---
assert.equal(getScreenDiffusionLabel("WAITING"), "ÇA VA BIENTÔT COMMENCER");
assert.equal(getScreenDiffusionLabel("CLOSED"), "VOTE TERMINÉ");
assert.equal(getScreenDiffusionLabel("FINISHED"), "MERCI D’AVOIR PARTICIPÉ !");
assert.equal(getScreenDiffusionLabel("RESULTS"), "RÉSULTATS");
assert.notEqual(
  getScreenDiffusionLabel("CLOSED"),
  "Merci ! Ton vote est pris en compte",
  "Screen CLOSED ≠ label Participant",
);
assert.equal(SCREEN_QR_CTA_JOIN, "SCANNER POUR REJOINDRE");
assert.match(SCREEN_QR_CTA_VOTE, /voter/i);
console.log("ok  labels Screen diffusion + QR CTA");

// --- Progression Question x/y ---
assert.deepEqual(
  resolveScreenQuestionProgress({
    pollsProgress: { current: 2, total: 3 },
  }),
  { current: 2, total: 3 },
);
assert.deepEqual(
  resolveScreenQuestionProgress({ pollOrder: 0, pollsTotal: 3 }),
  { current: 1, total: 3 },
);
assert.equal(
  formatScreenQuestionProgressLabel({ current: 1, total: 3 }, "voting"),
  "QUESTION 1/3",
);
assert.equal(
  formatScreenQuestionProgressLabel({ current: 2, total: 3 }, "results"),
  "RÉSULTATS — QUESTION 2/3",
);
assert.equal(formatScreenQuestionProgressLabel(null, "voting"), null);
console.log("ok  progression Question x/y");

// --- Votes reçus = participants (pas somme des sélections MULTIPLE) ---
const single = countScreenVotesReceived({
  type: "SINGLE_CHOICE",
  votersCount: 24,
  options: [
    { id: "a", votes: 10 },
    { id: "b", votes: 14 },
  ],
});
assert.equal(single.count, 24);
assert.equal(single.source, "votersCount");
assert.equal(single.isMultipleChoice, false);
assert.equal(single.label, "24 votes reçus");

/** 10 participants × 3 options cochées → somme options = 30, afficher 10. */
const multi = countScreenVotesReceived({
  type: "MULTIPLE_CHOICE",
  votersCount: 10,
  options: [
    { id: "a", voteCount: 10 },
    { id: "b", voteCount: 10 },
    { id: "c", voteCount: 10 },
  ],
});
assert.equal(multi.count, 10);
assert.equal(multi.source, "votersCount");
assert.equal(multi.isMultipleChoice, true);
assert.equal(multi.label, "10 votes reçus");
assert.notEqual(multi.count, 30, "MULTIPLE_CHOICE ≠ somme des sélections");
console.log("ok  compteur votes (SINGLE + MULTIPLE = participants)");

// --- Options A/B/C/D ---
const sorted = sortScreenOptions([
  { id: "2", label: "B", order: 1 },
  { id: "1", label: "A", order: 0 },
  { id: "3", label: "C", order: 2 },
]);
assert.deepEqual(
  sorted.map((o) => o.label),
  ["A", "B", "C"],
);
assert.equal(screenOptionLetter(0), "A");
assert.equal(screenOptionLetter(3), "D");
console.log("ok  options triées + lettres A/B/C/D");

// --- Salle ≠ Screen (indépendance axes) ---
assert.ok(
  typeof shouldShowScreenCornerQr === "function",
  "helper Screen dédié (pas Participant)",
);
assert.notEqual(
  getScreenDiffusionLabel("VOTING"),
  "Choisis ta réponse",
  "label Screen VOTING adapté diffusion",
);
console.log("ok  Salle ≠ Screen (labels diffusion dédiés)");

// --- B/C CLOSED compteur + quiz reveal sans RESULTS ---
assert.equal(shouldShowScreenClosedVoteCount({ voteOuvert: false }), true);
assert.equal(shouldShowScreenClosedVoteCount({ voteOuvert: true }), false);
assert.equal(
  isScreenQuizAnswerRevealed({ type: "QUIZ", quizRevealed: true }),
  true,
);
assert.equal(
  isScreenQuizAnswerRevealed({ type: "QUIZ", quizRevealed: false }),
  false,
);
assert.equal(
  isScreenQuizAnswerRevealed({ type: "SINGLE_CHOICE", quizRevealed: true }),
  false,
);
assert.equal(formatScreenOptionLine("B", "Paris"), "B — Paris");
assert.equal(
  getScreenClosedAwaitingResultsLabel({ quizAnswerRevealed: true }),
  "Les scores arrivent bientôt",
);
assert.equal(
  getScreenClosedAwaitingResultsLabel({ quizAnswerRevealed: false }),
  "Les résultats arrivent bientôt",
);
assert.equal(
  getScreenClosedAwaitingResultsLabel({}),
  "Les résultats arrivent bientôt",
);
assert.equal(formatTestModeVoteCountLabel(1), "1 vote");
assert.equal(formatTestModeVoteCountLabel(2, { withUnit: false }), "2");
assert.equal(formatTestModeVoteCountLabel(10, { withUnit: false }), "≈ 10");
console.log("ok  CLOSED compteur + quiz reveal Screen (sans RESULTS)");

if (failed > 0) {
  console.error(`\n${failed} cas en échec`);
  process.exit(1);
}

const total =
  screenQrCases.length +
  overlayCases.length +
  1 + // guide
  1 + // labels
  1 + // progression
  1 + // votes
  1 + // options
  1 + // salle≠screen
  1; // closed+quiz (+ footer scores + ≈ TEST)
console.log(`\n${total} groupes d’assertions OK — LOT-2 diffusion Screen final`);
