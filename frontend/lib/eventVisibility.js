/** @typedef {"private" | "public"} EventVisibilityUi */

/**
 * @param {unknown} raw
 * @returns {EventVisibilityUi}
 */
export function normalizeVisibilityUi(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  return s === "public" ? "public" : "private";
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isPublicVisibility(raw) {
  return normalizeVisibilityUi(raw) === "public";
}

export const PUBLISH_PUBLIC_WARNING_LINES = [
  "L’événement pourra être listé dans « Les événements » (annuaire public) s’il est éligible.",
  "Si la page de l’événement est active, les moteurs de recherche pourront l’indexer.",
  "Le live (/join), les QR codes et le vote restent accessibles par lien, comme aujourd’hui.",
  "Vous pourrez repasser en privé plus tard : retrait de l’annuaire et noindex (la désindexation réelle peut prendre du temps).",
];

export const UNPUBLISH_PRIVATE_WARNING_LINES = [
  "L’événement sera retiré de « Les événements » et repassera en noindex.",
  "Les liens /join et la page de l’événement déjà partagés continuent de fonctionner (pas de fermeture automatique).",
  "D’éventuels favoris futurs resteront enregistrés mais ne donneront pas accès à un contenu privé.",
];
