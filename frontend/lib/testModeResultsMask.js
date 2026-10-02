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
 * Préfixe UI `≈` : seulement si la valeur affichée peut être bucketisée (≥ bucket).
 * Sous le bucket le backend garde le brut → afficher le nombre exact sans ≈.
 * Ne modifie aucune règle de masquage backend.
 * @param {unknown} displayedCount
 * @param {number} [bucket]
 */
export function shouldShowTestModeApproxPrefix(
  displayedCount,
  bucket = TEST_MODE_VOTE_BUCKET,
) {
  const n = Math.max(0, Number(displayedCount) || 0);
  if (!Number.isFinite(n)) return false;
  const b = Math.max(1, Number(bucket) || TEST_MODE_VOTE_BUCKET);
  return n >= b;
}

/**
 * Libellé compteur MODE TEST (Salle / Screen / Overlay).
 * @param {unknown} displayedCount
 * @param {{ bucket?: number; withUnit?: boolean }} [opts]
 */
export function formatTestModeVoteCountLabel(displayedCount, opts = {}) {
  const n = Math.max(0, Math.floor(Number(displayedCount) || 0));
  const bucket = opts.bucket;
  const withUnit = opts.withUnit !== false;
  const approx = shouldShowTestModeApproxPrefix(n, bucket);
  const core = approx ? `≈ ${n}` : String(n);
  if (!withUnit) return core;
  // 0 vote / 1 vote / N votes (libellé UX TEST exact sous bucket)
  return `${core} vote${n > 1 ? "s" : ""}`;
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
