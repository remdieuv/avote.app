/**
 * Snapshot live événement (Socket.IO) — inclusion poll + payload.
 * Partagé entre broadcast régie et snapshot socket-only au join_event.
 */

/**
 * Décide si le poll actif doit être inclus dans `event_live_updated`.
 * @param {{
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   activePollId?: string | null;
 * } | null | undefined} event
 * @param {{ id?: string | null; status?: string | null } | null | undefined} poll
 */
function shouldIncludePollInEventLivePayload(event, poll) {
  if (!event || !poll) return false;
  const vs = String(event.voteState ?? "").toUpperCase();
  const ds = String(event.displayState ?? "").toUpperCase();
  const pollStatus = String(poll.status ?? "").toUpperCase();
  const openActive = vs === "OPEN" && pollStatus === "ACTIVE";
  const sceneQuestionOrResults = ds === "QUESTION" || ds === "RESULTS";
  /** Ex. fin de chrono : vote CLOSED, poll CLOSED — le public garde le contexte */
  const voteTerminePollEncoreAffiche =
    vs === "CLOSED" &&
    pollStatus === "CLOSED" &&
    String(poll.id) === String(event.activePollId);
  /**
   * LOT-5 — Suivante / PRÉPARÉ : poll ACTIVE × WAITING × vote CLOSED.
   * Inclure le poll pour que Join mette à jour activePollStatus.
   */
  const preparedActiveAntenna =
    vs === "CLOSED" &&
    ds === "WAITING" &&
    pollStatus === "ACTIVE" &&
    String(poll.id) === String(event.activePollId);
  return (
    openActive ||
    sceneQuestionOrResults ||
    voteTerminePollEncoreAffiche ||
    preparedActiveAntenna
  );
}

/**
 * Construit le payload `event_live_updated` (axes + poll optionnel).
 * @param {{
 *   id: string;
 *   slug?: string | null;
 *   isLiveConsumed?: boolean | null;
 *   isLocked?: boolean | null;
 *   liveState?: string | null;
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   screenDisplayState?: string | null;
 *   activePollId?: string | null;
 *   autoReveal?: boolean | null;
 *   autoRevealDelaySec?: number | null;
 *   autoRevealShowResultsAt?: Date | string | null;
 * }} event
 * @param {object | null} pollJson — déjà passé par pollToJson (visibilité isCorrect / masque TEST)
 * @param {object | null} questionTimer
 */
function buildEventLiveUpdatedPayload(event, pollJson, questionTimer) {
  const showAt = event.autoRevealShowResultsAt;
  return {
    eventId: event.id,
    slug: event.slug,
    isLiveConsumed: event.isLiveConsumed,
    isLocked: event.isLocked,
    liveState: String(event.liveState ?? "").toLowerCase(),
    voteState: String(event.voteState ?? "").toLowerCase(),
    displayState: String(event.displayState ?? "").toLowerCase(),
    screenDisplayState: event.screenDisplayState
      ? String(event.screenDisplayState).toLowerCase()
      : null,
    activePollId: event.activePollId,
    autoReveal: event.autoReveal,
    autoRevealDelaySec: event.autoRevealDelaySec,
    autoRevealShowResultsAt:
      showAt == null
        ? null
        : typeof showAt === "string"
          ? showAt
          : showAt.toISOString(),
    questionTimer: questionTimer ?? null,
    poll: pollJson,
  };
}

/**
 * Au `join_event` / reconnect : envoyer le snapshot au socket joignant uniquement
 * (pas de broadcast room, pas de `poll_updated` aux autres).
 */
function joinEventEmitsSnapshotToJoiningSocketOnly() {
  return true;
}

module.exports = {
  shouldIncludePollInEventLivePayload,
  buildEventLiveUpdatedPayload,
  joinEventEmitsSnapshotToJoiningSocketOnly,
};
