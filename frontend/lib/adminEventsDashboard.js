import { getEventUxSortTier, getEventUxState } from "./eventUxState";

/**
 * Tri dashboard admin : En direct → Lecture → En attente → … (par date décroissante).
 * @param {Array<{ liveState?: string; displayState?: string; voteState?: string; createdAt?: string; _localOnly?: boolean }>} events
 */
export function sortEventsForDashboard(events) {
  return [...events].sort((a, b) => {
    const pa = getEventUxSortTier(getEventUxState(a).key);
    const pb = getEventUxSortTier(getEventUxState(b).key);
    if (pb !== pa) return pb - pa;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}
