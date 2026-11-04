/**
 * Fil chronologique Landing hybride — agrège photos / résultats / messages
 * sans dupliquer votes ni URLs (références + agrégats à la lecture).
 */

/**
 * Lead CRM pur : exclu du fil (Concours peut apparaître).
 * @param {{ type?: string | null; leadEnabled?: boolean | null } | null | undefined} poll
 */
function isLandingFeedLeadCrm(poll) {
  if (!poll) return false;
  const type = String(poll.type || "").toUpperCase();
  if (type === "CONTEST_ENTRY") return false;
  return poll.leadEnabled === true;
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
  return {
    pollId: poll.id,
    question:
      (poll.question && String(poll.question).trim()) ||
      (poll.title && String(poll.title).trim()) ||
      "Question",
    type: String(poll.type || ""),
    votersCount: uniqueVoters.size,
    quizRevealed,
    options: (poll.options || []).map((opt) => {
      const base = {
        id: opt.id,
        label: opt.label,
        votes: voteCounts[opt.id] || 0,
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
 * @param {object} args.event — Event prisma (+ axes live)
 * @param {object[]} args.photos — EventLandingPhoto[]
 * @param {Record<string, number>} args.likeCounts — photoId → count
 * @param {Set<string>} args.likedPhotoIds — photos likées par le visiteur
 * @param {object[]} args.messages — EventLandingMessage[] (déjà filtrés hidden si public)
 * @param {object[]} args.closedPolls — Poll CLOSED avec options+votes+event
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
      items.push({
        type: "message",
        id: `message:${m.id}`,
        occurredAt: new Date(m.createdAt).toISOString(),
        message: {
          id: m.id,
          body: m.body,
          createdAt: new Date(m.createdAt).toISOString(),
        },
      });
    }
  }

  if (keepResults) {
    for (const poll of closedPolls) {
      if (isLandingFeedLeadCrm(poll)) continue;
      if (poll.landingResultHidden === true) continue;
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
