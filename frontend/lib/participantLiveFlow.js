/**
 * LOT-1 / LOT-7 — continuum participant (Salle permanente `/join`).
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
 * Surface vote/confirmation/CLOSED/RESULTS à afficher DANS la Salle `/join`
 * (pas de navigation vers `/p`).
 *
 * @param {{
 *   uxState?: string | null;
 *   isFull?: boolean;
 *   loading?: boolean;
 * }} input
 * @returns {boolean}
 */
export function shouldEmbedPollSurfaceInRoom(input = {}) {
  if (input.loading) return false;
  if (input.isFull) return false;
  const ux = String(input.uxState ?? "").toUpperCase();
  return (
    ux === LIVE_UX_STATE.VOTING ||
    ux === LIVE_UX_STATE.CLOSED ||
    ux === LIVE_UX_STATE.RESULTS
  );
}

/**
 * Le parcours Salle standard ne doit jamais auto-naviguer vers `/p`.
 * Toujours false — gardé pour tests de non-régression explicites.
 * @returns {false}
 */
export function shouldAutoNavigateJoinToPollPath() {
  return false;
}

/**
 * En Salle (`embedded`), PollExperience réutilise le socket Join — pas de 2ᵉ `io()`.
 * En standalone `/p`, Poll ouvre sa propre connexion.
 * @param {{ embedded?: boolean }} input
 */
export function shouldPollOpenOwnSocket(input = {}) {
  return input.embedded !== true;
}

/**
 * Un seul bandeau OFFLINE : celui de Join en Salle ; Poll le gère seulement en `/p`.
 * @param {{ embedded?: boolean }} input
 */
export function shouldPollRenderOfflineBanner(input = {}) {
  return input.embedded !== true;
}

/**
 * Meta branding slug déjà portée par Join — inutile en embedded.
 * @param {{ embedded?: boolean }} input
 */
export function shouldPollFetchEventMetaBranding(input = {}) {
  return input.embedded !== true;
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
