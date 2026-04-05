import {
  adminEventsListBadgeKey,
  sortEventsForDashboard,
} from "./adminEventsDashboard";

export const EVENT_STATUS_FILTER_ALL = "all";

/** @type {{ value: string; label: string }[]} */
export const EVENT_STATUS_FILTERS = [
  { value: EVENT_STATUS_FILTER_ALL, label: "Tous" },
  { value: "voting", label: "En direct" },
  { value: "lecture", label: "Lecture" },
  { value: "waiting", label: "En attente" },
  { value: "results", label: "Résultats" },
  { value: "paused", label: "Pause" },
  { value: "finished", label: "Terminés" },
];

export const SORT_ACTIVE_FIRST = "activeFirst";
export const SORT_RECENT = "recent";
export const SORT_OLDEST = "oldest";
export const SORT_NAME_AZ = "nameAz";

/** @type {{ value: string; label: string }[]} */
export const EVENT_SORT_OPTIONS = [
  { value: SORT_ACTIVE_FIRST, label: "Actifs d'abord" },
  { value: SORT_RECENT, label: "Plus récents" },
  { value: SORT_OLDEST, label: "Plus anciens" },
  { value: SORT_NAME_AZ, label: "Nom A → Z" },
];

/**
 * @param {Array<{ title?: string; slug?: string }>} events
 * @param {string} rawQuery
 */
export function filterEventsBySearch(events, rawQuery) {
  const q = String(rawQuery || "").trim().toLowerCase();
  if (!q) return [...events];
  return events.filter((e) => {
    const title = String(e.title || "").toLowerCase();
    const slug = String(e.slug || "").toLowerCase();
    return title.includes(q) || slug.includes(q);
  });
}

/**
 * @param {Array<{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }>} events
 * @param {string} status
 */
export function filterEventsByStatus(events, status) {
  if (!status || status === EVENT_STATUS_FILTER_ALL) return [...events];
  return events.filter((e) => adminEventsListBadgeKey(e) === status);
}

/**
 * @param {Array<{ liveState?: string; createdAt?: string; title?: string }>} events
 * @param {string} mode
 */
export function sortEventsByMode(events, mode) {
  const list = [...events];
  if (mode === SORT_RECENT) {
    return list.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }
  if (mode === SORT_OLDEST) {
    return list.sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
    );
  }
  if (mode === SORT_NAME_AZ) {
    return list.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""), "fr", {
        sensitivity: "base",
      }),
    );
  }
  return sortEventsForDashboard(list);
}
