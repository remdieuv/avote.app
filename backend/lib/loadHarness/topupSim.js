/**
 * Recharge simulée sans Stripe — réutilise la logique métier pure.
 */

const { planCapacityTopUp } = require("../capacityTopUp");

/**
 * @param {{
 *   participantsLimit?: unknown;
 *   liveState?: unknown;
 *   isLocked?: unknown;
 *   delta?: unknown;
 * }} input
 */
function simulateCapacityTopUp(input = {}) {
  const plan = planCapacityTopUp(input);
  if (!plan.ok) {
    return {
      ok: false,
      code: plan.code,
      error: plan.error,
      stripeUsed: false,
    };
  }
  return {
    ok: true,
    stripeUsed: false,
    previousLimit: Math.max(
      1,
      Math.trunc(Number(input.participantsLimit) || 0) || 1,
    ),
    nextLimit: plan.nextLimit,
    shouldUnlock: plan.shouldUnlock,
    delta: Math.trunc(Number(input.delta) || 0),
  };
}

module.exports = {
  simulateCapacityTopUp,
};
