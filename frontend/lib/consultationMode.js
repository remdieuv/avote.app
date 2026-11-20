/**
 * Libre-service — helpers FE (alignés backend/lib/consultationMode.js).
 */

/** Types exclus du catalogue V1 (régie indispensable / FE incomplet). */
export const SELF_SERVICE_EXCLUDED_TYPES = Object.freeze([
  "CONTEST_ENTRY",
  "OPEN_TEXT",
  "WORD_CLOUD",
  "RANKING",
]);

/**
 * @param {unknown} raw
 * @returns {"live" | "self_service"}
 */
export function normalizeConsultationModeUi(raw) {
  const u = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (u === "self_service" || u === "selfservice") return "self_service";
  return "live";
}

/**
 * @param {unknown} pollType
 */
export function isSelfServiceCatalogType(pollType) {
  const t = String(pollType || "").toUpperCase();
  if (!t) return false;
  return !SELF_SERVICE_EXCLUDED_TYPES.includes(t);
}

/**
 * @param {unknown} eventOrPayload
 */
export function isSelfServiceMode(eventOrPayload) {
  return (
    normalizeConsultationModeUi(
      eventOrPayload?.consultationMode ?? eventOrPayload?.mode,
    ) === "self_service"
  );
}

/**
 * @param {unknown} eventOrPayload
 */
export function isSelfServiceConsultationOpen(eventOrPayload) {
  return (
    isSelfServiceMode(eventOrPayload) &&
    Boolean(eventOrPayload?.selfServiceOpen)
  );
}

/**
 * Vote autorisé côté participant (payload poll).
 * @param {unknown} poll
 */
export function pollAllowsSelfServiceVote(poll) {
  if (!poll || typeof poll !== "object") return false;
  if (poll.selfServiceVotable === true) return true;
  return (
    isSelfServiceConsultationOpen(poll) &&
    String(poll.status || "").toUpperCase() === "ACTIVE"
  );
}
