/**
 * LOT-3 — Architecture régie desktop (Questions | Pilotage | Partage).
 * Helpers purs : libellés métier + CTA primaire contextuel (V1.1 §2.6).
 * LOT-3 QA : numérotation playlist, sélection ≠ antenne, CTA post-Suivante.
 */

/**
 * @param {{ type?: string | null; leadEnabled?: boolean | null }} poll
 */
export function isRegieContestPoll(poll = {}) {
  return String(poll.type ?? "").toUpperCase() === "CONTEST_ENTRY";
}

/**
 * @param {{ type?: string | null; leadEnabled?: boolean | null }} poll
 */
export function isRegieLeadPoll(poll = {}) {
  return Boolean(poll.leadEnabled) && !isRegieContestPoll(poll);
}

/**
 * Type lisible (pas de jargon Prisma).
 * @param {{ type?: string | null; leadEnabled?: boolean | null }} poll
 */
export function getRegiePollTypeLabel(poll = {}) {
  const t = String(poll.type ?? "").toUpperCase();
  if (t === "CONTEST_ENTRY") return "Concours";
  if (poll.leadEnabled === true && t !== "CONTEST_ENTRY") return "Lead";
  if (t === "QUIZ") return "Quiz";
  if (t === "MULTIPLE_CHOICE") return "Multiple";
  if (t === "SINGLE_CHOICE") return "Sondage";
  return "Question";
}

/**
 * Tri playlist par `order` réel (réorganisation respectée).
 * Ne remonte jamais l’antenne en tête — la numérotation reste stable.
 * @param {Array<{ order?: number | null }> | null | undefined} polls
 */
export function sortPollsByPlaylistOrder(polls) {
  const list = Array.isArray(polls) ? [...polls] : [];
  return list.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Libellé « Question N/Total » (1-indexé).
 * @param {number} indexZeroBased
 * @param {number} total
 */
export function getRegieQuestionNumberLabel(indexZeroBased, total) {
  const t = Math.max(0, Number(total) || 0);
  const n = Math.max(1, (Number(indexZeroBased) || 0) + 1);
  if (t <= 0) return "Question —";
  return `Question ${Math.min(n, t)}/${t}`;
}

/**
 * Sélection playlist (consultation) ≠ question à l’antenne (pilotage live).
 * @param {string | null | undefined} selectedPollId
 * @param {string | null | undefined} activePollId
 */
export function isRegieConsultSelectionOnly(selectedPollId, activePollId) {
  const sel = String(selectedPollId || "").trim();
  const ant = String(activePollId || "").trim();
  if (!sel) return false;
  if (!ant) return true;
  return sel !== ant;
}

/**
 * Statut métier de la carte question (pas ACTIVE / CLOSED bruts).
 * @param {{
 *   pollStatus?: string | null;
 *   isActive?: boolean;
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 * }} input
 */
export function getRegiePollStatusLabel(input = {}) {
  const ps = String(input.pollStatus ?? "").toUpperCase();
  if (ps === "ARCHIVED") return "Terminée";
  if (ps === "DRAFT" || ps === "SCHEDULED") return "Prête";

  if (!input.isActive) {
    if (ps === "CLOSED") return "Fermée";
    return "Prête";
  }

  const vs = String(input.voteState ?? "").toLowerCase();
  const ds = String(input.displayState ?? "").toLowerCase();
  if (vs === "open") return "En cours";
  if (ds === "results") {
    if (
      isRegieContestPoll({
        type: input.pollType,
        leadEnabled: input.leadEnabled,
      })
    ) {
      return "Tirage";
    }
    if (
      isRegieLeadPoll({
        type: input.pollType,
        leadEnabled: input.leadEnabled,
      })
    ) {
      return "Fermée";
    }
    return "Résultats";
  }
  // Antenne préparée (Suivante / next-poll) : ACTIVE × vote fermé × waiting
  if (ps === "ACTIVE" && (vs === "closed" || vs === "") && ds !== "results") {
    return "En attente d'ouverture";
  }
  if (vs === "closed" || ps === "CLOSED") return "Fermée";
  return "Prête";
}

/**
 * CTA primaire unique du Pilotage (V1.1 §2.6 + correctifs QA LOT-3).
 *
 * Distingue WAITING préparée (poll ACTIVE après Suivante → Ouvrir)
 * de CLOSED après Fermer (poll CLOSED → Afficher / Tirage / Suivante).
 *
 * @param {{
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   pollStatus?: string | null;
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 *   contestQuotaReached?: boolean;
 *   eventFinished?: boolean;
 *   hasActivePoll?: boolean;
 *   hasNextPoll?: boolean;
 * }} input
 * @returns {"open"|"close"|"show-results"|"draw"|"next"|"finish"|null}
 */
export function getRegiePrimaryLiveAction(input = {}) {
  if (input.eventFinished === true) return null;
  if (input.hasActivePoll === false) return "finish";

  const vs = String(input.voteState ?? "").toLowerCase();
  const ds = String(input.displayState ?? "").toLowerCase();
  const ps = String(input.pollStatus ?? "").toUpperCase();
  const contest = isRegieContestPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });
  const lead = isRegieLeadPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });

  // VOTING
  if (vs === "open") return "close";

  // RESULTS
  if (ds === "results") {
    if (contest && input.contestQuotaReached !== true) return "draw";
    if (input.hasNextPoll === false) return "finish";
    return "next";
  }

  // CLOSED après Fermer (poll.status CLOSED) — parcours Afficher / Tirage / Suivante
  if (ps === "CLOSED") {
    if (contest) return "draw";
    if (lead) return "next";
    return "show-results";
  }

  // WAITING / question préparée (ACTIVE après Suivante ou premier passage)
  if (ps === "ACTIVE" || ps === "DRAFT" || ps === "SCHEDULED" || ps === "") {
    return "open";
  }

  // Fallback vote fermé sans statut clair
  if (vs === "closed" || vs === "") {
    if (contest) return "draw";
    if (lead) return "next";
    return "show-results";
  }
  return "open";
}

/**
 * Libellés FR des CTA Pilotage.
 * @param {ReturnType<typeof getRegiePrimaryLiveAction>} action
 */
export function getRegiePrimaryLiveActionLabel(action) {
  switch (action) {
    case "open":
      return "Ouvrir";
    case "close":
      return "Fermer";
    case "show-results":
      return "Afficher les résultats";
    case "draw":
      return "Tirer au sort";
    case "next":
      return "Suivante";
    case "finish":
      return "Terminer l’événement";
    default:
      return "";
  }
}

/**
 * Actions Live autorisées selon l’état métier (désactive les incompatibles).
 * « Suivante » reste une commande explicite de préparation (hors vote ouvert).
 * @param {{
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   pollStatus?: string | null;
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 *   eventFinished?: boolean;
 *   hasActivePoll?: boolean;
 * }} input
 * @returns {{
 *   open: boolean;
 *   close: boolean;
 *   showResults: boolean;
 *   next: boolean;
 *   finish: boolean;
 *   draw: boolean;
 * }}
 */
export function getRegieAllowedLiveActions(input = {}) {
  const finished = input.eventFinished === true;
  const hasActive = input.hasActivePoll !== false && !finished;
  const vs = String(input.voteState ?? "").toLowerCase();
  const ds = String(input.displayState ?? "").toLowerCase();
  const ps = String(input.pollStatus ?? "").toUpperCase();
  const contest = isRegieContestPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });
  const lead = isRegieLeadPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });
  const voteOpen = vs === "open";
  const showingResults = ds === "results";
  /** Après Fermer : poll CLOSED — Afficher est pertinent (sondage / quiz). */
  const closedAfterVote = hasActive && !voteOpen && !showingResults && ps === "CLOSED";

  return {
    open: hasActive && !voteOpen && !showingResults,
    close: hasActive && voteOpen,
    showResults:
      hasActive && !voteOpen && !showingResults && !lead && !contest && closedAfterVote,
    /** Commande explicite conservée ; désactivée pendant le vote ouvert. */
    next: !finished && !voteOpen,
    finish: !finished,
    draw: hasActive && contest && !voteOpen,
  };
}

/** Zones desktop LOT-3. */
export const REGIE_ZONE_QUESTIONS = "Questions";
export const REGIE_ZONE_PILOTAGE = "Pilotage du direct";
export const REGIE_ZONE_PARTAGE = "Partage & accès";
export const REGIE_ZONE_PROJECTION_AVANCEE = "Projection avancée";
