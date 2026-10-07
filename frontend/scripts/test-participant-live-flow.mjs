/**
 * LOT-1 / LOT-7 — Salle `/join` permanente + Page événement + FULL/OFFLINE.
 * Exécution : node frontend/scripts/test-participant-live-flow.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LIVE_UX_LABEL_VOTE_CONFIRMED,
  LIVE_UX_STATE,
  getClosedParticipantTitle,
  getLiveStateLabel,
  getLiveStatePresentation,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";
import {
  PARTICIPANT_CONTEST_NOTICE,
  PARTICIPANT_LEAD_NOTICE,
  extractParticipantErrorCode,
  formatQuizRevealParticipantFeedback,
  getParticipantFormNotice,
  getParticipantFullLabel,
  getParticipantOfflineLabel,
  getParticipantResultsOptionBadgeLabel,
  isParticipantRoomFull,
  resolveEventLandingPhase,
  resolveJoinHistoriqueQuestions,
  countParticipantVoteConfirmedSurfaces,
  resolveParticipantTopStripLabel,
  shouldAutoNavigateJoinToPollPath,
  shouldEmbedPollSurfaceInRoom,
  shouldJoinApplySocketLiveAxesImmediately,
  shouldJoinSocketJoinActivePoll,
  shouldPollApplyParentPollSnapshot,
  shouldPollFetchEventMetaBranding,
  shouldPollOpenOwnSocket,
  shouldPollRenderOfflineBanner,
  shouldShowActiveVotingInstruction,
  shouldPollShowStandaloneArchiveResults,
  shouldShowParticipantFullUi,
  shouldShowParticipantResultStats,
  shouldShowParticipantLiveResultsBlock,
  isParticipantVoteSessionOpen,
  isParticipantVoteClosed,
  getParticipantResultsBlockTitle,
  shouldRevealQuizAnswerToParticipant,
  shouldRevealQuizWhenShowingResults,
  resolveShowResultsEventPatch,
  resolveScreenDisplayAfterLiveTransition,
  resolveNextPollPrepareEventPatch,
  resolveEventPatchAfterVoteClose,
  mergePollJsonPreservingQuizReveal,
  countJoinFinishedMerciMessages,
  resolveJoinFinishedCardContent,
} from "../lib/participantLiveFlow.js";
import {
  applyTestModeResultsVoteMask,
  formatTestModeVoteCountLabel,
} from "../lib/testModeResultsMask.js";
import {
  normalizeLiveAxes,
  normalizePollJson,
  optionVoteCount,
} from "../lib/normalizeLivePayload.js";

/** @type {{ name: string; run: () => void }[]} */
const cases = [];

function test(name, run) {
  cases.push({ name, run });
}

// A — scan → conceptuellement /join (embed off en WAITING)
test("A/B. WAITING → reste Salle, pas d’embed vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: null,
    hasActivePoll: false,
  });
  assert.equal(ux, LIVE_UX_STATE.WAITING);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), false);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// C — VOTING → embed dans /join, jamais nav /p
test("C. VOTING → embed dans Salle, aucune auto-nav /p", () => {
  const ux = resolveLiveUxState({
    liveScene: "voting",
    displayState: "question",
    voteState: "open",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.VOTING);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), true);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// D/E — confirmation reste en VOTING embed (déjà voté côté UI)
test("D/E. VOTING (confirm) → toujours embed Salle", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.VOTING }),
    true,
  );
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// F — CLOSED sans résultats, reste /join
test("F. CLOSED → embed Salle, pas RESULTS", () => {
  const ux = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "question",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.CLOSED);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), true);
  assert.notEqual(ux, LIVE_UX_STATE.RESULTS);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// G — RESULTS dans /join
test("G. RESULTS → embed Salle (résultats dans /join)", () => {
  const ux = resolveLiveUxState({
    liveScene: "results",
    displayState: "results",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.RESULTS);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), true);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// H — question suivante WAITING puis VOTING
test("H. WAITING puis VOTING → Salle puis embed, jamais /p", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.WAITING }),
    false,
  );
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.VOTING }),
    true,
  );
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// I — FINISHED dans /join (corps Salle, pas embed)
test("I. FINISHED → reste Salle, pas embed vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "finished",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: null,
    hasActivePoll: false,
  });
  assert.equal(ux, LIVE_UX_STATE.FINISHED);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), false);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

test("FINISHED != FULL même si isLocked (Terminer événement réel)", () => {
  assert.equal(isParticipantRoomFull({ isLocked: true }), true);
  assert.equal(
    shouldShowParticipantFullUi({
      isLocked: true,
      uxState: LIVE_UX_STATE.FINISHED,
    }),
    false,
  );
  assert.equal(
    shouldShowParticipantFullUi({
      isLocked: true,
      uxState: LIVE_UX_STATE.VOTING,
    }),
    true,
  );
  assert.equal(
    shouldShowParticipantFullUi({
      isLocked: false,
      uxState: LIVE_UX_STATE.FINISHED,
    }),
    false,
  );
});

test("G15. carte FINISHED /join → exactement 1 « Merci d’avoir participé ! »", () => {
  const merci = getLiveStateLabel(LIVE_UX_STATE.FINISHED);
  assert.equal(merci, "Merci d’avoir participé !");

  const card = resolveJoinFinishedCardContent();
  assert.equal(card.showEyebrow, false);
  assert.equal(card.title, merci);
  assert.equal(card.body, null);
  assert.equal(countJoinFinishedMerciMessages(card), 1);

  // Régression explicite du bug réel : eyebrow + titre + LIVE_UX_BODY_FINISHED_MERCI
  const tripleBug = {
    showEyebrow: true,
    eyebrowText: merci,
    title: merci,
    body: merci,
  };
  assert.equal(countJoinFinishedMerciMessages(tripleBug), 3);

  // Présentation UX FINISHED : titre = Merci, subtitle null (pas un 2ᵉ Merci)
  const pres = getLiveStatePresentation({
    liveScene: "finished",
    displayState: "waiting",
    voteState: "closed",
  });
  assert.equal(pres.ux, LIVE_UX_STATE.FINISHED);
  assert.equal(pres.title, merci);
  assert.equal(pres.subtitle, null);
  assert.equal(
    countJoinFinishedMerciMessages({
      showEyebrow: false,
      title: pres.title,
      body: null,
    }),
    1,
  );
});

// J — aucune navigation automatique join→p
test("J. shouldAutoNavigateJoinToPollPath toujours false", () => {
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// K — /p direct : helper n’interdit pas l’usage standalone (contrat)
test("K. /p direct non concerné par embed Salle", () => {
  // L’embed ne s’applique qu’à Join ; /p reste PollExperience standalone.
  assert.equal(
    typeof shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.VOTING }),
    "boolean",
  );
});

// L — LOT-0 CLOSED ≠ RESULTS (rappel)
test("L. LOT-0 CLOSED ≠ RESULTS", () => {
  assert.equal(
    resolveLiveUxState({
      liveScene: "waiting",
      displayState: "question",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: true,
    }),
    LIVE_UX_STATE.CLOSED,
  );
});

// M — Page événement
test("M. Page événement avant / pendant / après", () => {
  assert.equal(
    resolveEventLandingPhase({
      liveState: "waiting",
      voteState: "closed",
      displayState: "waiting",
    }),
    "before",
  );
  assert.equal(
    resolveEventLandingPhase({
      liveState: "voting",
      voteState: "open",
      displayState: "question",
    }),
    "during",
  );
  assert.equal(resolveEventLandingPhase({ liveState: "finished" }), "after");
});

test("PAUSED → Salle sans embed vote", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.PAUSED }),
    false,
  );
});

test("FULL bloque embed", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({
      uxState: LIVE_UX_STATE.VOTING,
      isFull: true,
    }),
    false,
  );
  assert.equal(isParticipantRoomFull({ isLocked: true }), true);
  assert.equal(extractParticipantErrorCode("LIMIT_REACHED"), "LIMIT_REACHED");
  assert.equal(getParticipantFullLabel(), "La salle est complète.");
});

test("OFFLINE libellé + préavis types", () => {
  assert.equal(getParticipantOfflineLabel(), "Connexion interrompue.");
  assert.equal(
    getParticipantFormNotice({ leadEnabled: true }),
    PARTICIPANT_LEAD_NOTICE,
  );
  assert.equal(
    getParticipantFormNotice({ pollType: "CONTEST_ENTRY" }),
    PARTICIPANT_CONTEST_NOTICE,
  );
  assert.equal(getParticipantFormNotice({ pollType: "SINGLE_CHOICE" }), null);
  assert.equal(getParticipantFormNotice({ pollType: "QUIZ" }), null);
  assert.equal(
    getParticipantFormNotice({ pollType: "MULTIPLE_CHOICE" }),
    null,
  );
});

test("embedded : pas de 2ᵉ socket ni bandeau OFFLINE ni meta branding", () => {
  assert.equal(shouldPollOpenOwnSocket({ embedded: true }), false);
  assert.equal(shouldPollRenderOfflineBanner({ embedded: true }), false);
  assert.equal(shouldPollFetchEventMetaBranding({ embedded: true }), false);
});

test("A3. peer votes : Join join_poll sur même io, Poll embed sans 2ᵉ socket", () => {
  assert.equal(shouldPollOpenOwnSocket({ embedded: true }), false);
  assert.equal(
    shouldJoinSocketJoinActivePoll({ activePollId: "poll-1" }),
    true,
  );
  assert.equal(shouldJoinSocketJoinActivePoll({ activePollId: null }), false);
  assert.equal(shouldJoinSocketJoinActivePoll({ activePollId: "  " }), false);
  assert.equal(
    shouldPollApplyParentPollSnapshot({
      embedded: true,
      parentPollRevision: 2,
    }),
    true,
  );
  assert.equal(
    shouldPollApplyParentPollSnapshot({
      embedded: true,
      parentPollRevision: 0,
    }),
    false,
  );
  assert.equal(
    shouldPollApplyParentPollSnapshot({
      embedded: false,
      parentPollRevision: 3,
    }),
    false,
  );
});

test("LOT-1. résultats live après vote (comportement /p prod) aussi en Salle", () => {
  // VOTING + a voté → barres immédiates (pas besoin de RESULTS salle)
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: true,
      voteState: "open",
      pollStatus: "ACTIVE",
      liveScene: "voting",
      affichageResultatsPublic: false,
    }),
    true,
  );
  // Fallback liveScene voting si voteState absent (payload partiel embed)
  assert.equal(
    isParticipantVoteSessionOpen({
      voteState: "",
      pollStatus: "ACTIVE",
      liveScene: "voting",
    }),
    true,
  );
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: true,
      voteState: "",
      pollStatus: "ACTIVE",
      liveScene: "voting",
      affichageResultatsPublic: false,
    }),
    true,
  );
  // Pas encore voté → pas de barres pendant VOTING
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: false,
      voteState: "open",
      pollStatus: "ACTIVE",
      liveScene: "voting",
      affichageResultatsPublic: false,
    }),
    false,
  );
  // CLOSED après vote → garder résultats finaux (continuité, ne pas masquer)
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: true,
      voteState: "closed",
      pollStatus: "ACTIVE",
      liveScene: "waiting",
      affichageResultatsPublic: false,
    }),
    true,
    "CLOSED après vote : barres finaux visibles",
  );
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: true,
      voteState: "closed",
      pollStatus: "CLOSED",
      liveScene: "waiting",
      affichageResultatsPublic: false,
    }),
    true,
  );
  // CLOSED sans avoir voté → pas de fuite résultats (carte attente)
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: false,
      voteState: "closed",
      pollStatus: "ACTIVE",
      liveScene: "waiting",
      affichageResultatsPublic: false,
    }),
    false,
    "CLOSED non-votant : pas de barres (attente projection)",
  );
  // RESULTS public → barres même sans vote local
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: false,
      voteState: "closed",
      pollStatus: "CLOSED",
      liveScene: "results",
      affichageResultatsPublic: true,
    }),
    true,
  );
  // Libellés bloc résultats
  assert.equal(
    getParticipantResultsBlockTitle({ voteSessionOpen: true }),
    "Résultats en direct",
  );
  assert.equal(
    getParticipantResultsBlockTitle({ voteSessionOpen: false }),
    "Résultats finaux",
  );
  assert.equal(isParticipantVoteClosed({ voteState: "closed" }), true);
  assert.equal(
    isParticipantVoteClosed({ voteState: "open", pollStatus: "ACTIVE" }),
    false,
  );
  // Quiz : barres live après vote comme un sondage (sans révéler la bonne réponse)
  assert.equal(
    shouldShowParticipantLiveResultsBlock({
      hasPoll: true,
      hasVoted: true,
      voteState: "open",
      pollStatus: "ACTIVE",
      liveScene: "voting",
      affichageResultatsPublic: false,
    }),
    true,
    "Quiz VOTING après vote : barres live immédiates",
  );
  assert.equal(
    shouldRevealQuizAnswerToParticipant({
      isQuiz: true,
      quizRevealed: true,
      affichageResultatsPublic: false,
    }),
    false,
    "Quiz CLOSED : pas de révélation bonne réponse",
  );
  assert.equal(
    shouldRevealQuizAnswerToParticipant({
      isQuiz: true,
      quizRevealed: true,
      affichageResultatsPublic: true,
    }),
    true,
    "Quiz RESULTS : révélation bonne réponse + verdict",
  );
  assert.equal(
    shouldRevealQuizAnswerToParticipant({
      isQuiz: true,
      quizRevealed: false,
      affichageResultatsPublic: true,
    }),
    false,
  );
  // GET /p périmé ne doit pas effacer une révélation déjà reçue (poll_updated)
  const mergedReveal = mergePollJsonPreservingQuizReveal(
    {
      id: "q1",
      quizRevealed: true,
      options: [
        { id: "a", label: "Paris", isCorrect: true, votes: 2 },
        { id: "b", label: "Lyon", votes: 1 },
      ],
    },
    {
      id: "q1",
      quizRevealed: false,
      options: [
        { id: "a", label: "Paris", votes: 3 },
        { id: "b", label: "Lyon", votes: 1 },
      ],
    },
  );
  assert.equal(mergedReveal?.quizRevealed, true);
  assert.equal(
    /** @type {{ isCorrect?: boolean }} */ (mergedReveal?.options?.[0]).isCorrect,
    true,
    "isCorrect conservé malgré GET stale",
  );
  assert.equal(
    shouldRevealQuizAnswerToParticipant({
      isQuiz: true,
      quizRevealed: mergedReveal?.quizRevealed === true,
      affichageResultatsPublic: true,
    }),
    true,
    "RESULTS + quizRevealed préservé → révélation Salle",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: true,
      quizRevealed: true,
      isCorrect: true,
      isWinner: true,
      voteOuvert: false,
    }),
    "Bonne réponse",
    "RESULTS Quiz : badge Bonne réponse (pas Gagnant)",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: true,
      quizRevealed: false,
      isCorrect: true,
      isWinner: true,
      voteOuvert: true,
    }),
    "En tête",
    "Quiz non révélé : badge sondage, jamais « Bonne réponse »",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: true,
      quizRevealed: false,
      isCorrect: true,
      isWinner: false,
      voteOuvert: true,
    }),
    null,
    "Quiz non révélé sans leader : aucun badge révélateur",
  );
  // Embed : pas de 2ᵉ socket pour sync peers
  assert.equal(shouldPollOpenOwnSocket({ embedded: true }), false);
  assert.equal(
    shouldPollApplyParentPollSnapshot({
      embedded: true,
      parentPollRevision: 1,
    }),
    true,
  );
});

test("Régie. Afficher les résultats — Quiz révélé seulement si vote fermé", () => {
  assert.equal(
    shouldRevealQuizWhenShowingResults({
      pollType: "QUIZ",
      quizRevealed: false,
      voteState: "closed",
    }),
    true,
    "show-results + vote fermé → quizRevealed (action unique régie)",
  );
  assert.equal(
    shouldRevealQuizWhenShowingResults({
      pollType: "QUIZ",
      quizRevealed: false,
      voteState: "open",
    }),
    false,
    "Vote ouvert : RESULTS sans révéler (résultats en direct)",
  );
  assert.equal(
    shouldRevealQuizWhenShowingResults({
      pollType: "QUIZ",
      quizRevealed: true,
      voteState: "closed",
    }),
    false,
  );
  assert.equal(
    shouldRevealQuizWhenShowingResults({
      pollType: "SINGLE_CHOICE",
      quizRevealed: false,
      voteState: "closed",
    }),
    false,
  );
});

test("LOT-1. Afficher manuel = auto — RESULTS momentané, pas sticky", () => {
  const quizClosed = resolveShowResultsEventPatch({
    pollType: "QUIZ",
    quizRevealed: false,
    voteState: "closed",
  });
  assert.deepEqual(
    quizClosed,
    {
      displayState: "RESULTS",
      screenDisplayState: "RESULTS",
      clearAutoRevealSchedule: true,
      revealQuiz: true,
    },
    "Auto et manuel : même patch RESULTS + révélation Quiz",
  );
  assert.equal(
    resolveShowResultsEventPatch({
      pollType: "SINGLE_CHOICE",
      quizRevealed: false,
      voteState: "closed",
    }).revealQuiz,
    false,
  );
  assert.equal(
    resolveShowResultsEventPatch({
      pollType: "QUIZ",
      quizRevealed: false,
      voteState: "open",
    }).revealQuiz,
    false,
    "Vote ouvert : RESULTS sans révélation Quiz",
  );
});

test("LOT-1. Suivante → PRÉPARÉ, jamais OPEN/VOTING", () => {
  const prepare = resolveNextPollPrepareEventPatch();
  assert.equal(prepare.openVote, false);
  assert.equal(prepare.voteState, "CLOSED");
  assert.equal(prepare.displayState, "WAITING");
  assert.equal(prepare.liveState, "WAITING");
  assert.equal(prepare.clearAutoRevealSchedule, true);
  const uxPrepare = resolveLiveUxState({
    liveScene: prepare.liveState,
    displayState: prepare.displayState,
    voteState: prepare.voteState,
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(uxPrepare, LIVE_UX_STATE.WAITING, "PRÉPARÉ → hub attente /join");
  assert.notEqual(uxPrepare, LIVE_UX_STATE.VOTING);
});

test("LOT-1. Ouvrir → VOTING ; Fermer = axes CLOSED sans sticky RESULTS", () => {
  const openUx = resolveLiveUxState({
    liveScene: "voting",
    displayState: "question",
    voteState: "open",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(openUx, LIVE_UX_STATE.VOTING);

  const closeSticky = resolveEventPatchAfterVoteClose({
    autoReveal: true,
    screenDisplayState: "RESULTS",
  });
  assert.equal(closeSticky.voteState, "CLOSED");
  assert.equal(closeSticky.displayState, "WAITING");
  assert.equal(closeSticky.liveState, "WAITING");
  assert.equal(closeSticky.schedulesAutoReveal, true);
  assert.equal(
    closeSticky.screenDisplayState,
    null,
    "Fermer efface RESULTS collant → Screen peut rester Vote terminé pendant le délai",
  );

  const closeNoSticky = resolveEventPatchAfterVoteClose({
    screenDisplayState: "QUESTION",
  });
  assert.equal(
    closeNoSticky.screenDisplayState,
    undefined,
    "QUESTION Screen préservé à la fermeture (indépendance contrôlée)",
  );

  const closeBlack = resolveScreenDisplayAfterLiveTransition("BLACK", "close");
  assert.equal(closeBlack, undefined, "BLACK projection avancée préservé");
});

test("LOT-1. Transitions Screen — Afficher pose RESULTS ; Suivante/Ouvrir nettoient", () => {
  assert.equal(
    resolveScreenDisplayAfterLiveTransition("QUESTION", "show-results"),
    "RESULTS",
  );
  assert.equal(
    resolveScreenDisplayAfterLiveTransition("RESULTS", "prepare"),
    null,
    "Suivante : plus de RESULTS collant",
  );
  assert.equal(
    resolveScreenDisplayAfterLiveTransition("RESULTS", "open"),
    null,
    "Ouvrir : Screen suit QUESTION salle",
  );
  assert.equal(
    resolveScreenDisplayAfterLiveTransition("BLACK", "prepare"),
    undefined,
  );
  assert.equal(
    resolveScreenDisplayAfterLiveTransition("BLACK", "show-results"),
    "RESULTS",
    "Afficher peut sortir du noir pour projeter les résultats",
  );
});

test("LOT-1. Auto OFF : CLOSED reste CLOSED jusqu’à Afficher (pas RESULTS anticipé)", () => {
  const closedUx = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(closedUx, LIVE_UX_STATE.CLOSED);
  assert.notEqual(closedUx, LIVE_UX_STATE.RESULTS);

  const afterShow = resolveShowResultsEventPatch({
    pollType: "SINGLE_CHOICE",
    voteState: "closed",
  });
  const resultsUx = resolveLiveUxState({
    liveScene: "results",
    displayState: afterShow.displayState,
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(resultsUx, LIVE_UX_STATE.RESULTS);
});

test("A8. Join applique axes socket immédiatement puis fetchMeta", () => {
  assert.equal(shouldJoinApplySocketLiveAxesImmediately(), true);
});

test("A1. WAITING Join : présentation sans Merci vote", () => {
  const pres = getLiveStatePresentation({
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(pres.ux, LIVE_UX_STATE.WAITING);
  assert.equal(pres.title, getLiveStateLabel(LIVE_UX_STATE.WAITING));
  assert.ok(!/Merci ! Ton vote/i.test(pres.title));
});

test("A2. CLOSED non-votant ≠ Merci ; votant = Merci", () => {
  assert.equal(
    getClosedParticipantTitle(false),
    "Vote fermé — les résultats arrivent bientôt",
  );
  assert.ok(!/Merci ! Ton vote/i.test(getClosedParticipantTitle(false)));
  assert.equal(getClosedParticipantTitle(true), LIVE_UX_LABEL_VOTE_CONFIRMED);
});

test("A0. cohérence régie↔Salle↔Screen : TEST RESULTS 1 vote reste 1", () => {
  // Régie = _count brut (1). Salle/Screen = pollToJson mask.
  const salleScreen = applyTestModeResultsVoteMask(
    { optA: 1, optB: 0 },
    { isTestMode: true, displayState: "RESULTS" },
  );
  const regieVoteCount = 1; // _count.votes
  const publicTotal = Object.values(salleScreen).reduce((s, n) => s + n, 0);
  assert.equal(salleScreen.optA, 1);
  assert.equal(publicTotal, regieVoteCount);
});

/**
 * QA : A participé/terminé → duplicate B → B jamais lancé → /join/B = WAITING.
 * Cause : duplicate pose activePollId + poll ACTIVE + vote CLOSED + display WAITING ;
 * Join doit passer activePollStatus (pas null) et n’afficher que pastPolls (vide).
 */
test("Copie jamais lancée (dup A→B) → WAITING, pas vote confirmé, pas questions passées héritées", () => {
  // Payload Join après duplicate (jamais « Lancer ») — miroir backend /events/slug
  const joinCtx = {
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  };
  const ux = resolveLiveUxState(joinCtx);
  assert.equal(ux, LIVE_UX_STATE.WAITING);
  assert.notEqual(ux, LIVE_UX_STATE.CLOSED);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), false);

  // pastPolls API vide (activePollId = Q1, idx 0 → aucune question avant)
  const historique = resolveJoinHistoriqueQuestions([]);
  assert.equal(historique.length, 0);

  // Régression explicite de l’ancien bug Join (pollStatus forcé null → faux CLOSED)
  assert.equal(
    resolveLiveUxState({
      ...joinCtx,
      pollStatus: null,
    }),
    LIVE_UX_STATE.CLOSED,
  );

  // Historique ne doit jamais inventer une entrée depuis la question active
  assert.deepEqual(
    resolveJoinHistoriqueQuestions([
      { id: "past-1", label: "Question déjà jouée" },
    ]),
    [{ id: "past-1", label: "Question déjà jouée" }],
  );
  assert.deepEqual(resolveJoinHistoriqueQuestions(null), []);
  assert.deepEqual(resolveJoinHistoriqueQuestions(undefined), []);
});

test("/p standalone : socket + OFFLINE + meta branding autonomes", () => {
  assert.equal(shouldPollOpenOwnSocket({ embedded: false }), true);
  assert.equal(shouldPollOpenOwnSocket({}), true);
  assert.equal(shouldPollRenderOfflineBanner({ embedded: false }), true);
  assert.equal(shouldPollFetchEventMetaBranding({}), true);
});

test("G15+/p : archive résultats standalone — pas de fuite CLOSED live", () => {
  // Historique (?poll=) → barres OK
  assert.equal(
    shouldPollShowStandaloneArchiveResults({
      embedded: false,
      pollStatus: "CLOSED",
      isPastPollLookup: true,
      liveScene: "voting",
      displayState: "question",
    }),
    true,
  );
  // Événement terminé → barres OK
  assert.equal(
    shouldPollShowStandaloneArchiveResults({
      embedded: false,
      pollStatus: "CLOSED",
      liveScene: "finished",
      displayState: "waiting",
    }),
    true,
  );
  // RESULTS public → barres OK
  assert.equal(
    shouldPollShowStandaloneArchiveResults({
      embedded: false,
      pollStatus: "CLOSED",
      liveScene: "results",
      displayState: "results",
    }),
    true,
  );
  // CLOSED live avant RESULTS (pas d’archive) → pas de fuite
  assert.equal(
    shouldPollShowStandaloneArchiveResults({
      embedded: false,
      pollStatus: "CLOSED",
      liveScene: "waiting",
      displayState: "question",
      isPastPollLookup: false,
    }),
    false,
  );
  // Embedded Salle → jamais via ce helper (Join a sa propre scène RESULTS)
  assert.equal(
    shouldPollShowStandaloneArchiveResults({
      embedded: true,
      pollStatus: "CLOSED",
      isPastPollLookup: true,
      liveScene: "finished",
    }),
    false,
  );
  // Poll encore ACTIVE → pas d’archive
  assert.equal(
    shouldPollShowStandaloneArchiveResults({
      embedded: false,
      pollStatus: "ACTIVE",
      isPastPollLookup: true,
    }),
    false,
  );
});

test("Socle Live : normalize poll_updated event* → bare cohérent", () => {
  const n = normalizePollJson({
    id: "p",
    eventLiveState: "CLOSED",
    eventVoteState: "CLOSED",
    eventDisplayState: "QUESTION",
    options: [{ id: "o", label: "A", votes: 1 }],
  });
  const axes = normalizeLiveAxes(n);
  assert.equal(axes.liveState, "closed");
  assert.equal(axes.displayState, "question");
  assert.equal(optionVoteCount(n.options[0]), 1);
  const ux = resolveLiveUxState({
    liveScene: axes.liveState,
    displayState: axes.displayState,
    voteState: axes.voteState,
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.CLOSED);
});

test("Socle Live : G9 contestWinnersCount + A3 pas de 2e socket", () => {
  assert.equal(
    normalizePollJson({ id: "x", contestWinnersCount: 3 }).contestWinnersCount,
    3,
  );
  assert.equal(shouldPollOpenOwnSocket({ embedded: true }), false);
});

test("A. VOTING après vote : pas de stats tant que RESULTS non projetés", () => {
  assert.equal(
    shouldShowParticipantResultStats({ affichageResultatsPublic: false }),
    false,
  );
  assert.equal(
    shouldShowParticipantResultStats({ affichageResultatsPublic: true }),
    true,
  );
  assert.equal(
    shouldShowActiveVotingInstruction({ voteOuvert: true, hasVoted: false }),
    true,
  );
  assert.equal(
    shouldShowActiveVotingInstruction({ voteOuvert: true, hasVoted: true }),
    false,
  );
});

test("C. Quiz révélation CLOSED : feedback Salle nomme la bonne réponse", () => {
  assert.equal(
    formatQuizRevealParticipantFeedback({
      correctLabel: "Paris",
      answeredCorrectly: true,
      hasVoted: true,
    }),
    "Bonne réponse : Paris ✅ — ton choix était correct",
  );
  assert.equal(
    formatQuizRevealParticipantFeedback({
      correctLabel: "Paris",
      answeredCorrectly: false,
      hasVoted: true,
    }),
    "Mauvaise réponse ❌ — la bonne était : Paris",
  );
  assert.equal(
    formatQuizRevealParticipantFeedback({
      correctLabel: "Paris",
      hasVoted: false,
    }),
    "Bonne réponse : Paris",
  );
});

test("Finition. Merci une seule fois — VOTING après vote et CLOSED après vote", () => {
  // VOTING après vote : strip masqué (null), bandeau principal seul.
  assert.equal(
    resolveParticipantTopStripLabel({
      hasVoted: true,
      voteOuvert: true,
      voteConfirmedLabel: LIVE_UX_LABEL_VOTE_CONFIRMED,
      stateTitle: getLiveStateLabel(LIVE_UX_STATE.VOTING),
    }),
    null,
  );
  assert.equal(
    countParticipantVoteConfirmedSurfaces({
      hasVoted: true,
      voteOuvert: true,
      merciPourVote: true,
      closedWaitCardVisible: false,
      voteConfirmedLabel: LIVE_UX_LABEL_VOTE_CONFIRMED,
      stateTitle: getLiveStateLabel(LIVE_UX_STATE.VOTING),
    }),
    1,
    "VOTING après vote : Merci une seule fois (bloc principal)",
  );

  // CLOSED après vote : strip = label CLOSED (≠ Merci), carte = Merci.
  assert.equal(
    resolveParticipantTopStripLabel({
      hasVoted: true,
      voteOuvert: false,
      voteConfirmedLabel: LIVE_UX_LABEL_VOTE_CONFIRMED,
      stateTitle: getLiveStateLabel(LIVE_UX_STATE.CLOSED),
    }),
    getLiveStateLabel(LIVE_UX_STATE.CLOSED),
  );
  assert.equal(
    getClosedParticipantTitle(true),
    LIVE_UX_LABEL_VOTE_CONFIRMED,
    "Merci reste sur la carte CLOSED",
  );
  assert.equal(
    countParticipantVoteConfirmedSurfaces({
      hasVoted: true,
      voteOuvert: false,
      merciPourVote: false,
      closedWaitCardVisible: true,
      voteConfirmedLabel: LIVE_UX_LABEL_VOTE_CONFIRMED,
      stateTitle: getLiveStateLabel(LIVE_UX_STATE.CLOSED),
    }),
    1,
    "CLOSED après vote : Merci une seule fois (carte)",
  );

  // Non-votant VOTING : strip = instruction, pas de Merci.
  assert.equal(
    resolveParticipantTopStripLabel({
      hasVoted: false,
      voteOuvert: true,
      voteConfirmedLabel: LIVE_UX_LABEL_VOTE_CONFIRMED,
      stateTitle: getLiveStateLabel(LIVE_UX_STATE.VOTING),
    }),
    getLiveStateLabel(LIVE_UX_STATE.VOTING),
  );
  assert.equal(
    countParticipantVoteConfirmedSurfaces({
      hasVoted: false,
      voteOuvert: true,
      merciPourVote: false,
      voteConfirmedLabel: LIVE_UX_LABEL_VOTE_CONFIRMED,
      stateTitle: getLiveStateLabel(LIVE_UX_STATE.VOTING),
    }),
    0,
  );
});

test("Finition. Badge RESULTS Quiz = Bonne réponse ; sondage = Gagnant", () => {
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: true,
      quizRevealed: true,
      isCorrect: true,
      isWinner: true,
      voteOuvert: false,
    }),
    "Bonne réponse",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: true,
      quizRevealed: true,
      isCorrect: true,
      isWinner: false,
      voteOuvert: false,
    }),
    "Bonne réponse",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: false,
      quizRevealed: false,
      isCorrect: false,
      isWinner: true,
      voteOuvert: false,
    }),
    "Gagnant",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: false,
      isWinner: true,
      voteOuvert: true,
    }),
    "En tête",
  );
  assert.equal(
    getParticipantResultsOptionBadgeLabel({
      isQuiz: true,
      quizRevealed: false,
      isCorrect: true,
      isWinner: true,
      voteOuvert: false,
    }),
    "Gagnant",
    "Quiz non révélé : badge sondage inchangé",
  );
  assert.equal(formatTestModeVoteCountLabel(2), "2 votes");
});

test("G15. JoinLiveHub source : pas de triple Merci FINISHED", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "../components/JoinLiveHub.jsx"), "utf8");

  // Ne plus importer / rendre le 3ᵉ Merci (sous-texte redondant).
  assert.equal(src.includes("LIVE_UX_BODY_FINISHED_MERCI"), false);

  // Le rendu FINISHED doit passer par le helper unique.
  assert.match(src, /resolveJoinFinishedCardContent/);
  assert.match(src, /isFinishedUx/);
  assert.match(src, /finishedCardContent\.title/);

  // Eyebrow conditionnellement masqué en FINISHED.
  assert.match(src, /!isFinishedUx\s*\?/);
});

let failed = 0;
for (const c of cases) {
  try {
    c.run();
    console.log(`ok — ${c.name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${c.name}`);
    console.error(e);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\n${cases.length} tests participant OK (Salle permanente)`);
