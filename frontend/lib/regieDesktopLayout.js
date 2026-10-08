/**
 * LOT-3 — Architecture régie desktop (Questions | Pilotage | Partage).
 * Helpers purs : libellés métier + CTA primaire contextuel (V1.1 §2.6).
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
  if (vs === "closed" || ps === "CLOSED") return "Fermée";
  return "Prête";
}

/**
 * CTA primaire unique du Pilotage (V1.1 §2.6).
 * @param {{
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 *   contestQuotaReached?: boolean;
 *   eventFinished?: boolean;
 *   hasActivePoll?: boolean;
 * }} input
 * @returns {"open"|"close"|"show-results"|"draw"|"next"|"finish"|null}
 */
export function getRegiePrimaryLiveAction(input = {}) {
  if (input.eventFinished === true) return null;
  if (input.hasActivePoll === false) return "finish";

  const vs = String(input.voteState ?? "").toLowerCase();
  const ds = String(input.displayState ?? "").toLowerCase();
  const contest = isRegieContestPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });
  const lead = isRegieLeadPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });

  if (vs === "open") return "close";
  if (ds === "results") {
    if (contest && input.contestQuotaReached !== true) return "draw";
    return "next";
  }
  // CLOSED / PRÉPARÉ (vote fermé, pas encore RESULTS)
  if (vs === "closed" || vs === "") {
    if (contest) return "draw";
    if (lead) return "next";
    // Sondage / Multiple / Quiz
    if (ds !== "results") return "show-results";
    return "next";
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

/** Zones desktop LOT-3. */
export const REGIE_ZONE_QUESTIONS = "Questions";
export const REGIE_ZONE_PILOTAGE = "Pilotage du direct";
export const REGIE_ZONE_PARTAGE = "Partage & accès";
export const REGIE_ZONE_PROJECTION_AVANCEE = "Projection avancée";
