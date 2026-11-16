/**
 * Application d’une recharge de capacité (purs + contrat TX).
 */

/**
 * @param {{
 *   participantsLimit?: unknown;
 *   isLocked?: unknown;
 *   liveState?: unknown;
 *   delta?: unknown;
 * }} input
 * @returns {{
 *   ok: boolean;
 *   error?: string;
 *   code?: string;
 *   nextLimit?: number;
 *   shouldUnlock?: boolean;
 * }}
 */
function planCapacityTopUp(input = {}) {
  const delta = Math.trunc(Number(input.delta) || 0);
  if (!Number.isFinite(delta) || delta <= 0) {
    return { ok: false, code: "INVALID_DELTA", error: "Delta de capacité invalide." };
  }
  const liveState = String(input.liveState || "").toUpperCase();
  if (liveState === "FINISHED") {
    return {
      ok: false,
      code: "EVENT_FINISHED",
      error: "Événement terminé : recharge impossible.",
    };
  }
  const current = Math.max(1, Math.trunc(Number(input.participantsLimit) || 0) || 1);
  const nextLimit = current + delta;
  const isLocked = Boolean(input.isLocked);
  // Unlock seulement si lock héritage saturation (pas une fin volontaire).
  const shouldUnlock = isLocked && liveState !== "FINISHED";
  return { ok: true, nextLimit, shouldUnlock };
}

module.exports = {
  planCapacityTopUp,
};
