/**
 * Largeurs desktop partagées pour le site public (marketing).
 * Header et contenu alignés sur le plafond classique (**1440 px**).
 */

import {
  CLASSIC_CONTENT_MAX,
  classicContentMaxWidth,
} from "./classicLayout.js";

export const MARKETING_CONTENT_MAX = CLASSIC_CONTENT_MAX;

/** Padding fluide : plus de marge latérale tablette/mobile, desktop borné. */
export const MARKETING_CONTENT_PADDING =
  "1.25rem clamp(1rem, 3.2vw, 1.75rem) 4rem";

/**
 * @returns {string} ex. `"1440px"`
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
