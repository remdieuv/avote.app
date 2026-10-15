/**
 * Guards purs — réordonnancement / suppression playlist régie.
 * TEST = isLiveConsumed === false ; RÉEL = true ; verrouillé = isLocked.
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
 * Historique de diffusion (mode RÉEL) : question déjà ouverte / fermée / révélée
 * ou ayant des données (votes, leads, tirages). Les DRAFT / SCHEDULED vierges
 * restent suppressibles.
 * @param {{
 *   status?: unknown;
 *   voteCount?: unknown;
 *   leadsCount?: unknown;
 *   contestDrawsCount?: unknown;
 *   contestWinnersCount?: unknown;
 *   quizRevealed?: unknown;
 * }} [input]
 */
function pollHasDiffusionHistory(input = {}) {
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
 * @param {{ isLocked?: unknown }} [input]
 * @returns {{ ok: boolean; status: number; error: string | null }}
 */
function evaluatePlaylistReorderGuards(input = {}) {
  if (Boolean(input.isLocked)) {
    return {
      ok: false,
      status: 403,
      error: "Cet événement est terminé et ne peut plus être modifié.",
    };
  }
  return { ok: true, status: 200, error: null };
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   isLiveConsumed?: unknown;
 *   isActivePoll?: unknown;
 *   voteCount?: unknown;
 *   status?: unknown;
 *   leadsCount?: unknown;
 *   contestDrawsCount?: unknown;
 *   contestWinnersCount?: unknown;
 *   quizRevealed?: unknown;
 *   confirmWipeTestData?: unknown;
 * }} [input]
 * @returns {{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   requiresWipeConfirm: boolean;
 *   isTestMode: boolean;
 *   hasVotes: boolean;
 *   hasDiffusionHistory: boolean;
 * }}
 */
function evaluatePlaylistDeleteGuards(input = {}) {
  const isLocked = Boolean(input.isLocked);
  const isLiveConsumed = input.isLiveConsumed === true;
  const isTestMode = input.isLiveConsumed === false;
  const isActivePoll = Boolean(input.isActivePoll);
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
  const confirmWipeTestData = input.confirmWipeTestData === true;

  if (isLocked) {
    return {
      ok: false,
      status: 403,
      error: "Cet événement est terminé et ne peut plus être modifié.",
      requiresWipeConfirm: false,
      isTestMode,
      hasVotes,
      hasDiffusionHistory,
    };
  }

  if (isActivePoll) {
    return {
      ok: false,
      status: 409,
      error:
        "Impossible de supprimer la question actuellement à l’antenne. Passez d’abord à une autre question.",
      requiresWipeConfirm: false,
      isTestMode,
      hasVotes,
      hasDiffusionHistory,
    };
  }

  if (isTestMode && hasVotes && !confirmWipeTestData) {
    return {
      ok: false,
      status: 409,
      error:
        "Des votes existent en mode test. Confirmez la remise à zéro explicite (confirmWipeTestData) avant suppression.",
      requiresWipeConfirm: true,
      isTestMode,
      hasVotes,
      hasDiffusionHistory,
    };
  }

  if (!isTestMode && isLiveConsumed) {
    if (hasVotes) {
      return {
        ok: false,
        status: 409,
        error:
          "En mode réel, une question ayant reçu des votes ne peut pas être supprimée.",
        requiresWipeConfirm: false,
        isTestMode,
        hasVotes,
        hasDiffusionHistory,
      };
    }
    if (hasDiffusionHistory) {
      return {
        ok: false,
        status: 409,
        error:
          "En mode réel, une question déjà diffusée (ouverte, fermée ou révélée) ne peut pas être supprimée.",
        requiresWipeConfirm: false,
        isTestMode,
        hasVotes,
        hasDiffusionHistory,
      };
    }
  }

  return {
    ok: true,
    status: 200,
    error: null,
    requiresWipeConfirm: false,
    isTestMode,
    hasVotes,
    hasDiffusionHistory,
  };
}

/**
 * Calcule la nouvelle liste d’ids après ↑ / ↓ (sans muter l’entrée).
 * @param {string[]} orderedIds
 * @param {string} pollId
 * @param {"up"|"down"} direction
 * @returns {{ ok: boolean; error: string | null; pollIds: string[] }}
 */
function computeReorderByDirection(orderedIds, pollId, direction) {
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const id = String(pollId || "").trim();
  const dir = String(direction || "").toLowerCase().trim();
  if (!id) {
    return { ok: false, error: "pollId requis.", pollIds: ids };
  }
  if (dir !== "up" && dir !== "down") {
    return { ok: false, error: 'direction doit être "up" ou "down".', pollIds: ids };
  }
  const i = ids.indexOf(id);
  if (i < 0) {
    return { ok: false, error: "Question introuvable dans la playlist.", pollIds: ids };
  }
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) {
    return { ok: true, error: null, pollIds: ids };
  }
  const next = [...ids];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return { ok: true, error: null, pollIds: next };
}

/**
 * Valide une liste complète d’ids (permutation exacte, sans doublon).
 * @param {string[]} currentIds
 * @param {unknown} proposedRaw
 * @returns {{ ok: boolean; error: string | null; pollIds: string[] }}
 */
function validateFullPollOrder(currentIds, proposedRaw) {
  const current = Array.isArray(currentIds)
    ? currentIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (!Array.isArray(proposedRaw)) {
    return {
      ok: false,
      error: "pollIds doit être un tableau d’identifiants.",
      pollIds: current,
    };
  }
  const proposed = proposedRaw
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  if (proposed.length !== current.length) {
    return {
      ok: false,
      error: "La playlist doit contenir exactement les mêmes questions.",
      pollIds: current,
    };
  }
  const seen = new Set();
  for (const id of proposed) {
    if (seen.has(id)) {
      return {
        ok: false,
        error: "Doublons interdits dans l’ordre des questions.",
        pollIds: current,
      };
    }
    seen.add(id);
  }
  const currentSet = new Set(current);
  for (const id of proposed) {
    if (!currentSet.has(id)) {
      return {
        ok: false,
        error: "Identifiant de question inconnu pour cet événement.",
        pollIds: current,
      };
    }
  }
  return { ok: true, error: null, pollIds: proposed };
}

/**
 * Assigne des `order` contigus 0..n-1.
 * @param {string[]} pollIdsOrdered
 * @returns {{ id: string; order: number }[]}
 */
function buildContiguousOrderUpdates(pollIdsOrdered) {
  const ids = Array.isArray(pollIdsOrdered) ? pollIdsOrdered : [];
  return ids.map((id, order) => ({ id: String(id), order }));
}

module.exports = {
  asNonNegInt,
  pollHasDiffusionHistory,
  evaluatePlaylistReorderGuards,
  evaluatePlaylistDeleteGuards,
  computeReorderByDirection,
  validateFullPollOrder,
  buildContiguousOrderUpdates,
};
