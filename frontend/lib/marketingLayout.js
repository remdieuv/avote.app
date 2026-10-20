/**
 * Largeurs desktop partagées pour le site public (marketing).
 * Header et contenu alignés sur **1200 px**.
 */

export const MARKETING_CONTENT_MAX = 1200;

/** Padding horizontal typique des conteneurs marketing. */
export const MARKETING_CONTENT_PADDING = "1.25rem 1.25rem 4rem";

/**
 * @returns {string} ex. `"1200px"`
 */
export function marketingContentMaxWidth() {
  return `${MARKETING_CONTENT_MAX}px`;
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
