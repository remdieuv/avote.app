/**
 * Largeurs desktop partagées pour le site public (marketing).
 * Header et contenu alignés sur le plafond classique (**1280 px**).
 */

import {
  CLASSIC_CONTENT_MAX,
  classicContentMaxWidth,
} from "./classicLayout.js";

export const MARKETING_CONTENT_MAX = CLASSIC_CONTENT_MAX;

/** Padding horizontal typique des conteneurs marketing. */
export const MARKETING_CONTENT_PADDING = "1.25rem 1.25rem 4rem";

/**
 * @returns {string} ex. `"1280px"`
 */
export function marketingContentMaxWidth() {
  return classicContentMaxWidth();
}

/**
 * Style de conteneur marketing centré.
 * @param {Record<string, string | number>} [extra]
 */
export function marketingContentShellStyle(extra = {}) {
  return {
    width: "100%",
    maxWidth: marketingContentMaxWidth(),
    margin: "0 auto",
    padding: MARKETING_CONTENT_PADDING,
    boxSizing: "border-box",
    ...extra,
  };
}
