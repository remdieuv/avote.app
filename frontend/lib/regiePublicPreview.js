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
 * Calcule la taille du cadre smartphone pour tenir dans l’espace disponible
 * (contain, sans déformation, plafonné au design).
 *
 * @param {number} availableWidth
 * @param {number} availableHeight
 * @param {{ padX?: number; padY?: number; minWidth?: number }} [options]
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

  const maxW = Math.max(1, Number(availableWidth) - padX);
  const maxH = Math.max(1, Number(availableHeight) - padY);

  let width = Math.min(designW, maxW);
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }

  // Remonter vers minWidth seulement si ça tient encore dans la boîte.
  if (width < minWidth) {
    const minH = minWidth / aspect;
    if (minWidth <= maxW && minH <= maxH) {
      width = minWidth;
      height = minH;
    }
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

/**
 * Styles du plateau (centre le téléphone).
 * @returns {Record<string, string | number>}
 */
export function getRegiePublicPreviewPhoneStageStyle() {
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
    maxHeight: "100%",
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
 * @deprecated Remplacé par le cadre smartphone centré — conservé pour imports éventuels.
 * @param {boolean} desktop
 */
export function getRegiePublicPreviewFrameInset(desktop) {
  return desktop === true ? "5.4rem 1rem 1rem" : "6rem 0.8rem 0.8rem";
}
