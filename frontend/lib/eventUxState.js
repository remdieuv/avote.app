/**
 * Statut UX unifié (liste événements, régie, badges) — couche présentation uniquement.
 * @typedef {'voting' | 'lecture' | 'waiting' | 'results' | 'paused' | 'finished'} EventUxKey
 */

/** @type {Record<EventUxKey, number>} */
const SORT_TIER = {
  voting: 100,
  lecture: 85,
  waiting: 80,
  results: 60,
  paused: 40,
  finished: 20,
};

/** @type {Record<EventUxKey, { label: string; bg: string; color: string; border: string }>} */
const UX = {
  voting: {
    label: "En direct",
    bg: "rgba(22, 163, 74, 0.12)",
    color: "#166534",
    border: "rgba(22, 163, 74, 0.38)",
  },
  lecture: {
    label: "Question affichée",
    bg: "rgba(99, 102, 241, 0.12)",
    color: "#3730a3",
    border: "rgba(99, 102, 241, 0.35)",
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

/**
 * @param {{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }} event
 * @returns {EventUxKey}
 */
export function getEventUxKey(event) {
  if (event._localOnly) return "waiting";
  const ls = String(event.liveState ?? "").toLowerCase();
  const ds = String(event.displayState ?? "").toLowerCase();
  const vs = String(event.voteState ?? "").toLowerCase();

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

/**
 * @param {{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }} event
 * @returns {{ key: EventUxKey; label: string; color: { bg: string; color: string; border: string } }}
 */
export function getEventUxState(event) {
  if (event._localOnly) {
    const u = UX.waiting;
    return {
      key: "waiting",
      label: "Brouillon local",
      color: { bg: u.bg, color: u.color, border: u.border },
    };
  }
  const key = getEventUxKey(event);
  const u = UX[key];
  return {
    key,
    label: u.label,
    color: { bg: u.bg, color: u.color, border: u.border },
  };
}

/** @param {EventUxKey} key */
export function getEventUxSortTier(key) {
  return SORT_TIER[key] ?? 10;
}

/**
 * Styles carte « État live » régie (fond, bordure, accent, pill).
 * @param {EventUxKey} key
 */
export function getEventUxPanelStyles(key) {
  switch (key) {
    case "voting":
      return {
        background: "linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%)",
        border: "1px solid #86efac",
        accent: "#16a34a",
        pillBg: "#dcfce7",
        pillColor: "#166534",
      };
    case "lecture":
      return {
        background: "linear-gradient(180deg, #eef2ff 0%, #f5f3ff 100%)",
        border: "1px solid #c7d2fe",
        accent: "#4f46e5",
        pillBg: "#e0e7ff",
        pillColor: "#3730a3",
      };
    case "results":
      return {
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        border: "1px solid #93c5fd",
        accent: "#2563eb",
        pillBg: "#dbeafe",
        pillColor: "#1e40af",
      };
    case "paused":
      return {
        background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
        border: "1px solid #fcd34d",
        accent: "#d97706",
        pillBg: "#fde68a",
        pillColor: "#92400e",
      };
    case "finished":
      return {
        background: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
        border: "1px solid #d1d5db",
        accent: "#4b5563",
        pillBg: "#e5e7eb",
        pillColor: "#1f2937",
      };
    case "waiting":
    default:
      return {
        background: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
        border: "1px solid #d1d5db",
        accent: "#6b7280",
        pillBg: "#e5e7eb",
        pillColor: "#374151",
      };
  }
}

/** Badge compact (fonds pleins) pour QR / sidebar — même libellé UX. */
const SCENE_HEX = {
  voting: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  lecture: { bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc" },
  waiting: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  results: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  paused: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  finished: { bg: "#f3f4f6", color: "#334155", border: "#e5e7eb" },
};

/**
 * @param {EventUxKey} key
 * @returns {{ label: string; bg: string; color: string; border: string }}
 */
export function getEventUxSceneBadgeFromKey(key) {
  const hex = SCENE_HEX[key] ?? SCENE_HEX.waiting;
  return { label: UX[key]?.label ?? UX.waiting.label, ...hex };
}

/**
 * @param {{ liveState?: string; displayState?: string; voteState?: string; _localOnly?: boolean }} event
 */
export function getEventUxSceneBadge(event) {
  const { key, label } = getEventUxState(event);
  const hex = SCENE_HEX[key] ?? SCENE_HEX.waiting;
  return { label, ...hex };
}
