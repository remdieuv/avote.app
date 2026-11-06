/**
 * Lot C — helpers UI Découvrir (labels, CTA, formatage).
 * S’appuie sur les catégories API : upcoming | live | finished.
 */

/** @typedef {"upcoming"|"live"|"finished"} DiscoverCategory */

/**
 * @param {unknown} raw
 * @returns {DiscoverCategory|null}
 */
export function normalizeDiscoverCategory(raw) {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "upcoming" || v === "live" || v === "finished") return v;
  return null;
}

/**
 * @param {DiscoverCategory|null|undefined} category
 */
export function discoverCategoryLabel(category) {
  switch (category) {
    case "upcoming":
      return "À venir";
    case "live":
      return "En direct";
    case "finished":
      return "Terminé";
    default:
      return "";
  }
}

/**
 * @param {string|null|undefined} iso
 * @returns {string|null}
 */
export function formatDiscoverStartsAt(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString("fr-FR");
  }
}

/**
 * CTA principal selon catégorie + données réelles (pas de lien inventé).
 * @param {{
 *   discoverCategory?: unknown;
 *   joinPath?: string|null;
 *   landingPath?: string|null;
 *   landingEnabled?: boolean;
 * }} event
 * @returns {{ href: string; label: string } | null}
 */
export function resolveDiscoverPrimaryCta(event) {
  const cat = normalizeDiscoverCategory(event?.discoverCategory);
  const join =
    typeof event?.joinPath === "string" && event.joinPath.trim()
      ? event.joinPath.trim()
      : null;
  const landing =
    typeof event?.landingPath === "string" && event.landingPath.trim()
      ? event.landingPath.trim()
      : event?.landingEnabled && typeof event?.slug === "string"
        ? `/e/${event.slug}`
        : null;

  if (cat === "live") {
    if (join) return { href: join, label: "Participer" };
    return null;
  }
  if (cat === "finished") {
    if (landing) return { href: landing, label: "Voir les souvenirs" };
    return null;
  }
  if (cat === "upcoming") {
    if (landing) return { href: landing, label: "Voir l'événement" };
    if (join) return { href: join, label: "Voir l'événement" };
    return null;
  }
  return null;
}

/**
 * Lien secondaire optionnel (ex. Participer si landing déjà en CTA).
 * @param {{
 *   discoverCategory?: unknown;
 *   joinPath?: string|null;
 *   landingPath?: string|null;
 * }} event
 * @param {{ href: string; label: string } | null} primary
 */
export function resolveDiscoverSecondaryCta(event, primary) {
  const cat = normalizeDiscoverCategory(event?.discoverCategory);
  const join =
    typeof event?.joinPath === "string" && event.joinPath.trim()
      ? event.joinPath.trim()
      : null;
  if (!join || !primary) return null;
  if (primary.href === join) return null;
  if (cat === "upcoming" && primary.label === "Voir l'événement") {
    return { href: join, label: "Rejoindre" };
  }
  return null;
}

export const DISCOVER_CATEGORY_TABS = Object.freeze([
  { id: "upcoming", label: "À venir" },
  { id: "live", label: "En direct" },
  { id: "finished", label: "Terminés" },
]);
