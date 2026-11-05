/**
 * Présentation Landing « ✨ L'événement » — helpers purs (tri programme, légendes, messages V3).
 */

const CAPTION_MAX = 200;
const PROGRAM_TITLE_MAX = 120;
const PROGRAM_TIME_MAX = 40;
const META_DATE_MAX = 120;
const META_VENUE_MAX = 200;
const META_HOURS_MAX = 120;
const PROGRAM_MAX_ITEMS = 40;
const MESSAGE_TITLE_MAX = 200;
const MESSAGE_BODY_MAX = 4000;
const MESSAGE_PHOTOS_MAX = 8;
/** sortOrder pour horaires non parsables (fin de liste, ordre stable via createdAt). */
const UNPARSED_SORT_BASE = 10_000;

/**
 * @param {unknown} raw
 * @returns {number | null} minutes depuis minuit
 */
function parseProgramTimeToMinutes(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\s*[h:]\s*(\d{2})\s*$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h >= 0 && h <= 47 && min >= 0 && min <= 59) return h * 60 + min;
    return null;
  }
  m = s.match(/^(\d{1,2})\s*h\s*$/);
  if (m) {
    const h = Number(m[1]);
    if (h >= 0 && h <= 47) return h * 60;
    return null;
  }
  m = s.match(/^(\d{1,2})\s*:\s*(\d{2})\s*$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h >= 0 && h <= 47 && min >= 0 && min <= 59) return h * 60 + min;
  }
  return null;
}

/**
 * @param {string} timeLabel
 * @returns {number}
 */
function programSortOrderFromTimeLabel(timeLabel) {
  const mins = parseProgramTimeToMinutes(timeLabel);
  if (mins == null) return UNPARSED_SORT_BASE;
  return mins;
}

/**
 * @param {Array<{ timeLabel?: string; sortOrder?: number; createdAt?: string | Date; id?: string; title?: string }>} items
 */
function sortLandingProgramItems(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const sa =
      typeof a.sortOrder === "number"
        ? a.sortOrder
        : programSortOrderFromTimeLabel(a.timeLabel || "");
    const sb =
      typeof b.sortOrder === "number"
        ? b.sortOrder
        : programSortOrderFromTimeLabel(b.timeLabel || "");
    if (sa !== sb) return sa - sb;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

/**
 * @param {unknown} raw
 * @param {number} max
 * @returns {string | null | undefined} null = clear ; undefined = invalid
 */
function normalizeOptionalBoundedText(raw, max) {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  return t.slice(0, max);
}

/**
 * @param {unknown} raw
 * @returns {string | null | undefined}
 */
function normalizeLandingCaption(raw) {
  return normalizeOptionalBoundedText(raw, CAPTION_MAX);
}

/**
 * IDs de photos showcase pour illustrer un message.
 * @param {unknown} raw
 * @param {Set<string> | string[] | null | undefined} [allowedIds]
 * @returns {string[] | null | undefined} null = clear ; undefined = invalid
 */
function normalizeLandingMessagePhotoIds(raw, allowedIds) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  let list = raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "") return null;
    try {
      list = JSON.parse(t);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(list)) return undefined;
  const allowed =
    allowedIds instanceof Set
      ? allowedIds
      : Array.isArray(allowedIds)
        ? new Set(allowedIds.map(String))
        : null;
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (typeof item !== "string" && typeof item !== "number") continue;
    const id = String(item).trim();
    if (!id || seen.has(id)) continue;
    if (allowed && !allowed.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MESSAGE_PHOTOS_MAX) break;
  }
  return out.length ? out : null;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function parseStoredLandingPhotoIds(raw) {
  const normalized = normalizeLandingMessagePhotoIds(raw, null);
  return Array.isArray(normalized) ? normalized : [];
}

/**
 * @param {{
 *   landingEventDate?: string | null;
 *   landingVenue?: string | null;
 *   landingHours?: string | null;
 *   programItems?: unknown[];
 *   showcasePhotos?: unknown[];
 *   landingIntroBody?: string | null;
 *   landingThanksBody?: string | null;
 *   afterLive?: boolean;
 * }} input
 */
function shouldShowLandingEvenementSection(input = {}) {
  const hasMeta =
    Boolean(String(input.landingEventDate || "").trim()) ||
    Boolean(String(input.landingVenue || "").trim()) ||
    Boolean(String(input.landingHours || "").trim());
  const hasProgram =
    Array.isArray(input.programItems) && input.programItems.length > 0;
  const hasGallery =
    Array.isArray(input.showcasePhotos) && input.showcasePhotos.length > 0;
  const hasIntro = Boolean(String(input.landingIntroBody || "").trim());
  const hasThanks =
    Boolean(input.afterLive) &&
    Boolean(String(input.landingThanksBody || "").trim());
  return hasMeta || hasProgram || hasGallery || hasIntro || hasThanks;
}

/**
 * Infos pratiques = textes/liens complémentaires uniquement (pas méta structurée).
 * @param {{
 *   infoSectionTitle?: string | null;
 *   infoSectionText?: string | null;
 *   infoPrimaryCtaLabel?: string | null;
 *   infoPrimaryCtaUrl?: string | null;
 *   infoSecondaryCtaLabel?: string | null;
 *   infoSecondaryCtaUrl?: string | null;
 * }} input
 */
function hasLandingComplementaryInfo(input = {}) {
  const title = String(input.infoSectionTitle || "").trim();
  const text = String(input.infoSectionText || "").trim();
  const pL = String(input.infoPrimaryCtaLabel || "").trim();
  const pU = String(input.infoPrimaryCtaUrl || "").trim();
  const sL = String(input.infoSecondaryCtaLabel || "").trim();
  const sU = String(input.infoSecondaryCtaUrl || "").trim();
  return Boolean(title || text || (pL && pU) || (sL && sU));
}

/**
 * @param {string | null | undefined} body
 * @returns {string[]}
 */
function splitLandingMessageParagraphs(body) {
  const raw = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

module.exports = {
  CAPTION_MAX,
  PROGRAM_TITLE_MAX,
  PROGRAM_TIME_MAX,
  META_DATE_MAX,
  META_VENUE_MAX,
  META_HOURS_MAX,
  PROGRAM_MAX_ITEMS,
  MESSAGE_TITLE_MAX,
  MESSAGE_BODY_MAX,
  MESSAGE_PHOTOS_MAX,
  UNPARSED_SORT_BASE,
  parseProgramTimeToMinutes,
  programSortOrderFromTimeLabel,
  sortLandingProgramItems,
  normalizeOptionalBoundedText,
  normalizeLandingCaption,
  normalizeLandingMessagePhotoIds,
  parseStoredLandingPhotoIds,
  shouldShowLandingEvenementSection,
  hasLandingComplementaryInfo,
  splitLandingMessageParagraphs,
};
