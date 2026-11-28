/**
 * Mini-site — helpers UI (Accueil / Participer / Résultats Lot 2).
 */

export const MINI_SITE_TAB_LABELS = Object.freeze({
  accueil: "Accueil",
  participer: "Participer",
  resultats: "Résultats",
  journal: "Journal",
  galerie: "Galerie",
  "a-propos": "À propos",
});

/** Onglets toujours présents (ordre fixe). */
export const MINI_SITE_REQUIRED_TAB_IDS = Object.freeze([
  "accueil",
  "participer",
]);

/** Onglets facultatifs déjà développés (activables via API). */
export const MINI_SITE_AVAILABLE_OPTIONAL_TAB_IDS = Object.freeze([
  "resultats",
  "journal",
]);

/** @deprecated Lot 1 — conserver pour tests historiques ; utiliser resolveVisibleMiniSiteTabs. */
export const MINI_SITE_PUBLIC_TAB_IDS = Object.freeze(["accueil", "participer"]);

const TAB_PATHS = Object.freeze({
  accueil: "",
  participer: "participer",
  resultats: "resultats",
  journal: "journal",
});

/**
 * Onglets visibles : Accueil + Participer + facultatifs disponibles et enabled.
 * Ne jamais inclure Galerie / À propos (Lots 4–5).
 * @param {Array<{ id?: string; path?: string; enabled?: boolean; required?: boolean; available?: boolean }> | null | undefined} apiTabs
 */
export function resolveVisibleMiniSiteTabs(apiTabs) {
  const fromApi = Array.isArray(apiTabs) ? apiTabs : [];
  const byId = new Map(
    fromApi
      .filter((t) => t && typeof t.id === "string")
      .map((t) => [t.id, t]),
  );
  /** @type {{ id: string; path: string; label: string; hrefSuffix: string }[]} */
  const out = [];

  for (const id of MINI_SITE_REQUIRED_TAB_IDS) {
    const row = byId.get(id);
    if (row && row.enabled === false && row.required !== true) continue;
    const path = TAB_PATHS[id] ?? id;
    out.push({
      id,
      path: typeof row?.path === "string" ? row.path : path,
      label: MINI_SITE_TAB_LABELS[id] || id,
      hrefSuffix: path ? `/${path}` : "",
    });
  }

  for (const id of MINI_SITE_AVAILABLE_OPTIONAL_TAB_IDS) {
    const row = byId.get(id);
    if (!row || row.enabled !== true) continue;
    const path = TAB_PATHS[id] ?? id;
    out.push({
      id,
      path: typeof row.path === "string" ? row.path : path,
      label: MINI_SITE_TAB_LABELS[id] || id,
      hrefSuffix: path ? `/${path}` : "",
    });
  }

  return out;
}

/**
 * @param {string} slug
 * @param {string} hrefSuffix
 */
export function miniSiteTabHref(slug, hrefSuffix) {
  const base = `/e/${encodeURIComponent(slug)}`;
  return hrefSuffix ? `${base}${hrefSuffix}` : base;
}

/**
 * @param {unknown} primaryColor
 * @returns {string}
 */
export function resolveMiniSiteAccent(primaryColor) {
  const c = typeof primaryColor === "string" ? primaryColor.trim() : "";
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return "#0f766e";
}

/**
 * Libellé public du type d’interaction (pas de jargon technique).
 * @param {unknown} type
 */
export function minisiteResultTypeLabel(type) {
  const t = String(type || "").toUpperCase();
  switch (t) {
    case "SINGLE_CHOICE":
      return "Choix unique";
    case "MULTIPLE_CHOICE":
      return "Choix multiple";
    case "YES_NO":
      return "Oui / Non";
    case "RATING":
      return "Notation";
    case "QUIZ":
      return "Quiz";
    case "CONTEST_ENTRY":
      return "Concours";
    default:
      return "Question";
  }
}

/** Espace fine insécable (avant ? ! : ;). */
const NNBSP = "\u202F";
/** Espace insécable. */
const NBSP = "\u00A0";

/**
 * Typographie française d’affichage uniquement (ne pas persister en base).
 * Empêche ?, !, :, ; et % de se retrouver seuls en début de ligne.
 * @param {unknown} text
 * @returns {string}
 */
export function formatFrenchDisplayText(text) {
  if (typeof text !== "string") return "";
  let s = text.normalize("NFC");
  // Espaces existants (y compris NNBSP/NBSP) avant ponctuation haute → NNBSP
  s = s.replace(/[\s\u00A0\u202F]*([?!:;])/g, `${NNBSP}$1`);
  // % : NBSP avant
  s = s.replace(/[\s\u00A0\u202F]*(%)/g, `${NBSP}$1`);
  // Guillemets français
  s = s.replace(/«\s*/g, `«${NBSP}`);
  s = s.replace(/\s*»/g, `${NBSP}»`);
  // Ponctuation haute collée au mot précédent sans espace → NNBSP
  s = s.replace(/([^\s\u00A0\u202F])([?!:;])/g, `$1${NNBSP}$2`);
  s = s.replace(/([^\s\u00A0\u202F])(%)/g, `$1${NBSP}$2`);
  return s;
}

/**
 * Extrait court pour aperçu Journal (affichage uniquement).
 * @param {unknown} text
 * @param {number} [maxLen]
 */
export function excerptFrenchText(text, maxLen = 160) {
  const raw = typeof text === "string" ? text.trim() : "";
  if (!raw) return "";
  const flat = raw.replace(/\s+/g, " ");
  if (flat.length <= maxLen) return flat;
  const cut = flat.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

/**
 * URL absolue de partage à partir d’un chemin `/e/...`.
 * @param {unknown} pathOrUrl
 */
export function absoluteMiniSiteUrl(pathOrUrl) {
  const raw = typeof pathOrUrl === "string" ? pathOrUrl.trim() : "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}
