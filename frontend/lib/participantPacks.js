/**
 * Packs participants — miroir commercial (TTC) pour pricing / régie.
 * @typedef {50 | 100 | 250 | 500 | 1000} ParticipantPackSize
 */

/** @type {readonly ParticipantPackSize[]} */
export const PARTICIPANT_PACK_SIZES = Object.freeze([50, 100, 250, 500, 1000]);

/** @type {Record<ParticipantPackSize, { eurosTtc: number; label: string; priceLabel: string }>} */
export const PARTICIPANT_PACKS = Object.freeze({
  50: { eurosTtc: 4.99, label: "50 participants", priceLabel: "4,99 €" },
  100: { eurosTtc: 9.99, label: "100 participants", priceLabel: "9,99 €" },
  250: { eurosTtc: 19.99, label: "250 participants", priceLabel: "19,99 €" },
  500: { eurosTtc: 34.99, label: "500 participants", priceLabel: "34,99 €" },
  1000: {
    eurosTtc: 59.99,
    label: "1 000 participants",
    priceLabel: "59,99 €",
  },
});

/**
 * @param {unknown} raw
 * @returns {ParticipantPackSize | null}
 */
export function parseParticipantPackSize(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const trunc = Math.trunc(n);
  if (PARTICIPANT_PACK_SIZES.includes(/** @type {ParticipantPackSize} */ (trunc))) {
    return /** @type {ParticipantPackSize} */ (trunc);
  }
  return null;
}

/**
 * @param {unknown} planType
 * @returns {ParticipantPackSize | null}
 */
export function packSizeFromPlanType(planType) {
  const s = String(planType || "")
    .trim()
    .toUpperCase();
  if (s === "P50") return 50;
  if (s === "P100" || s === "FUN") return 100;
  if (s === "P250") return 250;
  if (s === "P500" || s === "EVENT") return 500;
  if (s === "P1000") return 1000;
  return null;
}
