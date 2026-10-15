/**
 * Aperçu public régie — helpers purs (responsive + cadre smartphone).
 */

/** Dimensions design iPhone-ish (logical CSS px). */
export const REGIE_PUBLIC_PREVIEW_PHONE_DESIGN = {
  width: 390,
  height: 844,
};

/**
 * Titre « Ce que voit votre audience ».
 * @param {boolean} desktop
 */
export function getRegiePublicPreviewTitleFontSize(desktop) {
  return desktop === true ? "0.94rem" : "0.84rem";
}

/**
 * Calcule la taille du cadre smartphone.
 *
 * - `mode: "width"` (défaut desktop / below) : largeur prioritaire ≈ 390 px,
 *   hauteur dérivée — le panneau s’adapte, la régie peut scroller.
 * - `mode: "contain"` (drawer mobile plein écran) : fit dans largeur × hauteur.
 *
 * @param {number} availableWidth
 * @param {number} availableHeight
 * @param {{
 *   padX?: number;
 *   padY?: number;
 *   minWidth?: number;
 *   mode?: "width" | "contain";
 * }} [options]
 * @returns {{ width: number; height: number }}
 */
export function computeRegiePublicPreviewPhoneSize(
  availableWidth,
  availableHeight,
  options = {},
) {
  const designW = REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.width;
  const designH = REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.height;
  const aspect = designW / designH;
  const padX = Math.max(
    0,
    Number.isFinite(Number(options.padX)) ? Number(options.padX) : 24,
  );
  const padY = Math.max(
    0,
    Number.isFinite(Number(options.padY)) ? Number(options.padY) : 16,
  );
  const minWidth = Math.max(
    120,
    Number.isFinite(Number(options.minWidth))
      ? Number(options.minWidth)
      : 240,
  );
  const mode = options.mode === "contain" ? "contain" : "width";

  const maxW = Math.max(1, Number(availableWidth) - padX);
  let width = Math.min(designW, maxW);
  let height = width / aspect;

  if (mode === "contain") {
    const maxH = Math.max(1, Number(availableHeight) - padY);
    if (height > maxH) {
      height = maxH;
      width = height * aspect;
    }
    if (width < minWidth) {
      const minH = minWidth / aspect;
      if (minWidth <= maxW && minH <= maxH) {
        width = minWidth;
        height = minH;
      }
    }
  } else {
    // Largeur prioritaire : ne pas réduire pour « tenir » en hauteur.
    if (width < minWidth && minWidth <= maxW) {
      width = Math.min(designW, minWidth);
      height = width / aspect;
    }
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

/**
 * Mode de fit selon le layout d’intégration.
 * @param {"beside" | "below" | "drawer" | string | null | undefined} layout
 * @returns {"width" | "contain"}
 */
export function getRegiePublicPreviewFitMode(layout) {
  return String(layout || "").toLowerCase() === "drawer" ? "contain" : "width";
}

/**
 * Styles du plateau (centre le téléphone).
 * @param {{ naturalHeight?: boolean }} [options]
 * @returns {Record<string, string | number>}
 */
export function getRegiePublicPreviewPhoneStageStyle(options = {}) {
  const natural = options.naturalHeight !== false;
  if (natural) {
    return {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.65rem 1rem 1.15rem",
      boxSizing: "border-box",
      flex: "0 0 auto",
    };
  }
  return {
    flex: 1,
    minHeight: 0,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.65rem 1rem 1rem",
    boxSizing: "border-box",
  };
}

/**
 * Styles du cadre smartphone (taille déjà calculée).
 * @param {{ width: number; height: number }} size
 * @returns {Record<string, string | number>}
 */
export function getRegiePublicPreviewPhoneFrameStyle(size) {
  const width = Math.max(1, Number(size?.width) || 0);
  const height = Math.max(1, Number(size?.height) || 0);
  return {
    width,
    height,
    maxWidth: "100%",
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow:
      "0 22px 48px rgba(2, 6, 23, 0.40), inset 0 0 0 1px rgba(255,255,255,0.04)",
    boxSizing: "border-box",
  };
}

/**
 * Shell du panel : below/beside grandissent avec le téléphone (scroll régie).
 * Drawer reste contraint à l’écran.
 * @param {{
 *   layout?: string | null;
 *   fused?: boolean;
 *   phoneHeight?: number;
 * }} input
 * @returns {Record<string, string | number>}
 */
export function getRegiePublicPreviewShellStyle(input = {}) {
  const layout = String(input.layout || "").toLowerCase();
  const fused = input.fused === true;
  const phoneH = Math.max(0, Number(input.phoneHeight) || 0);
  /** En-tête panel + paddings ≈ 7.5rem */
  const naturalMin =
    phoneH > 0 ? Math.round(phoneH + 120) : fused ? 720 : 680;

  if (layout === "drawer") {
    return {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0,
      flex: 1,
    };
  }
  if (layout === "beside") {
    return {
      flex: fused ? "0 0 40%" : "0 0 34%",
      minWidth: "min(100%, 320px)",
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      minHeight: naturalMin,
    };
  }
  // below (desktop fused) — pas de maxHeight : la page régie scrolle
  return {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    minHeight: naturalMin,
  };
}
