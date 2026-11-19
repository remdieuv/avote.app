/**
 * Navigation unifiée pages classiques (public + espace connecté).
 * Hors scope : régie, vote, projection, parcours auth.
 */

/**
 * @typedef {{
 *  href: string;
 *  label: string;
 *  match?: "exact" | "prefix" | "none";
 *  separatorBefore?: boolean;
 * }} SiteNavItem
 */

/** @type {readonly SiteNavItem[]} */
export const PUBLIC_NAV_ITEMS = Object.freeze([
  { href: "/discover", label: "Les événements", match: "prefix" },
  { href: "/pricing", label: "Tarifs", match: "exact" },
]);

/** @type {readonly SiteNavItem[]} */
export const PERSONAL_NAV_ITEMS = Object.freeze([
  { href: "/admin/events", label: "Mes événements", match: "prefix" },
  { href: "/admin/leads", label: "Mes leads", match: "prefix" },
  { href: "/admin/analytics", label: "Analytics", match: "prefix" },
  { href: "/admin", label: "Créer", match: "exact" },
]);

/**
 * @param {boolean} isAuthed
 * @returns {SiteNavItem[]}
 */
export function siteNavItems(isAuthed) {
  if (!isAuthed) return [...PUBLIC_NAV_ITEMS];
  const [firstPersonal, ...restPersonal] = PERSONAL_NAV_ITEMS;
  return [
    ...PUBLIC_NAV_ITEMS,
    { ...firstPersonal, separatorBefore: true },
    ...restPersonal,
  ];
}
