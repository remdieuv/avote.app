/**
 * Mini-site — helpers UI Lot 1 (Accueil / Participer).
 */

export const MINI_SITE_TAB_LABELS = Object.freeze({
  accueil: "Accueil",
  participer: "Participer",
  resultats: "Résultats",
  journal: "Journal",
  galerie: "Galerie",
  "a-propos": "À propos",
});

/**
 * Onglets visibles Lot 1 : Accueil + Participer uniquement.
 * Les flags API `tabs[].enabled` pour les autres restent false.
 * @param {Array<{ id?: string; path?: string; enabled?: boolean; required?: boolean }> | null | undefined} apiTabs
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
  for (const id of ["accueil", "participer"]) {
    const row = byId.get(id);
    const path = id === "accueil" ? "" : "participer";
    out.push({
      id,
      path: typeof row?.path === "string" ? row.path : path,
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
