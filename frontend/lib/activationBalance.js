/**
 * Solde affichable : activations par pack + reliquat eventCredits.
 * @param {number | null | undefined} eventCredits
 * @param {Record<string, number> | { FUN?: number; EVENT?: number } | null | undefined} activationsAvailable
 */

import { PARTICIPANT_PACK_SIZES } from "./participantPacks.js";

export function computeActivationBalance(eventCredits, activationsAvailable) {
  const credits =
    typeof eventCredits === "number" && Number.isFinite(eventCredits)
      ? Math.max(0, Math.trunc(eventCredits))
      : null;

  const avail =
    activationsAvailable && typeof activationsAvailable === "object"
      ? activationsAvailable
      : null;

  /** @type {Record<string, number>} */
  const byPack = {};
  let typedLoaded = false;
  let typedTotal = 0;

  if (avail) {
    typedLoaded = true;
    for (const size of PARTICIPANT_PACK_SIZES) {
      const key = String(size);
      const raw = Number(avail[key]);
      const n = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
      byPack[key] = n;
      typedTotal += n;
    }
    // Compat réponses legacy FUN/EVENT (avant packs).
    if (typedTotal === 0) {
      const fun = Number.isFinite(Number(avail.FUN))
        ? Math.max(0, Math.trunc(Number(avail.FUN)))
        : 0;
      const event = Number.isFinite(Number(avail.EVENT))
        ? Math.max(0, Math.trunc(Number(avail.EVENT)))
        : 0;
      if (fun || event) {
        byPack["100"] = (byPack["100"] || 0) + fun;
        byPack["500"] = (byPack["500"] || 0) + event;
        typedTotal = fun + event;
      }
    }
  }

  const legacyCredits =
    credits !== null && typedLoaded ? Math.max(0, credits - typedTotal) : 0;
  const totalAvailable =
    credits !== null
      ? typedLoaded
        ? typedTotal + legacyCredits
        : credits
      : typedLoaded
        ? typedTotal
        : null;

  return {
    byPack,
    fun: byPack["100"] ?? null,
    event: byPack["500"] ?? null,
    typedTotal,
    legacyCredits,
    totalAvailable,
    typedLoaded,
    credits,
  };
}

/** @param {number} count */
export function formatDisponibles(count) {
  const n = Math.max(0, Math.trunc(count));
  return n === 1 ? "1 disponible" : `${n} disponibles`;
}
