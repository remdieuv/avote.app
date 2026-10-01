/**
 * Masquage des totaux résultats en MODE TEST (aligné backend `pollToJson`).
 * Objectif : obscurcir la granularité sans jamais transformer 1 vote en 0.
 */

export const TEST_MODE_VOTE_BUCKET = 10;

/**
 * @param {unknown} raw
 * @param {number} [bucket]
 * @returns {number}
 */
export function maskTestModeOptionVoteCount(raw, bucket = TEST_MODE_VOTE_BUCKET) {
  const n = Math.max(0, Number(raw) || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const b = Math.max(1, Number(bucket) || TEST_MODE_VOTE_BUCKET);
  // Sous le bucket : garder le brut (1 vote ≠ 0 ; cohérent régie / Salle / screen).
  if (n < b) return Math.floor(n);
  return Math.round(n / b) * b;
}

/**
 * @param {Record<string, number>} voteCounts
 * @param {{
 *   isTestMode?: boolean;
 *   displayState?: string | null;
 *   bucket?: number;
 * }} [opts]
 * @returns {Record<string, number>}
 */
export function applyTestModeResultsVoteMask(voteCounts, opts = {}) {
  const isTestMode = opts.isTestMode === true;
  const ds = String(opts.displayState ?? "").toUpperCase();
  if (!isTestMode || ds !== "RESULTS") {
    return { ...voteCounts };
  }
  /** @type {Record<string, number>} */
  const out = {};
  for (const [k, v] of Object.entries(voteCounts || {})) {
    out[k] = maskTestModeOptionVoteCount(v, opts.bucket);
  }
  return out;
}
