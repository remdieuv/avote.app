/**
 * Lot B — catalogue thèmes Discover (source de vérité applicative + seed SQL).
 * Distinct de `themeMode` (dark/light/auto salle).
 */

/** @type {ReadonlyArray<{ id: string; slug: string; label: string; sortOrder: number }>} */
const DISCOVER_THEMES = Object.freeze([
  {
    id: "theme_musique_festivals",
    slug: "musique-festivals",
    label: "Musique & Festivals",
    sortOrder: 10,
  },
  {
    id: "theme_sport",
    slug: "sport",
    label: "Sport",
    sortOrder: 20,
  },
  {
    id: "theme_culture_spectacles",
    slug: "culture-spectacles",
    label: "Culture & Spectacles",
    sortOrder: 30,
  },
  {
    id: "theme_conferences_business",
    slug: "conferences-business",
    label: "Conférences & Business",
    sortOrder: 40,
  },
  {
    id: "theme_associations_solidarite",
    slug: "associations-solidarite",
    label: "Associations & Solidarité",
    sortOrder: 50,
  },
  {
    id: "theme_vie_locale_citoyennete",
    slug: "vie-locale-citoyennete",
    label: "Vie locale & Citoyenneté",
    sortOrder: 60,
  },
  {
    id: "theme_fetes_celebrations",
    slug: "fetes-celebrations",
    label: "Fêtes & Célébrations",
    sortOrder: 70,
  },
  {
    id: "theme_gaming_streaming",
    slug: "gaming-streaming",
    label: "Gaming & Streaming",
    sortOrder: 80,
  },
  {
    id: "theme_autres",
    slug: "autres",
    label: "Autres",
    sortOrder: 90,
  },
]);

const CITY_MAX_LEN = 120;

/**
 * @param {unknown} raw
 * @returns {string | null | undefined} undefined = invalide
 */
function normalizeDiscoverCity(raw) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().replace(/\s+/g, " ");
  if (t === "") return null;
  if (t.length > CITY_MAX_LEN) return undefined;
  return t;
}

/**
 * @param {unknown} raw
 * @returns {Date | null | undefined} undefined = invalide
 */
function parseDiscoverStartsAt(raw) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? undefined : raw;
  }
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/**
 * @param {unknown} raw
 * @returns {string | null | undefined} undefined = invalide (non string)
 */
function normalizeThemeRef(raw) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  return t;
}

module.exports = {
  DISCOVER_THEMES,
  CITY_MAX_LEN,
  normalizeDiscoverCity,
  parseDiscoverStartsAt,
  normalizeThemeRef,
};
