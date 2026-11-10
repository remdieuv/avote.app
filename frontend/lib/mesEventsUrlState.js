/**
 * Lot 5 UX — persistence URL Mes événements.
 * section | status | q | sort — sans nouvelles règles métier.
 */

import {
  EVENT_SORT_OPTIONS,
  EVENT_STATUS_FILTER_ALL,
  EVENT_STATUS_FILTERS,
  SORT_ACTIVE_FIRST,
} from "./adminEventsFilters.js";

/** @typedef {"organized"|"favorites"|"invitations"} MesEventsSection */

export const MES_EVENTS_SECTION_IDS = Object.freeze([
  "organized",
  "favorites",
  "invitations",
]);

/**
 * @param {unknown} raw
 * @returns {MesEventsSection}
 */
export function normalizeMesEventsSection(raw) {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "favorites" || v === "invitations" || v === "organized") return v;
  return "organized";
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMesEventsStatus(raw) {
  const v = String(raw || "").trim();
  if (EVENT_STATUS_FILTERS.some((o) => o.value === v)) return v;
  return EVENT_STATUS_FILTER_ALL;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMesEventsSort(raw) {
  const v = String(raw || "").trim();
  if (EVENT_SORT_OPTIONS.some((o) => o.value === v)) return v;
  return SORT_ACTIVE_FIRST;
}

/**
 * @param {URLSearchParams | { get?: (k: string) => string | null } | null | undefined} sp
 * @returns {{
 *   section: MesEventsSection;
 *   status: string;
 *   q: string;
 *   sort: string;
 * }}
 */
export function parseMesEventsSearchParams(sp) {
  const get = (k) => {
    if (!sp) return "";
    if (typeof sp.get === "function") return String(sp.get(k) || "");
    return "";
  };
  return {
    section: normalizeMesEventsSection(get("section")),
    status: normalizeMesEventsStatus(get("status")),
    q: get("q").trim(),
    sort: normalizeMesEventsSort(get("sort")),
  };
}

/**
 * @param {{
 *   section?: unknown;
 *   status?: unknown;
 *   q?: unknown;
 *   sort?: unknown;
 * }} state
 * @returns {URLSearchParams}
 */
export function buildMesEventsSearchParams(state = {}) {
  const params = new URLSearchParams();
  const section = normalizeMesEventsSection(state.section);
  const status = normalizeMesEventsStatus(state.status);
  const sort = normalizeMesEventsSort(state.sort);
  const q = String(state.q || "").trim();

  if (section !== "organized") params.set("section", section);
  // status/sort/q ne s’appliquent qu’aux Organisés — on les conserve pour un retour
  // sur Organisés après Favoris/Invitations.
  if (status !== EVENT_STATUS_FILTER_ALL) params.set("status", status);
  if (sort !== SORT_ACTIVE_FIRST) params.set("sort", sort);
  if (q) params.set("q", q);
  return params;
}

/**
 * @param {ReturnType<typeof buildMesEventsSearchParams>} params
 * @returns {string}
 */
export function mesEventsHrefFromParams(params) {
  const qs = params?.toString?.() || "";
  return qs ? `/admin/events?${qs}` : "/admin/events";
}

/** Libellé d’aide pour le filtre Terminés (toolbar). */
export const MES_EVENTS_FINISHED_FILTER_HINT =
  "Filtre Statut → Terminés : événements clôturés (souvenirs / page de l’événement).";
