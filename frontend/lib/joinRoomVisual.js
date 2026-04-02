/**
 * Styles visuels partagés entre la salle /join et la page de vote /p.
 */

/** @param {string | null | undefined} strength */
export function joinRoomOverlayAlpha(strength) {
  const s = String(strength || "").toLowerCase();
  if (s === "low") return 0.3;
  if (s === "strong") return 0.65;
  return 0.48;
}

/**
 * @param {string | null | undefined} themeMode
 * @param {boolean} prefersDark
 */
export function resolveJoinRoomIsDark(themeMode, prefersDark) {
  const resolved = String(themeMode || "").toLowerCase();
  if (resolved === "light") return false;
  if (resolved === "dark") return true;
  return prefersDark;
}

/** @param {string | null | undefined} primaryColor */
export function joinRoomAccent(primaryColor) {
  return primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
    ? primaryColor
    : "#2563eb";
}

/**
 * @param {boolean} isDark
 * @param {string} accent
 */
export function createJoinRoomPalette(isDark, accent) {
  return {
    fg: isDark ? "#f8fafc" : "#0f172a",
    fg2: isDark ? "#e2e8f0" : "#334155",
    muted: isDark ? "#94a3b8" : "#64748b",
    muted2: isDark ? "#cbd5e1" : "#475569",
    cardBg: isDark ? "rgba(15, 23, 42, 0.55)" : "rgba(255,255,255,0.92)",
    cardBorder: isDark
      ? "rgba(148, 163, 184, 0.18)"
      : "rgba(15, 23, 42, 0.12)",
    headerBg: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255,255,255,0.82)",
    headerBorder: isDark
      ? "rgba(148, 163, 184, 0.12)"
      : "rgba(15, 23, 42, 0.08)",
    footerBg: isDark ? "rgba(2, 6, 23, 0.35)" : "rgba(248,250,252,0.92)",
    link: isDark ? "#93c5fd" : accent,
  };
}

/**
 * @param {{
 *   hasBackgroundImage: boolean;
 *   roomSolidColor: string | null;
 *   isDark: boolean;
 *   fg: string;
 * }} p
 */
export function buildJoinRoomShellStyle({
  hasBackgroundImage,
  roomSolidColor,
  isDark,
  fg,
}) {
  const base = {
    minHeight: "100vh",
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
    fontFamily: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    color: fg,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 1,
  };
  if (hasBackgroundImage) {
    return { ...base, backgroundColor: "transparent" };
  }
  const solidBg =
    roomSolidColor && /^#[0-9A-Fa-f]{6}$/.test(roomSolidColor)
      ? roomSolidColor
      : null;
  if (solidBg) {
    return { ...base, backgroundColor: solidBg };
  }
  if (isDark) {
    return {
      ...base,
      background:
        "linear-gradient(165deg, #0b1120 0%, #0f172a 38%, #1e1b4b 100%)",
    };
  }
  return {
    ...base,
    background:
      "linear-gradient(165deg, #f8fafc 0%, #e2e8f0 45%, #f1f5f9 100%)",
  };
}

/**
 * Carte glass central (join) ou panneau vote (aligné, texte à gauche).
 * @param {{
 *   palette: ReturnType<typeof createJoinRoomPalette>;
 *   isDark: boolean;
 *   textAlign?: "left" | "center";
 * }} p
 */
export function glassPanelStyle({ palette, isDark, textAlign = "center" }) {
  return {
    width: "100%",
    maxWidth: "min(42rem, 100%)",
    padding: "clamp(1.35rem, 4vw, 2rem) clamp(1.15rem, 4vw, 1.85rem)",
    borderRadius: "20px",
    border: `1px solid ${palette.cardBorder}`,
    background: palette.cardBg,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: isDark
      ? "0 24px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 20px 40px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255,255,255,0.85)",
    textAlign,
    boxSizing: "border-box",
  };
}
