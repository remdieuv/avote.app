/**
 * Largeurs desktop partagées pour l’espace organisateur `/admin`.
 * — standard : formulaires « confort » (création, etc.)
 * — workspace : listes, tableaux, dual-pane live/landing
 * — formNarrow : sous-formulaires (ex. mot de passe)
 *
 * Ne pas élargir la régie : elle reste en pleine largeur viewport.
 */

export const ADMIN_CONTENT_MAX_STANDARD = 1200;
export const ADMIN_CONTENT_MAX_WORKSPACE = 1600;
export const ADMIN_CONTENT_MAX_FORM_NARROW = 640;

/** Padding horizontal typique des shells admin (inchangé mobile). */
export const ADMIN_CONTENT_PADDING =
  "24px clamp(16px, 3vw, 24px) 40px";

/**
 * @param {"standard" | "workspace"} [tier="workspace"]
 * @returns {string} ex. `"1600px"`
 */
export function adminContentMaxWidth(tier = "workspace") {
  if (tier === "standard") return `${ADMIN_CONTENT_MAX_STANDARD}px`;
  return `${ADMIN_CONTENT_MAX_WORKSPACE}px`;
}

/**
 * Style de shell de contenu centré (pages admin).
 * @param {"standard" | "workspace"} [tier="workspace"]
 * @param {Record<string, string | number>} [extra]
 */
export function adminContentShellStyle(tier = "workspace", extra = {}) {
  return {
    width: "100%",
    maxWidth: adminContentMaxWidth(tier),
    margin: "0 auto",
    padding: ADMIN_CONTENT_PADDING,
    boxSizing: "border-box",
    ...extra,
  };
}
