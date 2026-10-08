/**
 * Source unique de vérité : libellés et résolution UX des états live (/join, /p, /screen).
 *
 * Contrat AVOTE V1 (LOT-0) — ne pas inventer d’enum Prisma :
 * - Axes métier : voteState (OPEN|CLOSED) × displayState (QUESTION|RESULTS|BLACK|WAITING)
 *   + liveState legacy (WAITING|VOTING|RESULTS|PAUSED|FINISHED).
 * - CLOSED / FULL / OFFLINE = états UX frontend dérivés, jamais de nouvelles valeurs Prisma.
 * - FULL ← LIMIT_REACHED / isLocked / limitReached (présentation locale).
 * - OFFLINE ← drop socket / erreur réseau FE.
 * - PAUSED UX ← display BLACK ou liveState PAUSED (pas de nouvel état backend V1).
 *
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

/**
 * Présentations UI locales (hors machine live Prisma) — pour lots suivants.
 * Ne pas confondre avec LiveUxState.
 */
export const LIVE_UX_LOCAL = {
  FULL: "FULL",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR",
  LOADING: "LOADING",
};

/** Confirmation personnelle après un vote réussi (pas le label d’état CLOSED). */
export const LIVE_UX_LABEL_VOTE_CONFIRMED =
  "Merci ! Ton vote est pris en compte";

/** WAITING avant la première question (démarrage live). */
export const LIVE_UX_LABEL_WAITING_START = "Ça va bientôt commencer";

/** WAITING entre deux questions (après Suivante → PRÉPARÉ). */
export const LIVE_UX_LABEL_WAITING_BETWEEN = "Prochaine question bientôt";

/** @type {Record<LiveUxState, string>} */
const LABELS = {
  WAITING: LIVE_UX_LABEL_WAITING_START,
  VOTING: "Choisis ta réponse",
  // CLOSED = vote clos pour tous (votants et non-votants) — pas une ack personnelle.
  CLOSED: "Vote fermé — les résultats arrivent bientôt",
  RESULTS: "Résultats",
  PAUSED: "Petite pause",
  FINISHED: "Merci d’avoir participé !",
};

/**
 * True si au moins une question a déjà été enchaînée (entre deux questions).
 * Sources : `pastPolls` API et/ou `pollsProgress.current > 1`.
 * @param {{
 *   pastPolls?: unknown;
 *   pastPollsCount?: number | null;
 *   pollsProgress?: { current?: number; total?: number } | null;
 *   pollsProgressCurrent?: number | null;
 * }} [input]
 */
export function isWaitingBetweenQuestions(input = {}) {
  const pastFromList = Array.isArray(input.pastPolls)
    ? input.pastPolls.length
    : NaN;
  const pastCount = Number.isFinite(pastFromList)
    ? pastFromList
    : Number(input.pastPollsCount);
  if (Number.isFinite(pastCount) && pastCount > 0) return true;

  const cur = Number(
    input.pollsProgress?.current ?? input.pollsProgressCurrent,
  );
  return Number.isFinite(cur) && cur > 1;
}

/**
 * Titre WAITING participant /join (et présentation associée).
 * @param {Parameters<typeof isWaitingBetweenQuestions>[0]} [input]
 */
export function getWaitingLiveLabel(input = {}) {
  return isWaitingBetweenQuestions(input)
    ? LIVE_UX_LABEL_WAITING_BETWEEN
    : LIVE_UX_LABEL_WAITING_START;
}

/**
 * Titre carte CLOSED participant : Merci seulement si la personne a voté.
 * @param {boolean} hasVoted
 */
export function getClosedParticipantTitle(hasVoted) {
  return hasVoted
    ? LIVE_UX_LABEL_VOTE_CONFIRMED
    : LABELS.CLOSED;
}

/** @type {Record<string, string>} */
const LOCAL_LABELS = {
  FULL: "La salle est complète.",
  OFFLINE: "Connexion interrompue.",
  ERROR: "Ce lien ne correspond à aucun événement.",
  LOADING: "Chargement…",
};

/**
 * Mapping UX global lisible côté interface.
 * @param {{
 *   liveState?: string | null;
 *   voteState?: string | null;
 *   displayState?: string | null;
 * }} input
 * @returns {{ step: "waiting" | "action" | "confirmation" | "result" | "pause" | "finished"; label: string }}
 */
export function getUxState({ liveState, voteState, displayState }) {
  const ls = String(liveState ?? "").toUpperCase();
  const vs = String(voteState ?? "").toUpperCase();
  const ds = String(displayState ?? "").toUpperCase();

  if (ls === "FINISHED") {
    return { step: "finished", label: LABELS.FINISHED };
  }
  if (ls === "PAUSED" || ds === "BLACK") {
    return { step: "pause", label: LABELS.PAUSED };
  }
  if (ls === "RESULTS" || ds === "RESULTS") {
    return { step: "result", label: LABELS.RESULTS };
  }
  if (ls === "CLOSED" || vs === "CLOSED") {
    return { step: "confirmation", label: LABELS.CLOSED };
  }
  if (ls === "VOTING" || vs === "OPEN" || ds === "QUESTION") {
    return { step: "action", label: LABELS.VOTING };
  }
  return { step: "waiting", label: LABELS.WAITING };
}

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
  return LABELS[k] ?? LOCAL_LABELS[k] ?? LABELS.WAITING;
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
 * Consommer cette fonction sur Join et /p — ne pas réinterpréter vote×display localement.
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

  /**
   * CLOSED UX : vote fermé, résultats salle pas encore révélés.
   * display QUESTION → toujours confirmation.
   * display WAITING → CLOSED si sondage clos / contexte poll actif ; sinon WAITING idle.
   */
  if (voteClosed && ds !== "results" && ls !== "results") {
    if (ds === "question") {
      return LIVE_UX_STATE.CLOSED;
    }
    if (
      pollClosed ||
      (ds === "waiting" && hasActive && (ps === "" || !pollActive))
    ) {
      return LIVE_UX_STATE.CLOSED;
    }
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

/** Sous-texte /p : attente sans sondage chargé. */
export const LIVE_UX_BODY_POLL_WAITING =
  "Garde cet écran ouvert — la question s’affichera toute seule.";

/** Sous-texte /p : aucun JSON poll (slug public, message d’info). */
export const LIVE_UX_BODY_POLL_NO_POLL_SLUG =
  "Aucun sondage à l’écran pour l’instant — la suite du live arrive ici.";

/** Sous-texte /screen : attente sans contenu poll après GET /p 404 (slug valide). */
export const LIVE_UX_DETAIL_SCREEN_WAITING_SLUG =
  "La prochaine question ou les résultats s’afficheront ici.";

/** Sous-texte projection résultats : vote encore ouvert côté événement. */
export const LIVE_UX_BODY_RESULTS_VOTES_OPEN =
  "Les votes continuent en direct.";

/** Sous-texte /join : événement terminé. */
export const LIVE_UX_BODY_FINISHED_MERCI = "Merci d’avoir participé !";

/** Sous-texte /join : attente générique (sous le titre WAITING). */
export const LIVE_UX_BODY_JOIN_WAITING =
  "Garde cet écran ouvert — la question s’affichera toute seule.";

/** Sous-texte /join : phase résultats côté hub. */
export const LIVE_UX_BODY_JOIN_AFTER_RESULTS =
  "Prépare-toi pour la suite du direct.";

/** Sous-texte /join : pause. */
export const LIVE_UX_BODY_JOIN_PAUSED = "On reprend dans un instant.";

/** Sous-texte confirmation CLOSED (Join / /p). */
export const LIVE_UX_BODY_CLOSED_WAIT_RESULTS =
  "Les résultats s’afficheront ici quand ce sera le moment.";

/**
 * Pilule /screen lorsque l’affichage = résultats (barres ou notation).
 * Tant que `eventVoteState` est ouvert, les totaux peuvent bouger (« en direct ») ;
 * une fois le vote fermé, le libellé ne doit plus suggérer un décompte en cours.
 * @param {boolean} voteOuvertResultats
 */
export function getScreenResultsPillLabel(voteOuvertResultats) {
  return voteOuvertResultats ? "Résultats en direct" : "Résultat final";
}

/**
 * @param {Parameters<typeof resolveLiveUxState>[0] & {
 *   autoReveal?: boolean;
 *   autoRevealShowResultsAt?: string | null;
 *   pastPolls?: unknown;
 *   pastPollsCount?: number | null;
 *   pollsProgress?: { current?: number; total?: number } | null;
 *   pollsProgressCurrent?: number | null;
 * }} ctx
 */
export function getLiveStatePresentation(ctx) {
  const ux = resolveLiveUxState(ctx);
  return {
    ux,
    title:
      ux === LIVE_UX_STATE.WAITING
        ? getWaitingLiveLabel(ctx)
        : getLiveStateLabel(ux),
    subtitle: getLiveStateSubtitle(ctx),
  };
}
