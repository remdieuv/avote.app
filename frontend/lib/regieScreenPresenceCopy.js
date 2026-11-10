/**
 * Correctif UX — indicateur d’écrans connectés (Projection avancée).
 * Copy / agrégation pure à partir des événements socket déjà émis
 * (`screen:count`, `screen:presence`). Aucune API nouvelle.
 */

export const REGIE_SCREENS_PRESENCE_UNKNOWN =
  "État des écrans indisponible";

/**
 * @param {unknown} count
 * @returns {string}
 */
export function formatConnectedScreensLabel(count) {
  const n = Math.max(0, Math.floor(Number(count)));
  if (!Number.isFinite(n)) return REGIE_SCREENS_PRESENCE_UNKNOWN;
  if (n <= 1) return `${n} écran connecté`;
  return `${n} écrans connectés`;
}

/**
 * Libellé en-tête « Projection avancée ».
 * @param {{
 *   known?: boolean | null;
 *   count?: number | null;
 * }} [args]
 * @returns {string}
 */
export function getProjectionAdvancedScreensLabel(args = {}) {
  if (args.known !== true) return REGIE_SCREENS_PRESENCE_UNKNOWN;
  if (
    typeof args.count !== "number" ||
    !Number.isFinite(args.count) ||
    args.count < 0
  ) {
    return REGIE_SCREENS_PRESENCE_UNKNOWN;
  }
  return formatConnectedScreensLabel(args.count);
}

/**
 * Agrège la présence déjà reçue (sans inventer de connexion).
 * Priorité : `screen:count` serveur ; sinon somme main+B si les deux slots sont connus.
 *
 * @param {{
 *   serverCount?: number | null;
 *   mainConnected?: boolean | null;
 *   bConnected?: boolean | null;
 *   mainKnown?: boolean | null;
 *   bKnown?: boolean | null;
 * }} [args]
 * @returns {{ known: boolean; count: number | null }}
 */
export function resolveConnectedScreensPresence(args = {}) {
  if (
    typeof args.serverCount === "number" &&
    Number.isFinite(args.serverCount) &&
    args.serverCount >= 0
  ) {
    return { known: true, count: Math.floor(args.serverCount) };
  }
  if (args.mainKnown === true && args.bKnown === true) {
    const count =
      (args.mainConnected === true ? 1 : 0) +
      (args.bConnected === true ? 1 : 0);
    return { known: true, count };
  }
  return { known: false, count: null };
}
