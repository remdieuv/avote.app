/**
 * Remise à zéro runtime au passage TEST → RÉEL (première activation).
 * Helpers purs — la TX Prisma vit dans server.js start-real.
 */

/**
 * Première question jouable (order asc), ignore ARCHIVED.
 * @param {Array<{ id?: string | null; order?: number | null; status?: string | null }>} polls
 * @returns {string | null}
 */
function resolveFirstPlayablePollId(polls) {
  if (!Array.isArray(polls) || polls.length < 1) return null;
  const playable = polls
    .filter((p) => p && String(p.status || "").toUpperCase() !== "ARCHIVED")
    .slice()
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const first = playable[0];
  if (!first || typeof first.id !== "string" || !first.id.trim()) return null;
  return first.id.trim();
}

/**
 * Patch Event : axes PRÉPARÉ Q1 + chrono réarmé (totalSec conservé).
 * @param {{
 *   firstPollId?: string | null;
 *   screenDisplayState?: string | null;
 *   questionTimerTotalSec?: number | null;
 * }} input
 */
function buildStartRealEventResetPatch(input = {}) {
  const firstPollId =
    typeof input.firstPollId === "string" && input.firstPollId.trim()
      ? input.firstPollId.trim()
      : null;
  const totalRaw = input.questionTimerTotalSec;
  const totalSec =
    totalRaw == null || totalRaw === ""
      ? null
      : Number.isFinite(Number(totalRaw))
        ? Math.max(0, Math.trunc(Number(totalRaw)))
        : null;
  const sds = String(input.screenDisplayState ?? "").toUpperCase();
  /** @type {Record<string, unknown>} */
  const data = {
    activePollId: firstPollId,
    voteState: "CLOSED",
    displayState: "WAITING",
    liveState: "WAITING",
    autoRevealShowResultsAt: null,
    questionTimerTotalSec: totalSec,
    questionTimerAccumulatedSec: 0,
    questionTimerStartedAt: null,
    questionTimerIsPaused: true,
  };
  if (sds !== "BLACK") {
    data.screenDisplayState = null;
  }
  return data;
}

/**
 * Status polls après reset : Q1 ACTIVE, autres non-ARCHIVED → DRAFT.
 * @param {Array<{ id?: string | null; status?: string | null }>} polls
 * @param {string | null} firstPollId
 * @returns {Array<{ id: string; status: "ACTIVE" | "DRAFT" }>}
 */
function buildStartRealPollStatusUpdates(polls, firstPollId) {
  if (!Array.isArray(polls)) return [];
  const first = firstPollId ? String(firstPollId) : "";
  /** @type {Array<{ id: string; status: "ACTIVE" | "DRAFT" }>} */
  const out = [];
  for (const p of polls) {
    if (!p || typeof p.id !== "string" || !p.id.trim()) continue;
    if (String(p.status || "").toUpperCase() === "ARCHIVED") continue;
    const id = p.id.trim();
    out.push({
      id,
      status: first && id === first ? "ACTIVE" : "DRAFT",
    });
  }
  return out;
}

/**
 * Périmètre deletes — toujours borné à un eventId / ses pollIds.
 * @param {{ eventId?: string | null; pollIds?: string[] | null }} input
 */
function getStartRealDeletionScope(input = {}) {
  const eventId =
    typeof input.eventId === "string" && input.eventId.trim()
      ? input.eventId.trim()
      : null;
  const pollIds = Array.isArray(input.pollIds)
    ? [
        ...new Set(
          input.pollIds
            .map((x) => String(x || "").trim())
            .filter(Boolean),
        ),
      ]
    : [];
  return {
    eventId,
    pollIds,
    deleteContestWinnersWhere: pollIds.length
      ? { pollId: { in: pollIds } }
      : null,
    deleteContestDrawsWhere: eventId ? { eventId } : null,
    deleteLeadsWhere: eventId ? { eventId } : null,
    deleteVotesWhere: pollIds.length ? { pollId: { in: pollIds } } : null,
    /** Ordre FK : winners → draws → leads → votes */
    deletionOrder: [
      "contestDrawWinner",
      "contestDraw",
      "leadCapture",
      "vote",
    ],
  };
}

/**
 * Wipe runtime uniquement lors du passage false → true.
 * @param {{ isLiveConsumed?: boolean | null }} input
 */
function shouldPerformStartRealRuntimeReset(input = {}) {
  return input.isLiveConsumed === false;
}

/**
 * FUN et EVENT passent par le même reset (planType n’affecte que la conso crédit).
 * @param {"FUN" | "EVENT" | string | null | undefined} planType
 */
function startRealResetAppliesToPlan(planType) {
  const p = String(planType || "").trim().toUpperCase();
  return p === "FUN" || p === "EVENT";
}

module.exports = {
  resolveFirstPlayablePollId,
  buildStartRealEventResetPatch,
  buildStartRealPollStatusUpdates,
  getStartRealDeletionScope,
  shouldPerformStartRealRuntimeReset,
  startRealResetAppliesToPlan,
};
