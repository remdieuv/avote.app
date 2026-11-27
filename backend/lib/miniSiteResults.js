/**
 * Lot 2 — onglet Résultats du mini-site (agrégats + historique approche A).
 * Pure + SQL. Réutilise publicPollVisibility / voteAggregates.
 */

const { Prisma } = require("@prisma/client");
const {
  PUBLIC_POLL_SURFACE,
  filterPollsForPublicSurface,
  landingFeedResultPollsWhere,
  isPollPubliclyExposable,
} = require("./publicPollVisibility");
const { fetchPollVoteAggregates } = require("./voteAggregates");

/** Types avec restitution graphique dédiée V1. */
const MINISITE_RESULTS_SUPPORTED_TYPES = Object.freeze([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "YES_NO",
  "RATING",
  "QUIZ",
  "CONTEST_ENTRY",
]);

const ADVANCED_TYPES_EXCLUDED_V1 = Object.freeze([
  "RANKING",
  "OPEN_TEXT",
  "WORD_CLOUD",
]);

/**
 * @param {unknown} type
 * @returns {boolean}
 */
function isMinisiteResultsSupportedType(type) {
  const t = String(type || "").toUpperCase();
  return MINISITE_RESULTS_SUPPORTED_TYPES.includes(t);
}

/**
 * Granularité historique : heure si durée < 48 h, sinon jour.
 * @param {Date | null | undefined} firstAt
 * @param {Date | null | undefined} lastAt
 * @returns {"hour" | "day"}
 */
function resolveHistoryGranularity(firstAt, lastAt) {
  if (!(firstAt instanceof Date) || !(lastAt instanceof Date)) return "hour";
  const ms = lastAt.getTime() - firstAt.getTime();
  if (!Number.isFinite(ms) || ms < 0) return "hour";
  return ms < 48 * 60 * 60 * 1000 ? "hour" : "day";
}

/**
 * @param {number} n
 * @param {number} d
 * @returns {number}
 */
function pct1(n, d) {
  if (!d || d <= 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

/**
 * Charge les polls candidats résultats (même where que le fil), filtrés surface + type V1.
 * @param {{ poll: { findMany: Function } }} db
 * @param {object} event
 */
async function loadMinisiteResultPolls(db, event) {
  if (!event?.id) return [];
  const candidates = await db.poll.findMany({
    where: landingFeedResultPollsWhere(event),
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      question: true,
      type: true,
      status: true,
      order: true,
      leadEnabled: true,
      landingResultHidden: true,
      quizRevealed: true,
      updatedAt: true,
      createdAt: true,
      options: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          order: true,
          isCorrect: true,
          imageUrl: true,
        },
      },
    },
  });
  const visible = filterPollsForPublicSurface({
    event,
    polls: candidates,
    surface: PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
  });
  return visible.filter((p) => isMinisiteResultsSupportedType(p.type));
}

/**
 * @param {object} poll
 * @param {{ optionVoteCounts: Record<string, number>; votersCount: number; voteCount: number }} agg
 * @param {{ isTestMode?: boolean }} [meta]
 */
function buildPublicResultPayload(poll, agg, meta = {}) {
  const type = String(poll.type || "").toUpperCase();
  const respondents = Math.max(0, Number(agg.votersCount) || 0);
  const answers = Math.max(0, Number(agg.voteCount) || 0);
  const pctBase =
    type === "MULTIPLE_CHOICE" ? respondents || answers : answers || respondents;
  const quizRevealed = Boolean(poll.quizRevealed);
  const options = (poll.options || []).map((opt) => {
    const votes = Number(agg.optionVoteCounts[opt.id] || 0);
    const row = {
      id: String(opt.id),
      label: String(opt.label || ""),
      order: typeof opt.order === "number" ? opt.order : 0,
      answers: votes,
      /** % des répondants (MC) ou des réponses (single). */
      percent: pct1(votes, pctBase),
    };
    if (quizRevealed) {
      return { ...row, isCorrect: Boolean(opt.isCorrect) };
    }
    return row;
  });

  const question =
    (typeof poll.question === "string" && poll.question.trim()) ||
    (typeof poll.title === "string" && poll.title.trim()) ||
    "Question";

  return {
    pollId: String(poll.id),
    question,
    type,
    status: String(poll.status || "").toUpperCase(),
    order: typeof poll.order === "number" ? poll.order : 0,
    respondents,
    answers,
    percentBase:
      type === "MULTIPLE_CHOICE" ? "respondents" : "answers",
    percentMayExceed100: type === "MULTIPLE_CHOICE",
    quizRevealed,
    options,
    sharePath: null, // rempli par l’API avec le slug
    isTestMode: meta.isTestMode === true,
    updatedAt:
      poll.updatedAt instanceof Date
        ? poll.updatedAt.toISOString()
        : poll.updatedAt
          ? new Date(poll.updatedAt).toISOString()
          : null,
  };
}

/**
 * Historique cumulatif (approche A) depuis Vote.createdAt.
 * @param {{ $queryRaw: Function }} db
 * @param {string} pollId
 * @param {{
 *   optionIds: string[];
 *   granularity?: "hour" | "day";
 *   percentBase?: "respondents" | "answers";
 * }} opts
 */
async function fetchMinisiteResultHistory(db, pollId, opts) {
  const id = String(pollId || "").trim();
  const optionIds = Array.isArray(opts.optionIds)
    ? opts.optionIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const percentBase =
    opts.percentBase === "respondents" ? "respondents" : "answers";
  if (!id) {
    return {
      granularity: "hour",
      disclaimer:
        "Évolution de l’état cumulé du scrutin (bulletins enregistrés), pas le suivi individuel des opinions.",
      volume: [],
      options: [],
      hasHistory: false,
      percentBase,
      percentMayExceed100: percentBase === "respondents",
    };
  }

  const bounds = await db.$queryRaw`
    SELECT MIN(v."createdAt") AS "firstAt", MAX(v."createdAt") AS "lastAt"
    FROM "Vote" v
    WHERE v."pollId" = ${id}
  `;
  const firstAt = bounds?.[0]?.firstAt ? new Date(bounds[0].firstAt) : null;
  const lastAt = bounds?.[0]?.lastAt ? new Date(bounds[0].lastAt) : null;
  const granularity =
    opts.granularity === "hour" || opts.granularity === "day"
      ? opts.granularity
      : resolveHistoryGranularity(firstAt, lastAt);

  const trunc = granularity === "day" ? "day" : "hour";

  const firstVoteBuckets = await db.$queryRaw`
    SELECT date_trunc(${Prisma.raw(`'${trunc}'`)}, sub."firstAt") AS "bucketStart",
           COUNT(*)::int AS "newRespondents"
    FROM (
      SELECT v."voterSessionId", MIN(v."createdAt") AS "firstAt"
      FROM "Vote" v
      WHERE v."pollId" = ${id}
      GROUP BY v."voterSessionId"
    ) sub
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const answerBuckets = await db.$queryRaw`
    SELECT date_trunc(${Prisma.raw(`'${trunc}'`)}, v."createdAt") AS "bucketStart",
           COUNT(*)::int AS "newAnswers"
    FROM "Vote" v
    WHERE v."pollId" = ${id}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const optionBuckets =
    optionIds.length === 0
      ? []
      : await db.$queryRaw`
          SELECT date_trunc(${Prisma.raw(`'${trunc}'`)}, v."createdAt") AS "bucketStart",
                 v."optionId" AS "optionId",
                 COUNT(*)::int AS "newAnswers"
          FROM "Vote" v
          WHERE v."pollId" = ${id}
            AND v."optionId" IN (${Prisma.join(optionIds)})
          GROUP BY 1, 2
          ORDER BY 1 ASC
        `;

  /** @type {Map<string, { newRespondents: number; newAnswers: number }>} */
  const byBucket = new Map();
  const ensure = (iso) => {
    if (!byBucket.has(iso)) {
      byBucket.set(iso, { newRespondents: 0, newAnswers: 0 });
    }
    return byBucket.get(iso);
  };

  for (const row of firstVoteBuckets || []) {
    if (!row?.bucketStart) continue;
    const iso = new Date(row.bucketStart).toISOString();
    ensure(iso).newRespondents = Number(row.newRespondents) || 0;
  }
  for (const row of answerBuckets || []) {
    if (!row?.bucketStart) continue;
    const iso = new Date(row.bucketStart).toISOString();
    ensure(iso).newAnswers = Number(row.newAnswers) || 0;
  }

  const bucketKeys = [...byBucket.keys()].sort();
  let cumRespondents = 0;
  let cumAnswers = 0;
  /** @type {{ bucketStart: string; periodRespondents: number; periodAnswers: number; cumulativeRespondents: number; cumulativeAnswers: number }[]} */
  const volume = [];
  for (const iso of bucketKeys) {
    const b = byBucket.get(iso);
    cumRespondents += b.newRespondents;
    cumAnswers += b.newAnswers;
    volume.push({
      bucketStart: iso,
      periodRespondents: b.newRespondents,
      periodAnswers: b.newAnswers,
      cumulativeRespondents: cumRespondents,
      cumulativeAnswers: cumAnswers,
    });
  }

  /** @type {Map<string, Map<string, number>>} */
  const optPeriod = new Map();
  for (const row of optionBuckets || []) {
    if (!row?.bucketStart || !row?.optionId) continue;
    const iso = new Date(row.bucketStart).toISOString();
    const oid = String(row.optionId);
    if (!optPeriod.has(iso)) optPeriod.set(iso, new Map());
    optPeriod.get(iso).set(oid, Number(row.newAnswers) || 0);
  }

  /** @type {Map<string, number>} */
  const cumByOpt = new Map(optionIds.map((oid) => [oid, 0]));
  /** @type {{ bucketStart: string; cumulativeAnswers: number; cumulativeRespondents: number; percentBaseValue: number; options: { optionId: string; cumulativeAnswers: number; cumulativePercent: number }[] }[]} */
  const optionsSeries = [];
  for (const iso of bucketKeys) {
    const periodMap = optPeriod.get(iso) || new Map();
    for (const oid of optionIds) {
      cumByOpt.set(oid, (cumByOpt.get(oid) || 0) + (periodMap.get(oid) || 0));
    }
    const vol = volume.find((v) => v.bucketStart === iso);
    const cumResp = vol ? vol.cumulativeRespondents : 0;
    const totalAnswers = [...cumByOpt.values()].reduce((a, b) => a + b, 0);
    const pctDenom =
      percentBase === "respondents" ? cumResp || totalAnswers : totalAnswers;
    optionsSeries.push({
      bucketStart: iso,
      cumulativeAnswers: totalAnswers,
      cumulativeRespondents: cumResp,
      percentBaseValue: pctDenom,
      options: optionIds.map((oid) => ({
        optionId: oid,
        cumulativeAnswers: cumByOpt.get(oid) || 0,
        cumulativePercent: pct1(cumByOpt.get(oid) || 0, pctDenom),
      })),
    });
  }

  const hasHistory = volume.length >= 2 && cumAnswers > 0;

  return {
    granularity,
    firstAt: firstAt ? firstAt.toISOString() : null,
    lastAt: lastAt ? lastAt.toISOString() : null,
    disclaimer:
      "Évolution de l’état cumulé du scrutin (bulletins enregistrés à chaque date), et non le suivi individuel des opinions.",
    volume,
    options: optionsSeries,
    hasHistory,
    percentBase,
    percentMayExceed100: percentBase === "respondents",
  };
}

/**
 * @param {{ poll: { findMany: Function }; $queryRaw: Function }} db
 * @param {object} event
 * @param {{ slug: string }} ctx
 */
async function buildMinisiteResultsList(db, event, ctx) {
  const polls = await loadMinisiteResultPolls(db, event);
  const isTestMode = event.isLiveConsumed === false;
  const items = [];
  for (const poll of polls) {
    const agg = await fetchPollVoteAggregates(db, poll.id);
    const payload = buildPublicResultPayload(poll, agg, { isTestMode });
    payload.sharePath = `/e/${encodeURIComponent(ctx.slug)}/resultats/${encodeURIComponent(poll.id)}`;
    items.push(payload);
  }
  return {
    enabled: true,
    slug: ctx.slug,
    isTestMode,
    results: items,
  };
}

/**
 * @param {{ poll: { findUnique: Function }; $queryRaw: Function }} db
 * @param {object} event
 * @param {string} pollId
 * @param {{ slug: string; includeHistory?: boolean }} ctx
 */
async function buildMinisiteResultDetail(db, event, pollId, ctx) {
  const id = String(pollId || "").trim();
  if (!id) return { ok: false, status: 404 };

  const poll = await db.poll.findUnique({
    where: { id },
    select: {
      id: true,
      eventId: true,
      title: true,
      question: true,
      type: true,
      status: true,
      order: true,
      leadEnabled: true,
      landingResultHidden: true,
      quizRevealed: true,
      updatedAt: true,
      createdAt: true,
      options: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          order: true,
          isCorrect: true,
          imageUrl: true,
        },
      },
    },
  });
  if (!poll || poll.eventId !== event.id) {
    return { ok: false, status: 404 };
  }
  if (
    !isPollPubliclyExposable({
      event,
      poll,
      surface: PUBLIC_POLL_SURFACE.SHARE_RESULT,
    }) ||
    !isMinisiteResultsSupportedType(poll.type)
  ) {
    return { ok: false, status: 404 };
  }

  const isTestMode = event.isLiveConsumed === false;
  const agg = await fetchPollVoteAggregates(db, poll.id);
  const result = buildPublicResultPayload(poll, agg, { isTestMode });
  result.sharePath = `/e/${encodeURIComponent(ctx.slug)}/resultats/${encodeURIComponent(poll.id)}`;

  let history = null;
  if (ctx.includeHistory === true) {
    history = await fetchMinisiteResultHistory(db, poll.id, {
      optionIds: (poll.options || []).map((o) => o.id),
      percentBase: result.percentBase,
    });
  }

  return {
    ok: true,
    payload: {
      enabled: true,
      slug: ctx.slug,
      isTestMode,
      result,
      history,
    },
  };
}

module.exports = {
  MINISITE_RESULTS_SUPPORTED_TYPES,
  ADVANCED_TYPES_EXCLUDED_V1,
  isMinisiteResultsSupportedType,
  resolveHistoryGranularity,
  loadMinisiteResultPolls,
  buildPublicResultPayload,
  fetchMinisiteResultHistory,
  buildMinisiteResultsList,
  buildMinisiteResultDetail,
};
