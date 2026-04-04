/**
 * Modulation visuelle des états live, dérivée du thème (accent / palette).
 * Ne remplace pas la customization événement : elle l’intensifie ou l’adoucit.
 */

/**
 * @typedef {'join'|'poll'|'screen'} LiveVisualSurface
 * @typedef {'neutral'|'dynamic'|'highlight'|'soft'|'conclusion'} LiveVisualTone
 */

/** @type {Record<LiveVisualTone, {
 *   borderAccentMixPct: number;
 *   shadowScale: number;
 *   cardAccentTintPct: number;
 *   stateBadgeWeight: number;
 *   ctaScale: number;
 *   pulseAllowed: boolean;
 *   titleClampMul: number;
 *   shellBorderExtraPx: number;
 * }>} */
const TONE_CORE = {
  neutral: {
    borderAccentMixPct: 14,
    shadowScale: 1,
    cardAccentTintPct: 0,
    stateBadgeWeight: 800,
    ctaScale: 1,
    pulseAllowed: true,
    titleClampMul: 1,
    shellBorderExtraPx: 0,
  },
  dynamic: {
    borderAccentMixPct: 44,
    shadowScale: 1.1,
    cardAccentTintPct: 5,
    stateBadgeWeight: 900,
    ctaScale: 1.06,
    pulseAllowed: false,
    titleClampMul: 1.06,
    shellBorderExtraPx: 1,
  },
  highlight: {
    borderAccentMixPct: 34,
    shadowScale: 1.06,
    cardAccentTintPct: 3,
    stateBadgeWeight: 800,
    ctaScale: 1,
    pulseAllowed: false,
    titleClampMul: 1.12,
    shellBorderExtraPx: 2,
  },
  soft: {
    borderAccentMixPct: 8,
    shadowScale: 0.78,
    cardAccentTintPct: 0,
    stateBadgeWeight: 700,
    ctaScale: 1,
    pulseAllowed: true,
    titleClampMul: 0.94,
    shellBorderExtraPx: 0,
  },
  conclusion: {
    borderAccentMixPct: 22,
    shadowScale: 0.9,
    cardAccentTintPct: 0,
    stateBadgeWeight: 800,
    ctaScale: 1,
    pulseAllowed: false,
    titleClampMul: 1,
    shellBorderExtraPx: 0,
  },
};

/**
 * @param {LiveVisualTone} tone
 * @param {LiveVisualSurface} surface
 */
export function getLiveStateVisualTokens(tone, surface) {
  const core = TONE_CORE[tone] ?? TONE_CORE.neutral;
  let shadowScale = core.shadowScale;
  let ctaScale = core.ctaScale;
  let titleClampMul = core.titleClampMul;
  let borderMix = core.borderAccentMixPct;

  if (surface === "join") {
    shadowScale *= 0.94;
    titleClampMul *= 0.98;
    borderMix = Math.max(6, borderMix - 4);
    if (tone === "dynamic") ctaScale *= 1.04;
  } else if (surface === "poll") {
    shadowScale *= 1.05;
    titleClampMul *= 1.02;
    borderMix += tone === "dynamic" ? 4 : tone === "highlight" ? 2 : 0;
    if (tone === "dynamic") ctaScale *= 1.1;
  } else if (surface === "screen") {
    shadowScale *= 1.22;
    titleClampMul *= 1.18;
    borderMix += 6;
  }

  const shellBorderExtraPx =
    surface === "screen" ? core.shellBorderExtraPx + 1 : core.shellBorderExtraPx;

  return {
    ...core,
    borderAccentMixPct: Math.min(55, borderMix),
    shadowScale,
    ctaScale,
    titleClampMul,
    shellBorderExtraPx,
  };
}

/**
 * Bordure carte / panneau : mélange accent + couleur de base (palette).
 * @param {string} baseBorderCss
 * @param {string} accentHex
 * @param {number} mixPct
 */
export function mergeCardBorderWithAccent(baseBorderCss, accentHex, mixPct) {
  return `1px solid color-mix(in srgb, ${accentHex} ${mixPct}%, ${baseBorderCss})`;
}

/**
 * Fond carte : léger voile teinté par l’accent (0 = inchangé).
 */
export function mixCardBackground(cardBgCss, accentHex, tintPct, isDark) {
  if (!tintPct || tintPct <= 0) return cardBgCss;
  const p = Math.min(12, tintPct);
  return `color-mix(in srgb, ${accentHex} ${isDark ? p : p * 0.65}%, ${cardBgCss})`;
}

/**
 * @param {{
 *   palette: { cardBg: string; cardBorder: string };
 *   isDark: boolean;
 *   accent: string;
 *   tokens: ReturnType<typeof getLiveStateVisualTokens>;
 * }} p
 */
export function buildJoinPollCardSurfaces(p) {
  const { palette, isDark, accent, tokens } = p;
  const y = Math.round(24 * tokens.shadowScale);
  const spread = Math.round(isDark ? y * 2 : y * 1.35);
  const alpha = isDark
    ? Math.min(0.52, 0.3 + tokens.shadowScale * 0.05)
    : Math.min(0.14, 0.07 + tokens.shadowScale * 0.035);

  const boxShadow = isDark
    ? `0 ${y}px ${spread}px rgba(0,0,0,${alpha}), inset 0 1px 0 rgba(255,255,255,0.06)`
    : `0 ${y}px ${spread}px rgba(15,23,42,${alpha}), inset 0 1px 0 rgba(255,255,255,0.88)`;

  const border = mergeCardBorderWithAccent(
    palette.cardBorder,
    accent,
    tokens.borderAccentMixPct,
  );
  const background = mixCardBackground(
    palette.cardBg,
    accent,
    tokens.cardAccentTintPct,
    isDark,
  );

  return { boxShadow, border, background };
}

/**
 * Typo badge d’état (petites caps) — poids selon le tone.
 * @param {ReturnType<typeof getLiveStateVisualTokens>} tokens
 */
export function stateBadgeTypography(tokens) {
  return {
    fontWeight: tokens.stateBadgeWeight,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  };
}

/**
 * Bandeau supérieur /screen : accent déjà issu de la customization, renforcé par le tone.
 * @param {string} roomTopAccent
 * @param {ReturnType<typeof getLiveStateVisualTokens>} tokens
 */
export function screenShellTopBorderStyle(roomTopAccent, tokens) {
  const w = 5 + tokens.shellBorderExtraPx;
  const mix = Math.min(70, 38 + tokens.borderAccentMixPct * 0.45);
  return {
    borderTopWidth: w,
    borderTopStyle: "solid",
    borderTopColor: `color-mix(in srgb, ${roomTopAccent} ${mix}%, #334155)`,
  };
}

/**
 * Titres plein écran /screen (multiplicateur sur clamp vw).
 * @param {ReturnType<typeof getLiveStateVisualTokens>} tokens
 */
export function screenStateTitleFontSizeClamp(tokens) {
  const m = tokens.titleClampMul;
  return {
    fontSize: `clamp(${(2 * m).toFixed(2)}rem, ${(7 * m).toFixed(2)}vw, ${(5 * m).toFixed(2)}rem)`,
  };
}

/**
 * Sous-titre état /screen : adoucir en pause / conclusion.
 * @param {LiveVisualTone} tone
 */
export function screenStateSubtitleOpacity(tone) {
  if (tone === "soft") return 0.72;
  if (tone === "conclusion") return 0.8;
  if (tone === "highlight") return 0.95;
  return 0.88;
}
