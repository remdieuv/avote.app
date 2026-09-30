/**
 * LOT-1 / LOT-7 — continuum participant (Salle → vote → états live).
 * Pure helpers : pas de second moteur d’état — consomme resolveLiveUxState / LIVE_UX_*.
 */

import {
  LIVE_UX_LOCAL,
  LIVE_UX_STATE,
  getLiveStateLabel,
} from "./liveStateUx.js";

/** Préavis lead avant choix (F-A). */
export const PARTICIPANT_LEAD_NOTICE =
  "On te demandera ton prénom et ton téléphone après ton choix.";

/** Préavis concours avant choix (F-A). */
export const PARTICIPANT_CONTEST_NOTICE =
  "Après ton choix, on te demandera tes coordonnées pour le tirage.";

/** Transition douce join → vote (pas de CTA « Voter maintenant »). */
export const PARTICIPANT_ENTERING_VOTE =
  "La question s’affiche…";

/**
 * Phase Page événement `/e` pour hiérarchie CTA.
 * @typedef {'before'|'during'|'after'} EventLandingPhase
 */

/**
 * @param {{
 *   liveState?: string | null;
 *   voteState?: string | null;
 *   displayState?: string | null;
 * }} input
 * @returns {EventLandingPhase}
 */
export function resolveEventLandingPhase(input = {}) {
  const ls = String(input.liveState ?? "").toLowerCase();
  const vs = String(input.voteState ?? "").toLowerCase();
  const ds = String(input.displayState ?? "").toLowerCase();

  if (ls === "finished") return "after";

  if (
    ls === "voting" ||
    ls === "results" ||
    ls === "paused" ||
    vs === "open" ||
    ds === "question" ||
    ds === "results" ||
    ds === "black"
  ) {
    return "during";
  }

  // CLOSED UX (vote fermé, pas encore RESULTS) = encore pendant le live
  if (vs === "closed" && (ds === "question" || ls === "closed")) {
    return "during";
  }

  return "before";
}

/**
 * Salle complète : mapper codes API existants → présentation FULL (pas d’enum Prisma).
 * @param {{
 *   isLocked?: boolean | null;
 *   limitReached?: boolean | null;
 *   errorCode?: string | null;
 * }} input
 */
export function isParticipantRoomFull(input = {}) {
  if (input.isLocked === true) return true;
  if (input.limitReached === true) return true;
  const code = String(input.errorCode ?? "").toUpperCase();
  return code === "LIMIT_REACHED" || code === "EVENT_LOCKED" || code === "FULL";
}

/**
 * @param {unknown} errBodyOrMessage
 * @returns {string | null} code normalisé ou null
 */
export function extractParticipantErrorCode(errBodyOrMessage) {
  if (errBodyOrMessage == null) return null;
  if (typeof errBodyOrMessage === "string") {
    const s = errBodyOrMessage.trim().toUpperCase();
    if (
      s === "LIMIT_REACHED" ||
      s === "EVENT_LOCKED" ||
      s === "FULL" ||
      s.includes("LIMIT_REACHED")
    ) {
      if (s.includes("EVENT_LOCKED")) return "EVENT_LOCKED";
      if (s.includes("LIMIT_REACHED") || s === "FULL") return "LIMIT_REACHED";
    }
    return null;
  }
  if (typeof errBodyOrMessage === "object") {
    const err = /** @type {Record<string, unknown>} */ (errBodyOrMessage);
    const code = String(err.error ?? err.code ?? "").toUpperCase();
    if (code === "LIMIT_REACHED" || code === "EVENT_LOCKED" || code === "FULL") {
      return code === "FULL" ? "LIMIT_REACHED" : code;
    }
    if (err.limitReached === true) return "LIMIT_REACHED";
    if (err.locked === true) return "EVENT_LOCKED";
  }
  return null;
}

/**
 * Libellé FULL (P-E8).
 */
export function getParticipantFullLabel() {
  return getLiveStateLabel(LIVE_UX_LOCAL.FULL);
}

/**
 * Libellé OFFLINE (P-E9).
 */
export function getParticipantOfflineLabel() {
  return getLiveStateLabel(LIVE_UX_LOCAL.OFFLINE);
}

/**
 * Auto-présentation vote : surface `/p` sans clic « Voter maintenant ».
 * Ne remplace PAS la Salle en permanence — uniquement si participation immédiate requise.
 *
 * @param {{
 *   uxState?: string | null;
 *   hasVoted?: boolean;
 *   isFull?: boolean;
 *   offline?: boolean;
 *   loading?: boolean;
 *   storageReady?: boolean;
 *   inPreviewFrame?: boolean;
 * }} input
 * @returns {boolean}
 */
export function shouldAutoEnterVoteSurface(input = {}) {
  if (input.loading) return false;
  if (input.inPreviewFrame) return false;
  if (input.offline) return false;
  if (input.isFull) return false;
  if (input.storageReady === false) return false;
  if (input.hasVoted) return false;
  const ux = String(input.uxState ?? "").toUpperCase();
  return ux === LIVE_UX_STATE.VOTING;
}

/**
 * Afficher les résultats détaillés sur `/p` dès RESULTS (lien Salle → détail fluide).
 * @param {{
 *   uxState?: string | null;
 *   hasActivePoll?: boolean;
 *   isFull?: boolean;
 *   offline?: boolean;
 *   loading?: boolean;
 *   inPreviewFrame?: boolean;
 * }} input
 */
export function shouldAutoEnterResultsSurface(input = {}) {
  if (input.loading) return false;
  if (input.inPreviewFrame) return false;
  if (input.offline) return false;
  if (input.isFull) return false;
  if (!input.hasActivePoll) return false;
  const ux = String(input.uxState ?? "").toUpperCase();
  return ux === LIVE_UX_STATE.RESULTS;
}

/**
 * Préavis lead / concours avant les choix.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 * @returns {string | null}
 */
export function getParticipantFormNotice(input = {}) {
  const type = String(input.pollType ?? "").toUpperCase();
  if (type === "CONTEST_ENTRY") return PARTICIPANT_CONTEST_NOTICE;
  if (input.leadEnabled === true) return PARTICIPANT_LEAD_NOTICE;
  return null;
}
