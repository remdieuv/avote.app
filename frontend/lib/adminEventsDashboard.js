/**
 * Tri dashboard admin : en direct → en attente → autres (par date décroissante).
 * @param {Array<{ liveState?: string; createdAt?: string }>} events
 */
export function sortEventsForDashboard(events) {
  const priority = (ls) => {
    const s = String(ls || "").toLowerCase();
    if (s === "voting") return 100;
    if (s === "waiting") return 80;
    if (s === "results") return 60;
    if (s === "paused") return 40;
    if (s === "finished") return 20;
    return 10;
  };
  return [...events].sort((a, b) => {
    const pa = priority(a.liveState);
    const pb = priority(b.liveState);
    if (pb !== pa) return pb - pa;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
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
