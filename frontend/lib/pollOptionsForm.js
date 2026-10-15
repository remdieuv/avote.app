/**
 * Validations partagées réponses (création + Modifier régie).
 * Aligné sur POST /events/:id/polls/live (min 2, max 32).
 */

export const POLL_OPTIONS_MIN = 2;
export const POLL_OPTIONS_MAX = 32;

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizePollOptionLabels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === "string" ? x.trim() : String(x ?? "").trim()))
    .filter(Boolean);
}

/**
 * @param {unknown} raw
 * @returns {{ ok: boolean; error: string | null; labels: string[] }}
 */
export function validatePollOptionLabels(raw) {
  const labels = normalizePollOptionLabels(raw);
  if (labels.length < POLL_OPTIONS_MIN) {
    return {
      ok: false,
      error: "Ajoutez au moins deux réponses non vides.",
      labels,
    };
  }
  if (labels.length > POLL_OPTIONS_MAX) {
    return {
      ok: false,
      error: "Maximum 32 réponses.",
      labels,
    };
  }
  return { ok: true, error: null, labels };
}

/**
 * Types dont les options sont éditables dans Modifier (pas concours Oui/Non).
 * @param {unknown} pollType
 * @param {{ leadEnabled?: unknown; contestFixed?: boolean }} [opts]
 */
export function pollTypeAllowsOptionEdit(pollType, opts = {}) {
  const t = String(pollType || "").toUpperCase();
  if (t === "CONTEST_ENTRY") return false;
  if (opts.contestFixed === true) return false;
  return (
    t === "SINGLE_CHOICE" ||
    t === "MULTIPLE_CHOICE" ||
    t === "QUIZ" ||
    t === "LEAD" ||
    Boolean(opts.leadEnabled)
  );
}
