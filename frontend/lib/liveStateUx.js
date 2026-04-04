/**
 * Source unique de vérité : libellés et tons UX des états live (/join, /p, /screen).
 * @typedef {'WAITING'|'VOTING'|'CLOSED'|'RESULTS'|'PAUSED'|'FINISHED'} LiveUxState
 */

export const LIVE_UX_STATE = {
  WAITING: "WAITING",
  VOTING: "VOTING",
  CLOSED: "CLOSED",
  RESULTS: "RESULTS",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
};

/** @type {Record<LiveUxState, string>} */
const LABELS = {
  WAITING: "La prochaine question arrive",
  VOTING: "Vote en cours",
  CLOSED: "Vote terminé",
  RESULTS: "Résultats en cours",
  PAUSED: "Pause en cours",
  FINISHED: "Événement terminé",
};

/** @type {Record<LiveUxState, 'neutral'|'dynamic'|'highlight'|'soft'|'conclusion'>} */
const TONES = {
  WAITING: "neutral",
  VOTING: "dynamic",
  CLOSED: "neutral",
  RESULTS: "highlight",
  PAUSED: "soft",
  FINISHED: "conclusion",
};

/**
 * @param {LiveUxState | string | null | undefined} uxState
 * @returns {string}
 */
export function getLiveStateLabel(uxState) {
  const k = String(uxState ?? "").toUpperCase();
  return LABELS[k] ?? LABELS.WAITING;
}

/**
 * @param {LiveUxState | string | null | undefined} uxState
 */
export function getLiveStateTone(uxState) {
  const k = String(uxState ?? "").toUpperCase();
  return TONES[k] ?? "neutral";
}

/**
 * Affichage dérivé du liveState quand displayState est absent (aligné projection).
 * @param {string | null | undefined} liveScene
 * @returns {string}
 */
export function deriveDisplayStateFromLive(liveScene) {
  const s = String(liveScene ?? "").toLowerCase();
  if (s === "results") return "results";
  if (s === "voting") return "question";
  if (s === "paused") return "black";
  if (s === "finished") return "waiting";
  if (s === "waiting") return "waiting";
  return "waiting";
}

/**
 * Résout l’état UX canonique sans modifier la logique métier (vote / régie).
 * @param {{
 *   liveScene: string | null | undefined;
 *   displayState: string | null | undefined;
 *   voteState: string | null | undefined;
 *   pollStatus: string | null | undefined;
 *   hasActivePoll?: boolean;
 * }} ctx
 * @returns {LiveUxState}
 */
export function resolveLiveUxState(ctx) {
  const ls = String(ctx.liveScene ?? "").toLowerCase();
  const dsRaw = ctx.displayState;
  const ds =
    typeof dsRaw === "string" && dsRaw.trim()
      ? dsRaw.toLowerCase()
      : deriveDisplayStateFromLive(ctx.liveScene);
  const vs = String(ctx.voteState ?? "").toLowerCase();
  const ps = String(ctx.pollStatus ?? "").toUpperCase();
  const hasActive = ctx.hasActivePoll === true;

  if (ls === "finished") return LIVE_UX_STATE.FINISHED;
  if (ls === "paused" || ds === "black") return LIVE_UX_STATE.PAUSED;
  if (ds === "results" || ls === "results") return LIVE_UX_STATE.RESULTS;

  const voteOpen = vs === "open";
  const pollActive = ps === "ACTIVE";
  const canVote =
    voteOpen &&
    (ds === "question" || ls === "voting") &&
    (ps === "" || pollActive);
  if (canVote) return LIVE_UX_STATE.VOTING;

  const voteClosed = vs === "closed";
  const pollClosed = ps === "CLOSED";
  if (
    voteClosed &&
    ds !== "results" &&
    ls !== "results" &&
    (pollClosed || (ds === "waiting" && hasActive && !pollActive))
  ) {
    return LIVE_UX_STATE.CLOSED;
  }

  if (voteClosed && pollActive) {
    return LIVE_UX_STATE.WAITING;
  }

  return LIVE_UX_STATE.WAITING;
}

/**
 * Sous-texte optionnel (ex. auto-reveal). Le titre reste getLiveStateLabel(CLOSED).
 * @param {{
 *   liveScene?: string | null;
 *   displayState?: string | null;
 *   voteState?: string | null;
 *   pollStatus?: string | null;
 *   hasActivePoll?: boolean;
 *   autoReveal?: boolean;
 *   autoRevealShowResultsAt?: string | null;
 * }} ctx
 * @returns {string | null}
 */
export function getLiveStateSubtitle(ctx) {
  const ux = resolveLiveUxState(ctx);
  if (ux !== LIVE_UX_STATE.CLOSED) return null;
  const iso = ctx.autoRevealShowResultsAt;
  if (typeof iso !== "string" || !iso.trim()) return null;
  if (new Date(iso).getTime() <= Date.now() - 800) return null;
  if (ctx.autoReveal === false) return null;
  return "Les résultats arrivent dans quelques secondes.";
}

/** Affichage /join si sous-titre auto-reveal indisponible mais décompte actif. */
export const LIVE_UX_SUBTITLE_REVEAL_PENDING =
  "Résultats dans quelques instants.";

/** Sous-texte /p : attente sans sondage chargé (contenu pédagogique, sous le titre WAITING). */
export const LIVE_UX_BODY_POLL_WAITING = `Rien ne fonctionne mal : vous êtes sur la bonne page pour cet événement. Pour l’instant, la salle est en pause ou entre deux moments — le vote et les résultats sont lancés depuis la régie. Dès que l’organisateur ouvrira le vote ou affichera les résultats, ils apparaîtront ici automatiquement. Vous pouvez garder cet onglet ouvert ; inutile d’actualiser en continu.`;

/** Sous-texte /p : aucun JSON poll (slug public, message d’info). */
export const LIVE_UX_BODY_POLL_NO_POLL_SLUG =
  "Aucun sondage à l’écran pour l’instant — la régie contrôle la suite du live.";

/** Sous-texte /screen : attente sans contenu poll après GET /p 404 (slug valide). */
export const LIVE_UX_DETAIL_SCREEN_WAITING_SLUG =
  "La régie affichera la prochaine question ou les résultats.";

/** Sous-texte projection résultats : vote encore ouvert côté événement. */
export const LIVE_UX_BODY_RESULTS_VOTES_OPEN =
  "Les votes continuent en direct.";

/** Sous-texte /join : événement terminé. */
export const LIVE_UX_BODY_FINISHED_MERCI = "Merci d’avoir participé.";

/** Sous-texte /join : attente générique (sous le titre WAITING). */
export const LIVE_UX_BODY_JOIN_WAITING = "La régie prépare la suite du live.";

/** Sous-texte /join : phase résultats côté hub. */
export const LIVE_UX_BODY_JOIN_AFTER_RESULTS =
  "Préparez-vous pour la suite du direct.";

/** Sous-texte /join : pause. */
export const LIVE_UX_BODY_JOIN_PAUSED = "La reprise du direct est imminente.";

/** @param {Parameters<typeof resolveLiveUxState>[0] & { autoReveal?: boolean; autoRevealShowResultsAt?: string | null }} ctx */
export function getLiveStatePresentation(ctx) {
  const ux = resolveLiveUxState(ctx);
  return {
    ux,
    title: getLiveStateLabel(ux),
    subtitle: getLiveStateSubtitle(ctx),
  };
}
