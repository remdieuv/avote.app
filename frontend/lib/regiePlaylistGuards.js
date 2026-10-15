/**
 * Régie — guards UI playlist (↑↓ / supprimer), miroir backend.
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
 * @param {{
 *   status?: unknown;
 *   voteCount?: unknown;
 *   leadsCount?: unknown;
 *   contestDrawsCount?: unknown;
 *   contestWinnersCount?: unknown;
 *   quizRevealed?: unknown;
 * }} [input]
 */
export function pollHasDiffusionHistory(input = {}) {
  const status = String(input.status || "").toUpperCase();
  if (status === "ACTIVE" || status === "CLOSED" || status === "ARCHIVED") {
    return true;
  }
  if (Boolean(input.quizRevealed)) return true;
  if (asNonNegInt(input.voteCount) > 0) return true;
  if (asNonNegInt(input.leadsCount) > 0) return true;
  if (asNonNegInt(input.contestDrawsCount) > 0) return true;
  if (asNonNegInt(input.contestWinnersCount) > 0) return true;
  return false;
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   isLiveConsumed?: unknown;
 *   isActivePoll?: unknown;
 *   indexZeroBased?: unknown;
 *   totalPolls?: unknown;
 *   voteCount?: unknown;
 *   status?: unknown;
 *   leadsCount?: unknown;
 *   contestDrawsCount?: unknown;
 *   contestWinnersCount?: unknown;
 *   quizRevealed?: unknown;
 * }} [input]
 * @returns {{
 *   eventLocked: boolean;
 *   inTestMode: boolean;
 *   inRealMode: boolean;
 *   isActivePoll: boolean;
 *   canReorderPlaylist: boolean;
 *   canMoveUp: boolean;
 *   canMoveDown: boolean;
 *   canDelete: boolean;
 *   requiresWipeConfirm: boolean;
 *   deleteBlockedReason: string | null;
 *   reorderBlockedReason: string | null;
 *   deleteConfirmMessage: string | null;
 * }}
 */
export function getRegiePlaylistActionState(input = {}) {
  const eventLocked = Boolean(input.isLocked);
  const inTestMode = input.isLiveConsumed === false;
  const inRealMode = input.isLiveConsumed === true;
  const isActivePoll = Boolean(input.isActivePoll);
  const index = Math.max(0, Math.trunc(Number(input.indexZeroBased) || 0));
  const total = Math.max(0, Math.trunc(Number(input.totalPolls) || 0));
  const voteCount = asNonNegInt(input.voteCount);
  const hasVotes = voteCount > 0;
  const hasDiffusionHistory = pollHasDiffusionHistory({
    status: input.status,
    voteCount,
    leadsCount: input.leadsCount,
    contestDrawsCount: input.contestDrawsCount,
    contestWinnersCount: input.contestWinnersCount,
    quizRevealed: input.quizRevealed,
  });

  const reorderBlockedReason = eventLocked
    ? "Événement verrouillé : la playlist ne peut plus être modifiée."
    : null;
  const canReorderPlaylist = !eventLocked;
  const canMoveUp = canReorderPlaylist && total > 1 && index > 0;
  const canMoveDown = canReorderPlaylist && total > 1 && index < total - 1;

  /** @type {string | null} */
  let deleteBlockedReason = null;
  let canDelete = true;
  let requiresWipeConfirm = false;

  if (eventLocked) {
    canDelete = false;
    deleteBlockedReason =
      "Événement verrouillé : aucune suppression n’est possible.";
  } else if (isActivePoll) {
    canDelete = false;
    deleteBlockedReason =
      "Impossible de supprimer la question à l’antenne. Passez d’abord à une autre question.";
  } else if (inTestMode && hasVotes) {
    canDelete = true;
    requiresWipeConfirm = true;
  } else if (inRealMode && hasVotes) {
    canDelete = false;
    deleteBlockedReason =
      "Mode réel : une question ayant reçu des votes ne peut pas être supprimée.";
  } else if (inRealMode && hasDiffusionHistory) {
    canDelete = false;
    deleteBlockedReason =
      "Mode réel : une question déjà diffusée ne peut pas être supprimée.";
  }

  /** @type {string | null} */
  let deleteConfirmMessage = null;
  if (canDelete) {
    if (requiresWipeConfirm) {
      deleteConfirmMessage = `Cette question a ${voteCount} vote${
        voteCount !== 1 ? "s" : ""
      } en mode test. Confirmer la remise à zéro et la suppression ? Les votes seront définitivement effacés.`;
    } else {
      deleteConfirmMessage =
        "Supprimer cette question de la playlist ? Cette action est irréversible.";
    }
  }

  return {
    eventLocked,
    inTestMode,
    inRealMode,
    isActivePoll,
    canReorderPlaylist,
    canMoveUp,
    canMoveDown,
    canDelete,
    requiresWipeConfirm,
    deleteBlockedReason,
    reorderBlockedReason,
    deleteConfirmMessage,
  };
}

/**
 * Calcule l’ordre local après ↑/↓ (pour tests / preview).
 * @param {Array<{ id?: string }>} pollsOrdered
 * @param {string} pollId
 * @param {"up"|"down"} direction
 */
export function previewPlaylistReorder(pollsOrdered, pollId, direction) {
  const list = Array.isArray(pollsOrdered) ? [...pollsOrdered] : [];
  const ids = list.map((p) => String(p?.id || ""));
  const i = ids.indexOf(String(pollId || ""));
  if (i < 0) return list;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
}
