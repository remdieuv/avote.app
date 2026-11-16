/**
 * Agrégation latences / erreurs pour le harness de charge.
 */

/**
 * @param {number[]} samplesMs
 * @param {number} percentile 0–100
 * @returns {number | null}
 */
function percentile(samplesMs, percentile) {
  const arr = (Array.isArray(samplesMs) ? samplesMs : [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const p = Math.min(100, Math.max(0, Number(percentile) || 0));
  if (p <= 0) return arr[0];
  if (p >= 100) return arr[arr.length - 1];
  const idx = (p / 100) * (arr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  const w = idx - lo;
  return arr[lo] * (1 - w) + arr[hi] * w;
}

/**
 * @param {number[]} samplesMs
 * @returns {{ count: number; p50: number | null; p95: number | null; p99: number | null; max: number | null }}
 */
function summarizeLatencies(samplesMs) {
  const arr = (Array.isArray(samplesMs) ? samplesMs : [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return {
    count: arr.length,
    p50: percentile(arr, 50),
    p95: percentile(arr, 95),
    p99: percentile(arr, 99),
    max: arr.length ? Math.max(...arr) : null,
  };
}

/**
 * @param {{
 *   httpAttempts?: number;
 *   httpErrors?: number;
 *   socketAttempts?: number;
 *   socketErrors?: number;
 *   voteOk?: number;
 *   voteLimitReached?: number;
 *   voteAlreadyVoted?: number;
 *   voteOtherReject?: number;
 *   latenciesMs?: number[];
 *   peakConnections?: number;
 *   pollUpdatedSeen?: number;
 * }} snap
 */
function buildReport(snap = {}) {
  const httpAttempts = Math.max(0, Math.trunc(Number(snap.httpAttempts) || 0));
  const httpErrors = Math.max(0, Math.trunc(Number(snap.httpErrors) || 0));
  const socketAttempts = Math.max(
    0,
    Math.trunc(Number(snap.socketAttempts) || 0),
  );
  const socketErrors = Math.max(0, Math.trunc(Number(snap.socketErrors) || 0));
  const lat = summarizeLatencies(snap.latenciesMs || []);
  const httpErrorRate =
    httpAttempts > 0 ? httpErrors / httpAttempts : socketAttempts > 0 ? 0 : 0;
  const socketErrorRate =
    socketAttempts > 0 ? socketErrors / socketAttempts : 0;
  const combinedAttempts = httpAttempts + socketAttempts;
  const combinedErrors = httpErrors + socketErrors;
  const combinedErrorRate =
    combinedAttempts > 0 ? combinedErrors / combinedAttempts : 0;

  return {
    httpAttempts,
    httpErrors,
    httpErrorRate,
    socketAttempts,
    socketErrors,
    socketErrorRate,
    combinedAttempts,
    combinedErrors,
    combinedErrorRate,
    voteOk: Math.max(0, Math.trunc(Number(snap.voteOk) || 0)),
    voteLimitReached: Math.max(
      0,
      Math.trunc(Number(snap.voteLimitReached) || 0),
    ),
    voteAlreadyVoted: Math.max(
      0,
      Math.trunc(Number(snap.voteAlreadyVoted) || 0),
    ),
    voteOtherReject: Math.max(
      0,
      Math.trunc(Number(snap.voteOtherReject) || 0),
    ),
    peakConnections: Math.max(
      0,
      Math.trunc(Number(snap.peakConnections) || 0),
    ),
    pollUpdatedSeen: Math.max(
      0,
      Math.trunc(Number(snap.pollUpdatedSeen) || 0),
    ),
    latency: lat,
  };
}

module.exports = {
  percentile,
  summarizeLatencies,
  buildReport,
};
