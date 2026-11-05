/**
 * Présentation Landing « ✨ L'événement » — helpers front (miroir backend).
 */

export const LANDING_CAPTION_MAX = 200;
export const LANDING_PROGRAM_TITLE_MAX = 120;
export const LANDING_PROGRAM_TIME_MAX = 40;
export const LANDING_META_DATE_MAX = 120;
export const LANDING_META_VENUE_MAX = 200;
export const LANDING_META_HOURS_MAX = 120;
export const LANDING_MESSAGE_TITLE_MAX = 200;
export const LANDING_MESSAGE_BODY_MAX = 4000;
export const LANDING_MESSAGE_PHOTOS_MAX = 8;

const UNPARSED_SORT_BASE = 10_000;

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseProgramTimeToMinutes(raw) {
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
 */
export function programSortOrderFromTimeLabel(timeLabel) {
  const mins = parseProgramTimeToMinutes(timeLabel);
  if (mins == null) return UNPARSED_SORT_BASE;
  return mins;
}

/**
 * @param {Array<{ timeLabel?: string; sortOrder?: number; createdAt?: string; id?: string }>} items
 */
export function sortLandingProgramItems(items) {
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
    const ta = a.createdAt ? Date.parse(a.createdAt) || 0 : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) || 0 : 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
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
export function shouldShowLandingEvenementSection(input = {}) {
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
 * @param {{
 *   infoSectionTitle?: string | null;
 *   infoSectionText?: string | null;
 *   infoPrimaryCtaLabel?: string | null;
 *   infoPrimaryCtaUrl?: string | null;
 *   infoSecondaryCtaLabel?: string | null;
 *   infoSecondaryCtaUrl?: string | null;
 * }} input
 */
export function hasLandingComplementaryInfo(input = {}) {
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
export function splitLandingMessageParagraphs(body) {
  const raw = String(body || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseLandingMessagePhotoIds(raw) {
  if (raw == null) return [];
  let list = raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      list = JSON.parse(t);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= LANDING_MESSAGE_PHOTOS_MAX) break;
  }
  return out;
}
