/**
 * Contenu Hero landing — uniquement features métier réellement créables
 * (voir QUESTION_TYPE_META / PollType côté création d’événement).
 */

/** @typedef {{ id: string; label: string; icon: "poll" | "quiz" | "contest" | "lead" }} HeroFeatureCategory */

/**
 * Features opérationnelles en création d’événement / live.
 * Adapter la liste si un type disparaît du produit.
 *
 * @type {readonly HeroFeatureCategory[]}
 */
export const HERO_FEATURE_CATEGORIES = Object.freeze([
  { id: "poll", label: "Sondages", icon: "poll" },
  { id: "quiz", label: "Quiz", icon: "quiz" },
  { id: "contest", label: "Concours", icon: "contest" },
  { id: "lead", label: "Collecte de contacts", icon: "lead" },
]);

export const HERO_TITLE = "Faites participer votre audience en direct.";

/**
 * Texte support dérivé des catégories affichées + promesse QR.
 * @param {readonly HeroFeatureCategory[]} [categories]
 */
export function buildHeroSupportText(
  categories = HERO_FEATURE_CATEGORIES,
) {
  const labels = categories.map((c) => c.label.toLowerCase());
  if (labels.length === 0) {
    return "Un QR code suffit pour lancer l’interaction en direct.";
  }
  const head =
    labels.length === 1
      ? capitalize(labels[0])
      : `${capitalize(labels.slice(0, -1).join(", "))}, ${labels[labels.length - 1]}…`;
  return `${head} Un QR code suffit pour lancer l’interaction en direct.`;
}

export const HERO_SUPPORT_TEXT = buildHeroSupportText();

/** @param {string} s */
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
