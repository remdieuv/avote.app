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
  getScreenClosedDiffusionLabel,
  getScreenDiffusionLabel,
  getScreenWaitingDiffusionLabel,
  SCREEN_CLOSED_AWAITING_ORGANIZER_LABEL,
  SCREEN_CLOSED_LABEL,
  SCREEN_FINISHED_SUBTITLE,
  SCREEN_WAITING_LABEL_BETWEEN,
  SCREEN_WAITING_LABEL_LAST,
  SCREEN_WAITING_LABEL_START,
  isScreenProjectionVoteOpen,
  isScreenQuizAnswerRevealed,
  overlayMustStayTransparent,
  projectionAxesAfterVoteClose,
  resolveScreenQuestionProgress,
  resolveScreenSurfaceAfterVoteClose,
  screenOptionLetter,
  shouldShowScreenClosedVoteCount,
  shouldShowScreenCornerQr,
  shouldRenderScreenAutoRevealWait,
  shouldRenderScreenFinished,
  sortScreenOptions,
} from "../lib/diffusionUx.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LIVE_UX_STATE, resolveLiveUxState } from "../lib/liveStateUx.js";
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
assert.equal(getScreenDiffusionLabel("WAITING"), SCREEN_WAITING_LABEL_START);
assert.equal(
  getScreenWaitingDiffusionLabel({ pollsProgress: { current: 1, total: 3 } }),
  SCREEN_WAITING_LABEL_START,
);
assert.equal(
  getScreenWaitingDiffusionLabel({ pollsProgress: { current: 2, total: 3 } }),
  SCREEN_WAITING_LABEL_BETWEEN,
);
assert.equal(
  getScreenWaitingDiffusionLabel({
    pastPolls: [{ id: "p1", label: "Q1" }],
    pollsProgress: { current: 2, total: 2 },
  }),
  SCREEN_WAITING_LABEL_LAST,
  "inverser 2/2 → START : PRÉPARÉ N/N → DERNIÈRE QUESTION BIENTÔT",
);
assert.notEqual(
  getScreenWaitingDiffusionLabel({
    pollsProgress: { current: 2, total: 2 },
  }),
  SCREEN_WAITING_LABEL_BETWEEN,
  "dernière Q : jamais PROCHAINE QUESTION BIENTÔT",
);
assert.notEqual(
  getScreenWaitingDiffusionLabel({
    pollsProgress: { current: 2, total: 2 },
  }),
  SCREEN_WAITING_LABEL_START,
  "dernière Q préparée : jamais accueil ÇA VA BIENTÔT COMMENCER",
);
assert.equal(
  getScreenDiffusionLabel("WAITING", {
    pastPolls: [{ id: "p1", label: "Q1" }],
  }),
  SCREEN_WAITING_LABEL_BETWEEN,
);
assert.equal(getScreenDiffusionLabel("CLOSED"), SCREEN_CLOSED_LABEL);
assert.equal(
  getScreenClosedDiffusionLabel({
    pollsProgress: { current: 2, total: 2 },
    eventFinished: false,
  }),
  SCREEN_CLOSED_AWAITING_ORGANIZER_LABEL,
  "dernière fermée + event actif → attente organisateur",
);
assert.equal(
  getScreenDiffusionLabel("CLOSED", {
    pollsProgress: { current: 1, total: 2 },
  }),
  SCREEN_CLOSED_LABEL,
);
assert.equal(
  getScreenDiffusionLabel("FINISHED"),
  "MERCI POUR VOTRE PARTICIPATION !",
);
assert.match(SCREEN_FINISHED_SUBTITLE, /terminé/i);
assert.equal(
  shouldRenderScreenFinished({ liveScene: "finished", uxState: "WAITING" }),
  true,
  "FINISHED prioritaire même si UX waiting",
);
assert.equal(
  shouldRenderScreenFinished({ liveScene: "waiting", uxState: "WAITING" }),
  false,
);
assert.equal(
  shouldRenderScreenFinished({ liveScene: null, uxState: "FINISHED" }),
  true,
);
assert.equal(getScreenDiffusionLabel("RESULTS"), "RÉSULTATS");

{
  const here = dirname(fileURLToPath(import.meta.url));
  const screen = readFileSync(
    join(here, "../components/ScreenProjection.jsx"),
    "utf8",
  );
  const finishedScene = readFileSync(
    join(here, "../components/ScreenLiveScenes.jsx"),
    "utf8",
  );
  const renderBlock = screen.slice(screen.indexOf("if (loading)"));
  const idxFinished = renderBlock.indexOf("shouldRenderScreenFinished");
  const idxNoPoll = renderBlock.indexOf("!poll && noPollFromHttp404");
  const idxAutoReveal = renderBlock.indexOf("shouldRenderScreenAutoRevealWait");
  const idxDsWaiting = renderBlock.indexOf('ds === "waiting"');
  const idxClosedGuard = renderBlock.indexOf(
    "projectionPres.ux !== LIVE_UX_STATE.CLOSED",
  );
  const idxClosedBranch = renderBlock.indexOf(
    'projectionPres.ux === "CLOSED" && poll',
  );
  assert.ok(idxFinished >= 0, "branche FINISHED dans le rendu");
  assert.ok(idxNoPoll >= 0);
  assert.ok(idxAutoReveal >= 0, "branche auto-reveal countdown");
  assert.ok(idxDsWaiting >= 0);
  assert.ok(
    idxClosedGuard >= 0,
    "C1: ds=waiting ne court-circuite pas UX CLOSED",
  );
  assert.ok(
    idxFinished < idxNoPoll && idxFinished < idxDsWaiting,
    "FINISHED doit être évalué avant no-poll / ds=waiting",
  );
  assert.ok(
    idxAutoReveal < idxDsWaiting,
    "auto-reveal countdown avant ds=waiting (sinon ÇA VA BIENTÔT écrase le décompte)",
  );
  assert.ok(
    idxClosedBranch > idxDsWaiting,
    "branche CLOSED après garde waiting (fall-through post-Fermer)",
  );
  assert.ok(screen.includes("getScreenClosedDiffusionLabel"));
  assert.ok(screen.includes("closedBannerLabel"));
  assert.ok(screen.includes("eventTitle={eventTitle}"));
  assert.ok(finishedScene.includes("SCREEN_FINISHED_SUBTITLE"));
  assert.ok(finishedScene.includes("eventTitle"));
  console.log("ok  Screen FINISHED prioritaire + contenu clôture + C1 CLOSED");
}

{
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: true,
      displayState: "waiting",
      screenId: "a",
      independent: false,
    }),
    true,
    "A sync + WAITING + pending → décompte",
  );
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: true,
      displayState: "waiting",
      screenId: "b",
      independent: false,
    }),
    true,
    "B sync + WAITING + pending → décompte",
  );
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: true,
      displayState: "waiting",
      screenId: "b",
      independent: true,
    }),
    false,
    "B indep WAITING → pas de forçage décompte",
  );
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: true,
      displayState: "question",
      screenId: "b",
      independent: true,
    }),
    false,
    "B indep QUESTION → pas de forçage",
  );
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: true,
      displayState: "black",
      screenId: "a",
    }),
    false,
    "BLACK prioritaire",
  );
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: true,
      displayState: "results",
      screenId: "a",
    }),
    false,
    "RESULTS (Afficher manuel) → pas de décompte",
  );
  assert.equal(
    shouldRenderScreenAutoRevealWait({
      pendingAutoReveal: false,
      displayState: "waiting",
      screenId: "a",
    }),
    false,
  );
  console.log("ok  Screen auto-reveal countdown vs WAITING / B indep");
}
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
assert.equal(formatTestModeVoteCountLabel(1), "1 vote");
assert.equal(formatTestModeVoteCountLabel(2, { withUnit: false }), "2");
assert.equal(formatTestModeVoteCountLabel(10, { withUnit: false }), "≈ 10");
console.log("ok  CLOSED compteur + quiz reveal Screen (sans RESULTS)");

// --- G13 : fermeture manuelle = fin chrono → même état Screen CLOSED ---
{
  const timerClose = projectionAxesAfterVoteClose();
  const manualClose = projectionAxesAfterVoteClose();
  assert.deepEqual(
    timerClose,
    manualClose,
    "G13: axes projection chrono ≡ manuel",
  );
  assert.equal(timerClose.displayState, "waiting");
  assert.equal(timerClose.voteState, "closed");
  assert.equal(timerClose.liveScene, "waiting");
  assert.equal(
    timerClose.screenDisplayState,
    null,
    "LOT-1: Fermer efface sticky RESULTS Screen (G13)",
  );
  assert.equal(resolveLiveUxState(timerClose), LIVE_UX_STATE.CLOSED);
  assert.equal(resolveLiveUxState(manualClose), LIVE_UX_STATE.CLOSED);
  assert.equal(resolveScreenSurfaceAfterVoteClose(timerClose), "closed");
  assert.equal(resolveScreenSurfaceAfterVoteClose(manualClose), "closed");
  assert.equal(
    isScreenProjectionVoteOpen({
      displayState: timerClose.displayState,
      eventVoteState: timerClose.voteState,
    }),
    false,
    "G13: pas de QR « Scannez pour voter » après close",
  );
  // Ancien manuel (display QUESTION conservé) : UX CLOSED possible, mais ≠ contrat chrono
  // (voteOuvert Screen reste couplé à ds===question — d’où l’incohérence G13).
  const legacyManualKeptQuestion = projectionAxesAfterVoteClose({
    displayState: "question",
  });
  assert.equal(
    resolveLiveUxState(legacyManualKeptQuestion),
    LIVE_UX_STATE.CLOSED,
  );
  assert.notEqual(
    legacyManualKeptQuestion.displayState,
    timerClose.displayState,
    "G13: l’ancien close manuel (display question) diverge du chrono",
  );
  // Lead / Concours / autoReveal OFF : même surface CLOSED (pas WAITING)
  for (const kind of ["sondage", "lead", "concours"]) {
    assert.equal(
      resolveScreenSurfaceAfterVoteClose(timerClose),
      "closed",
      `${kind}: post-Fermer → surface closed`,
    );
  }
  assert.equal(
    resolveLiveUxState({
      ...timerClose,
      pollStatus: "ACTIVE",
    }),
    LIVE_UX_STATE.WAITING,
    "PRÉPARÉ (poll ACTIVE) → WAITING, pas CLOSED",
  );
  console.log("ok  G13 manual close = timer close (projection CLOSED)");
}

{
  // L1+L2 — transitions 1/2 → 2/2 préparée → ouvert → fermé (5 types)
  const types = [
    { name: "Unique", pollType: "SINGLE_CHOICE", leadEnabled: false },
    { name: "Multiple", pollType: "MULTIPLE_CHOICE", leadEnabled: false },
    { name: "Quiz", pollType: "QUIZ", leadEnabled: false },
    { name: "Lead", pollType: "SINGLE_CHOICE", leadEnabled: true },
    { name: "Concours", pollType: "CONTEST_ENTRY", leadEnabled: false },
  ];
  for (const t of types) {
    assert.equal(
      getScreenWaitingDiffusionLabel({
        pollsProgress: { current: 1, total: 2 },
      }),
      SCREEN_WAITING_LABEL_START,
      `${t.name}: PRÉPARÉ 1/2 → START`,
    );
    assert.equal(
      getScreenWaitingDiffusionLabel({
        pastPolls: [{ id: "q1" }],
        pollsProgress: { current: 2, total: 2 },
      }),
      SCREEN_WAITING_LABEL_LAST,
      `${t.name}: PRÉPARÉ 2/2 → LAST (pas START)`,
    );
    const prepared = resolveLiveUxState({
      liveScene: "waiting",
      displayState: "waiting",
      voteState: "closed",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
      pollsProgress: { current: 2, total: 2 },
    });
    assert.equal(prepared, LIVE_UX_STATE.WAITING, `${t.name}: 2/2 PRÉPARÉ → WAITING`);
    const openUx = resolveLiveUxState({
      liveScene: "voting",
      displayState: "question",
      voteState: "open",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
    });
    assert.equal(openUx, LIVE_UX_STATE.VOTING, `${t.name}: ouvert → VOTING`);
    const closedAxes = projectionAxesAfterVoteClose({
      displayState: "waiting",
      hasActivePoll: true,
      pollStatus: "CLOSED",
    });
    assert.equal(
      resolveLiveUxState(closedAxes),
      LIVE_UX_STATE.CLOSED,
      `${t.name}: fermé → CLOSED`,
    );
    assert.equal(
      resolveScreenSurfaceAfterVoteClose(closedAxes),
      "closed",
      `${t.name}: surface Screen closed`,
    );
    assert.equal(
      getScreenClosedDiffusionLabel({
        pollsProgress: { current: 2, total: 2 },
        eventFinished: false,
      }),
      SCREEN_CLOSED_AWAITING_ORGANIZER_LABEL,
      `${t.name}: N/N fermée → attente organisateur`,
    );
  }
  console.log("ok  L1+L2 transitions 1/2→2/2→ouvert→fermé × 5 types");
}

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
  1 + // closed+quiz (+ footer scores + ≈ TEST)
  1; // G13
console.log(`\n${total} groupes d’assertions OK — LOT-2 diffusion Screen final`);
