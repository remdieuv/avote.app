/**
 * Guards purs pour PATCH /polls/:id — soft vs sensible, TEST vs RÉEL.
 */

/**
 * @param {unknown} n
 * @returns {number}
 */
function asNonNegInt(n) {
  const v = Math.max(0, Math.trunc(Number(n) || 0));
  return Number.isFinite(v) ? v : 0;
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   isLiveConsumed?: unknown;
 *   voteCount?: unknown;
 *   quizRevealed?: unknown;
 *   wantsQuizCorrectChange?: unknown;
 * }} [input]
 * @returns {{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   blockQuizCorrect: boolean;
 *   softEditWithVotes: boolean;
 *   isTestMode: boolean;
 * }}
 */
function evaluatePollPatchGuards(input = {}) {
  const isLocked = Boolean(input.isLocked);
  const isLiveConsumed = input.isLiveConsumed === true;
  const isTestMode = input.isLiveConsumed === false;
  const voteCount = asNonNegInt(input.voteCount);
  const quizRevealed = Boolean(input.quizRevealed);
  const wantsQuizCorrectChange = Boolean(input.wantsQuizCorrectChange);
  const softEditWithVotes = voteCount > 0;

  if (isLocked) {
    return {
      ok: false,
      status: 403,
      error: "Cet événement est terminé et ne peut plus être modifié.",
      blockQuizCorrect: true,
      softEditWithVotes,
      isTestMode,
    };
  }

  const blockQuizCorrect =
    isLiveConsumed && wantsQuizCorrectChange && (voteCount > 0 || quizRevealed);

  if (blockQuizCorrect) {
    return {
      ok: false,
      status: 409,
      error:
        voteCount > 0
          ? "En mode réel, la bonne réponse ne peut plus être modifiée après des votes."
          : "En mode réel, la bonne réponse ne peut plus être modifiée après révélation.",
      blockQuizCorrect: true,
      softEditWithVotes,
      isTestMode,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    blockQuizCorrect: false,
    softEditWithVotes,
    isTestMode,
  };
}

/**
 * Champs soft acceptés aujourd’hui (hors quizCorrectOrder).
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string | null | undefined} pollType
 */
function pollPatchRequestsSoftFields(body, pollType) {
  const b = body && typeof body === "object" ? body : {};
  if (typeof b.question === "string") return true;
  const type = String(pollType || "").toUpperCase();
  if (type === "CONTEST_ENTRY") {
    if (Object.prototype.hasOwnProperty.call(b, "contestPrize")) return true;
    if (Object.prototype.hasOwnProperty.call(b, "contestWinnerCount")) return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string | null | undefined} pollType
 */
function pollPatchRequestsQuizCorrectChange(body, pollType) {
  if (String(pollType || "").toUpperCase() !== "QUIZ") return false;
  const b = body && typeof body === "object" ? body : {};
  return Object.prototype.hasOwnProperty.call(b, "quizCorrectOrder");
}

module.exports = {
  evaluatePollPatchGuards,
  pollPatchRequestsSoftFields,
  pollPatchRequestsQuizCorrectChange,
};
