/**
 * LOT-2 — Remplacement d’un gagnant concours (helpers purs + file d’attente).
 * Pas de second moteur Live : le serveur applique le plan puis émet poll_updated.
 */

const STATUS_ACTIVE = "ACTIVE";
const STATUS_REPLACED = "REPLACED";

/**
 * @param {unknown} raw
 * @returns {"ACTIVE" | "REPLACED"}
 */
function normalizeContestWinnerStatus(raw) {
  const s = String(raw ?? STATUS_ACTIVE).toUpperCase();
  return s === STATUS_REPLACED ? STATUS_REPLACED : STATUS_ACTIVE;
}

/**
 * @param {Array<{ status?: string | null }>} winners
 */
function filterActiveContestWinners(winners) {
  const list = Array.isArray(winners) ? winners : [];
  return list.filter(
    (w) => normalizeContestWinnerStatus(w?.status) === STATUS_ACTIVE,
  );
}

/**
 * File d’attente exclusive par pollId (anti double-clic / requêtes simultanées).
 * @returns {(pollId: string, fn: () => Promise<any>) => Promise<any>}
 */
function createPollExclusiveQueue() {
  /** @type {Map<string, Promise<unknown>>} */
  const tails = new Map();

  return async function runExclusive(pollId, fn) {
    const key = String(pollId || "").trim() || "__unknown__";
    const prev = tails.get(key) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => gate);
    tails.set(key, chained);
    await prev.catch(() => {});
    try {
      return await fn();
    } finally {
      release();
      if (tails.get(key) === chained) tails.delete(key);
    }
  };
}

/**
 * Plan de remplacement (purement décisionnel).
 * @param {{
 *   target?: { id?: string; status?: string | null; position?: number | null } | null;
 *   eligiblePool?: Array<Record<string, unknown>>;
 *   randomInt?: (min: number, maxExclusive: number) => number;
 * }} input
 * @returns {{
 *   ok: true;
 *   picked: Record<string, unknown>;
 *   position: number;
 * } | {
 *   ok: false;
 *   code: "MISSING_TARGET" | "NOT_ACTIVE" | "NO_REPLACEMENT";
 *   error: string;
 * }}
 */
function resolveReplaceContestWinnerPlan(input = {}) {
  const target = input.target;
  if (!target || !target.id) {
    return {
      ok: false,
      code: "MISSING_TARGET",
      error: "Gagnant à remplacer introuvable.",
    };
  }
  if (normalizeContestWinnerStatus(target.status) !== STATUS_ACTIVE) {
    return {
      ok: false,
      code: "NOT_ACTIVE",
      error: "Ce gagnant a déjà été remplacé.",
    };
  }
  const pool = Array.isArray(input.eligiblePool) ? [...input.eligiblePool] : [];
  if (pool.length < 1) {
    return {
      ok: false,
      code: "NO_REPLACEMENT",
      error:
        "Aucun remplaçant disponible : tous les participants éligibles ont déjà gagné lors de ce concours.",
    };
  }
  const randomInt =
    typeof input.randomInt === "function"
      ? input.randomInt
      : (min, maxExclusive) => {
          const span = Math.max(0, maxExclusive - min);
          return min + Math.floor(Math.random() * span);
        };
  const idx = randomInt(0, pool.length);
  const picked = pool[Math.max(0, Math.min(pool.length - 1, idx))];
  const position = Math.max(1, Number(target.position) || 1);
  return { ok: true, picked, position };
}

/**
 * Après remplacement : le nombre d’actifs doit rester ≤ quota.
 * @param {{ activeBefore?: number; quota?: number }} input
 */
function activeWinnersStayWithinQuotaAfterReplace(input = {}) {
  const activeBefore = Math.max(0, Number(input.activeBefore) || 0);
  const quota = Math.max(1, Number(input.quota) || 1);
  // Remplacement : -1 actif +1 actif → inchangé.
  return activeBefore <= quota;
}

module.exports = {
  STATUS_ACTIVE,
  STATUS_REPLACED,
  normalizeContestWinnerStatus,
  filterActiveContestWinners,
  createPollExclusiveQueue,
  resolveReplaceContestWinnerPlan,
  activeWinnersStayWithinQuotaAfterReplace,
};
