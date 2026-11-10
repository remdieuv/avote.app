/**
 * Lot 3 UX — libellés Fil / souvenirs selon phase Page de l’événement.
 * Pas de règle d’accès ni de stockage : copy uniquement.
 */

/** @typedef {'before'|'during'|'after'} EventLandingPhase */

/**
 * @param {unknown} phase
 * @returns {EventLandingPhase}
 */
export function normalizeLandingFeedPhase(phase) {
  const p = String(phase || "").toLowerCase();
  if (p === "during" || p === "after") return p;
  return "before";
}

/**
 * Sous-titre de la section Fil.
 * @param {{ phase?: unknown }} [args]
 */
export function getLandingFeedSubtitle(args = {}) {
  const phase = normalizeLandingFeedPhase(args.phase);
  if (phase === "after") {
    return "Souvenirs, photos et résultats conservés après l’événement.";
  }
  if (phase === "during") {
    return "Photos, messages et résultats en direct — du plus récent au plus ancien.";
  }
  return "Souvenirs et résultats apparaîtront ici pendant et après le live.";
}

/**
 * Message d’état vide du Fil.
 * @param {{
 *   phase?: unknown;
 *   canUpload?: boolean | null;
 * }} [args]
 * @returns {string}
 */
export function getLandingFeedEmptyHint(args = {}) {
  const phase = normalizeLandingFeedPhase(args.phase);
  const canUpload = args.canUpload === true;
  if (phase === "after") {
    return canUpload
      ? "Aucun souvenir pour l’instant — vous pouvez encore ajouter une photo ici."
      : "Aucun souvenir publié pour cet événement.";
  }
  if (phase === "during") {
    return canUpload
      ? "Le fil est encore vide — partagez une photo : elle apparaîtra ici avec les résultats."
      : "Le fil est encore vide — photos et résultats apparaîtront ici en direct.";
  }
  // before
  return canUpload
    ? "Rien pour le moment — vous pouvez préparer une photo pour le journal ; le live n’a pas encore commencé."
    : "Rien pour le moment — le journal se remplira pendant et après le live.";
}

/**
 * CTA partage photo (desktop + FAB).
 * @param {{ phase?: unknown }} [args]
 * @returns {{ label: string; title: string; ariaLabel: string }}
 */
export function getLandingFeedShareCopy(args = {}) {
  const phase = normalizeLandingFeedPhase(args.phase);
  if (phase === "after") {
    return {
      label: "Ajouter un souvenir",
      title: "Ajouter une photo aux souvenirs de l’événement",
      ariaLabel: "Ajouter un souvenir",
    };
  }
  if (phase === "during") {
    return {
      label: "Partager une photo",
      title: "Partager une photo dans le fil en direct",
      ariaLabel: "Partager une photo",
    };
  }
  return {
    label: "Ajouter une photo au journal",
    title: "Photo pour le journal — l’événement n’a pas encore commencé",
    ariaLabel: "Ajouter une photo au journal (avant le live)",
  };
}

/**
 * Accroche section « ✨ L'événement » (infos / programme — pas le Fil).
 * @param {{ phase?: unknown }} [args]
 */
export function getLandingEvenementLead(args = {}) {
  const phase = normalizeLandingFeedPhase(args.phase);
  if (phase === "after") {
    return "Infos et programme de l’événement. Les souvenirs et résultats sont dans le fil ci-dessous.";
  }
  if (phase === "during") {
    return "Infos pratiques et programme — le live et les souvenirs se suivent dans le fil.";
  }
  return "Infos pratiques, date, lieu et programme — distincts du journal de souvenirs.";
}

/**
 * Afficher le bloc Fil même sans items.
 * @param {{
 *   phase?: unknown;
 *   hasItems?: boolean | null;
 *   canUpload?: boolean | null;
 * }} [args]
 */
export function shouldShowLandingFeedBlock(args = {}) {
  if (args.hasItems === true) return true;
  if (args.canUpload === true) return true;
  const phase = normalizeLandingFeedPhase(args.phase);
  return phase === "during" || phase === "after";
}
