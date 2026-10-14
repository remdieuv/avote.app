/**
 * Régie — guards UI « Modifier la question » (miroir logique PATCH).
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
 *   isQuiz?: unknown;
 * }} [input]
 * @returns {{
 *   eventLocked: boolean;
 *   inTestMode: boolean;
 *   inRealMode: boolean;
 *   voteCount: number;
 *   canEditSoftFields: boolean;
 *   canEditQuizCorrect: boolean;
 *   softWarning: string | null;
 *   quizHint: string | null;
 *   quizBlockedReason: string | null;
 *   lockedReason: string | null;
 * }}
 */
export function getRegiePollEditGuardState(input = {}) {
  const eventLocked = Boolean(input.isLocked);
  const inTestMode = input.isLiveConsumed === false;
  const inRealMode = input.isLiveConsumed === true;
  const voteCount = asNonNegInt(input.voteCount);
  const quizRevealed = Boolean(input.quizRevealed);
  const isQuiz = Boolean(input.isQuiz);

  const lockedReason = eventLocked
    ? "Événement verrouillé : aucune modification n’est possible."
    : null;

  const canEditSoftFields = !eventLocked;

  let canEditQuizCorrect = !eventLocked && isQuiz;
  let quizBlockedReason = null;
  if (canEditQuizCorrect && inRealMode && (voteCount > 0 || quizRevealed)) {
    canEditQuizCorrect = false;
    quizBlockedReason =
      voteCount > 0
        ? "Mode réel : la bonne réponse est verrouillée car cette question a déjà reçu des votes."
        : "Mode réel : la bonne réponse est verrouillée car elle a déjà été révélée.";
  }

  const softWarning =
    !eventLocked && voteCount > 0
      ? "Cette question a déjà des votes. Les modifications de texte / lot ne changent pas les résultats enregistrés."
      : null;

  const quizHint =
    !eventLocked &&
    inTestMode &&
    isQuiz &&
    voteCount > 0 &&
    canEditQuizCorrect
      ? "Mode test : pour repartir à zéro avant de changer la bonne réponse, utilisez « Rejouer cette question »."
      : null;

  return {
    eventLocked,
    inTestMode,
    inRealMode,
    voteCount,
    canEditSoftFields,
    canEditQuizCorrect,
    softWarning,
    quizHint,
    quizBlockedReason,
    lockedReason,
  };
}
