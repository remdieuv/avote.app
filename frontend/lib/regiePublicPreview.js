/**
 * Aperçu public régie — helpers purs (responsive + non-régression).
 */

/**
 * Titre « Ce que voit votre audience ».
 * @param {boolean} desktop
 */
export function getRegiePublicPreviewTitleFontSize(desktop) {
  return desktop === true ? "0.94rem" : "0.84rem";
}

/**
 * Inset iframe / fallback erreur sous la barre d’en-tête de l’aperçu.
 * @param {boolean} desktop
 */
export function getRegiePublicPreviewFrameInset(desktop) {
  return desktop === true ? "5.4rem 1rem 1rem" : "6rem 0.8rem 0.8rem";
}
