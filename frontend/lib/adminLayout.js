/**
 * Largeurs desktop partagées pour l’espace organisateur `/admin`.
 *
 * Contrat produit :
 * — cadre / header admin : toujours **workspace** (1600 px)
 * — pages de travail (events, dual-pane, leads, analytics) : contenu workspace
 * — formulaires (création, compte) : **rail intérieur** standard (1200 px)
 *   à l’intérieur du cadre 1600 — pas de décalage header/contenu
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
 * Style du cadre admin centré (toujours 1600).
 * Le 1er argument `tier` est accepté pour rétrocompatibilité mais n’affecte
 * plus la largeur du cadre — utiliser `adminFormRailStyle` pour le rail 1200.
 *
 * @param {"standard" | "workspace" | Record<string, string | number>} [tierOrExtra="workspace"]
 * @param {Record<string, string | number>} [extra]
 */
export function adminContentShellStyle(tierOrExtra = "workspace", extra = {}) {
  const extras =
    tierOrExtra && typeof tierOrExtra === "object" ? tierOrExtra : extra;
  return {
    width: "100%",
    maxWidth: adminContentMaxWidth("workspace"),
    margin: "0 auto",
    padding: ADMIN_CONTENT_PADDING,
    boxSizing: "border-box",
    ...extras,
  };
}

/**
 * Rail intérieur pour formulaires (1200) dans le cadre 1600.
 * @param {Record<string, string | number>} [extra]
 */
export function adminFormRailStyle(extra = {}) {
  return {
    width: "100%",
    maxWidth: adminContentMaxWidth("standard"),
    margin: "0 auto",
    boxSizing: "border-box",
    ...extra,
  };
}
