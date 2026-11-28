/**
 * Fil chronologique Landing hybride — agrège photos / résultats / messages
 * sans dupliquer votes ni URLs (références + agrégats à la lecture).
 */

const {
  PUBLIC_POLL_SURFACE,
  isPublicLeadCrmExcluded,
  isPollPubliclyExposable,
} = require("./publicPollVisibility");

/**
 * Lead CRM pur : exclu du fil (Concours peut apparaître).
 * @param {{ type?: string | null; leadEnabled?: boolean | null } | null | undefined} poll
 */
function isLandingFeedLeadCrm(poll) {
  return isPublicLeadCrmExcluded(poll);
}

/**
 * Carte résultat allégée pour le fil (pas de formDefinition / PII).
 * @param {object} poll — avec options + votes + event (pour mask TEST)
 * @param {{ displayName?: string }[]} [contestWinners]
 */
function landingResultCardFromPoll(poll, contestWinners) {
  const eventIsTestMode = poll?.event?.isLiveConsumed === false;
  const eventDisplayStateUpper = String(
    poll?.event?.displayState || "",
  ).toUpperCase();
  const maskResultsInTestMode =
    eventIsTestMode && eventDisplayStateUpper === "RESULTS";

  const voteCounts = {};
  const uniqueVoters = new Set();
  for (const v of poll.votes || []) {
    voteCounts[v.optionId] = (voteCounts[v.optionId] || 0) + 1;
    if (v.voterSessionId != null && String(v.voterSessionId).trim()) {
      uniqueVoters.add(String(v.voterSessionId));
    }
  }
  if (maskResultsInTestMode) {
    for (const k of Object.keys(voteCounts)) {
      const n = voteCounts[k] || 0;
      voteCounts[k] = n < 10 ? n : Math.floor(n / 10) * 10;
    }
  }

  const quizRevealed = Boolean(poll.quizRevealed);
  const type = String(poll.type || "").toUpperCase();
  const votersCount = uniqueVoters.size;
  let answersTotal = 0;
  for (const n of Object.values(voteCounts)) answersTotal += Number(n) || 0;
  const pctBase =
    type === "MULTIPLE_CHOICE"
      ? votersCount || answersTotal
      : answersTotal || votersCount;
  return {
    pollId: poll.id,
    question:
      (poll.question && String(poll.question).trim()) ||
      (poll.title && String(poll.title).trim()) ||
      "Question",
    type: String(poll.type || ""),
    votersCount,
    answers: answersTotal,
    percentBase: type === "MULTIPLE_CHOICE" ? "respondents" : "answers",
    percentMayExceed100: type === "MULTIPLE_CHOICE",
    quizRevealed,
    options: (poll.options || []).map((opt) => {
      const votes = voteCounts[opt.id] || 0;
      const percent =
        !pctBase || pctBase <= 0
          ? 0
          : Math.round((votes / pctBase) * 1000) / 10;
      const base = {
        id: opt.id,
        label: opt.label,
        votes,
        answers: votes,
        percent,
      };
      if (quizRevealed) {
        return { ...base, isCorrect: Boolean(opt.isCorrect) };
      }
      return base;
    }),
    contestWinners: Array.isArray(contestWinners) ? contestWinners : undefined,
  };
}

/**
 * @param {object} args
 * @param {object} args.event — Event prisma (+ axes live / consultation)
 * @param {object[]} args.photos — EventLandingPhoto[]
 * @param {Record<string, number>} args.likeCounts — photoId → count
 * @param {Set<string>} args.likedPhotoIds — photos likées par le visiteur
 * @param {object[]} args.messages — EventLandingMessage[] (déjà filtrés hidden si public)
 * @param {object[]} args.closedPolls — Poll CLOSED (idéalement déjà filtrés côté API)
 * @param {Record<string, { displayName: string }[]>} args.winnersByPollId
 * @param {boolean} args.afterLive — phase after
 */
function buildLandingFeedItems(args) {
  const {
    event,
    photos = [],
    likeCounts = {},
    likedPhotoIds = new Set(),
    messages = [],
    closedPolls = [],
    winnersByPollId = {},
    afterLive = false,
  } = args;

  const keepPhotos = afterLive
    ? event.landingKeepPhotosAfter !== false
    : true;
  const keepResults = afterLive
    ? event.landingKeepResultsAfter !== false
    : true;
  const keepMessages = afterLive
    ? event.landingKeepMessagesAfter !== false
    : true;

  /** @type {{ type: string; id: string; occurredAt: string; photo?: object; result?: object; message?: object }[]} */
  const items = [];

  if (keepPhotos) {
    for (const p of photos) {
      const pid = String(p.id);
      items.push({
        type: "photo",
        id: `photo:${pid}`,
        occurredAt: new Date(p.createdAt).toISOString(),
        photo: {
          id: pid,
          url: p.url,
          createdAt: new Date(p.createdAt).toISOString(),
          caption:
            typeof p.caption === "string" && p.caption.trim()
              ? p.caption.trim()
              : null,
          likeCount: Number(likeCounts[pid] || 0),
          likedByMe: likedPhotoIds.has(pid),
        },
      });
    }
  }

  if (keepMessages) {
    for (const m of messages) {
      if (m.hidden) continue;
      const title =
        typeof m.title === "string" && m.title.trim() ? m.title.trim() : null;
      items.push({
        type: "message",
        id: `message:${m.id}`,
        occurredAt: new Date(m.createdAt).toISOString(),
        message: {
          id: m.id,
          title,
          body: m.body,
          imageUrl:
            typeof m.imageUrl === "string" && m.imageUrl.trim()
              ? m.imageUrl.trim()
              : null,
          createdAt: new Date(m.createdAt).toISOString(),
        },
      });
    }
  }

  if (keepResults) {
    for (const poll of closedPolls) {
      // Défense en profondeur : même si l’API a déjà filtré.
      if (
        !isPollPubliclyExposable({
          event,
          poll,
          surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
        })
      ) {
        continue;
      }
      const winners = winnersByPollId[poll.id];
      items.push({
        type: "result",
        id: `result:${poll.id}`,
        occurredAt: new Date(poll.updatedAt || poll.createdAt).toISOString(),
        result: landingResultCardFromPoll(poll, winners),
      });
    }
  }

  items.sort((a, b) => {
    const ta = Date.parse(a.occurredAt) || 0;
    const tb = Date.parse(b.occurredAt) || 0;
    return tb - ta;
  });

  return items;
}

module.exports = {
  isLandingFeedLeadCrm,
  landingResultCardFromPoll,
  buildLandingFeedItems,
};
