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
]);

/** @deprecated Lot 1 — conserver pour tests historiques ; utiliser resolveVisibleMiniSiteTabs. */
export const MINI_SITE_PUBLIC_TAB_IDS = Object.freeze(["accueil", "participer"]);

const TAB_PATHS = Object.freeze({
  accueil: "",
  participer: "participer",
  resultats: "resultats",
});

/**
 * Onglets visibles : Accueil + Participer + facultatifs disponibles et enabled.
 * Ne jamais inclure Journal / Galerie / À propos (Lots 3–5).
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
