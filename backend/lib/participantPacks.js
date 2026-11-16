/**
 * Packs participants AVOTE — achat initial et recharges (mêmes paliers).
 * Prix TTC affichés côté FE ; Price IDs Stripe via env.
 */

/** @typedef {50 | 100 | 250 | 500 | 1000} ParticipantPackSize */

/** @type {readonly ParticipantPackSize[]} */
const PARTICIPANT_PACK_SIZES = Object.freeze([50, 100, 250, 500, 1000]);

/** @type {Record<ParticipantPackSize, { eurosTtc: number; label: string; envPriceKey: string; planType: string }>} */
const PARTICIPANT_PACKS = Object.freeze({
  50: {
    eurosTtc: 4.99,
    label: "50 participants",
    envPriceKey: "STRIPE_PRICE_PACK_50",
    planType: "P50",
  },
  100: {
    eurosTtc: 9.99,
    label: "100 participants",
    envPriceKey: "STRIPE_PRICE_PACK_100",
    planType: "P100",
  },
  250: {
    eurosTtc: 19.99,
    label: "250 participants",
    envPriceKey: "STRIPE_PRICE_PACK_250",
    planType: "P250",
  },
  500: {
    eurosTtc: 34.99,
    label: "500 participants",
    envPriceKey: "STRIPE_PRICE_PACK_500",
    planType: "P500",
  },
  1000: {
    eurosTtc: 59.99,
    label: "1 000 participants",
    envPriceKey: "STRIPE_PRICE_PACK_1000",
    planType: "P1000",
  },
});

/**
 * @param {unknown} raw
 * @returns {ParticipantPackSize | null}
 */
function parseParticipantPackSize(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const trunc = Math.trunc(n);
  if (PARTICIPANT_PACK_SIZES.includes(/** @type {ParticipantPackSize} */ (trunc))) {
    return /** @type {ParticipantPackSize} */ (trunc);
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {ParticipantPackSize | null}
 */
function packSizeFromPlanType(raw) {
  const s = String(raw || "")
    .trim()
    .toUpperCase();
  if (s === "P50") return 50;
  if (s === "P100") return 100;
  if (s === "P250") return 250;
  if (s === "P500") return 500;
  if (s === "P1000") return 1000;
  // Ancien code FUN/EVENT (aucun achat réel) → mapper si reliquat local
  if (s === "FUN") return 100;
  if (s === "EVENT") return 500;
  return null;
}

/**
 * @param {ParticipantPackSize} size
 * @returns {string}
 */
function planTypeForPackSize(size) {
  const pack = PARTICIPANT_PACKS[size];
  return pack ? pack.planType : "P100";
}

/**
 * @param {ParticipantPackSize} size
 * @returns {string}
 */
function stripePriceIdForPack(size) {
  const pack = PARTICIPANT_PACKS[size];
  if (!pack) return "";
  return String(process.env[pack.envPriceKey] || "").trim();
}

/**
 * @returns {{ pack: ParticipantPackSize; label: string; eurosTtc: number; priceConfigured: boolean }[]}
 */
function listParticipantPacksPublic() {
  return PARTICIPANT_PACK_SIZES.map((pack) => {
    const meta = PARTICIPANT_PACKS[pack];
    return {
      pack,
      label: meta.label,
      eurosTtc: meta.eurosTtc,
      priceConfigured: Boolean(stripePriceIdForPack(pack)),
    };
  });
}

module.exports = {
  PARTICIPANT_PACK_SIZES,
  PARTICIPANT_PACKS,
  parseParticipantPackSize,
  packSizeFromPlanType,
  planTypeForPackSize,
  stripePriceIdForPack,
  listParticipantPacksPublic,
};
