/**
 * « Passer cette question » — guards + résolution next/finish.
 * Réutilise le même passage d’antenne que next-poll (sans publier les résultats,
 * sans effacer les votes, sans créer de gagnant).
 */

/**
 * @param {unknown} n
 * @returns {number}
 */
function asNonNegInt(n) {
  const v = Math.max(0, Math.trunc(Number(n) || 0));
  return Number.isFinite(v) ? v : 0;
}

/**
 * @param {{ type?: unknown; leadEnabled?: unknown }} [poll]
 */
function isContestPoll(poll = {}) {
  return String(poll.type || "").toUpperCase() === "CONTEST_ENTRY";
}

/**
 * Playlist jouable (hors ARCHIVED), triée par order.
 * @param {Array<{ id?: string; order?: number|null; status?: string|null }>|null|undefined} polls
 */
function listPlayablePolls(polls) {
  const list = Array.isArray(polls) ? [...polls] : [];
  return list
    .filter((p) => String(p?.status || "").toUpperCase() !== "ARCHIVED")
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * @param {Array<{ id?: string; order?: number|null; status?: string|null }>|null|undefined} polls
 * @param {string | null | undefined} activePollId
 * @returns {{
 *   playable: Array<{ id?: string; order?: number|null; status?: string|null }>;
 *   currentIndex: number;
 *   nextPoll: { id?: string } | null;
 *   hasNext: boolean;
 *   isLast: boolean;
 *   hasActive: boolean;
 * }}
 */
function resolveSkipPollPlaylist(polls, activePollId) {
  const playable = listPlayablePolls(polls);
  const active = String(activePollId || "").trim();
  const currentIndex = active
    ? playable.findIndex((p) => String(p.id) === active)
    : -1;
  const hasActive = currentIndex >= 0;
  const nextPoll =
    hasActive && currentIndex < playable.length - 1
      ? playable[currentIndex + 1]
      : null;
  const hasNext = Boolean(nextPoll);
  const isLast = hasActive && !hasNext;
  return { playable, currentIndex, nextPoll, hasNext, isLast, hasActive };
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   eventFinished?: unknown;
 *   hasActivePoll?: unknown;
 *   hasNextPoll?: unknown;
 *   voteState?: unknown;
 *   confirmOpenVote?: unknown;
 *   isContest?: unknown;
 *   contestQuotaReached?: unknown;
 *   confirmAbandonDraw?: unknown;
 * }} [input]
 * @returns {{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   code: string | null;
 *   requiresFinish: boolean;
 *   needsConfirmOpenVote: boolean;
 *   needsConfirmAbandonDraw: boolean;
 * }}
 */
function evaluateSkipPollGuards(input = {}) {
  const isLocked = Boolean(input.isLocked);
  const eventFinished = Boolean(input.eventFinished);
  const hasActivePoll = Boolean(input.hasActivePoll);
  const hasNextPoll = Boolean(input.hasNextPoll);
  const voteOpen = String(input.voteState || "").toLowerCase().trim() === "open";
  const confirmOpenVote = input.confirmOpenVote === true;
  const isContest = Boolean(input.isContest);
  const contestQuotaReached = Boolean(input.contestQuotaReached);
  const confirmAbandonDraw = input.confirmAbandonDraw === true;

  const needsConfirmOpenVote = voteOpen;
  const needsConfirmAbandonDraw =
    isContest && !contestQuotaReached && hasActivePoll;

  if (isLocked) {
    return {
      ok: false,
      status: 403,
      error: "Cet événement est terminé et ne peut plus être modifié.",
      code: "EVENT_LOCKED",
      requiresFinish: false,
      needsConfirmOpenVote,
      needsConfirmAbandonDraw,
    };
  }

  if (eventFinished) {
    return {
      ok: false,
      status: 409,
      error: "L’événement est déjà terminé.",
      code: "EVENT_FINISHED",
      requiresFinish: false,
      needsConfirmOpenVote,
      needsConfirmAbandonDraw,
    };
  }

  if (!hasActivePoll) {
    return {
      ok: false,
      status: 409,
      error: "Aucune question à l’antenne à passer.",
      code: "NO_ACTIVE_POLL",
      requiresFinish: false,
      needsConfirmOpenVote,
      needsConfirmAbandonDraw,
    };
  }

  if (!hasNextPoll) {
    return {
      ok: false,
      status: 409,
      error:
        "Dernière question : proposez de terminer l’événement plutôt que de passer.",
      code: "LAST_QUESTION",
      requiresFinish: true,
      needsConfirmOpenVote,
      needsConfirmAbandonDraw,
    };
  }

  if (needsConfirmOpenVote && !confirmOpenVote) {
    return {
      ok: false,
      status: 409,
      error:
        "Un vote est encore ouvert. Confirmez la fermeture (confirmOpenVote) pour passer.",
      code: "CONFIRM_OPEN_VOTE",
      requiresFinish: false,
      needsConfirmOpenVote: true,
      needsConfirmAbandonDraw,
    };
  }

  if (needsConfirmAbandonDraw && !confirmAbandonDraw) {
    return {
      ok: false,
      status: 409,
      error:
        "Tirage au sort non terminé. Confirmez l’abandon (confirmAbandonDraw) pour passer.",
      code: "CONFIRM_ABANDON_DRAW",
      requiresFinish: false,
      needsConfirmOpenVote,
      needsConfirmAbandonDraw: true,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    code: null,
    requiresFinish: false,
    needsConfirmOpenVote,
    needsConfirmAbandonDraw,
  };
}

/**
 * Indique si le quota tirage est atteint (sans inventer de gagnant).
 * @param {{
 *   contestWinnerCount?: unknown;
 *   totalWinners?: unknown;
 * }} [input]
 */
function isContestQuotaReached(input = {}) {
  const quota = Math.max(1, asNonNegInt(input.contestWinnerCount) || 1);
  const total = asNonNegInt(input.totalWinners);
  return total >= quota;
}

module.exports = {
  asNonNegInt,
  isContestPoll,
  listPlayablePolls,
  resolveSkipPollPlaylist,
  evaluateSkipPollGuards,
  isContestQuotaReached,
};
