/**
 * Largeurs desktop partagées pour l’espace organisateur `/admin`.
 *
 * Contrat produit :
 * — cadre / header admin : **1280 px** sur toutes les pages shellées
 *   (événements, leads, analytics, création, compte, dual-pane, etc.)
 * — formNarrow : sous-blocs de champs (ex. mot de passe) — pas un plafond de page
 *
 * Ne pas élargir la régie : elle reste en pleine largeur viewport.
 */

import {
  CLASSIC_CONTENT_MAX,
  classicContentMaxWidth,
} from "./classicLayout.js";

export const ADMIN_CONTENT_MAX_WORKSPACE = CLASSIC_CONTENT_MAX;

/** Alias historique — même valeur que workspace (toutes pages admin = 1280). */
export const ADMIN_CONTENT_MAX_STANDARD = ADMIN_CONTENT_MAX_WORKSPACE;

export const ADMIN_CONTENT_MAX_FORM_NARROW = 640;

/** Padding horizontal typique des shells admin (inchangé mobile). */
export const ADMIN_CONTENT_PADDING =
  "24px clamp(16px, 3vw, 24px) 40px";

/**
 * @param {"standard" | "workspace"} [tier="workspace"]
 * @returns {string} ex. `"1280px"`
 */
export function adminContentMaxWidth(_tier = "workspace") {
  return classicContentMaxWidth();
}

/**
 * Style du cadre admin centré (1280).
 * Le 1er argument `tier` est accepté pour rétrocompatibilité mais n’affecte
 * plus la largeur — toutes les pages admin shellées partagent 1280.
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
