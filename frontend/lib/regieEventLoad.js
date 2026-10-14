/**
 * Chargement régie `/admin/event/[id]` — course silent/socket vs GET initial.
 */

/**
 * Après `fetchEvent` : lever le spinner si cette génération est encore la courante.
 * Un `silent` (socket `event_live_updated` / post start-real) qui abort le GET
 * initial ne doit pas laisser `loading=true` → page entièrement vide
 * (`!loading && eventData` faux alors que les données sont déjà là).
 *
 * @param {{ generation?: number; currentGeneration?: number }} input
 */
export function shouldClearRegieEventLoadingAfterFetch(input = {}) {
  return Number(input.generation) === Number(input.currentGeneration);
}

/**
 * Afficher le corps régie dès qu’on a des données — ne pas exiger `!loading`
 * (évite blank si spinner reste coincé après abort).
 * @param {{ eventData?: unknown; loading?: boolean }} input
 */
export function shouldRenderRegieEventBody(input = {}) {
  return input.eventData != null && typeof input.eventData === "object";
}

/**
 * Après start-real : axes attendus pour non-régression régie.
 * @param {{
 *   isLiveConsumed?: boolean | null;
 *   liveState?: string | null;
 *   voteState?: string | null;
 *   displayState?: string | null;
 *   activePollId?: string | null;
 *   polls?: Array<{ id?: string | null; order?: number | null; status?: string | null }> | null;
 *   questionTimerTotalSec?: number | null;
 *   questionTimerAccumulatedSec?: number | null;
 *   questionTimerStartedAt?: string | null;
 *   questionTimerIsPaused?: boolean | null;
 * }} event
 */
export function assertRegieUsableAfterStartReal(event = {}) {
  const polls = Array.isArray(event.polls) ? event.polls : [];
  const playable = polls
    .filter((p) => String(p?.status || "").toUpperCase() !== "ARCHIVED")
    .slice()
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
  const firstId = playable[0]?.id ? String(playable[0].id) : null;
  const errors = [];
  if (event.isLiveConsumed !== true) {
    errors.push("isLiveConsumed must be true");
  }
  if (String(event.liveState || "").toLowerCase() !== "waiting") {
    errors.push("liveState must be waiting");
  }
  if (String(event.voteState || "").toLowerCase() !== "closed") {
    errors.push("voteState must be closed");
  }
  if (String(event.displayState || "").toLowerCase() !== "waiting") {
    errors.push("displayState must be waiting");
  }
  if (!firstId) {
    errors.push("event must keep at least one playable poll");
  } else if (String(event.activePollId || "") !== firstId) {
    errors.push("activePollId must be question 1");
  }
  const q1 = playable[0];
  if (q1 && String(q1.status || "").toUpperCase() !== "ACTIVE") {
    errors.push("question 1 status must be ACTIVE");
  }
  for (let i = 1; i < playable.length; i++) {
    if (String(playable[i].status || "").toUpperCase() !== "DRAFT") {
      errors.push(`poll ${playable[i].id} status must be DRAFT`);
    }
  }
  if (Number(event.questionTimerAccumulatedSec || 0) !== 0) {
    errors.push("chrono accumulated must be 0");
  }
  if (event.questionTimerStartedAt != null) {
    errors.push("chrono startedAt must be null");
  }
  if (event.questionTimerIsPaused !== true && event.questionTimerTotalSec != null) {
    errors.push("chrono must be paused when configured");
  }
  return { ok: errors.length === 0, errors, firstPollId: firstId };
}
