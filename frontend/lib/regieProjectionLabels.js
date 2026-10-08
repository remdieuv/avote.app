/**
 * Libellés régie décrivant l’état réel de la projection Screen.
 * Couche présentation uniquement — ne change pas le moteur Live.
 */

/** @type {Record<"question" | "results" | "black" | "waiting", string>} */
export const REGIE_DISPLAY_STATE_LABELS = {
  question: "Question (réponses à l’écran)",
  results: "Résultats (barres)",
  /** Mode Noir / BLACK — écran volontairement vide (≠ attente QR). */
  black: "Noir — écran noir (pause projection).",
  /**
   * WAITING / PRÉPARÉ : Screen affiche l’accueil QR — ce n’est pas un écran vide.
   * Ne jamais annoncer « la salle ne voit rien » ici.
   */
  waiting:
    "Attente — écran d’accueil avec QR. Ouvrez le vote pour afficher la question.",
};

/**
 * @param {string | null | undefined} displayState
 * @returns {string}
 */
export function getRegieDisplayStateLabel(displayState) {
  const k = String(displayState ?? "").toLowerCase().trim();
  if (k && Object.prototype.hasOwnProperty.call(REGIE_DISPLAY_STATE_LABELS, k)) {
    return REGIE_DISPLAY_STATE_LABELS[
      /** @type {keyof typeof REGIE_DISPLAY_STATE_LABELS} */ (k)
    ];
  }
  return String(displayState || "waiting").toUpperCase();
}

/**
 * Indique si l’état projection décrit un accueil QR (WAITING), pas le Noir.
 * @param {string | null | undefined} projectionDisplayState
 */
export function isRegieProjectionWaiting(projectionDisplayState) {
  return String(projectionDisplayState ?? "").toLowerCase() === "waiting";
}

/**
 * Indique le véritable mode Noir / BLACK côté projection.
 * @param {string | null | undefined} projectionDisplayState
 */
export function isRegieProjectionBlack(projectionDisplayState) {
  return String(projectionDisplayState ?? "").toLowerCase() === "black";
}

/**
 * Hint console régie quand aucun poll actif — cohérent avec Screen WAITING.
 * @param {{
 *   projectionDisplayState?: string | null;
 *   eventFinished?: boolean;
 *   eventLocked?: boolean;
 * }} input
 */
export function getRegieIdleProjectionHint(input = {}) {
  if (input.eventLocked) {
    return "Cet événement est terminé. Créez un nouvel événement pour une nouvelle session.";
  }
  if (input.eventFinished) {
    return "Événement terminé — aucune question active.";
  }
  if (isRegieProjectionWaiting(input.projectionDisplayState)) {
    return "Projection en attente — écran QR affiché. Ouvrez le vote pour lancer la question.";
  }
  if (isRegieProjectionBlack(input.projectionDisplayState)) {
    return "Projection en noir — la salle voit un écran noir.";
  }
  return "Aucun contenu synchronisé pour l’instant.";
}
