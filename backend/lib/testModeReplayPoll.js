/**
 * LOT-4 correctif — « Rejouer la question » (MODE TEST uniquement).
 * Miroir CommonJS des helpers FE (éligibilité + patch événement).
 */

function isReplayContestPoll(poll = {}) {
  return String(poll.type ?? "").toUpperCase() === "CONTEST_ENTRY";
}

function isReplayLeadPoll(poll = {}) {
  return Boolean(poll.leadEnabled) && !isReplayContestPoll(poll);
}

function isPollAlreadyPlayedForReplay(poll = {}) {
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
 *   poll?: object | null;
 *   voteCount?: number;
 *   leadCount?: number;
 *   contestDrawCount?: number;
 * }} input
 */
function canReplayTestPollOnServer(input = {}) {
  if (input.isTestMode !== true) {
    return { ok: false, status: 403, error: "Rejeu disponible uniquement en MODE TEST." };
  }
  if (input.eventLocked === true) {
    return { ok: false, status: 403, error: "Événement verrouillé." };
  }
  if (input.eventFinished === true) {
    return { ok: false, status: 400, error: "Événement terminé." };
  }
  if (String(input.voteState ?? "").toUpperCase() === "OPEN") {
    return {
      ok: false,
      status: 409,
      error: "Impossible de rejouer pendant qu’un vote est ouvert.",
    };
  }
  const poll = input.poll
    ? {
        ...input.poll,
        voteCount: input.voteCount ?? input.poll.voteCount,
        leadCount: input.leadCount ?? input.poll.leadCount,
        contestDrawCount:
          input.contestDrawCount ?? input.poll.contestDrawCount,
      }
    : null;
  if (!poll || !isPollAlreadyPlayedForReplay(poll)) {
    return {
      ok: false,
      status: 400,
      error: "Cette question n’a pas encore été jouée.",
    };
  }
  return { ok: true };
}

function getReplayTestPollDeletionPlan(poll = {}) {
  const contest = isReplayContestPoll(poll);
  const lead = isReplayLeadPoll(poll);
  const quiz = String(poll.type ?? "").toUpperCase() === "QUIZ";
  return {
    deleteVotes: true,
    deleteLeads: lead || contest,
    deleteContestDrawsAndWinners: contest,
    resetQuizRevealed: quiz || true,
    otherPollsUntouched: true,
  };
}

/**
 * @param {{ pollId: string; screenDisplayState?: string | null }} input
 */
function buildReplayTestPollEventPatch(input) {
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
  if (sds !== "BLACK") {
    data.screenDisplayState = null;
  }
  return data;
}

module.exports = {
  isReplayContestPoll,
  isReplayLeadPoll,
  isPollAlreadyPlayedForReplay,
  canReplayTestPollOnServer,
  getReplayTestPollDeletionPlan,
  buildReplayTestPollEventPatch,
};
