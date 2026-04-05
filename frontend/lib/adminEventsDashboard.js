const SORT_TIER = {
  voting: 100,
  lecture: 85,
  waiting: 80,
  results: 60,
  paused: 40,
  finished: 20,
};

/**
 * Clé liste admin (badge + filtre + tri), alignée sur la régie : lecture = question + vote fermé.
 * @param {{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }} e
 */
export function adminEventsListBadgeKey(e) {
  if (e._localOnly) return "waiting";
  const ls = String(e.liveState || "").toLowerCase();
  const ds = String(e.displayState || "").toLowerCase();
  const vs = String(e.voteState || "").toLowerCase();

  if (ls === "finished") return "finished";
  if (ls === "paused" || ds === "black") return "paused";
  if (ds === "results") return "results";
  if (ds === "question" && vs === "open") return "voting";
  if (ds === "question" && vs === "closed") return "lecture";
  if (ls === "voting") return "voting";
  if (ls === "results") return "results";
  if (ls === "paused") return "paused";
  return "waiting";
}

/** @param {{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }} e */
export function adminEventSortTier(e) {
  const k = adminEventsListBadgeKey(e);
  return SORT_TIER[k] ?? 10;
}

/**
 * Tri dashboard admin : en direct → lecture → en attente → … (par date décroissante).
 * @param {Array<{ liveState?: string; displayState?: string; voteState?: string; createdAt?: string; _localOnly?: boolean }>} events
 */
export function sortEventsForDashboard(events) {
  return [...events].sort((a, b) => {
    const pa = adminEventSortTier(a);
    const pb = adminEventSortTier(b);
    if (pb !== pa) return pb - pa;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

/**
 * Badge carte liste admin (inclut Lecture).
 * @param {{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }} e
 */
export function adminEventsListBadgeProps(e) {
  const key = adminEventsListBadgeKey(e);
  const lecture = {
    label: "Lecture",
    bg: "rgba(99, 102, 241, 0.12)",
    color: "#3730a3",
    border: "rgba(99, 102, 241, 0.35)",
  };
  if (key === "lecture") return lecture;
  return liveStateBadgeProps(
    key === "voting"
      ? "voting"
      : key === "waiting"
        ? "waiting"
        : key === "results"
          ? "results"
          : key === "paused"
            ? "paused"
            : key === "finished"
              ? "finished"
              : String(e.liveState || ""),
  );
}

/** @param {string | undefined} liveState */
export function liveStateBadgeProps(liveState) {
  const s = String(liveState || "").toLowerCase();
  const map = {
    voting: {
      label: "En direct",
      bg: "rgba(22, 163, 74, 0.12)",
      color: "#166534",
      border: "rgba(22, 163, 74, 0.38)",
    },
    waiting: {
      label: "En attente",
      bg: "rgba(100, 116, 139, 0.14)",
      color: "#475569",
      border: "rgba(100, 116, 139, 0.32)",
    },
    results: {
      label: "Résultats",
      bg: "rgba(37, 99, 235, 0.1)",
      color: "#1d4ed8",
      border: "rgba(37, 99, 235, 0.3)",
    },
    paused: {
      label: "Pause",
      bg: "rgba(245, 158, 11, 0.14)",
      color: "#b45309",
      border: "rgba(245, 158, 11, 0.38)",
    },
    finished: {
      label: "Terminé",
      bg: "rgba(71, 85, 105, 0.12)",
      color: "#334155",
      border: "rgba(71, 85, 105, 0.28)",
    },
  };
  return (
    map[s] ?? {
      label: "—",
      bg: "rgba(148, 163, 184, 0.14)",
      color: "#64748b",
      border: "rgba(148, 163, 184, 0.3)",
    }
  );
}
