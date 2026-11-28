/**
 * Lot 3 — Journal mini-site (actualités manuelles + auto fiables).
 * Réutilise publicPollVisibility / landingFeed — pas d’architecture parallèle.
 */

const {
  PUBLIC_POLL_SURFACE,
  filterPollsForPublicSurface,
  landingFeedResultPollsWhere,
  isPollPubliclyExposable,
} = require("./publicPollVisibility");
const { CONSULTATION_MODE, normalizeConsultationMode } = require("./consultationMode");
const { landingResultCardFromPoll } = require("./landingFeed");

const JOURNAL_TITLE_MAX = 120;
const JOURNAL_BODY_MAX = 500;

/**
 * @param {unknown} type
 */
function isJournalSupportedPollType(type) {
  const t = String(type || "").toUpperCase();
  return [
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "YES_NO",
    "RATING",
    "QUIZ",
    "CONTEST_ENTRY",
  ].includes(t);
}

/**
 * @param {object} message
 * @param {{ resolveMediaUrl?: (url: string | null | undefined) => string | null }} [opts]
 */
function mapPublicJournalNews(message, opts = {}) {
  const title =
    typeof message.title === "string" && message.title.trim()
      ? message.title.trim()
      : null;
  const body = typeof message.body === "string" ? message.body : "";
  const rawImage =
    typeof message.imageUrl === "string" && message.imageUrl.trim()
      ? message.imageUrl.trim()
      : null;
  const imageUrl =
    rawImage && typeof opts.resolveMediaUrl === "function"
      ? opts.resolveMediaUrl(rawImage)
      : rawImage;
  return {
    id: String(message.id),
    title: title || "Actualité",
    body,
    imageUrl,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt
          ? new Date(message.createdAt).toISOString()
          : null,
  };
}

/**
 * Auto-événements datés de façon fiable uniquement :
 * - nouvelle question publique (poll.createdAt)
 * - résultat publié (poll.updatedAt / createdAt) via JOURNAL_AUTO_RESULT
 * Ouverture/clôture participation : omises (pas de journal d’audit fiable).
 *
 * @param {{ poll: { findMany: Function } }} db
 * @param {object} event
 */
async function loadJournalAutoItems(db, event) {
  if (!event?.id) return [];

  const candidates = await db.poll.findMany({
    where: {
      eventId: event.id,
      status: { in: ["ACTIVE", "CLOSED"] },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      question: true,
      type: true,
      status: true,
      leadEnabled: true,
      landingResultHidden: true,
      quizRevealed: true,
      createdAt: true,
      updatedAt: true,
      options: {
        orderBy: { order: "asc" },
        select: { id: true, label: true, order: true, isCorrect: true },
      },
      votes: { select: { optionId: true, voterSessionId: true } },
    },
  });

  /** @type {{ type: string; id: string; occurredAt: string; auto: object; result?: object }[]} */
  const items = [];
  const seenQuestion = new Set();
  const seenResult = new Set();

  for (const poll of candidates) {
    if (!isJournalSupportedPollType(poll.type)) continue;

    const question =
      (poll.question && String(poll.question).trim()) ||
      (poll.title && String(poll.title).trim()) ||
      "Question";

    // Publication de question (catalogue public) — date = createdAt.
    if (
      isPollPubliclyExposable({
        event,
        poll,
        surface: PUBLIC_POLL_SURFACE.JOIN_CATALOG,
      }) &&
      !seenQuestion.has(poll.id)
    ) {
      seenQuestion.add(poll.id);
      const at =
        poll.createdAt instanceof Date
          ? poll.createdAt.toISOString()
          : new Date(poll.createdAt).toISOString();
      items.push({
        type: "auto_question",
        id: `auto_question:${poll.id}`,
        occurredAt: at,
        auto: {
          kind: "question_published",
          label: "Nouvelle question",
          pollId: poll.id,
          question,
        },
      });
    }

    // Résultat publié — surface Journal (mêmes gardes Lot 0 / #95).
    if (
      isPollPubliclyExposable({
        event,
        poll,
        surface: PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT,
      }) &&
      !seenResult.has(poll.id)
    ) {
      seenResult.add(poll.id);
      const at = new Date(poll.updatedAt || poll.createdAt).toISOString();
      const result = landingResultCardFromPoll(
        { ...poll, event },
        undefined,
      );
      items.push({
        type: "auto_result",
        id: `auto_result:${poll.id}`,
        occurredAt: at,
        auto: {
          kind: "result_published",
          label: "Résultat publié",
          pollId: poll.id,
          question,
        },
        result,
      });
    }
  }

  return items;
}

/**
 * @param {{
 *   poll: { findMany: Function };
 *   eventLandingMessage: { findMany: Function };
 * }} db
 * @param {object} event
 * @param {{
 *   slug: string;
 *   resolveMediaUrl?: (url: string | null | undefined) => string | null;
 *   limit?: number;
 * }} ctx
 */
async function buildMinisiteJournal(db, event, ctx) {
  const messages = await db.eventLandingMessage.findMany({
    where: { eventId: event.id, hidden: false },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      body: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  /** @type {{ type: string; id: string; occurredAt: string; news?: object; auto?: object; result?: object }[]} */
  const items = [];

  for (const m of messages) {
    const news = mapPublicJournalNews(m, {
      resolveMediaUrl: ctx.resolveMediaUrl,
    });
    items.push({
      type: "news",
      id: `news:${m.id}`,
      occurredAt: news.createdAt || new Date(0).toISOString(),
      news,
    });
  }

  const autoItems = await loadJournalAutoItems(db, event);
  for (const a of autoItems) items.push(a);

  items.sort((a, b) => {
    const ta = Date.parse(a.occurredAt) || 0;
    const tb = Date.parse(b.occurredAt) || 0;
    return tb - ta;
  });

  const limit =
    typeof ctx.limit === "number" && ctx.limit > 0 ? ctx.limit : null;
  const sliced = limit ? items.slice(0, limit) : items;

  return {
    enabled: true,
    slug: ctx.slug,
    isTestMode: event.isLiveConsumed === false,
    items: sliced,
    totalCount: items.length,
  };
}

module.exports = {
  JOURNAL_TITLE_MAX,
  JOURNAL_BODY_MAX,
  mapPublicJournalNews,
  loadJournalAutoItems,
  buildMinisiteJournal,
  isJournalSupportedPollType,
};
