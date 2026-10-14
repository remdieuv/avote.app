/**
 * Régie — stats options (barres) : formatage pur, ordre stable (pas de tri votes).
 */

/**
 * @param {unknown} n
 * @returns {number}
 */
function clampPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * Largeur de barre (0–100) pour une option.
 * @param {number} pct
 * @returns {number}
 */
export function getRegieOptionBarWidthPct(pct) {
  return clampPct(pct);
}

/**
 * Libellé votes · % (FR).
 * @param {{ voteCount?: unknown; pct?: unknown }} opt
 * @returns {string}
 */
export function formatRegieOptionStatMeta(opt = {}) {
  const votes = Math.max(0, Number(opt.voteCount) || 0);
  const pct = clampPct(opt.pct);
  const pctLabel = Number(pct).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });
  return `${votes} · ${pctLabel}%`;
}

/**
 * Style track / fill des barres régie (réemploi panneau « Réponses en direct »).
 * @param {{ pct?: unknown; highlight?: boolean }} [input]
 */
export function getRegieOptionStatBarStyles(input = {}) {
  const widthPct = getRegieOptionBarWidthPct(input.pct);
  const highlight = Boolean(input.highlight);
  return {
    track: {
      height: "7px",
      borderRadius: "999px",
      background: "#dbeafe",
      overflow: "hidden",
    },
    fill: {
      width: `${widthPct}%`,
      height: "100%",
      borderRadius: "999px",
      background: highlight ? "#16a34a" : "#2563eb",
    },
  };
}
