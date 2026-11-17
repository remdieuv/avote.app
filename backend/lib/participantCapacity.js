/**
 * Capacité participants : claim atomique + verrou advisory **par session**
 * (pas de sérialisation globale Event FOR UPDATE).
 */

/**
 * Verrou transactionnel scoped (eventId + voterSessionId).
 * Sérialise les doubles soumissions d’une même session ; les sessions
 * distinctes restent parallèles.
 * @param {{ $executeRaw: Function }} tx
 * @param {string} eventId
 * @param {string} voterSessionId
 */
async function lockParticipantSession(tx, eventId, voterSessionId) {
  const eid = String(eventId || "").trim();
  const sid = String(voterSessionId || "").trim();
  if (!eid || !sid) return;
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${`avote:evt:${eid}`}),
      hashtext(${sid})
    )
  `;
}

/**
 * Incrémente participantsUsed si used < limit (atomique).
 * @param {{ $queryRaw: Function }} tx
 * @param {string} eventId
 * @returns {Promise<{ ok: true; participantsUsed: number } | { ok: false; code: string }>}
 */
async function claimParticipantSlot(tx, eventId) {
  const eid = String(eventId || "").trim();
  if (!eid) {
    return { ok: false, code: "EVENT_REQUIRED" };
  }
  const rows = await tx.$queryRaw`
    UPDATE "Event"
    SET "participantsUsed" = "participantsUsed" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${eid}
      AND "participantsUsed" < "participantsLimit"
    RETURNING "participantsUsed"
  `;
  if (!Array.isArray(rows) || rows.length < 1) {
    return { ok: false, code: "LIMIT_REACHED" };
  }
  return {
    ok: true,
    participantsUsed: Math.max(0, Number(rows[0]?.participantsUsed) || 0),
  };
}

/**
 * Décrémente après un claim non suivi d’un vote (rollback capacité).
 * @param {{ $executeRaw: Function }} tx
 * @param {string} eventId
 */
async function releaseParticipantSlot(tx, eventId) {
  const eid = String(eventId || "").trim();
  if (!eid) return;
  await tx.$executeRaw`
    UPDATE "Event"
    SET "participantsUsed" = GREATEST("participantsUsed" - 1, 0),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${eid}
  `;
}

/**
 * Recalcule participantsUsed = COUNT(DISTINCT voterSessionId) pour un event.
 * À utiliser après wipe partiel (replay test).
 * @param {{ $executeRaw: Function }} tx
 * @param {string} eventId
 */
async function syncParticipantsUsedFromVotes(tx, eventId) {
  const eid = String(eventId || "").trim();
  if (!eid) return;
  await tx.$executeRaw`
    UPDATE "Event" e
    SET "participantsUsed" = COALESCE((
      SELECT COUNT(DISTINCT v."voterSessionId")::int
      FROM "Vote" v
      INNER JOIN "Poll" p ON p."id" = v."pollId"
      WHERE p."eventId" = ${eid}
    ), 0),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE e."id" = ${eid}
  `;
}

module.exports = {
  lockParticipantSession,
  claimParticipantSlot,
  releaseParticipantSlot,
  syncParticipantsUsedFromVotes,
};
