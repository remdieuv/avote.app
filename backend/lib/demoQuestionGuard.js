/**
 * Garde-fou textes de démo / filler à la création de questions.
 * Ne modifie / ne supprime jamais une question déjà persistée.
 */

const DISALLOWED = new Set([
  "placeholder question",
  "placeholder",
  "test question",
  "lorem ipsum",
]);

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
function isDisallowedDemoQuestionText(raw) {
  const v = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!v) return false;
  return DISALLOWED.has(v);
}

module.exports = {
  isDisallowedDemoQuestionText,
  DISALLOWED_DEMO_QUESTION_TEXTS: [...DISALLOWED],
};
