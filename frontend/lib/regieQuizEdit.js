/**
 * Régie — état « Bonne réponse » dans Modifier (source = options.isCorrect en base).
 */

/**
 * @param {{ options?: Array<{ label?: unknown; isCorrect?: unknown }> | null } | null | undefined} poll
 * @returns {{ hasSaved: boolean; index: number | null; label: string | null }}
 */
export function getSavedQuizCorrectAnswer(poll) {
  const opts = Array.isArray(poll?.options) ? poll.options : [];
  const index = opts.findIndex((o) => o?.isCorrect === true);
  if (index < 0) {
    return { hasSaved: false, index: null, label: null };
  }
  const raw = String(opts[index]?.label ?? "").trim();
  return {
    hasSaved: true,
    index,
    label: raw || `Option ${index + 1}`,
  };
}

/**
 * @param {{
 *   poll?: { options?: Array<{ label?: unknown; isCorrect?: unknown }> | null } | null;
 *   draftOrder?: unknown;
 * }} [input]
 * @returns {{
 *   hasSaved: boolean;
 *   savedIndex: number | null;
 *   savedLabel: string | null;
 *   draftIndex: number | null;
 *   draftLabel: string | null;
 *   draftPending: boolean;
 * }}
 */
export function getQuizCorrectAnswerEditStatus(input = {}) {
  const poll = input.poll;
  const opts = Array.isArray(poll?.options) ? poll.options : [];
  const saved = getSavedQuizCorrectAnswer(poll);
  const rawDraft = Number(input.draftOrder);
  const draftIndex =
    Number.isFinite(rawDraft) && opts.length > 0
      ? Math.min(Math.max(0, Math.floor(rawDraft)), opts.length - 1)
      : null;
  const draftLabel =
    draftIndex == null
      ? null
      : String(opts[draftIndex]?.label ?? "").trim() ||
        `Option ${draftIndex + 1}`;
  const draftPending =
    draftIndex == null
      ? false
      : !saved.hasSaved || draftIndex !== saved.index;
  return {
    hasSaved: saved.hasSaved,
    savedIndex: saved.index,
    savedLabel: saved.label,
    draftIndex,
    draftLabel,
    draftPending,
  };
}
