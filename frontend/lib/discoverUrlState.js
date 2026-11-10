/**
 * Lot 5 UX — persistence URL des filtres Découvrir.
 * Params alignés sur l’API : category | q | city | theme (pas de nouvel API).
 */

import { normalizeDiscoverCategory } from "./discoverUi.js";

/**
 * @param {URLSearchParams | { get?: (k: string) => string | null } | null | undefined} sp
 * @returns {{
 *   category: "upcoming"|"live"|"finished";
 *   q: string;
 *   city: string;
 *   theme: string;
 * }}
 */
export function parseDiscoverSearchParams(sp) {
  const get = (k) => {
    if (!sp) return "";
    if (typeof sp.get === "function") return String(sp.get(k) || "");
    return "";
  };
  const cat = normalizeDiscoverCategory(get("category"));
  return {
    category: cat || "upcoming",
    q: get("q").trim(),
    city: get("city").trim(),
    theme: get("theme").trim(),
  };
}

/**
 * @param {{
 *   category?: unknown;
 *   q?: unknown;
 *   city?: unknown;
 *   theme?: unknown;
 * }} state
 * @returns {URLSearchParams}
 */
export function buildDiscoverSearchParams(state = {}) {
  const params = new URLSearchParams();
  const cat = normalizeDiscoverCategory(state.category) || "upcoming";
  // Toujours exposer la catégorie pour un aller-retour fiable (y compris upcoming).
  params.set("category", cat);
  const q = String(state.q || "").trim();
  const city = String(state.city || "").trim();
  const theme = String(state.theme || "").trim();
  if (q) params.set("q", q);
  if (city) params.set("city", city);
  if (theme) params.set("theme", theme);
  return params;
}

/**
 * @param {ReturnType<typeof buildDiscoverSearchParams>} params
 * @returns {string}
 */
export function discoverHrefFromParams(params) {
  const qs = params?.toString?.() || "";
  return qs ? `/discover?${qs}` : "/discover";
}
