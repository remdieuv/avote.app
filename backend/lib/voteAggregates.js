/**
 * Agrégats Vote sans charger toutes les lignes (comptage capacité + résultats).
 */

/**
 * @param {{ $queryRaw: Function }} db — prisma ou client de transaction
 * @param {string} eventId
 * @returns {Promise<number>}
 */
async function countDistinctParticipantsForEvent(db, eventId) {
  const id = String(eventId || "").trim();
  if (!id) return 0;
  const rows = await db.$queryRaw`
    SELECT COUNT(DISTINCT v."voterSessionId")::int AS "count"
    FROM "Vote" v
    INNER JOIN "Poll" p ON p."id" = v."pollId"
    WHERE p."eventId" = ${id}
  `;
  const n = Array.isArray(rows) ? Number(rows[0]?.count) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Totaux par option + votants distincts pour un sondage.
 * @param {{ $queryRaw: Function }} db
 * @param {string} pollId
 * @returns {Promise<{ optionVoteCounts: Record<string, number>; votersCount: number; voteCount: number }>}
 */
async function fetchPollVoteAggregates(db, pollId) {
  const id = String(pollId || "").trim();
  /** @type {Record<string, number>} */
  const optionVoteCounts = {};
  if (!id) {
    return { optionVoteCounts, votersCount: 0, voteCount: 0 };
  }

  const [byOption, distinct] = await Promise.all([
    db.$queryRaw`
      SELECT v."optionId" AS "optionId", COUNT(*)::int AS "count"
      FROM "Vote" v
      WHERE v."pollId" = ${id}
      GROUP BY v."optionId"
    `,
    db.$queryRaw`
      SELECT COUNT(DISTINCT v."voterSessionId")::int AS "votersCount",
             COUNT(*)::int AS "voteCount"
      FROM "Vote" v
      WHERE v."pollId" = ${id}
    `,
  ]);

  if (Array.isArray(byOption)) {
    for (const row of byOption) {
      const oid = row?.optionId != null ? String(row.optionId) : "";
      if (!oid) continue;
      const c = Number(row.count) || 0;
      optionVoteCounts[oid] = c;
    }
  }

  const votersCount = Number(distinct?.[0]?.votersCount) || 0;
  const voteCount = Number(distinct?.[0]?.voteCount) || 0;
  return { optionVoteCounts, votersCount, voteCount };
}

/**
 * Totaux par option pour tous les polls d’un événement (régie).
 * @param {{ $queryRaw: Function }} db
 * @param {string} eventId
 * @returns {Promise<Record<string, number>>}
 */
async function fetchEventOptionVoteCounts(db, eventId) {
  const id = String(eventId || "").trim();
  /** @type {Record<string, number>} */
  const optionVoteCounts = {};
  if (!id) return optionVoteCounts;

  const rows = await db.$queryRaw`
    SELECT v."optionId" AS "optionId", COUNT(*)::int AS "count"
    FROM "Vote" v
    INNER JOIN "Poll" p ON p."id" = v."pollId"
    WHERE p."eventId" = ${id}
    GROUP BY v."optionId"
  `;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const oid = row?.optionId != null ? String(row.optionId) : "";
      if (!oid) continue;
      optionVoteCounts[oid] = Number(row.count) || 0;
    }
  }
  return optionVoteCounts;
}

/**
 * Compteurs vote / participants par événement (liste admin).
 * @param {{ $queryRaw: Function }} db
 * @param {string[]} eventIds
 * @returns {Promise<Map<string, { voteCount: number; participantCount: number }>>}
 */
async function fetchEventVoteParticipantCounts(db, eventIds) {
  /** @type {Map<string, { voteCount: number; participantCount: number }>} */
  const out = new Map();
  const ids = [
    ...new Set(
      (Array.isArray(eventIds) ? eventIds : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean),
    ),
  ];
  for (const id of ids) {
    out.set(id, { voteCount: 0, participantCount: 0 });
  }
  if (ids.length === 0) return out;

  const { Prisma } = require("@prisma/client");
  const rows = await db.$queryRaw`
    SELECT p."eventId" AS "eventId",
           COUNT(*)::int AS "voteCount",
           COUNT(DISTINCT v."voterSessionId")::int AS "participantCount"
    FROM "Vote" v
    INNER JOIN "Poll" p ON p."id" = v."pollId"
    WHERE p."eventId" IN (${Prisma.join(ids)})
    GROUP BY p."eventId"
  `;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const eid = row?.eventId != null ? String(row.eventId) : "";
      if (!eid || !out.has(eid)) continue;
      out.set(eid, {
        voteCount: Number(row.voteCount) || 0,
        participantCount: Number(row.participantCount) || 0,
      });
    }
  }
  return out;
}

/**
 * Attache les agrégats sur un poll pour `pollToJson` (sans tableau `votes`).
 * @param {object} poll
 * @param {{ optionVoteCounts: Record<string, number>; votersCount: number; voteCount?: number }} aggregates
 */
function attachVoteAggregatesToPoll(poll, aggregates) {
  if (!poll) return poll;
  poll._optionVoteCounts = { ...(aggregates?.optionVoteCounts || {}) };
  poll._votersCount = Math.max(0, Number(aggregates?.votersCount) || 0);
  if (aggregates?.voteCount != null) {
    poll._voteCount = Math.max(0, Number(aggregates.voteCount) || 0);
  }
  return poll;
}

/**
 * Résout totaux option + votersCount depuis agrégats attachés ou lignes `votes`.
 * @param {{
 *   votes?: Array<{ optionId?: string | null; voterSessionId?: string | null }>;
 *   _optionVoteCounts?: Record<string, number>;
 *   _votersCount?: number;
 * } | null | undefined} poll
 * @returns {{ voteCounts: Record<string, number>; votersCount: number }}
 */
function resolveVoteCountsFromPoll(poll) {
  if (
    poll &&
    poll._optionVoteCounts &&
    typeof poll._optionVoteCounts === "object" &&
    typeof poll._votersCount === "number"
  ) {
    return {
      voteCounts: { ...poll._optionVoteCounts },
      votersCount: Math.max(0, poll._votersCount),
    };
  }

  /** @type {Record<string, number>} */
  const voteCounts = {};
  const uniqueVoterSessions = new Set();
  for (const v of poll?.votes || []) {
    const oid = v?.optionId != null ? String(v.optionId) : "";
    if (oid) voteCounts[oid] = (voteCounts[oid] || 0) + 1;
    if (v?.voterSessionId != null && String(v.voterSessionId).trim()) {
      uniqueVoterSessions.add(String(v.voterSessionId));
    }
  }
  return { voteCounts, votersCount: uniqueVoterSessions.size };
}

module.exports = {
  countDistinctParticipantsForEvent,
  fetchPollVoteAggregates,
  fetchEventOptionVoteCounts,
  fetchEventVoteParticipantCounts,
  attachVoteAggregatesToPoll,
  resolveVoteCountsFromPoll,
};
