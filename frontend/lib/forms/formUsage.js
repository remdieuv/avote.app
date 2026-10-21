/**
 * L6 — Usage champs formulaire (soft lock D4) depuis lignes leads CRM.
 */

/**
 * @param {Iterable<{ pollId?: unknown; answers?: unknown }>} leads
 * @param {string | null | undefined} [pollId]
 * @returns {{
 *   usedFieldIds: string[];
 *   usedOptionIdsByField: Record<string, string[]>;
 * }}
 */
export function collectUsedFormIdsFromLeadRows(leads, pollId = null) {
  /** @type {Set<string>} */
  const usedFieldIds = new Set();
  /** @type {Record<string, Set<string>>} */
  const optSets = {};
  const filterPoll =
    pollId != null && String(pollId).trim() !== ""
      ? String(pollId)
      : null;

  for (const row of leads || []) {
    if (filterPoll && String(row?.pollId || "") !== filterPoll) continue;
    const answers = row?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      continue;
    }
    for (const [fid, val] of Object.entries(answers)) {
      if (!fid) continue;
      usedFieldIds.add(String(fid));
      if (typeof val === "string" && val) {
        if (!optSets[fid]) optSets[fid] = new Set();
        optSets[fid].add(val);
      } else if (Array.isArray(val)) {
        if (!optSets[fid]) optSets[fid] = new Set();
        for (const id of val) {
          if (id != null && id !== "") optSets[fid].add(String(id));
        }
      }
    }
  }

  /** @type {Record<string, string[]>} */
  const usedOptionIdsByField = {};
  for (const [fid, set] of Object.entries(optSets)) {
    usedOptionIdsByField[fid] = [...set];
  }
  return {
    usedFieldIds: [...usedFieldIds],
    usedOptionIdsByField,
  };
}

/**
 * Poll Régie Lead/Concours (LEAD stocké SINGLE_CHOICE + leadEnabled).
 * @param {{ type?: unknown; leadEnabled?: unknown } | null | undefined} poll
 * @returns {"LEAD"|"CONTEST_ENTRY"|null}
 */
export function regieFormPollKind(poll) {
  if (!poll) return null;
  if (String(poll.type || "").toUpperCase() === "CONTEST_ENTRY") {
    return "CONTEST_ENTRY";
  }
  if (Boolean(poll.leadEnabled)) return "LEAD";
  return null;
}
