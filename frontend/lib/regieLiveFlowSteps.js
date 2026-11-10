/**
 * Lot 4 UX — repères de déroulement régie (copy uniquement).
 * Réutilise getRegiePrimaryLiveAction : aucun nouvel état métier.
 */

import {
  getRegiePrimaryLiveAction,
  getRegiePrimaryLiveActionLabel,
} from "./regieDesktopLayout.js";

/**
 * Ordre réel du moteur : préparer → ouvrir → fermer → résultats → terminer.
 * (Ne pas inverser Fermer / Afficher.)
 * @typedef {'prepare'|'open'|'close'|'results'|'finish'} RegieLiveFlowStepId
 */

/** @type {ReadonlyArray<{ id: RegieLiveFlowStepId; label: string; shortLabel: string }>} */
export const REGIE_LIVE_FLOW_STEPS = Object.freeze([
  {
    id: "prepare",
    label: "Préparer l’événement",
    shortLabel: "Préparer",
  },
  {
    id: "open",
    label: "Ouvrir le vote",
    shortLabel: "Ouvrir",
  },
  {
    id: "close",
    label: "Fermer le vote",
    shortLabel: "Fermer",
  },
  {
    id: "results",
    label: "Afficher les résultats",
    shortLabel: "Résultats",
  },
  {
    id: "finish",
    label: "Terminer l’événement",
    shortLabel: "Terminer",
  },
]);

export const REGIE_CLOSE_VS_FINISH_HINT =
  "Fermer le vote arrête seulement la question en cours. Terminer l’événement clôture tout le live.";

export const REGIE_CLOSE_VOTE_TITLE =
  "Ferme le vote de la question en cours. L’événement continue — vous pourrez afficher les résultats.";

export const REGIE_FINISH_EVENT_TITLE =
  "Clôture définitive de l’événement. Plus de vote ni de question suivante.";

/**
 * @returns {{
 *   screen: { title: string; body: string };
 *   telecommande: { title: string; body: string };
 *   qr: { title: string; body: string };
 *   chrono: { title: string; body: string };
 * }}
 */
export function getRegieToolGlossary() {
  return {
    screen: {
      title: "Écran de projection",
      body: "Page /screen pour la salle ou OBS — ce que voit le public pendant le live.",
    },
    telecommande: {
      title: "Télécommande",
      body: "Piloter ouvrir / fermer / suivante depuis le téléphone, sans l’ordinateur.",
    },
    qr: {
      title: "QR de participation",
      body: "Lien et QR pour que les participants rejoignent la salle et votent.",
    },
    chrono: {
      title: "Chronomètre",
      body: "Décompte optionnel à l’écran pendant le vote (scène).",
    },
  };
}

/**
 * @param {{ inTestMode?: boolean | null }} [args]
 * @returns {string}
 */
export function getRegieLiveFlowModeLine(args = {}) {
  if (args.inTestMode === true) {
    return "MODE TEST — enchaînez ces étapes librement ; aucune activation consommée.";
  }
  return "MODE RÉEL — mêmes étapes ; l’audience et les résultats comptent pour le live.";
}

/**
 * Index d’étape (0–4) aligné sur le CTA primaire existant.
 * @param {{
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   pollStatus?: string | null;
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 *   contestQuotaReached?: boolean;
 *   eventFinished?: boolean;
 *   hasActivePoll?: boolean;
 *   hasNextPoll?: boolean;
 * }} input
 * @returns {{
 *   currentIndex: number;
 *   currentId: RegieLiveFlowStepId;
 *   primary: ReturnType<typeof getRegiePrimaryLiveAction>;
 *   steps: typeof REGIE_LIVE_FLOW_STEPS;
 *   completed: boolean;
 * }}
 */
export function deriveRegieLiveFlowStep(input = {}) {
  const primary = getRegiePrimaryLiveAction(input);
  if (input.eventFinished === true) {
    return {
      currentIndex: 4,
      currentId: "finish",
      primary: null,
      steps: REGIE_LIVE_FLOW_STEPS,
      completed: true,
    };
  }

  /** @type {number} */
  let currentIndex = 0;
  switch (primary) {
    case "open":
      currentIndex = 1;
      break;
    case "close":
      currentIndex = 2;
      break;
    case "show-results":
      currentIndex = 3;
      break;
    case "draw":
    case "next":
      currentIndex = 3;
      break;
    case "finish":
      currentIndex = 4;
      break;
    default:
      currentIndex = 0;
  }

  return {
    currentIndex,
    currentId: REGIE_LIVE_FLOW_STEPS[currentIndex].id,
    primary,
    steps: REGIE_LIVE_FLOW_STEPS,
    completed: false,
  };
}

/**
 * Prochaine action lisible (repère sous le stepper).
 * @param {{
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   pollStatus?: string | null;
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 *   contestQuotaReached?: boolean;
 *   eventFinished?: boolean;
 *   hasActivePoll?: boolean;
 *   hasNextPoll?: boolean;
 *   pendingAutoReveal?: boolean;
 * }} input
 * @returns {string}
 */
export function getRegieLiveFlowNextHint(input = {}) {
  if (input.eventFinished === true) {
    return "Événement terminé — plus d’action live.";
  }
  const primary = getRegiePrimaryLiveAction(input);
  if (!primary) {
    return "Aucune action live disponible.";
  }
  const label = getRegiePrimaryLiveActionLabel(primary, {
    pendingAutoReveal: input.pendingAutoReveal === true,
  });
  if (primary === "open") {
    return `Prochaine action : ${label} — les participants pourront répondre.`;
  }
  if (primary === "close") {
    return `Prochaine action : ${label} — puis afficher les résultats.`;
  }
  if (primary === "show-results") {
    return `Prochaine action : ${label} — visible à la salle et à l’écran.`;
  }
  if (primary === "next") {
    return `Prochaine action : ${label} — prépare la question sans ouvrir le vote.`;
  }
  if (primary === "draw") {
    return `Prochaine action : ${label} — puis enchaînez ou terminez.`;
  }
  if (primary === "finish") {
    return `Prochaine action : ${label} — clôture définitive du live.`;
  }
  return `Prochaine action : ${label}`;
}

/**
 * Title / aria pour le CTA primaire (Fermer vs Terminer clarifiés).
 * @param {ReturnType<typeof getRegiePrimaryLiveAction>} action
 * @param {{ openTitle?: string | null }} [opts]
 * @returns {string | undefined}
 */
export function getRegiePrimaryLiveActionTitle(action, opts = {}) {
  if (action === "close") return REGIE_CLOSE_VOTE_TITLE;
  if (action === "finish") return REGIE_FINISH_EVENT_TITLE;
  if (action === "open" && opts.openTitle) return String(opts.openTitle);
  return undefined;
}
