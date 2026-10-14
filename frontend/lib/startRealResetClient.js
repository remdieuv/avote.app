/**
 * Passage TEST → RÉEL — confirmation organisateur + clear marqueurs participant.
 */

/**
 * @param {"FUN" | "EVENT" | string} planType
 * @returns {string}
 */
export function getStartRealConfirmMessage(planType) {
  const plan = String(planType || "").trim().toUpperCase();
  const planLabel =
    plan === "FUN"
      ? "FUN (100 participants max)"
      : plan === "EVENT"
        ? "EVENT (500 participants max)"
        : plan || "sélectionnée";
  return (
    `Passer en live réel avec la formule ${plan} ?\n\n` +
    `1 activation sera consommée (${planLabel}).\n\n` +
    `Toutes les données de répétition seront supprimées définitivement : ` +
    `votes, résultats, leads, participations et tirages de concours, ` +
    `historique des réponses.\n\n` +
    `L’événement reviendra à la question 1, en attente d’ouverture. ` +
    `Les questions, bonnes réponses Quiz, ordre, configuration et liens (QR) sont conservés.`
  );
}

/** @param {string} pollId */
export function votedPollLocalStorageKey(pollId) {
  return `avote_voted_poll_${String(pollId || "").trim()}`;
}

/** @param {string} pollId */
export function votedOptionsLocalStorageKey(pollId) {
  return `avote_voted_options_poll_${String(pollId || "").trim()}`;
}

/**
 * Clear marqueurs locaux uniquement au passage TEST → RÉEL (pas au refresh RÉEL).
 * @param {{ wasTestMode?: boolean | null; isLiveConsumedNow?: boolean | null }} input
 */
export function shouldClearParticipantMarkersOnStartReal(input = {}) {
  return input.wasTestMode === true && input.isLiveConsumedNow === true;
}

/**
 * @param {{
 *   pollIds?: string[] | null;
 *   voterSessionId?: string | null;
 *   localStorage?: Storage | null;
 *   sessionStorage?: Storage | null;
 *   leadDraftKeyFn?: (pollId: string, voterSessionId: string) => string;
 *   leadSubmittedKeyFn?: (pollId: string, voterSessionId: string) => string;
 * }} input
 * @returns {{ clearedVoteKeys: number; clearedLeadKeys: number }}
 */
export function clearParticipantRepetitionMarkers(input = {}) {
  const pollIds = Array.isArray(input.pollIds)
    ? [
        ...new Set(
          input.pollIds.map((x) => String(x || "").trim()).filter(Boolean),
        ),
      ]
    : [];
  const ls = input.localStorage ?? null;
  const ss = input.sessionStorage ?? null;
  const voterSessionId = String(input.voterSessionId || "").trim();
  let clearedVoteKeys = 0;
  let clearedLeadKeys = 0;
  for (const pollId of pollIds) {
    if (ls) {
      try {
        ls.removeItem(votedPollLocalStorageKey(pollId));
        ls.removeItem(votedOptionsLocalStorageKey(pollId));
        clearedVoteKeys += 2;
      } catch {
        // navigation privée
      }
    }
    if (ss && voterSessionId) {
      try {
        const draftFn = input.leadDraftKeyFn;
        const submittedFn = input.leadSubmittedKeyFn;
        if (typeof draftFn === "function") {
          ss.removeItem(draftFn(pollId, voterSessionId));
          clearedLeadKeys += 1;
        }
        if (typeof submittedFn === "function") {
          ss.removeItem(submittedFn(pollId, voterSessionId));
          clearedLeadKeys += 1;
        }
      } catch {
        // ignore
      }
    }
  }
  return { clearedVoteKeys, clearedLeadKeys };
}
