/**
 * LOT-4 correctif — « Rejouer la question » (MODE TEST uniquement).
 * Helpers purs : éligibilité, confirmation, plan de suppression, patch événement.
 *
 * Décision antenne (documentée) : après rejeu, la question rejouée devient
 * l’antenne en état PRÉPARÉ (WAITING × vote CLOSED) sans ouvrir le vote —
 * l’organisateur clique ensuite « Ouvrir ». Les autres questions sont intactes.
 */

/**
 * @param {{ type?: string | null; leadEnabled?: boolean | null }} poll
 */
export function isReplayContestPoll(poll = {}) {
  return String(poll.type ?? "").toUpperCase() === "CONTEST_ENTRY";
}

/**
 * @param {{ type?: string | null; leadEnabled?: boolean | null }} poll
 */
export function isReplayLeadPoll(poll = {}) {
  return Boolean(poll.leadEnabled) && !isReplayContestPoll(poll);
}

/**
 * Question déjà jouée (éligible au rejeu) : fermée / données de participation.
 * @param {{
 *   status?: string | null;
 *   voteCount?: number | null;
 *   leadCount?: number | null;
 *   contestDrawCount?: number | null;
 * }} poll
 */
export function isPollAlreadyPlayedForReplay(poll = {}) {
  const status = String(poll.status ?? "").toUpperCase();
  if (status === "ARCHIVED") return false;
  if (status === "CLOSED") return true;
  if (Math.max(0, Number(poll.voteCount) || 0) > 0) return true;
  if (Math.max(0, Number(poll.leadCount) || 0) > 0) return true;
  if (Math.max(0, Number(poll.contestDrawCount) || 0) > 0) return true;
  return false;
}

/**
 * @param {{
 *   isTestMode?: boolean;
 *   voteState?: string | null;
 *   eventFinished?: boolean;
 *   eventLocked?: boolean;
 *   busy?: boolean;
 *   poll?: object | null;
 * }} input
 * @returns {{ ok: boolean; reason: string | null }}
 */
export function canOfferReplayTestPoll(input = {}) {
  if (input.isTestMode !== true) {
    return { ok: false, reason: "real_mode_forbidden" };
  }
  if (input.eventLocked === true || input.eventFinished === true) {
    return { ok: false, reason: "event_finished" };
  }
  if (String(input.voteState ?? "").toLowerCase() === "open") {
    return { ok: false, reason: "vote_open" };
  }
  if (input.busy === true) {
    return { ok: false, reason: "busy" };
  }
  if (!input.poll || !isPollAlreadyPlayedForReplay(input.poll)) {
    return { ok: false, reason: "not_played" };
  }
  return { ok: true, reason: null };
}

/**
 * Inventaire des suppressions (pour confirmation + tests isolation).
 * @param {{ type?: string | null; leadEnabled?: boolean | null }} poll
 * @returns {{
 *   deleteVotes: boolean;
 *   deleteLeads: boolean;
 *   deleteContestDrawsAndWinners: boolean;
 *   resetQuizRevealed: boolean;
 *   otherPollsUntouched: true;
 * }}
 */
export function getReplayTestPollDeletionPlan(poll = {}) {
  const contest = isReplayContestPoll(poll);
  const lead = isReplayLeadPoll(poll);
  const quiz = String(poll.type ?? "").toUpperCase() === "QUIZ";
  return {
    deleteVotes: true,
    deleteLeads: lead || contest,
    deleteContestDrawsAndWinners: contest,
    resetQuizRevealed: quiz,
    otherPollsUntouched: true,
  };
}

/**
 * Lignes FR listant ce qui sera définitivement supprimé.
 * @param {{ type?: string | null; leadEnabled?: boolean | null; question?: string | null; title?: string | null }} poll
 * @returns {string[]}
 */
export function getReplayTestPollDeletionLines(poll = {}) {
  const plan = getReplayTestPollDeletionPlan(poll);
  /** @type {string[]} */
  const lines = [
    "Tous les votes et réponses TEST de cette question uniquement",
  ];
  if (plan.deleteLeads && isReplayLeadPoll(poll)) {
    lines.push("Toutes les captures Lead CRM liées à cette question");
  }
  if (plan.deleteContestDrawsAndWinners) {
    lines.push(
      "Toutes les inscriptions Concours, tirages et historique de gagnants de cette question",
    );
  }
  if (plan.deleteLeads && isReplayContestPoll(poll)) {
    lines.push("Les formulaires d’éligibilité Concours liés à cette question");
  }
  if (plan.resetQuizRevealed) {
    lines.push("La révélation de la bonne réponse (Quiz) sera annulée");
  }
  lines.push(
    "Les résultats projetés de cette question (Screen / Overlay / Salle) seront effacés",
  );
  lines.push("Les autres questions et leurs données restent intactes");
  return lines;
}

/**
 * Message de confirmation explicite (window.confirm).
 * @param {{ type?: string | null; leadEnabled?: boolean | null; question?: string | null; title?: string | null }} poll
 */
export function getReplayTestPollConfirmMessage(poll = {}) {
  const title = String(poll.question || poll.title || "cette question").trim();
  const lines = getReplayTestPollDeletionLines(poll);
  return [
    `Rejouer la question (MODE TEST) ?`,
    ``,
    `« ${title} »`,
    ``,
    `Seront définitivement supprimés :`,
    ...lines.map((l) => `• ${l}`),
    ``,
    `La question repassera en attente d’ouverture (vote non ouvert).`,
    `Cette action est impossible en mode RÉEL.`,
  ].join("\n");
}

/**
 * Patch événement après rejeu = préparation antenne (comme Suivante), sans OPEN.
 * @param {{
 *   pollId: string;
 *   screenDisplayState?: string | null;
 * }} input
 */
export function buildReplayTestPollEventPatch(input) {
  const pollId = String(input.pollId || "").trim();
  const sds = String(input.screenDisplayState ?? "").toUpperCase();
  /** @type {Record<string, unknown>} */
  const data = {
    activePollId: pollId,
    voteState: "CLOSED",
    displayState: "WAITING",
    liveState: "WAITING",
    autoRevealShowResultsAt: null,
    questionTimerTotalSec: null,
    questionTimerAccumulatedSec: 0,
    questionTimerStartedAt: null,
    questionTimerIsPaused: true,
  };
  // Nettoyer RESULTS collant ; préserver BLACK (projection avancée)
  if (sds === "RESULTS") {
    data.screenDisplayState = null;
  } else if (sds !== "BLACK") {
    data.screenDisplayState = null;
  }
  return data;
}

/**
 * Raisons UI (tooltips).
 * @param {string | null} reason
 */
export function getReplayTestPollBlockedLabel(reason) {
  switch (reason) {
    case "real_mode_forbidden":
      return "Disponible uniquement en MODE TEST.";
    case "vote_open":
      return "Impossible pendant qu’un vote est ouvert.";
    case "busy":
      return "Une opération Live est déjà en cours.";
    case "event_finished":
      return "Événement terminé ou verrouillé.";
    case "not_played":
      return "Cette question n’a pas encore été jouée.";
    default:
      return "";
  }
}
