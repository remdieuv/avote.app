/**
 * Paliers et plans de scénarios (sans I/O réseau).
 */

/** @type {readonly number[]} */
const LOAD_TIERS = Object.freeze([10, 100, 250, 500, 1000]);

/** Plafond IP vote prod = 400/s — on pace en dessous, sans contourner. */
const DEFAULT_MAX_VOTES_PER_SEC = 350;

/** Durée max par palier (ms). */
const DEFAULT_TIER_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseTier(raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return null;
  if (!LOAD_TIERS.includes(n)) return null;
  return n;
}

/**
 * @param {{
 *   tier: number;
 *   participantsLimit?: number | null;
 *   maxVotesPerSec?: number;
 *   tierTimeoutMs?: number;
 *   sharedIp?: boolean;
 *   includeSaturationProbe?: boolean;
 *   includeSimulatedTopUp?: boolean;
 * }} opts
 */
function buildTierPlan(opts) {
  const tier = parseTier(opts.tier);
  if (!tier) {
    return {
      ok: false,
      code: "INVALID_TIER",
      error: `Palier invalide. Autorisés : ${LOAD_TIERS.join(", ")}.`,
    };
  }
  const maxVotesPerSec = Math.max(
    1,
    Math.trunc(Number(opts.maxVotesPerSec) || DEFAULT_MAX_VOTES_PER_SEC),
  );
  const tierTimeoutMs = Math.max(
    10_000,
    Math.trunc(Number(opts.tierTimeoutMs) || DEFAULT_TIER_TIMEOUT_MS),
  );
  const limitRaw = opts.participantsLimit;
  const participantsLimit =
    limitRaw == null || limitRaw === ""
      ? null
      : Math.max(1, Math.trunc(Number(limitRaw) || 0));

  const voteSpreadMs = Math.ceil((tier / maxVotesPerSec) * 1000);
  const sharedIp = opts.sharedIp !== false;

  /** @type {object[]} */
  const phases = [
    {
      id: "connect_and_vote",
      participants: tier,
      sharedIp,
      maxVotesPerSec,
      estimatedVoteSpreadMs: voteSpreadMs,
      note: sharedIp
        ? "Tous les clients partagent l’IP du runner (Wi‑Fi simulé) ; pacing ≤ plafond IP 400/s."
        : "sharedIp désactivé (atypique).",
    },
  ];

  if (opts.includeSaturationProbe !== false && participantsLimit != null) {
    const overflow = Math.min(10, Math.max(1, Math.ceil(tier * 0.05)));
    phases.push({
      id: "saturation_probe",
      extraParticipants: overflow,
      expectLimitReached: true,
      when: `si participantsUsed >= ${participantsLimit}`,
      note: "Nouveaux voterSessionId refusés (LIMIT_REACHED) ; pas de isLocked attendu.",
    });
  }

  if (opts.includeSimulatedTopUp !== false) {
    phases.push({
      id: "topup_simulated",
      delta: 50,
      note:
        "Simulation pure via planCapacityTopUp (pas de Stripe). Pour un top-up live staging : relever participantsLimit puis relancer un palier.",
    });
  }

  return {
    ok: true,
    tier,
    participantsLimit,
    maxVotesPerSec,
    tierTimeoutMs,
    sharedIp,
    phases,
  };
}

/**
 * Cohérence attendue après N votes uniques réussis.
 * @param {{ voteOk: number; expectedParticipants?: number; limitReached?: number }} input
 */
function evaluateVoteCoherence(input = {}) {
  const voteOk = Math.max(0, Math.trunc(Number(input.voteOk) || 0));
  const expected =
    input.expectedParticipants == null
      ? voteOk
      : Math.max(0, Math.trunc(Number(input.expectedParticipants) || 0));
  const limitReached = Math.max(
    0,
    Math.trunc(Number(input.limitReached) || 0),
  );
  const ok = voteOk === expected;
  return {
    ok,
    voteOk,
    expectedParticipants: expected,
    limitReached,
    message: ok
      ? `Cohérence OK : ${voteOk} votes réussis.`
      : `Incohérence : voteOk=${voteOk} vs attendu=${expected}.`,
  };
}

module.exports = {
  LOAD_TIERS,
  DEFAULT_MAX_VOTES_PER_SEC,
  DEFAULT_TIER_TIMEOUT_MS,
  parseTier,
  buildTierPlan,
  evaluateVoteCoherence,
};
