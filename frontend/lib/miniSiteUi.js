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

/** Onglets Lot 1 exposés dans la navigation publique (ordre fixe). */
export const MINI_SITE_PUBLIC_TAB_IDS = Object.freeze(["accueil", "participer"]);

/**
 * Onglets visibles Lot 1 : Accueil + Participer uniquement.
 * Ne jamais inclure Résultats / Journal / Galerie / À propos
 * (même désactivés ou « Bientôt ») — architecture conservée via flags API.
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
  for (const id of MINI_SITE_PUBLIC_TAB_IDS) {
    const row = byId.get(id);
    // Défense : ignorer toute entrée non requise / disabled venue de l’API.
    if (row && row.enabled === false && row.required !== true) continue;
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
