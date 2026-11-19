/**
 * Plafond unique des pages classiques AVOTE (marketing + admin shellé).
 * Hors scope : régie, participant / vote, projection, auth carte.
 */

export const CLASSIC_CONTENT_MAX = 1440;

/**
 * @returns {string} ex. `"1440px"`
 */
export function classicContentMaxWidth() {
  return `${CLASSIC_CONTENT_MAX}px`;
}
