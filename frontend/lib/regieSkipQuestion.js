/**
 * Régie — « Passer cette question » (commande secondaire pilotage).
 */

import {
  isRegieContestPoll,
  isRegieLeadPoll,
} from "./regieDesktopLayout.js";

/**
 * @param {unknown} n
 * @returns {number}
 */
function asNonNegInt(n) {
  const v = Math.max(0, Math.trunc(Number(n) || 0));
  return Number.isFinite(v) ? v : 0;
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   eventFinished?: unknown;
 *   busy?: unknown;
 *   hasActivePoll?: unknown;
 *   hasNextPoll?: unknown;
 *   voteState?: unknown;
 *   pollType?: unknown;
 *   leadEnabled?: unknown;
 *   contestQuotaReached?: unknown;
 * }} [input]
 * @returns {{
 *   canSkip: boolean;
 *   isLastQuestion: boolean;
 *   needsConfirmOpenVote: boolean;
 *   needsConfirmAbandonDraw: boolean;
 *   blockedReason: string | null;
 *   buttonLabel: string;
 *   confirmMessage: string | null;
 *   finishConfirmMessage: string | null;
 * }}
 */
export function getRegieSkipQuestionState(input = {}) {
  const eventLocked = Boolean(input.isLocked);
  const eventFinished = Boolean(input.eventFinished);
  const busy = Boolean(input.busy);
  const hasActivePoll = Boolean(input.hasActivePoll);
  const hasNextPoll = Boolean(input.hasNextPoll);
  const voteOpen = String(input.voteState || "").toLowerCase().trim() === "open";
  const contest = isRegieContestPoll({
    type: input.pollType,
    leadEnabled: input.leadEnabled,
  });
  const contestQuotaReached = Boolean(input.contestQuotaReached);
  const needsConfirmOpenVote = voteOpen;
  const needsConfirmAbandonDraw =
    contest && !contestQuotaReached && hasActivePoll;

  /** @type {string | null} */
  let blockedReason = null;
  if (eventLocked) {
    blockedReason = "Événement verrouillé : impossible de passer une question.";
  } else if (eventFinished) {
    blockedReason = "Événement déjà terminé.";
  } else if (!hasActivePoll) {
    blockedReason = "Aucune question à l’antenne.";
  } else if (busy) {
    blockedReason = "Action en cours…";
  }

  const isLastQuestion = hasActivePoll && !hasNextPoll;
  const canSkip = !blockedReason;

  const parts = [];
  if (needsConfirmOpenVote) {
    parts.push(
      "Un vote est encore ouvert : il sera fermé sans effacer les votes déjà enregistrés.",
    );
  }
  if (needsConfirmAbandonDraw) {
    parts.push(
      "Le tirage au sort n’est pas terminé : aucun gagnant fictif ne sera créé.",
    );
  }

  /** @type {string | null} */
  let confirmMessage = null;
  /** @type {string | null} */
  let finishConfirmMessage = null;

  if (canSkip && isLastQuestion) {
    const base =
      "C’est la dernière question. Terminer l’événement maintenant ?";
    finishConfirmMessage =
      parts.length > 0 ? `${parts.join(" ")}\n\n${base}` : base;
  } else if (canSkip && hasNextPoll) {
    const base =
      "Passer cette question et préparer la suivante sans publier les résultats ?";
    confirmMessage =
      parts.length > 0 ? `${parts.join(" ")}\n\n${base}` : base;
  }

  return {
    canSkip,
    isLastQuestion,
    needsConfirmOpenVote,
    needsConfirmAbandonDraw,
    blockedReason,
    buttonLabel: "Passer cette question",
    confirmMessage,
    finishConfirmMessage,
  };
}

/**
 * Corps API pour POST /events/:id/skip-poll.
 * @param {ReturnType<typeof getRegieSkipQuestionState>} state
 */
export function buildSkipPollRequestBody(state) {
  return {
    confirmOpenVote: Boolean(state?.needsConfirmOpenVote),
    confirmAbandonDraw: Boolean(state?.needsConfirmAbandonDraw),
  };
}

/**
 * @param {{
 *   voteCount?: unknown;
 *   pollType?: unknown;
 *   leadEnabled?: unknown;
 * }} [poll]
 */
export function describeSkipPollParticipation(poll = {}) {
  const n = asNonNegInt(poll.voteCount);
  if (isRegieContestPoll(poll)) {
    return `${n} inscrit${n !== 1 ? "s" : ""}`;
  }
  if (isRegieLeadPoll(poll)) {
    return `${n} lead${n !== 1 ? "s" : ""}`;
  }
  return `${n} vote${n !== 1 ? "s" : ""}`;
}
