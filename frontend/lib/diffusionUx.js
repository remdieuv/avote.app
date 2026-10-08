/**
 * LOT-2 — Diffusion Screen / Overlay : décisions UX pures (pas de moteur live concurrent).
 * États logiques : `resolveLiveUxState` (socle). Présentation Screen ≠ labels Participant.
 */

import {
  isWaitingBetweenQuestions,
  resolveLiveUxState,
} from "./liveStateUx.js";

/** WAITING Screen — avant la première question. */
export const SCREEN_WAITING_LABEL_START = "ÇA VA BIENTÔT COMMENCER";

/** WAITING Screen — entre deux questions (PRÉPARÉ après Suivante). */
export const SCREEN_WAITING_LABEL_BETWEEN = "PROCHAINE QUESTION BIENTÔT";

/**
 * Libellé WAITING grand écran selon le contexte (1ʳᵉ question vs entre questions).
 * @param {Parameters<typeof isWaitingBetweenQuestions>[0]} [input]
 */
export function getScreenWaitingDiffusionLabel(input = {}) {
  return isWaitingBetweenQuestions(input)
    ? SCREEN_WAITING_LABEL_BETWEEN
    : SCREEN_WAITING_LABEL_START;
}

/**
 * Libellés grand écran (salle / TV / vidéoprojecteur) — très courts, lisibles à distance.
 * Ne pas réutiliser aveuglément les textes Participant (`getLiveStateLabel`).
 *
 * @param {string | null | undefined} uxState — sortie resolveLiveUxState
 * @param {Parameters<typeof isWaitingBetweenQuestions>[0]} [waitingCtx]
 * @returns {string}
 */
export function getScreenDiffusionLabel(uxState, waitingCtx = {}) {
  const k = String(uxState ?? "").toUpperCase();
  switch (k) {
    case "WAITING":
      return getScreenWaitingDiffusionLabel(waitingCtx);
    case "VOTING":
      return "VOTE OUVERT";
    case "CLOSED":
      return "VOTE TERMINÉ";
    case "RESULTS":
      return "RÉSULTATS";
    case "PAUSED":
      return "PAUSE";
    case "FINISHED":
      return "MERCI D’AVOIR PARTICIPÉ !";
    default:
      return SCREEN_WAITING_LABEL_START;
  }
}

/** CTA QR WAITING (rejoindre la Salle). */
export const SCREEN_QR_CTA_JOIN = "SCANNER POUR REJOINDRE";

/** CTA QR VOTING (retardataires). */
export const SCREEN_QR_CTA_VOTE = "Scannez pour voter";

/**
 * Progression Question x/y depuis l’ordre réel des polls.
 * Préférer `pollsProgress` (GET /events/slug) ; fallback sur `poll.order` + total connu.
 *
 * @param {{
 *   pollsProgress?: { current?: number; total?: number } | null;
 *   pollOrder?: number | null;
 *   pollsTotal?: number | null;
 * }} input
 * @returns {{ current: number; total: number } | null}
 */
export function resolveScreenQuestionProgress(input) {
  const pp = input?.pollsProgress;
  const curPp = Number(pp?.current);
  const totPp = Number(pp?.total);
  if (
    Number.isFinite(curPp) &&
    Number.isFinite(totPp) &&
    curPp >= 1 &&
    totPp >= 1
  ) {
    return { current: Math.floor(curPp), total: Math.floor(totPp) };
  }

  const order = input?.pollOrder;
  const total = Number(input?.pollsTotal);
  if (typeof order === "number" && Number.isFinite(order) && order >= 0) {
    const current = Math.floor(order) + 1;
    if (Number.isFinite(total) && total >= current) {
      return { current, total: Math.floor(total) };
    }
    return { current, total: current };
  }
  return null;
}

/**
 * Libellé progression grand écran.
 * @param {{ current: number; total: number } | null | undefined} progress
 * @param {"voting" | "closed" | "results"} phase
 * @returns {string | null}
 */
export function formatScreenQuestionProgressLabel(progress, phase = "voting") {
  if (!progress || !(progress.current >= 1) || !(progress.total >= 1)) {
    return null;
  }
  const base = `QUESTION ${progress.current}/${progress.total}`;
  if (phase === "results") return `RÉSULTATS — ${base}`;
  return base;
}

/**
 * Compteur « votes reçus » pour le Screen pendant VOTING.
 * Priorité : `poll.votersCount` = participants distincts (voterSessionId).
 * Fallback : somme des options (approx. OK en SINGLE_CHOICE uniquement).
 *
 * Règle métier : même en MULTIPLE_CHOICE, afficher le nombre de participants
 * ayant voté — pas le total des sélections d’options.
 *
 * @param {{
 *   options?: Array<{ votes?: unknown; voteCount?: unknown }> | null;
 *   type?: string | null;
 *   votersCount?: unknown;
 * } | null | undefined} poll
 * @returns {{ count: number; isMultipleChoice: boolean; label: string; source: "votersCount" | "optionsSum" }}
 */
export function countScreenVotesReceived(poll) {
  const isMultipleChoice =
    String(poll?.type || "").toUpperCase() === "MULTIPLE_CHOICE";
  const fromVoters = Number(poll?.votersCount);
  if (Number.isFinite(fromVoters) && fromVoters >= 0) {
    const n = Math.max(0, Math.floor(fromVoters));
    const label = n === 1 ? "1 vote reçu" : `${n} votes reçus`;
    return { count: n, isMultipleChoice, label, source: "votersCount" };
  }
  const opts = Array.isArray(poll?.options) ? poll.options : [];
  const count = opts.reduce(
    (sum, o) => sum + (Number(o?.voteCount ?? o?.votes ?? 0) || 0),
    0,
  );
  const n = Math.max(0, Math.floor(count));
  const label = n === 1 ? "1 vote reçu" : `${n} votes reçus`;
  return { count: n, isMultipleChoice, label, source: "optionsSum" };
}

/**
 * Lettre d’option A, B, C… depuis l’index (ordre déjà trié).
 * @param {number} index
 * @returns {string}
 */
export function screenOptionLetter(index) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  if (i < 26) return String.fromCharCode(65 + i);
  return String(i + 1);
}

/**
 * Ligne option grand écran : « B — Paris ».
 * @param {string} letter
 * @param {string} label
 */
export function formatScreenOptionLine(letter, label) {
  const L = String(letter || "").trim() || "?";
  const text = String(label || "").trim() || "Option";
  return `${L} — ${text}`;
}

/**
 * Quiz révélé sur Screen pendant CLOSED (pas RESULTS) : highlight bonne réponse.
 * @param {{ type?: string | null; quizRevealed?: unknown } | null | undefined} poll
 */
export function isScreenQuizAnswerRevealed(poll) {
  return (
    String(poll?.type || "").toUpperCase() === "QUIZ" &&
    Boolean(poll?.quizRevealed)
  );
}

/**
 * G13 — axes projection après fermeture de vote (fin chrono OU « Fermer le vote »).
 * Les deux chemins backend doivent produire exactement cet état Screen CLOSED.
 * Un `screenDisplayState=RESULTS` collant est effacé (BLACK préservé côté serveur).
 * @param {Partial<{
 *   liveScene: string;
 *   displayState: string;
 *   voteState: string;
 *   pollStatus: string;
 *   hasActivePoll: boolean;
 *   screenDisplayState: string | null;
 * }>} [overrides]
 */
export function projectionAxesAfterVoteClose(overrides = {}) {
  return {
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
    screenDisplayState: null,
    ...overrides,
  };
}

/**
 * Règle `voteOuvert` Screen (alignée ScreenProjection) — QR « Scannez pour voter » si true.
 * @param {{ displayState?: string | null; eventVoteState?: string | null }} input
 */
export function isScreenProjectionVoteOpen(input = {}) {
  return (
    String(input.displayState ?? "").toLowerCase() === "question" &&
    String(input.eventVoteState ?? "").toLowerCase() === "open"
  );
}

/**
 * Surface Screen attendue après fermeture : `closed` (pas WAITING / VOTING).
 * @param {Parameters<typeof projectionAxesAfterVoteClose>[0]} [axes]
 * @returns {"closed" | "waiting" | "voting" | string}
 */
export function resolveScreenSurfaceAfterVoteClose(axes) {
  const a = projectionAxesAfterVoteClose(axes);
  const ux = resolveLiveUxState(a);
  const voteOpen = isScreenProjectionVoteOpen({
    displayState: a.displayState,
    eventVoteState: a.voteState,
  });
  if (ux === "CLOSED" && !voteOpen && a.hasActivePoll) return "closed";
  if (ux === "WAITING") return "waiting";
  if (ux === "VOTING" || voteOpen) return "voting";
  return String(ux).toLowerCase();
}

/**
 * Footer Screen CLOSED : après reveal Quiz → scores ; sinon résultats.
 * @param {{ quizAnswerRevealed?: boolean }} [input]
 */
export function getScreenClosedAwaitingResultsLabel(input = {}) {
  if (input.quizAnswerRevealed === true) {
    return "Les scores arrivent bientôt";
  }
  return "Les résultats arrivent bientôt";
}

/**
 * CLOSED Screen : afficher compteur + texte d’attente (les deux).
 * @param {{ voteOuvert?: boolean }} input
 */
export function shouldShowScreenClosedVoteCount(input = {}) {
  return input.voteOuvert !== true;
}

/**
 * Options triées pour affichage Screen (ordre métier).
 * @param {Array<Record<string, unknown>> | null | undefined} options
 * @returns {Array<Record<string, unknown>>}
 */
export function sortScreenOptions(options) {
  const opts = Array.isArray(options) ? [...options] : [];
  opts.sort(
    (a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0),
  );
  return opts;
}

/**
 * QR coin /screen : uniquement si l’événement est accessible et l’état le justifie.
 * Anti-pattern P8 : jamais de QR si introuvable / erreur / chargement / fin / noir.
 *
 * WAITING → QR héros dans la scène (pas de coin).
 * VOTING → QR secondaire dans ScreenQuestion (pas de coin).
 * CLOSED / RESULTS / FINISHED → pas de QR coin (focus contenu).
 *
 * @param {{
 *   loading?: boolean;
 *   error?: string | null;
 *   eventInvalid?: boolean;
 *   liveScene?: string | null;
 *   displayState?: string | null;
 *   surface?: "question" | "results" | "other" | string | null;
 *   projectionMode?: string | null;
 *   uxState?: string | null;
 * }} input
 * @returns {boolean}
 */
export function shouldShowScreenCornerQr(input) {
  const loading = input?.loading === true;
  const eventInvalid = input?.eventInvalid === true;
  const error =
    typeof input?.error === "string" && input.error.trim().length > 0;
  if (loading || eventInvalid || error) return false;

  const live = String(input?.liveScene ?? "").toLowerCase();
  const ds = String(input?.displayState ?? "").toLowerCase();
  const ux = String(input?.uxState ?? "").toUpperCase();
  if (live === "finished" || live === "paused" || ds === "black") return false;
  if (ux === "FINISHED" || ux === "PAUSED" || ux === "CLOSED" || ux === "RESULTS") {
    return false;
  }

  const surface = String(input?.surface ?? "other").toLowerCase();
  if (surface === "question" || surface === "results") return false;

  const pm = String(input?.projectionMode ?? "standard")
    .trim()
    .toLowerCase();
  if (pm === "results_focus") return false;

  // WAITING / idle : QR héros dans la scène, pas le coin.
  if (ds === "waiting" || ux === "WAITING" || live === "waiting") return false;

  return false;
}

/**
 * Overlay OBS : panneau verre (glass) interdit pour ces cas — fond transparent obligatoire.
 *
 * @param {{
 *   loading?: boolean;
 *   error?: string | null;
 *   eventInvalid?: boolean;
 *   noPollIdle?: boolean;
 *   effectivePanel?: string | null;
 *   displayState?: string | null;
 * }} input
 * @returns {boolean}
 */
export function overlayMustStayTransparent(input) {
  if (input?.loading === true) return true;
  if (input?.eventInvalid === true) return true;
  if (typeof input?.error === "string" && input.error.trim()) return true;
  if (input?.noPollIdle === true) return true;
  const panel = String(input?.effectivePanel ?? "").toLowerCase();
  if (panel === "empty") return true;
  const ds = String(input?.displayState ?? "").toLowerCase();
  if (ds === "black") return true;
  return false;
}

/** Micro-distinction régie (Screen ≠ Overlay). */
export const DIFFUSION_SCREEN_VS_OVERLAY_HINT =
  "Écran = salle / TV · Overlay = fond transparent OBS";

/** Guide OBS 3 gestes (micro-copy, pas un tutoriel). */
export const OBS_GUIDE_STEPS = [
  "Copier l’URL Overlay (preset Stream compact)",
  "Ajouter une Source Navigateur dans OBS",
  "Coller l’URL et vérifier la transparence (pas de rectangle blanc)",
];
