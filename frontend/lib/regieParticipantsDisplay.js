/**
 * Libellés compteur participants régie — clarification MODE TEST vs capacité réelle.
 * Ne modifie aucune règle métier (capacité / packs / gratuit).
 */

import { FREE_PARTICIPANTS_LIMIT } from "./freeOffer.js";

/**
 * @param {{
 *   inTestMode?: boolean;
 *   participantsUsed?: number | null;
 *   participantsLimit?: number | null;
 *   isFreePlan?: boolean;
 * }} input
 * @returns {{
 *   label: string;
 *   hint: string | null;
 *   showCommercialLimit: boolean;
 * }}
 */
export function resolveRegieParticipantsCounterDisplay(input = {}) {
  const used = Math.max(0, Number(input.participantsUsed) || 0);
  const limitRaw = Number(input.participantsLimit);
  const hasLimit = Number.isFinite(limitRaw) && limitRaw >= 1;
  const limit = hasLimit ? Math.max(1, Math.floor(limitRaw)) : null;

  if (input.inTestMode) {
    return {
      label: `Participants (test) : ${used}`,
      hint: `Plafond technique MODE TEST (pas l’offre). Au démarrage réel : ${FREE_PARTICIPANTS_LIMIT} en gratuit, ou le pack choisi.`,
      showCommercialLimit: false,
      technicalLimit: limit,
    };
  }

  if (limit == null) {
    return {
      label: `Participants : ${used}`,
      hint: null,
      showCommercialLimit: false,
      technicalLimit: null,
    };
  }

  return {
    label: `Participants : ${used} / ${limit}`,
    hint: input.isFreePlan
      ? `Offre gratuite ${FREE_PARTICIPANTS_LIMIT} + recharges éventuelles.`
      : null,
    showCommercialLimit: true,
    technicalLimit: limit,
  };
}
