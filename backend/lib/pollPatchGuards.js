/**
 * Guards purs pour PATCH /polls/:id — soft vs sensible / options, TEST vs RÉEL.
 */

/**
 * @param {unknown} n
 * @returns {number}
 */
function asNonNegInt(n) {
  const v = Math.max(0, Math.trunc(Number(n) || 0));
  return Number.isFinite(v) ? v : 0;
}

const POLL_OPTIONS_MIN = 2;
const POLL_OPTIONS_MAX = 32;

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizePollOptionLabels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === "string" ? x.trim() : String(x ?? "").trim()))
    .filter(Boolean);
}

/**
 * @param {unknown} raw
 * @returns {{ ok: boolean; error: string | null; labels: string[] }}
 */
function validatePollOptionLabels(raw) {
  const labels = normalizePollOptionLabels(raw);
  if (labels.length < POLL_OPTIONS_MIN) {
    return {
      ok: false,
      error: "Au moins 2 réponses non vides.",
      labels,
    };
  }
  if (labels.length > POLL_OPTIONS_MAX) {
    return {
      ok: false,
      error: "Maximum 32 réponses.",
      labels,
    };
  }
  return { ok: true, error: null, labels };
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   isLiveConsumed?: unknown;
 *   voteCount?: unknown;
 *   quizRevealed?: unknown;
 *   wantsQuizCorrectChange?: unknown;
 *   wantsOptionsChange?: unknown;
 * }} [input]
 * @returns {{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   blockQuizCorrect: boolean;
 *   blockOptions: boolean;
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
  const wantsOptionsChange = Boolean(input.wantsOptionsChange);
  const softEditWithVotes = voteCount > 0;

  if (isLocked) {
    return {
      ok: false,
      status: 403,
      error: "Cet événement est terminé et ne peut plus être modifié.",
      blockQuizCorrect: true,
      blockOptions: true,
      softEditWithVotes,
      isTestMode,
    };
  }

  if (wantsOptionsChange && voteCount > 0) {
    return {
      ok: false,
      status: 409,
      error: isTestMode
        ? "Des votes existent en mode test. Utilisez « Rejouer cette question » avant de modifier les réponses."
        : "En mode réel, les réponses ne peuvent plus être modifiées après des votes.",
      blockQuizCorrect: true,
      blockOptions: true,
      softEditWithVotes,
      isTestMode,
    };
  }

  // Réécriture d’options (voteCount === 0) porte isCorrect ; ne pas bloquer pour révélation.
  const blockQuizCorrect =
    isLiveConsumed &&
    wantsQuizCorrectChange &&
    !wantsOptionsChange &&
    (voteCount > 0 || quizRevealed);

  if (blockQuizCorrect) {
    return {
      ok: false,
      status: 409,
      error:
        voteCount > 0
          ? "En mode réel, la bonne réponse ne peut plus être modifiée après des votes."
          : "En mode réel, la bonne réponse ne peut plus être modifiée après révélation.",
      blockQuizCorrect: true,
      blockOptions: false,
      softEditWithVotes,
      isTestMode,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    blockQuizCorrect: false,
    blockOptions: false,
    softEditWithVotes,
    isTestMode,
  };
}

/**
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

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string | null | undefined} pollType
 */
function pollPatchRequestsOptionsChange(body, pollType) {
  const type = String(pollType || "").toUpperCase();
  if (type === "CONTEST_ENTRY") return false;
  const b = body && typeof body === "object" ? body : {};
  return Array.isArray(b.options);
}

module.exports = {
  evaluatePollPatchGuards,
  pollPatchRequestsSoftFields,
  pollPatchRequestsQuizCorrectChange,
  pollPatchRequestsOptionsChange,
  normalizePollOptionLabels,
  validatePollOptionLabels,
  POLL_OPTIONS_MIN,
  POLL_OPTIONS_MAX,
};
