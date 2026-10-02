/**
 * Normalisation minimale des payloads Live (HTTP + Socket).
 * Unifie bare (`liveState`) et préfixés poll (`eventLiveState`),
 * et `votes` / `voteCount` — sans fusionner displayState et screenDisplayState.
 */

/**
 * @param {...unknown} values
 * @returns {string | null}
 */
function firstNonEmptyString(...values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Axes live participant / événement.
 * `screenDisplayState` reste un axe distinct (projection) — ne pas le copier dans `displayState`.
 *
 * @param {Record<string, unknown> | null | undefined} payload
 * @returns {{
 *   liveState: string | null;
 *   voteState: string | null;
 *   displayState: string | null;
 *   screenDisplayState: string | null;
 *   activePollId: string | null;
 *   isLiveConsumed: boolean | null;
 *   isLocked: boolean | null;
 * }}
 */
export function normalizeLiveAxes(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  const liveRaw = firstNonEmptyString(
    p.liveState,
    p.eventLiveState,
    p.liveScene,
  );
  const voteRaw = firstNonEmptyString(p.voteState, p.eventVoteState);
  const displayRaw = firstNonEmptyString(p.displayState, p.eventDisplayState);
  // Projection only — jamais utilisé comme displayState salle.
  const screenRaw = firstNonEmptyString(
    p.screenDisplayState,
    p.eventScreenDisplayState,
  );
  const activePollId =
    typeof p.activePollId === "string" && p.activePollId.trim()
      ? p.activePollId.trim()
      : null;

  let isLiveConsumed = null;
  if (typeof p.isLiveConsumed === "boolean") isLiveConsumed = p.isLiveConsumed;
  else if (typeof p.eventIsLiveConsumed === "boolean") {
    isLiveConsumed = p.eventIsLiveConsumed;
  }

  let isLocked = null;
  if (typeof p.isLocked === "boolean") isLocked = p.isLocked;
  else if (typeof p.eventIsLocked === "boolean") isLocked = p.eventIsLocked;

  return {
    liveState: liveRaw ? liveRaw.toLowerCase() : null,
    voteState: voteRaw ? voteRaw.toLowerCase() : null,
    displayState: displayRaw ? displayRaw.toLowerCase() : null,
    screenDisplayState: screenRaw ? screenRaw.toLowerCase() : null,
    activePollId,
    isLiveConsumed,
    isLocked,
  };
}

/**
 * Compteur option : accepte `votes` (pollToJson) ou `voteCount` (régie).
 * @param {unknown} opt
 * @returns {number}
 */
export function optionVoteCount(opt) {
  if (!opt || typeof opt !== "object") return 0;
  const o = /** @type {Record<string, unknown>} */ (opt);
  return Math.max(0, Number(o.voteCount ?? o.votes ?? 0) || 0);
}

/**
 * Normalise une liste d’options pour que votes et voteCount soient toujours présents.
 * @param {unknown} options
 * @returns {{ id: string; label: string; order?: number; votes: number; voteCount: number; [k: string]: unknown }[]}
 */
export function normalizePollOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((raw, i) => {
    const o =
      raw && typeof raw === "object"
        ? /** @type {Record<string, unknown>} */ (raw)
        : {};
    const n = optionVoteCount(o);
    return {
      ...o,
      id: String(o.id || i),
      label: String(o.label || `Option ${i + 1}`),
      votes: n,
      voteCount: n,
    };
  });
}

/**
 * Applique la normalisation options sur un poll JSON (immuable).
 * @param {Record<string, unknown> | null | undefined} poll
 */
export function normalizePollJson(poll) {
  if (!poll || typeof poll !== "object") return poll;
  const axes = normalizeLiveAxes(poll);
  return {
    ...poll,
    options: normalizePollOptions(poll.options),
    // Alias bare pour consommateurs unifiés (sans écraser screen).
    liveState: axes.liveState ?? poll.liveState ?? poll.eventLiveState ?? null,
    voteState: axes.voteState ?? poll.voteState ?? poll.eventVoteState ?? null,
    displayState:
      axes.displayState ?? poll.displayState ?? poll.eventDisplayState ?? null,
    contestWinnersCount: Math.max(
      0,
      Number(
        /** @type {Record<string, unknown>} */ (poll).contestWinnersCount ?? 0,
      ) || 0,
    ),
  };
}
