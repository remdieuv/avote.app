/**
 * Arrêt automatique du harness (seuils cahier des charges).
 */

const DEFAULT_MAX_ERROR_RATE = 0.01;
const DEFAULT_MAX_P95_MS = 2000;

/**
 * @param {{
 *   combinedErrorRate?: number | null;
 *   latency?: { p95?: number | null } | null;
 *   maxErrorRate?: number;
 *   maxP95Ms?: number;
 * }} input
 * @returns {{ stop: boolean; reasons: string[] }}
 */
function evaluateStopConditions(input = {}) {
  const maxErrorRate =
    typeof input.maxErrorRate === "number" && Number.isFinite(input.maxErrorRate)
      ? input.maxErrorRate
      : DEFAULT_MAX_ERROR_RATE;
  const maxP95Ms =
    typeof input.maxP95Ms === "number" && Number.isFinite(input.maxP95Ms)
      ? input.maxP95Ms
      : DEFAULT_MAX_P95_MS;

  /** @type {string[]} */
  const reasons = [];
  const errRate = Number(input.combinedErrorRate);
  if (Number.isFinite(errRate) && errRate > maxErrorRate) {
    reasons.push(
      `errorRate ${(errRate * 100).toFixed(2)}% > ${(maxErrorRate * 100).toFixed(0)}%`,
    );
  }
  const p95 = input.latency?.p95;
  if (typeof p95 === "number" && Number.isFinite(p95) && p95 > maxP95Ms) {
    reasons.push(`p95 ${Math.round(p95)}ms > ${maxP95Ms}ms`);
  }
  return { stop: reasons.length > 0, reasons };
}

module.exports = {
  DEFAULT_MAX_ERROR_RATE,
  DEFAULT_MAX_P95_MS,
  evaluateStopConditions,
};
