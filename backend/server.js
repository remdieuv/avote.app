require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const { prisma } = require("./lib/prisma");
const { uploadImageBufferToCloudinary } = require("./lib/cloudinary");
const {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  readTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
} = require("./lib/auth");
const { assertEventOwnedBy, assertPollOwnedBy } = require("./lib/eventAccess");

/** Origine publique de l’API (URLs absolues assets /join). */
const PUBLIC_API_ORIGIN = (
  process.env.PUBLIC_API_ORIGIN || "http://localhost:4000"
).replace(/\/$/, "");
const UPLOAD_ROOT = path.join(__dirname, "uploads");

function ensureUploadRoot() {
  try {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  } catch (_) {
    /* ignore */
  }
}
ensureUploadRoot();

/**
 * @param {string | null | undefined} stored
 * @returns {string | null}
 */
function absolutizeStoredAssetUrl(stored) {
  if (stored == null || typeof stored !== "string") return null;
  const t = stored.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const p = t.startsWith("/") ? t : `/${t}`;
  return `${PUBLIC_API_ORIGIN}${p}`;
}

/**
 * @param {import("@prisma/client").Event | null | undefined} event
 */
function eventCustomizationJson(event) {
  if (!event) {
    return {
      description: null,
      logoUrl: null,
      backgroundUrl: null,
      primaryColor: null,
      themeMode: null,
      backgroundOverlayStrength: null,
      roomBackgroundColor: null,
      infoSectionTitle: null,
      infoSectionText: null,
      infoPrimaryCtaLabel: null,
      infoPrimaryCtaUrl: null,
      infoSecondaryCtaLabel: null,
      infoSecondaryCtaUrl: null,
      infoShowOnFinished: true,
    };
  }
  return {
    description: event.description ?? null,
    logoUrl: absolutizeStoredAssetUrl(event.logoUrl),
    backgroundUrl: absolutizeStoredAssetUrl(event.backgroundUrl),
    primaryColor: event.primaryColor ?? null,
    themeMode: event.themeMode ?? null,
    backgroundOverlayStrength: event.backgroundOverlayStrength ?? null,
    roomBackgroundColor: event.roomBackgroundColor ?? null,
    infoSectionTitle: event.infoSectionTitle ?? null,
    infoSectionText: event.infoSectionText ?? null,
    infoPrimaryCtaLabel: event.infoPrimaryCtaLabel ?? null,
    infoPrimaryCtaUrl: event.infoPrimaryCtaUrl ?? null,
    infoSecondaryCtaLabel: event.infoSecondaryCtaLabel ?? null,
    infoSecondaryCtaUrl: event.infoSecondaryCtaUrl ?? null,
    infoShowOnFinished:
      typeof event.infoShowOnFinished === "boolean"
        ? event.infoShowOnFinished
        : true,
  };
}

const CUSTOM_THEME_MODES = new Set(["dark", "light", "auto"]);
const CUSTOM_OVERLAY = new Set(["low", "medium", "strong"]);

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
}).single("file");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

const PORT = process.env.PORT || 4000;

/**
 * Ancien champ liveState dérivé pour compat (chrono, clients legacy).
 * @param {import("@prisma/client").VoteState | string} voteState
 * @param {import("@prisma/client").DisplayState | string} displayState
 */
function computeLiveState(voteState, displayState) {
  const vs = String(voteState ?? "CLOSED").toUpperCase();
  const ds = String(displayState ?? "WAITING").toUpperCase();
  if (ds === "BLACK") return "PAUSED";
  if (ds === "WAITING") return "WAITING";
  if (ds === "RESULTS") return "RESULTS";
  if (ds === "QUESTION" && vs === "OPEN") return "VOTING";
  return "WAITING";
}

/** @param {string} pollId */
function roomPourPoll(pollId) {
  return `poll_${pollId}`;
}

/** @param {string} eventId */
function roomPourEvent(eventId) {
  return `event_${eventId}`;
}

/**
 * @param {string} eventId
 * @param {string} screenId
 */
function roomPourScreen(eventId, screenId) {
  return `screen_${eventId}__${screenId}`;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeScreenId(raw) {
  if (raw == null) return null;
  const id = String(raw).trim();
  if (!id) return null;
  if (!/^[A-Za-z0-9_-]{1,24}$/.test(id)) return null;
  return id.toLowerCase();
}

/**
 * Room écran = id événement brut (cuid), distinct de roomPourEvent (`event_…`).
 * @param {import("socket.io").Server} io
 */
async function emitScreenCountToAdmins(io, eventId) {
  const id = String(eventId).trim();
  if (!id) return;
  try {
    const sockets = await io.in(id).fetchSockets();
    const count = sockets.length;
    io.to(roomPourEvent(id)).emit("screen:count", { eventId: id, count });
  } catch (e) {
    console.error("screen:count", e);
  }
}

/**
 * @param {import("socket.io").Server} io
 * @param {string} eventId
 * @param {string} screenId
 */
async function emitScreenPresenceToAdmins(io, eventId, screenId) {
  const id = String(eventId).trim();
  const sid = normalizeScreenId(screenId);
  if (!id || !sid) return;
  try {
    const sockets = await io.in(roomPourScreen(id, sid)).fetchSockets();
    const count = sockets.length;
    io.to(roomPourEvent(id)).emit("screen:presence", {
      eventId: id,
      screenId: sid,
      count,
      connected: count > 0,
    });
  } catch (e) {
    console.error("screen:presence", e);
  }
}

const QUESTION_TIMER_RESET = {
  questionTimerTotalSec: null,
  questionTimerAccumulatedSec: 0,
  questionTimerStartedAt: null,
  questionTimerIsPaused: true,
};

/** Chrono scène : max 90 jours (Int Prisma suffit largement). */
const QUESTION_TIMER_SEC_MAX = 90 * 24 * 60 * 60;

/**
 * @param {import("@prisma/client").Event | null | undefined} event
 */
function questionTimerSnapshot(event) {
  if (!event || event.questionTimerTotalSec == null) return null;
  const total = event.questionTimerTotalSec;
  const accumulated = event.questionTimerAccumulatedSec ?? 0;
  const startedAt = event.questionTimerStartedAt;
  const isPaused = !!event.questionTimerIsPaused;
  const running = !isPaused && startedAt != null;
  let remainingSec = Math.max(0, total - accumulated);
  if (running) {
    const seg = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    remainingSec = Math.max(0, total - accumulated - seg);
  }
  return {
    totalSec: total,
    accumulatedSec: accumulated,
    startedAt: startedAt ? startedAt.toISOString() : null,
    isPaused,
    running,
    remainingSec,
    serverNow: new Date().toISOString(),
  };
}

/**
 * @param {import("@prisma/client").Poll & {
 *   options: import("@prisma/client").PollOption[];
 *   votes: import("@prisma/client").Vote[];
 *   event?: import("@prisma/client").Event | null;
 * }} poll
 */
function pollToJson(poll) {
  const eventIsTestMode = poll?.event?.isLiveConsumed === false;
  const eventDisplayStateUpper = String(poll?.event?.displayState || "").toUpperCase();
  const maskResultsInTestMode = eventIsTestMode && eventDisplayStateUpper === "RESULTS";

  const voteCounts = {};
  for (const v of poll.votes) {
    voteCounts[v.optionId] = (voteCounts[v.optionId] || 0) + 1;
  }

  // En mode TEST, on masque fortement la précision des résultats en "bucketisant"
  // les votes bruts avant le calcul des pourcentages côté écran.
  if (maskResultsInTestMode) {
    const bucket = 10; // faible granularité = plus difficile d'exploiter via réseau
    for (const k of Object.keys(voteCounts)) {
      const raw = voteCounts[k] || 0;
      voteCounts[k] = Math.round(raw / bucket) * bucket;
    }
  }

  return {
    id: poll.id,
    title: poll.title,
    question: poll.question,
    contestPrize: poll.contestPrize ?? null,
    contestWinnerCount: Number(poll.contestWinnerCount || 1),
    quizRevealed: Boolean(poll.quizRevealed),
    type: poll.type,
    leadEnabled: Boolean(poll.leadEnabled),
    leadTriggerOptionId: poll.leadTriggerOptionId ?? null,
    status: poll.status,
    order: poll.order,
    createdAt: poll.createdAt.toISOString(),
    eventId: poll.eventId,
    eventSlug: poll.event?.slug ?? null,
    eventLiveState: poll.event?.liveState
      ? String(poll.event.liveState).toLowerCase()
      : null,
    eventVoteState: poll.event?.voteState
      ? String(poll.event.voteState).toLowerCase()
      : null,
    eventDisplayState: poll.event?.displayState
      ? String(poll.event.displayState).toLowerCase()
      : null,
    eventScreenDisplayState: poll.event?.screenDisplayState
      ? String(poll.event.screenDisplayState).toLowerCase()
      : null,
    eventIsLiveConsumed: poll.event?.isLiveConsumed ?? null,
    eventIsLocked: poll.event?.isLocked ?? null,
    autoReveal: Boolean(poll.event?.autoReveal),
    autoRevealDelaySec: poll.event?.autoRevealDelaySec ?? 5,
    autoRevealShowResultsAt:
      poll.event?.autoRevealShowResultsAt?.toISOString() ?? null,
    questionTimer: poll.event
      ? questionTimerSnapshot(poll.event)
      : null,
    options: poll.options.map((option) => {
      const base = {
        id: option.id,
        label: option.label,
        order: option.order,
        votes: voteCounts[option.id] || 0,
      };
      if (poll.quizRevealed) {
        return { ...base, isCorrect: Boolean(option.isCorrect) };
      }
      return base;
    }),
  };
}

function maskPhoneForPublic(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 4) return "XX XX";
  const head = digits.slice(0, 2);
  const tail = digits.slice(-2);
  return `${head} XX XX XX ${tail}`;
}

function maskEmailForPublic(email) {
  const raw = String(email || "").trim();
  if (!raw || !raw.includes("@")) return null;
  const [local, domain] = raw.split("@");
  if (!domain) return null;
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

function winnerDisplayNameForPublic(firstName, position) {
  const n = String(firstName || "").trim();
  if (!n) return `Gagnant ${position}`;
  return `${n[0].toUpperCase()}${n.slice(1)}.`;
}

function winnerDisplayContactForPublic(phone, email) {
  return maskPhoneForPublic(phone) || maskEmailForPublic(email) || "Contact privé";
}

async function loadPollFull(pollId) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      event: true,
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });
}

async function loadPublicPollPourSlug(slug) {
  if (!slug || typeof slug !== "string") return null;

  const event = await prisma.event.findUnique({
    where: { slug: slug.trim() },
  });
  if (!event?.activePollId) return null;

  const poll = await prisma.poll.findFirst({
    where: {
      id: event.activePollId,
      eventId: event.id,
    },
    include: {
      event: true,
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });
  if (!poll) return null;

  const voteOuvert = String(event.voteState).toUpperCase() === "OPEN";

  if (voteOuvert) {
    if (poll.status !== "ACTIVE") {
      return null;
    }
    return poll;
  }

  /**
   * Vote fermé (chrono, régie, etc.) : garder le sondage actif lisible tant que
   * activePollId pointe encore dessus — sinon la page publique bascule en 404 /
   * « en attente » alors que le vote vient de se terminer.
   */
  if (poll.status !== "ACTIVE" && poll.status !== "CLOSED") {
    return null;
  }
  return poll;
}

/**
 * Sondage précis pour /p/:slug?poll=… : même événement, lecture résultats (CLOSED / ACTIVE).
 * @param {string} slug
 * @param {string} pollId
 */
async function loadPublicPollByIdForEventSlug(slug, pollId) {
  if (!slug || typeof slug !== "string" || !pollId || typeof pollId !== "string") {
    return null;
  }
  const event = await prisma.event.findUnique({
    where: { slug: slug.trim() },
  });
  if (!event) return null;

  const poll = await prisma.poll.findFirst({
    where: {
      id: pollId.trim(),
      eventId: event.id,
      status: { in: ["CLOSED", "ACTIVE"] },
    },
    include: {
      event: true,
      options: { orderBy: { order: "asc" } },
      votes: true,
    },
  });
  return poll || null;
}

async function submitVote(input) {
  const poll = await prisma.poll.findUnique({
    where: { id: input.pollId },
    include: {
      options: true,
      votes: true,
      event: true,
    },
  });

  if (!poll) {
    return { ok: false, message: "Sondage introuvable." };
  }

  if (Boolean(poll.event?.isLocked)) {
    return {
      ok: false,
      locked: true,
      message: "Cet événement est terminé et ne peut plus accepter de votes.",
    };
  }

  const eventId = String(poll.eventId || "").trim();
  if (!eventId) {
    return { ok: false, message: "Événement introuvable." };
  }

  const participantExistsOnEvent = await prisma.vote.findFirst({
    where: {
      voterSessionId: input.voterSessionId,
      poll: { eventId },
    },
    select: { id: true },
  });

  if (!participantExistsOnEvent) {
    const distinctParticipants = await prisma.vote.findMany({
      where: { poll: { eventId } },
      distinct: ["voterSessionId"],
      select: { voterSessionId: true },
    });
    const participantsUsed = distinctParticipants.length;
    const participantsLimit = Math.max(
      1,
      Number(poll.event?.participantsLimit || 500),
    );
    if (participantsUsed >= participantsLimit) {
      await prisma.event.update({
        where: { id: eventId },
        data: { isLocked: true },
      });
      return {
        ok: false,
        limitReached: true,
        message: "Limite de participants atteinte",
      };
    }
  }

  if (String(poll.event.voteState).toUpperCase() !== "OPEN") {
    return {
      ok: false,
      message: "Le vote n'est pas ouvert pour cet événement.",
    };
  }

  if (poll.status !== "ACTIVE") {
    return { ok: false, message: "Ce sondage n'est pas ouvert au vote." };
  }

  const existing = await prisma.vote.findFirst({
    where: {
      pollId: input.pollId,
      voterSessionId: input.voterSessionId,
    },
  });

  if (existing) {
    return {
      ok: false,
      alreadyVoted: true,
      message: "Vous avez déjà voté pour ce sondage.",
    };
  }

  const allowed = new Set(poll.options.map((option) => option.id));
  const cleaned = [...new Set(input.optionIds)].filter((id) => allowed.has(id));

  if (cleaned.length === 0) {
    return {
      ok: false,
      message: "Aucune réponse valide sélectionnée.",
    };
  }

  if (poll.type !== "MULTIPLE_CHOICE" && cleaned.length > 1) {
    return {
      ok: false,
      message: "Une seule réponse est autorisée pour ce sondage.",
    };
  }

  await prisma.vote.createMany({
    data: cleaned.map((optionId) => ({
      pollId: input.pollId,
      optionId,
      voterSessionId: input.voterSessionId,
    })),
  });

  return { ok: true };
}

/** @param {import("socket.io").Server} io */
async function emitPollUpdated(io, pollId) {
  const poll = await loadPollFull(pollId);
  if (poll) {
    io.to(roomPourPoll(pollId)).emit("poll_updated", pollToJson(poll));
  }
}

/**
 * Anciens événements : liveState VOTING alors que le vote est fermé et l’affichage en attente.
 * Aligne la base et l’objet `event` en mémoire (évite régie / socket incohérents).
 * @param {{ id: string; liveState: string; voteState: string; displayState: string }} event
 */
async function repairStaleVotingLiveState(event) {
  if (
    String(event.voteState).toUpperCase() === "CLOSED" &&
    String(event.displayState).toUpperCase() === "WAITING" &&
    String(event.liveState).toUpperCase() === "VOTING"
  ) {
    await prisma.event.update({
      where: { id: event.id },
      data: { liveState: "WAITING" },
    });
    event.liveState = "WAITING";
  }
}

/** @param {import("socket.io").Server} io */
async function emitEventLiveUpdated(io, eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });
  if (!event) return;
  await repairStaleVotingLiveState(event);

  let pollJson = null;
  if (event.activePollId) {
    const poll = await loadPollFull(event.activePollId);
    if (poll) {
      const vs = String(event.voteState).toUpperCase();
      const ds = String(event.displayState).toUpperCase();
      const openActive = vs === "OPEN" && poll.status === "ACTIVE";
      const sceneQuestionOrResults =
        ds === "QUESTION" || ds === "RESULTS";
      /** Ex. fin de chrono : vote CLOSED, poll CLOSED, display WAITING — le public garde le contexte */
      const voteTerminePollEncoreAffiche =
        vs === "CLOSED" &&
        String(poll.status).toUpperCase() === "CLOSED" &&
        String(poll.id) === String(event.activePollId);
      if (
        openActive ||
        sceneQuestionOrResults ||
        voteTerminePollEncoreAffiche
      ) {
        pollJson = pollToJson(poll);
      }
    }
  }

  io.to(roomPourEvent(eventId)).emit("event_live_updated", {
    eventId: event.id,
    slug: event.slug,
    isLiveConsumed: event.isLiveConsumed,
    isLocked: event.isLocked,
    liveState: event.liveState.toLowerCase(),
    voteState: String(event.voteState).toLowerCase(),
    displayState: String(event.displayState).toLowerCase(),
    screenDisplayState: event.screenDisplayState
      ? String(event.screenDisplayState).toLowerCase()
      : null,
    activePollId: event.activePollId,
    autoReveal: event.autoReveal,
    autoRevealDelaySec: event.autoRevealDelaySec,
    autoRevealShowResultsAt:
      event.autoRevealShowResultsAt?.toISOString() ?? null,
    questionTimer: questionTimerSnapshot(event),
    poll: pollJson,
  });

  if (event.activePollId && pollJson) {
    io.to(roomPourPoll(event.activePollId)).emit("poll_updated", pollJson);
  }
}

/**
 * Auto-fermeture quand le chrono atteint 0 : ferme le poll actif, WAITING, reset timer.
 * Ne passe pas aux résultats. Idempotent (updateMany sur poll ACTIVE uniquement).
 * @returns {Promise<boolean>}
 */
function eventEstEnVote(event) {
  return String(event.voteState).toUpperCase() === "OPEN";
}

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const autoRevealTimers = new Map();

function clearAutoRevealTimer(eventId) {
  const id = String(eventId);
  const t = autoRevealTimers.get(id);
  if (t) {
    clearTimeout(t);
    autoRevealTimers.delete(id);
  }
}

async function annulationAutoRevealProgrammee(eventId) {
  clearAutoRevealTimer(eventId);
  await prisma.event.updateMany({
    where: { id: eventId, autoRevealShowResultsAt: { not: null } },
    data: { autoRevealShowResultsAt: null },
  });
}

/** Applique display RESULTS après délai auto-reveal (timer ou file d’attente serveur). */
async function appliquerAutoRevealResultats(io, eventId) {
  clearAutoRevealTimer(eventId);
  const fresh = await prisma.event.findUnique({ where: { id: eventId } });
  if (!fresh?.activePollId) return;
  if (String(fresh.voteState).toUpperCase() !== "CLOSED") return;
  if (String(fresh.displayState).toUpperCase() === "RESULTS") {
    await prisma.event.update({
      where: { id: eventId },
      data: { autoRevealShowResultsAt: null },
    });
    await emitEventLiveUpdated(io, eventId);
    return;
  }
  await prisma.event.update({
    where: { id: eventId },
    data: {
      displayState: "RESULTS",
      liveState: computeLiveState(fresh.voteState, "RESULTS"),
      autoRevealShowResultsAt: null,
    },
  });
  await emitEventLiveUpdated(io, eventId);
}

function planifierTimeoutAutoReveal(io, eventId, delayMs) {
  clearAutoRevealTimer(eventId);
  const t = setTimeout(() => {
    void appliquerAutoRevealResultats(io, eventId);
  }, delayMs);
  autoRevealTimers.set(String(eventId), t);
}

async function fermerVoteSiChronoEpuise(io, eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.questionTimerTotalSec == null) return false;
  if (!eventEstEnVote(event)) return false;
  const activeId = event.activePollId;
  if (!activeId) return false;

  const snap = questionTimerSnapshot(event);
  /** < 1 s : tolère décalage horloge client/serveur */
  if (!snap || snap.remainingSec >= 1) return false;

  const closed = await prisma.poll.updateMany({
    where: {
      id: activeId,
      eventId,
      status: "ACTIVE",
    },
    data: { status: "CLOSED" },
  });
  if (closed.count === 0) return false;

  const delaySec = [3, 5, 10].includes(event.autoRevealDelaySec)
    ? event.autoRevealDelaySec
    : 5;
  const dataReveil = {
    voteState: "CLOSED",
    displayState: "WAITING",
    liveState: "WAITING",
    ...QUESTION_TIMER_RESET,
  };
  if (event.autoReveal) {
    dataReveil.autoRevealShowResultsAt = new Date(Date.now() + delaySec * 1000);
  } else {
    dataReveil.autoRevealShowResultsAt = null;
  }

  clearAutoRevealTimer(eventId);
  await prisma.event.update({
    where: { id: eventId },
    data: dataReveil,
  });

  await emitEventLiveUpdated(io, eventId);
  const pollFerme = await loadPollFull(activeId);
  if (pollFerme) {
    io.to(roomPourPoll(activeId)).emit("poll_updated", pollToJson(pollFerme));
  }
  if (event.autoReveal) {
    planifierTimeoutAutoReveal(io, eventId, delaySec * 1000);
  }
  return true;
}

async function passerAuSondageSuivant(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      polls: { orderBy: { order: "asc" } },
    },
  });

  if (!event) {
    return { ok: false, code: 404, message: "Événement introuvable." };
  }

  const isTestMode = event.isLiveConsumed === false;
  const forcedTestTimer = {
    questionTimerTotalSec: 30,
    questionTimerAccumulatedSec: 0,
    questionTimerStartedAt: new Date(),
    questionTimerIsPaused: false,
  };

  await annulationAutoRevealProgrammee(eventId);

  const liste = event.polls.filter((p) => p.status !== "ARCHIVED");
  const idx = liste.findIndex((p) => p.id === event.activePollId);
  const suivant = idx >= 0 ? liste[idx + 1] : liste[0];

  await prisma.poll.updateMany({
    where: { eventId, status: "ACTIVE" },
    data: { status: "CLOSED" },
  });

  if (!suivant) {
    const misAJour = await prisma.event.update({
      where: { id: eventId },
      data: {
        activePollId: null,
        liveState: "FINISHED",
        voteState: "CLOSED",
        displayState: "WAITING",
        autoRevealShowResultsAt: null,
        ...QUESTION_TIMER_RESET,
      },
    });
    return {
      ok: true,
      finished: true,
      event: misAJour,
    };
  }

  await prisma.poll.update({
    where: { id: suivant.id },
    data: { status: "ACTIVE" },
  });

  const misAJour = await prisma.event.update({
    where: { id: eventId },
    data: {
      activePollId: suivant.id,
      voteState: "OPEN",
      displayState: "QUESTION",
      liveState: "VOTING",
      autoRevealShowResultsAt: null,
      ...(isTestMode ? forcedTestTimer : QUESTION_TIMER_RESET),
    },
  });

  return {
    ok: true,
    finished: false,
    activePollId: suivant.id,
    event: misAJour,
  };
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

function requireAuth(req, res, next) {
  const token = readTokenFromRequest(req);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  req.userId = payload.sub;
  req.userEmail = payload.email;
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, role: true },
    });
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Compte introuvable." });
    }
    if (String(user.role || "").toUpperCase() !== "ADMIN") {
      return res.status(403).json({ error: "Accès réservé aux administrateurs." });
    }
    req.userRole = "ADMIN";
    next();
  } catch (e) {
    console.error("requireAdmin", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}
app.use("/uploads", express.static(UPLOAD_ROOT));

app.get("/", (_req, res) => {
  res.type("text/plain").send("API Avote OK");
});

app.get("/auth/google", (_req, res) => {
  res.status(501).json({
    error:
      "Connexion Google : à configurer côté serveur. Utilisez e-mail / mot de passe.",
  });
});

app.post("/auth/register", async (req, res) => {
  try {
    const body = req.body ?? {};
    const emailRaw =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const pass = typeof body.password === "string" ? body.password : "";
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return res.status(400).json({ error: "E-mail invalide." });
    }
    if (pass.length < 8) {
      return res
        .status(400)
        .json({ error: "Mot de passe : au moins 8 caractères." });
    }
    const exists = await prisma.user.findUnique({
      where: { email: emailRaw },
      select: { id: true },
    });
    if (exists) {
      return res
        .status(409)
        .json({ error: "Un compte existe déjà avec cet e-mail." });
    }
    const passwordHash = await hashPassword(pass);
    const user = await prisma.user.create({
      data: {
        email: emailRaw,
        passwordHash,
        provider: "CREDENTIALS",
      },
      select: { id: true, email: true },
    });
    const token = signToken(user.id, user.email);
    setAuthCookie(res, token);
    return res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Inscription impossible." });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const body = req.body ?? {};
    const emailRaw =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const pass = typeof body.password === "string" ? body.password : "";
    if (!emailRaw || !pass) {
      return res.status(400).json({ error: "E-mail et mot de passe requis." });
    }
    const user = await prisma.user.findUnique({
      where: { email: emailRaw },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user || !(await verifyPassword(pass, user.passwordHash))) {
      return res.status(401).json({ error: "E-mail ou mot de passe incorrect." });
    }
    const token = signToken(user.id, user.email);
    setAuthCookie(res, token);
    return res.json({
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Connexion impossible." });
  }
});

app.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get("/auth/me", async (req, res) => {
  try {
    const token = readTokenFromRequest(req);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Non authentifié." });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Compte introuvable." });
    }
    return res.json({ user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Liste admin : live + compteurs (questions, votes, participants distincts).
 * @returns {Promise<Array<{
 *   id: string;
 *   title: string;
 *   slug: string;
 *   createdAt: string;
 *   liveState: string;
 *   voteState: string;
 *   displayState: string;
 *   pollCount: number;
 *   voteCount: number;
 *   participantCount: number;
 * }>>}
 */
async function listEventsForAdmin(userId) {
  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      liveState: true,
      voteState: true,
      displayState: true,
      polls: { select: { id: true } },
    },
  });

  const pollIds = events.flatMap((e) => e.polls.map((p) => p.id));
  /** @type {Map<string, number>} */
  const votesByEventId = new Map();
  /** @type {Map<string, Set<string>>} */
  const participantsByEventId = new Map();
  for (const e of events) {
    votesByEventId.set(e.id, 0);
    participantsByEventId.set(e.id, new Set());
  }

  if (pollIds.length > 0) {
    const voteRows = await prisma.vote.findMany({
      where: { pollId: { in: pollIds } },
      select: { pollId: true, voterSessionId: true },
    });
    /** @type {Map<string, string>} */
    const pollToEvent = new Map();
    for (const ev of events) {
      for (const p of ev.polls) {
        pollToEvent.set(p.id, ev.id);
      }
    }
    for (const v of voteRows) {
      const eid = pollToEvent.get(v.pollId);
      if (!eid) continue;
      votesByEventId.set(eid, (votesByEventId.get(eid) || 0) + 1);
      participantsByEventId.get(eid)?.add(v.voterSessionId);
    }
  }

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    createdAt: e.createdAt.toISOString(),
    liveState: String(e.liveState).toLowerCase(),
    voteState: String(e.voteState).toLowerCase(),
    displayState: String(e.displayState).toLowerCase(),
    pollCount: e.polls.length,
    voteCount: votesByEventId.get(e.id) || 0,
    participantCount: participantsByEventId.get(e.id)?.size || 0,
  }));
}

/** Liste des événements (admin / « Mes événements ») */
app.get("/events", requireAuth, async (req, res) => {
  try {
    const list = await listEventsForAdmin(req.userId);
    return res.json(list);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/events/:eventId/duplicate", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const source = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        polls: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!source) {
      return res.status(404).json({ error: "Événement introuvable." });
    }
    if (!Array.isArray(source.polls) || source.polls.length < 1) {
      return res.status(400).json({ error: "Aucune question à dupliquer." });
    }

    const slug = await slugEvenementUnique();
    const duplicated = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          userId: req.userId,
          title: `${source.title} (copie)`,
          description: source.description ?? null,
          logoUrl: source.logoUrl ?? null,
          backgroundUrl: source.backgroundUrl ?? null,
          primaryColor: source.primaryColor ?? null,
          themeMode: source.themeMode ?? null,
          backgroundOverlayStrength: source.backgroundOverlayStrength ?? null,
          roomBackgroundColor: source.roomBackgroundColor ?? null,
          infoSectionTitle: source.infoSectionTitle ?? null,
          infoSectionText: source.infoSectionText ?? null,
          infoPrimaryCtaLabel: source.infoPrimaryCtaLabel ?? null,
          infoPrimaryCtaUrl: source.infoPrimaryCtaUrl ?? null,
          infoSecondaryCtaLabel: source.infoSecondaryCtaLabel ?? null,
          infoSecondaryCtaUrl: source.infoSecondaryCtaUrl ?? null,
          infoShowOnFinished:
            typeof source.infoShowOnFinished === "boolean"
              ? source.infoShowOnFinished
              : true,
          slug,
          status: "PUBLISHED",
          liveState: "WAITING",
          voteState: "CLOSED",
          displayState: "WAITING",
          isLiveConsumed: false,
          consumedAt: null,
          isLocked: false,
          autoReveal: Boolean(source.autoReveal),
          autoRevealDelaySec: source.autoRevealDelaySec ?? 5,
          autoRevealShowResultsAt: null,
          questionTimerTotalSec: source.questionTimerTotalSec ?? null,
          questionTimerAccumulatedSec: 0,
          questionTimerStartedAt: null,
          questionTimerIsPaused: true,
        },
      });

      let firstPollId = null;
      for (let i = 0; i < source.polls.length; i++) {
        const sp = source.polls[i];
        const created = await tx.poll.create({
          data: {
            eventId: event.id,
            title: sp.title,
            question: sp.question,
            contestPrize: sp.contestPrize ?? null,
            contestWinnerCount: normalizeContestWinnerCount(sp.contestWinnerCount),
            type: sp.type,
            leadEnabled: Boolean(sp.leadEnabled),
            status: i === 0 ? "ACTIVE" : "DRAFT",
            order: i,
            options: {
              create: sp.options.map((o) => ({
                label: o.label,
                order: o.order,
              })),
            },
          },
          include: { options: { orderBy: { order: "asc" } } },
        });
        if (sp.leadEnabled) {
          const sourceTrigger = sp.options.find((o) => o.id === sp.leadTriggerOptionId);
          const triggerOrder = sourceTrigger?.order ?? 0;
          const mappedTrigger =
            created.options.find((o) => o.order === triggerOrder) ?? created.options[0] ?? null;
          await tx.poll.update({
            where: { id: created.id },
            data: { leadTriggerOptionId: mappedTrigger?.id ?? null },
          });
        }
        if (!firstPollId) firstPollId = created.id;
      }

      await tx.event.update({
        where: { id: event.id },
        data: { activePollId: firstPollId },
      });
      return event;
    });

    return res.status(201).json({
      ok: true,
      event: {
        id: duplicated.id,
        title: duplicated.title,
        slug: duplicated.slug,
      },
    });
  } catch (e) {
    console.error("events/:eventId/duplicate", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.delete("/events/:eventId", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const evt = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, liveState: true, title: true },
    });
    if (!evt) {
      return res.status(404).json({ error: "Événement introuvable." });
    }
    if (String(evt.liveState || "").toUpperCase() === "VOTING") {
      return res.status(409).json({
        error:
          "Impossible de supprimer un événement pendant le vote en cours. Terminez d’abord l’événement.",
      });
    }
    await prisma.event.delete({ where: { id: eventId } });
    return res.json({ ok: true, id: eventId });
  } catch (e) {
    console.error("delete /events/:eventId", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/internal/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [users, events, polls, votes, leads] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.poll.count(),
      prisma.vote.count(),
      prisma.leadCapture.count(),
    ]);
    return res.json({ users, events, polls, votes, leads });
  } catch (e) {
    console.error("internal/stats", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/internal/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });
    return res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role ?? "USER",
        createdAt: u.createdAt,
        eventCount: u._count?.events ?? 0,
      })),
    });
  } catch (e) {
    console.error("internal/users", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.patch(
  "/internal/users/:userId/role",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { userId } = req.params;
    const nextRoleRaw =
      typeof req.body?.role === "string" ? req.body.role.trim().toUpperCase() : "";
    const nextRole = nextRoleRaw === "ADMIN" ? "ADMIN" : nextRoleRaw === "USER" ? "USER" : null;
    if (!nextRole) {
      return res.status(400).json({ error: 'Rôle invalide. Utilisez "USER" ou "ADMIN".' });
    }
    if (req.userId === userId && nextRole !== "ADMIN") {
      return res.status(400).json({ error: "Vous ne pouvez pas retirer votre propre rôle ADMIN." });
    }
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: nextRole },
        select: { id: true, email: true, role: true, createdAt: true },
      });
      return res.json({ user: updated });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
        return res.status(404).json({ error: "Utilisateur introuvable." });
      }
      console.error("internal/users/:userId/role", e);
      return res.status(500).json({ error: "Erreur serveur." });
    }
  },
);

app.get("/internal/events", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        liveState: true,
        createdAt: true,
        user: { select: { email: true } },
        _count: { select: { polls: true, leads: true } },
      },
    });
    return res.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        liveState: e.liveState,
        createdAt: e.createdAt,
        ownerEmail: e.user?.email ?? "N/A",
        pollCount: e._count?.polls ?? 0,
        leadCount: e._count?.leads ?? 0,
      })),
    });
  } catch (e) {
    console.error("internal/events", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get(
  "/internal/events/:eventId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          liveState: true,
          voteState: true,
          displayState: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true } },
          _count: { select: { polls: true, leads: true } },
          polls: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              status: true,
              question: true,
              title: true,
              _count: { select: { votes: true } },
            },
          },
        },
      });
      if (!event) {
        return res.status(404).json({ error: "Événement introuvable." });
      }
      return res.json({
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          status: event.status,
          liveState: event.liveState,
          voteState: event.voteState,
          displayState: event.displayState,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          ownerId: event.user?.id ?? null,
          ownerEmail: event.user?.email ?? "N/A",
          pollCount: event._count?.polls ?? 0,
          leadCount: event._count?.leads ?? 0,
          polls: Array.isArray(event.polls)
            ? event.polls.map((p) => ({
                id: p.id,
                order: p.order,
                status: p.status,
                label:
                  (typeof p.question === "string" && p.question.trim()) ||
                  (typeof p.title === "string" && p.title.trim()) ||
                  "Question",
                voteCount: p._count?.votes ?? 0,
              }))
            : [],
        },
      });
    } catch (e) {
      console.error("internal/events/:eventId", e);
      return res.status(500).json({ error: "Erreur serveur." });
    }
  },
);

app.get("/internal/leads", requireAuth, requireAdmin, async (req, res) => {
  const takeRaw = Number(req.query?.take ?? 300);
  const take = Number.isFinite(takeRaw)
    ? Math.min(1000, Math.max(1, Math.floor(takeRaw)))
    : 300;
  try {
    const leads = await prisma.leadCapture.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        firstName: true,
        phone: true,
        email: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
            user: { select: { email: true } },
          },
        },
        poll: {
          select: {
            id: true,
            question: true,
            title: true,
          },
        },
      },
    });
    return res.json({
      leads: leads.map((l) => ({
        id: l.id,
        firstName: l.firstName,
        phone: l.phone,
        email: l.email,
        createdAt: l.createdAt,
        eventId: l.event?.id ?? null,
        eventTitle: l.event?.title ?? "Événement",
        ownerEmail: l.event?.user?.email ?? "N/A",
        pollId: l.poll?.id ?? null,
        pollQuestion: l.poll?.question || l.poll?.title || "Question",
      })),
    });
  } catch (e) {
    console.error("internal/leads", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/events/slug/:slug", async (req, res) => {
  try {
    const slug =
      typeof req.params.slug === "string" ? req.params.slug.trim() : "";
    if (!slug) {
      return res.status(400).json({ error: "Slug invalide." });
    }

    const event = await prisma.event.findUnique({
      where: { slug },
    });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }

    await fermerVoteSiChronoEpuise(io, event.id);
    const eventApres = await prisma.event.findUnique({ where: { id: event.id } });
    if (eventApres) await repairStaleVotingLiveState(eventApres);

    let activePollQuestion = null;
    if (eventApres.activePollId) {
      const p = await prisma.poll.findFirst({
        where: { id: eventApres.activePollId, eventId: eventApres.id },
        select: { question: true, title: true },
      });
      if (p) {
        const q = (p.question && p.question.trim()) || "";
        const t = (p.title && p.title.trim()) || "";
        activePollQuestion = q || t || null;
      }
    }

    const pollsOrdered = await prisma.poll.findMany({
      where: { eventId: eventApres.id },
      orderBy: { order: "asc" },
      select: { id: true, question: true, title: true },
    });
    const pollsTotal = pollsOrdered.length;
    /** @type {{ current: number; total: number } | null} */
    let pollsProgress = null;
    /** @type {{ id: string; label: string }[]} */
    const pastPolls = [];
    if (eventApres.activePollId && pollsTotal > 0) {
      const idx = pollsOrdered.findIndex((x) => x.id === eventApres.activePollId);
      if (idx >= 0) {
        pollsProgress = { current: idx + 1, total: pollsTotal };
        for (let i = 0; i < idx; i++) {
          const row = pollsOrdered[i];
          const label =
            (row.question && row.question.trim()) ||
            (row.title && row.title.trim()) ||
            `Question ${i + 1}`;
          pastPolls.push({ id: row.id, label });
        }
      }
    } else if (pollsTotal > 0 && String(eventApres.liveState || "").toLowerCase() === "finished") {
      // Fin d'événement: exposer tout l'historique des questions côté /join.
      for (let i = 0; i < pollsOrdered.length; i++) {
        const row = pollsOrdered[i];
        const label =
          (row.question && row.question.trim()) ||
          (row.title && row.title.trim()) ||
          `Question ${i + 1}`;
        pastPolls.push({ id: row.id, label });
      }
    }
    const pastPollLabels = pastPolls.map((p) => p.label);

    const roomCustom = eventCustomizationJson(eventApres);
    return res.json({
      id: eventApres.id,
      title: eventApres.title,
      slug: eventApres.slug,
      ...roomCustom,
      liveState: eventApres.liveState.toLowerCase(),
      voteState: String(eventApres.voteState).toLowerCase(),
      displayState: String(eventApres.displayState).toLowerCase(),
      screenDisplayState: eventApres.screenDisplayState
        ? String(eventApres.screenDisplayState).toLowerCase()
        : null,
      activePollId: eventApres.activePollId,
      autoReveal: eventApres.autoReveal,
      autoRevealDelaySec: eventApres.autoRevealDelaySec,
      autoRevealShowResultsAt:
        eventApres.autoRevealShowResultsAt?.toISOString() ?? null,
      activePollQuestion,
      pollsProgress,
      pastPollLabels,
      pastPolls,
      questionTimer: questionTimerSnapshot(eventApres),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/** Détail événement + sondages triés (régie admin) */
app.get("/events/:eventId", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    await fermerVoteSiChronoEpuise(io, eventId);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        polls: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { votes: true } },
          },
        },
      },
    });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }
    await repairStaleVotingLiveState(event);
    const participantsDistinct = await prisma.vote.findMany({
      where: { poll: { eventId: event.id } },
      distinct: ["voterSessionId"],
      select: { voterSessionId: true },
    });
    return res.json({
      id: event.id,
      title: event.title,
      ...eventCustomizationJson(event),
      slug: event.slug,
      status: event.status,
      liveState: event.liveState.toLowerCase(),
      voteState: String(event.voteState).toLowerCase(),
      displayState: String(event.displayState).toLowerCase(),
      screenDisplayState: event.screenDisplayState
        ? String(event.screenDisplayState).toLowerCase()
        : null,
      activePollId: event.activePollId,
      participantsLimit: Number(event.participantsLimit || 500),
      participantsUsed: participantsDistinct.length,
      isLiveConsumed: Boolean(event.isLiveConsumed),
      isLocked: Boolean(event.isLocked),
      autoReveal: event.autoReveal,
      autoRevealDelaySec: event.autoRevealDelaySec,
      autoRevealShowResultsAt:
        event.autoRevealShowResultsAt?.toISOString() ?? null,
      questionTimer: questionTimerSnapshot(event),
      polls: event.polls.map((p) => ({
        id: p.id,
        title: p.title,
        question: p.question,
        contestPrize: p.contestPrize ?? null,
        contestWinnerCount: Number(p.contestWinnerCount || 1),
        quizRevealed: Boolean(p.quizRevealed),
        order: p.order,
        status: p.status,
        type: p.type,
        leadEnabled: Boolean(p.leadEnabled),
        leadTriggerOptionId: p.leadTriggerOptionId ?? null,
        voteCount: p._count.votes,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/** Mise à jour titre et/ou description (régie / admin) */
const EVENT_TITLE_MAX_LEN = 200;
app.patch("/events/:eventId", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const body = req.body ?? {};
    const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
    const hasDescription = Object.prototype.hasOwnProperty.call(
      body,
      "description",
    );
    if (!hasTitle && !hasDescription) {
      return res.status(400).json({
        error:
          "Corps attendu : au moins un des champs { title: string, description: string | null }.",
      });
    }
    const data = {};
    if (hasTitle) {
      if (typeof body.title !== "string") {
        return res.status(400).json({ error: "title doit être une chaîne." });
      }
      const t = body.title.trim();
      if (t === "") {
        return res
          .status(400)
          .json({ error: "Le titre ne peut pas être vide." });
      }
      if (t.length > EVENT_TITLE_MAX_LEN) {
        return res.status(400).json({
          error: `Titre trop long (max. ${EVENT_TITLE_MAX_LEN} caractères).`,
        });
      }
      data.title = t;
    }
    if (hasDescription) {
      const d = body.description;
      let value;
      if (d === null) {
        value = null;
      } else if (typeof d === "string") {
        const t = d.trim();
        value = t === "" ? null : t.slice(0, 2000);
      } else {
        return res
          .status(400)
          .json({ error: "description doit être une chaîne ou null." });
      }
      data.description = value;
    }
    const event = await prisma.event.update({
      where: { id: eventId },
      data,
      select: { id: true, title: true, description: true },
    });
    return res.json({
      id: event.id,
      title: event.title,
      description: event.description,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Personnalisation salle /join (branding).
 * @param {unknown} raw
 * @returns {string | null | undefined} undefined = invalide
 */
function normalizeAssetUrlInput(raw) {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > 2048) return undefined;
  if (t.startsWith("/uploads/")) return t;
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return undefined;
}

/**
 * @param {unknown} raw
 * @returns {string | null | undefined} undefined = invalide
 */
function normalizeExternalUrlInput(raw) {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > 2048) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

app.patch("/events/:eventId/customization", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const body = req.body ?? {};

    /** @type {Record<string, unknown>} */
    const data = {};

    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      const d = body.description;
      if (d === null) {
        data.description = null;
      } else if (typeof d === "string") {
        const t = d.trim();
        data.description = t === "" ? null : t.slice(0, 2000);
      } else {
        return res.status(400).json({ error: "description invalide." });
      }
    }

    for (const key of ["logoUrl", "backgroundUrl"]) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const v = normalizeAssetUrlInput(body[key]);
      if (v === undefined) {
        return res.status(400).json({ error: `${key} invalide.` });
      }
      data[key] = v;
    }

    if (Object.prototype.hasOwnProperty.call(body, "primaryColor")) {
      const c = body.primaryColor;
      if (c === null) {
        data.primaryColor = null;
      } else if (typeof c === "string") {
        const u = c.trim();
        if (u === "") {
          data.primaryColor = null;
        } else if (/^#[0-9A-Fa-f]{6}$/.test(u)) {
          data.primaryColor = u;
        } else {
          return res
            .status(400)
            .json({ error: "primaryColor : format #RRGGBB attendu." });
        }
      } else {
        return res.status(400).json({ error: "primaryColor invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "roomBackgroundColor")) {
      const c = body.roomBackgroundColor;
      if (c === null) {
        data.roomBackgroundColor = null;
      } else if (typeof c === "string") {
        const u = c.trim();
        if (u === "") {
          data.roomBackgroundColor = null;
        } else if (/^#[0-9A-Fa-f]{6}$/.test(u)) {
          data.roomBackgroundColor = u;
        } else {
          return res
            .status(400)
            .json({ error: "roomBackgroundColor : format #RRGGBB attendu." });
        }
      } else {
        return res.status(400).json({ error: "roomBackgroundColor invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "themeMode")) {
      const m = body.themeMode;
      if (m === null) {
        data.themeMode = null;
      } else if (typeof m === "string") {
        const u = m.trim().toLowerCase();
        if (u === "") {
          data.themeMode = null;
        } else if (CUSTOM_THEME_MODES.has(u)) {
          data.themeMode = u;
        } else {
          return res.status(400).json({ error: "themeMode invalide." });
        }
      } else {
        return res.status(400).json({ error: "themeMode invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "backgroundOverlayStrength")) {
      const m = body.backgroundOverlayStrength;
      if (m === null) {
        data.backgroundOverlayStrength = null;
      } else if (typeof m === "string") {
        const u = m.trim().toLowerCase();
        if (u === "") {
          data.backgroundOverlayStrength = null;
        } else if (CUSTOM_OVERLAY.has(u)) {
          data.backgroundOverlayStrength = u;
        } else {
          return res
            .status(400)
            .json({ error: "backgroundOverlayStrength invalide." });
        }
      } else {
        return res
          .status(400)
          .json({ error: "backgroundOverlayStrength invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoSectionTitle")) {
      const v = body.infoSectionTitle;
      if (v === null) {
        data.infoSectionTitle = null;
      } else if (typeof v === "string") {
        const t = v.trim();
        data.infoSectionTitle = t === "" ? null : t.slice(0, 120);
      } else {
        return res.status(400).json({ error: "infoSectionTitle invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoSectionText")) {
      const v = body.infoSectionText;
      if (v === null) {
        data.infoSectionText = null;
      } else if (typeof v === "string") {
        const t = v.trim();
        data.infoSectionText = t === "" ? null : t.slice(0, 1200);
      } else {
        return res.status(400).json({ error: "infoSectionText invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoPrimaryCtaLabel")) {
      const v = body.infoPrimaryCtaLabel;
      if (v === null) {
        data.infoPrimaryCtaLabel = null;
      } else if (typeof v === "string") {
        const t = v.trim();
        data.infoPrimaryCtaLabel = t === "" ? null : t.slice(0, 80);
      } else {
        return res.status(400).json({ error: "infoPrimaryCtaLabel invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoSecondaryCtaLabel")) {
      const v = body.infoSecondaryCtaLabel;
      if (v === null) {
        data.infoSecondaryCtaLabel = null;
      } else if (typeof v === "string") {
        const t = v.trim();
        data.infoSecondaryCtaLabel = t === "" ? null : t.slice(0, 80);
      } else {
        return res.status(400).json({ error: "infoSecondaryCtaLabel invalide." });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoPrimaryCtaUrl")) {
      const v = normalizeExternalUrlInput(body.infoPrimaryCtaUrl);
      if (v === undefined) {
        return res.status(400).json({ error: "infoPrimaryCtaUrl invalide." });
      }
      data.infoPrimaryCtaUrl = v;
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoSecondaryCtaUrl")) {
      const v = normalizeExternalUrlInput(body.infoSecondaryCtaUrl);
      if (v === undefined) {
        return res.status(400).json({ error: "infoSecondaryCtaUrl invalide." });
      }
      data.infoSecondaryCtaUrl = v;
    }

    if (Object.prototype.hasOwnProperty.call(body, "infoShowOnFinished")) {
      const v = body.infoShowOnFinished;
      if (typeof v !== "boolean") {
        return res.status(400).json({ error: "infoShowOnFinished invalide." });
      }
      data.infoShowOnFinished = v;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucun champ à enregistrer." });
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data,
    });
    try {
      io.to(roomPourEvent(event.id)).emit("event:customization_updated", {
        eventId: event.id,
      });
    } catch (err) {
      console.error("event:customization_updated", err);
    }
    return res.json(eventCustomizationJson(event));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/events/:eventId/customization/upload", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const kindRaw = String(req.query.kind || "").toLowerCase();
    if (kindRaw !== "logo" && kindRaw !== "background") {
      return res
        .status(400)
        .json({ error: "Query kind=logo ou kind=background requis." });
    }

    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: "Fichier manquant (champ file)." });
    }
    const uploadResult = await uploadImageBufferToCloudinary({
      buffer: req.file.buffer,
      eventId,
      kind: kindRaw === "background" ? "background" : "logo",
    });
    return res.json({ url: uploadResult.secureUrl, publicId: uploadResult.publicId });
  } catch (e) {
    if (e && typeof e === "object" && e.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Fichier trop volumineux (max 3 Mo)." });
    }
    console.error(e);
    return res.status(500).json({ error: e?.message || "Upload impossible." });
  }
});

/** Chrono question (auto-fermeture du vote quand remainingSec atteint 0) */
app.post("/events/:eventId/question-timer", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const body = req.body ?? {};
  const action =
    typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  const totalSecBrut = body.totalSec;

  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }

    // En mode TEST, le timer est forcé automatiquement (impossible de modifier).
    if (event.isLiveConsumed === false) {
      return res.status(403).json({
        error: "Timer disponible uniquement en mode réel.",
      });
    }

    if (action === "reset") {
      await prisma.event.update({
        where: { id: eventId },
        data: { ...QUESTION_TIMER_RESET },
      });
    } else if (action === "pause") {
      if (
        !event.questionTimerStartedAt ||
        event.questionTimerIsPaused ||
        event.questionTimerTotalSec == null
      ) {
        return res
          .status(400)
          .json({ error: "Le chrono n'est pas en cours." });
      }
      const seg = Math.floor(
        (Date.now() - event.questionTimerStartedAt.getTime()) / 1000,
      );
      await prisma.event.update({
        where: { id: eventId },
        data: {
          questionTimerAccumulatedSec:
            (event.questionTimerAccumulatedSec ?? 0) + seg,
          questionTimerStartedAt: null,
          questionTimerIsPaused: true,
        },
      });
    } else if (action === "start") {
      const totalParsed =
        typeof totalSecBrut === "number"
          ? Math.floor(totalSecBrut)
          : parseInt(String(totalSecBrut ?? ""), 10);
      const pausedEnAttente =
        event.questionTimerIsPaused &&
        event.questionTimerTotalSec != null &&
        event.questionTimerStartedAt == null;
      if (pausedEnAttente) {
        const reste =
          event.questionTimerTotalSec -
          (event.questionTimerAccumulatedSec ?? 0);
        if (reste <= 0) {
          return res.status(400).json({
            error: "Temps écoulé. Réinitialise ou définis une nouvelle durée.",
          });
        }
        await prisma.event.update({
          where: { id: eventId },
          data: {
            questionTimerStartedAt: new Date(),
            questionTimerIsPaused: false,
          },
        });
      } else {
        if (
          !Number.isFinite(totalParsed) ||
          totalParsed < 1 ||
          totalParsed > QUESTION_TIMER_SEC_MAX
        ) {
          return res.status(400).json({
            error: `Durée invalide : indique totalSec entre 1 et ${QUESTION_TIMER_SEC_MAX} (1 s à 90 jours).`,
          });
        }
        await prisma.event.update({
          where: { id: eventId },
          data: {
            questionTimerTotalSec: totalParsed,
            questionTimerAccumulatedSec: 0,
            questionTimerStartedAt: new Date(),
            questionTimerIsPaused: false,
          },
        });
      }
    } else {
      return res.status(400).json({
        error: 'action attendue : "start", "pause" ou "reset".',
      });
    }

    const updated = await prisma.event.findUnique({ where: { id: eventId } });
    await emitEventLiveUpdated(io, eventId);

    return res.json({
      ok: true,
      questionTimer: updated ? questionTimerSnapshot(updated) : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/p/:slug", async (req, res) => {
  try {
    const slugParam =
      typeof req.params.slug === "string" ? req.params.slug.trim() : "";
    const pollIdQuery =
      typeof req.query.pollId === "string"
        ? req.query.pollId.trim()
        : typeof req.query.poll === "string"
          ? req.query.poll.trim()
          : "";
    if (slugParam) {
      const evPourChrono = await prisma.event.findUnique({
        where: { slug: slugParam },
        select: { id: true },
      });
      if (evPourChrono) {
        await fermerVoteSiChronoEpuise(io, evPourChrono.id);
      }
    }
    let poll = null;
    if (pollIdQuery) {
      poll = await loadPublicPollByIdForEventSlug(slugParam, pollIdQuery);
    } else {
      poll = await loadPublicPollPourSlug(req.params.slug);
    }
    if (!poll) {
      return res.status(404).json({
        error:
          "Aucun contenu public pour cet événement (vote fermé ou en attente).",
      });
    }
    return res.json(pollToJson(poll));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Public (votant + écran) : statut concours pour la salle
 * - liste gagnants masquée
 * - indicateur "votant courant gagnant" si voterSessionId fourni
 */
app.get("/p/:slug/contest-status", async (req, res) => {
  try {
    const slug =
      typeof req.params.slug === "string" ? req.params.slug.trim() : "";
    if (!slug) return res.status(400).json({ error: "Slug invalide." });

    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, activePollId: true },
    });
    if (!event) return res.status(404).json({ error: "Événement introuvable." });

    const pollIdQuery =
      typeof req.query.pollId === "string" ? req.query.pollId.trim() : "";
    const targetPollId = pollIdQuery || event.activePollId || "";
    if (!targetPollId) {
      return res.status(404).json({ error: "Aucune question concours active." });
    }

    const poll = await prisma.poll.findFirst({
      where: { id: targetPollId, eventId: event.id, type: "CONTEST_ENTRY" },
      select: {
        id: true,
        contestPrize: true,
        contestWinnerCount: true,
      },
    });
    if (!poll) return res.status(404).json({ error: "Question concours introuvable." });

    const winners = await prisma.contestDrawWinner.findMany({
      where: { pollId: poll.id },
      orderBy: [{ draw: { createdAt: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        voterSessionId: true,
        firstName: true,
        phone: true,
        email: true,
        position: true,
        createdAt: true,
      },
    });

    const voterSessionId =
      typeof req.query.voterSessionId === "string"
        ? req.query.voterSessionId.trim()
        : "";
    const isCurrentVoterWinner =
      !!voterSessionId &&
      winners.some((w) => String(w.voterSessionId) === String(voterSessionId));

    return res.json({
      pollId: poll.id,
      contestPrize: poll.contestPrize ?? null,
      contestWinnerCount: normalizeContestWinnerCount(poll.contestWinnerCount),
      totalWinners: winners.length,
      isCurrentVoterWinner,
      winners: winners.map((w, idx) => ({
        id: w.id,
        position: idx + 1,
        displayName: winnerDisplayNameForPublic(w.firstName, idx + 1),
        displayContact: winnerDisplayContactForPublic(w.phone, w.email),
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("p/:slug/contest-status", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Régie : créer un sondage à la volée (file ou lancement immédiat).
 * Corpo : { question, type?: SINGLE_CHOICE|MULTIPLE_CHOICE|LEAD|CONTEST_ENTRY|QUIZ, options: string[], leadTriggerOrder?: number, quizCorrectOrder?: number, launchNow?: boolean }
 */
app.post("/events/:eventId/polls/live", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const owned = await assertEventOwnedBy(eventId, req.userId);
  if (!owned.ok) {
    return res.status(owned.status).json({ error: "Événement introuvable." });
  }

  const eventMode = await prisma.event.findUnique({
    where: { id: eventId },
    select: { isLocked: true, isLiveConsumed: true },
  });
  if (eventMode?.isLocked) {
    return res.status(403).json({
      error: "Cet événement est terminé et ne peut plus être rejoué.",
    });
  }
  const isTestMode = eventMode?.isLiveConsumed === false;

  const body = req.body ?? {};
  const questionBrute =
    typeof body.question === "string" ? body.question.trim() : "";
  const typeBrut =
    typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  const launchNow = body.launchNow === true;
  const optionsBrutes = Array.isArray(body.options) ? body.options : [];
  const contestPrize = normalizeContestPrize(body.contestPrize);
  const contestWinnerCount = normalizeContestWinnerCount(body.contestWinnerCount);

  if (!questionBrute || questionBrute.length > 2000) {
    return res
      .status(400)
      .json({ error: "question requise (1 à 2000 caractères)." });
  }

  const pollTypeParsed = parseTypeSondage(typeBrut) ?? "SINGLE_CHOICE";
  const pollType = pollTypeParsed === "LEAD" ? "SINGLE_CHOICE" : pollTypeParsed;
  const leadTriggerOrder = normalizeLeadTriggerOrder(
    body.leadTriggerOrder,
    optionsBrutes.length,
  );

  const labels = optionsBrutes
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (labels.length < 2) {
    return res.status(400).json({ error: "Au moins 2 réponses non vides." });
  }
  if (labels.length > 32) {
    return res.status(400).json({ error: "Maximum 32 réponses." });
  }
  const quizCorrectOrder = normalizeQuizCorrectOrder(
    body.quizCorrectOrder,
    labels.length,
  );
  if (pollTypeParsed === "QUIZ" && quizCorrectOrder == null) {
    return res
      .status(400)
      .json({ error: "QUIZ: une seule bonne réponse doit être définie." });
  }

  try {
    const agg = await prisma.poll.aggregate({
      where: { eventId },
      _max: { order: true },
    });
    const nextOrder = (agg._max.order ?? 0) + 1;
    const titreCourt =
      questionBrute.length > 120
        ? `${questionBrute.slice(0, 117)}…`
        : questionBrute;

    let created = await prisma.poll.create({
      data: {
        eventId,
        title: titreCourt,
        question: questionBrute,
        contestPrize: pollTypeParsed === "CONTEST_ENTRY" ? contestPrize : null,
        contestWinnerCount:
          pollTypeParsed === "CONTEST_ENTRY" ? contestWinnerCount : 1,
        type: pollType,
        leadEnabled: requiresFormOnPositiveAnswer(pollTypeParsed),
        status: "CLOSED",
        order: nextOrder,
        options: {
          create: labels.map((label, order) => ({
            label,
            order,
            isCorrect:
              pollTypeParsed === "QUIZ" ? order === quizCorrectOrder : false,
          })),
        },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });

    if (requiresFormOnPositiveAnswer(pollTypeParsed)) {
      const trigger = created.options[leadTriggerOrder] ?? created.options[0] ?? null;
      created = await prisma.poll.update({
        where: { id: created.id },
        data: { leadTriggerOptionId: trigger?.id ?? null },
        include: { options: { orderBy: { order: "asc" } } },
      });
    }

    if (launchNow) {
      await annulationAutoRevealProgrammee(eventId);
      await prisma.poll.updateMany({
        where: {
          eventId,
          status: "ACTIVE",
          NOT: { id: created.id },
        },
        data: { status: "CLOSED" },
      });
      await prisma.poll.update({
        where: { id: created.id },
        data: { status: "ACTIVE" },
      });
      await prisma.event.update({
        where: { id: eventId },
        data: {
          activePollId: created.id,
          voteState: "OPEN",
          displayState: "QUESTION",
          liveState: "VOTING",
          autoRevealShowResultsAt: null,
          ...(isTestMode
            ? {
                questionTimerTotalSec: 30,
                questionTimerAccumulatedSec: 0,
                questionTimerStartedAt: new Date(),
                questionTimerIsPaused: false,
              }
            : {}),
        },
      });
    }

    await emitEventLiveUpdated(io, eventId);
    const full = await loadPollFull(created.id);
    return res.status(201).json({
      pollId: created.id,
      poll: full ? pollToJson(full) : null,
      launched: launchNow,
    });
  } catch (e) {
    console.error("polls/live", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/events/:eventId/next-poll", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const eventMode = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (eventMode?.isLocked) {
      return res.status(403).json({
        error: "Cet événement est terminé et ne peut plus être rejoué.",
      });
    }

    const result = await passerAuSondageSuivant(eventId);
    if (!result.ok) {
      return res.status(result.code || 404).json({ error: result.message });
    }
    await emitEventLiveUpdated(io, eventId);
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/events/:eventId/finish", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const eventMode = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLiveConsumed: true, isLocked: true },
    });
    const shouldLock = Boolean(eventMode?.isLiveConsumed) && !Boolean(eventMode?.isLocked);
    await annulationAutoRevealProgrammee(eventId);
    await prisma.poll.updateMany({
      where: { eventId, status: "ACTIVE" },
      data: { status: "CLOSED" },
    });
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        liveState: "FINISHED",
        voteState: "CLOSED",
        displayState: "WAITING",
        activePollId: null,
        autoRevealShowResultsAt: null,
        ...(shouldLock ? { isLocked: true } : {}),
        ...QUESTION_TIMER_RESET,
      },
    });
    await emitEventLiveUpdated(io, eventId);
    return res.json({
      ok: true,
      finished: true,
      event,
    });
  } catch (e) {
    console.error("events/:eventId/finish", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Régie : démarrer le mode réel (consomme l'événement une seule fois).
 */
app.post("/events/:eventId/start-real", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const eventMode = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLiveConsumed: true, isLocked: true },
    });

    if (eventMode?.isLocked) {
      return res.status(403).json({ error: "Cet événement est terminé et verrouillé." });
    }
    if (eventMode?.isLiveConsumed) {
      return res.status(403).json({ error: "Mode réel déjà démarré pour cet événement." });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        isLiveConsumed: true,
        consumedAt: new Date(),
        isLocked: false,
      },
    });

    await emitEventLiveUpdated(io, eventId);
    return res.json({ success: true });
  } catch (e) {
    console.error("events/:eventId/start-real", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/open", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { event: true },
    });
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }

    if (poll.event?.isLocked) {
      return res.status(403).json({
        error: "Cet événement est terminé et ne peut plus être rejoué.",
      });
    }

    if (poll.status === "ARCHIVED") {
      return res.status(400).json({
        error: "Impossible d'ouvrir un sondage archivé.",
      });
    }

    await annulationAutoRevealProgrammee(poll.eventId);

    await prisma.poll.updateMany({
      where: {
        eventId: poll.eventId,
        status: "ACTIVE",
        NOT: { id: poll.id },
      },
      data: { status: "CLOSED" },
    });

    await prisma.poll.update({
      where: { id: poll.id },
      data: {
        status: "ACTIVE",
        quizRevealed:
          String(poll.type || "").toUpperCase() === "QUIZ" ? false : undefined,
      },
    });

    const event = await prisma.event.update({
      where: { id: poll.eventId },
      data: {
        activePollId: poll.id,
        voteState: "OPEN",
        displayState: "QUESTION",
        liveState: "VOTING",
        autoRevealShowResultsAt: null,
        ...(poll.event?.isLiveConsumed === false
          ? {
              questionTimerTotalSec: 30,
              questionTimerAccumulatedSec: 0,
              questionTimerStartedAt: new Date(),
              questionTimerIsPaused: false,
            }
          : {}),
      },
    });

    await emitEventLiveUpdated(io, poll.eventId);

    const full = await loadPollFull(poll.id);
    return res.json({
      event,
      poll: full ? pollToJson(full) : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/close", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { event: true },
    });
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }

    await prisma.poll.update({
      where: { id: poll.id },
      data: { status: "CLOSED" },
    });

    /** Stop vote : fermer la session de vote sans imposer l’affichage écran */
    let majEvent =
      poll.event.activePollId === poll.id
        ? {
            voteState: "CLOSED",
            liveState: computeLiveState(
              "CLOSED",
              poll.event.displayState ?? "WAITING",
            ),
          }
        : {};

    if (poll.event.activePollId === poll.id) {
      const evSnap = poll.event;
      clearAutoRevealTimer(poll.eventId);
      if (
        evSnap.autoReveal &&
        String(evSnap.displayState).toUpperCase() !== "RESULTS"
      ) {
        const delaySec = [3, 5, 10].includes(evSnap.autoRevealDelaySec)
          ? evSnap.autoRevealDelaySec
          : 5;
        majEvent = {
          ...majEvent,
          autoRevealShowResultsAt: new Date(Date.now() + delaySec * 1000),
        };
      } else {
        majEvent = { ...majEvent, autoRevealShowResultsAt: null };
      }
    }

    const event =
      Object.keys(majEvent).length > 0
        ? await prisma.event.update({
            where: { id: poll.eventId },
            data: majEvent,
          })
        : await prisma.event.findUnique({ where: { id: poll.eventId } });

    await emitEventLiveUpdated(io, poll.eventId);

    if (
      poll.event.activePollId === poll.id &&
      majEvent.autoRevealShowResultsAt
    ) {
      const d = [3, 5, 10].includes(poll.event.autoRevealDelaySec)
        ? poll.event.autoRevealDelaySec
        : 5;
      planifierTimeoutAutoReveal(io, poll.eventId, d * 1000);
    }

    const full = await loadPollFull(poll.id);
    return res.json({
      event,
      poll: full ? pollToJson(full) : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/show-results", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { event: true },
    });
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }

    await annulationAutoRevealProgrammee(poll.eventId);

    const event = await prisma.event.update({
      where: { id: poll.eventId },
      data: {
        activePollId: poll.id,
        displayState: "RESULTS",
        liveState: computeLiveState(poll.event.voteState, "RESULTS"),
      },
    });

    await emitEventLiveUpdated(io, poll.eventId);

    const full = await loadPollFull(poll.id);
    return res.json({
      event,
      poll: full ? pollToJson(full) : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/** Affichage écran : revenir à la question (ne rouvre pas le vote) */
app.post("/polls/:pollId/display-question", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { event: true },
    });
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }

    await annulationAutoRevealProgrammee(poll.eventId);

    const ev = poll.event;
    const event = await prisma.event.update({
      where: { id: poll.eventId },
      data: {
        activePollId: poll.id,
        displayState: "QUESTION",
        liveState: computeLiveState(ev.voteState, "QUESTION"),
      },
    });

    await emitEventLiveUpdated(io, poll.eventId);

    const full = await loadPollFull(poll.id);
    return res.json({
      event,
      poll: full ? pollToJson(full) : null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/reveal", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { event: true },
    });
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }
    if (String(poll.type || "").toUpperCase() !== "QUIZ") {
      return res.status(400).json({ error: "Cette action est réservée aux QUIZ." });
    }
    if (String(poll.event.voteState || "").toUpperCase() !== "CLOSED") {
      return res
        .status(400)
        .json({ error: "Fermez d'abord le vote avant de révéler la réponse." });
    }

    await prisma.poll.update({
      where: { id: poll.id },
      data: { quizRevealed: true },
    });

    const full = await loadPollFull(poll.id);
    if (!full) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }
    await emitPollUpdated(io, poll.id);
    await emitEventLiveUpdated(io, poll.eventId);

    return res.json({ ok: true, poll: pollToJson(full) });
  } catch (e) {
    console.error("polls/:pollId/reveal", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/polls", requireAuth, async (req, res) => {
  try {
    const polls = await prisma.poll.findMany({
      where: { event: { userId: req.userId } },
      orderBy: { createdAt: "desc" },
      include: {
        event: true,
        options: { orderBy: { order: "asc" } },
        votes: true,
      },
    });
    res.json(polls.map((poll) => pollToJson(poll)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible de lister les sondages." });
  }
});

async function slugEvenementUnique() {
  for (let i = 0; i < 8; i++) {
    const slug = `e-${crypto.randomBytes(4).toString("hex")}`;
    const exists = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) return slug;
  }
  throw new Error("Impossible de générer un slug unique");
}

/** Extrait les libellés non vides depuis le tableau `options` du body. */
function normaliserLibellesOptions(optionsInput) {
  const labels = [];
  if (!Array.isArray(optionsInput)) return labels;
  for (const raw of optionsInput) {
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t) labels.push(t);
    } else if (raw && typeof raw === "object" && typeof raw.label === "string") {
      const t = raw.label.trim();
      if (t) labels.push(t);
    }
  }
  return labels;
}

/** @returns {"SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "LEAD" | "CONTEST_ENTRY" | "QUIZ" | null} */
function parseTypeSondage(typeRaw) {
  if (typeRaw === "QUIZ") return "QUIZ";
  if (typeRaw === "CONTEST_ENTRY") return "CONTEST_ENTRY";
  if (typeRaw === "LEAD") return "LEAD";
  if (typeRaw === "MULTIPLE_CHOICE") return "MULTIPLE_CHOICE";
  if (
    typeRaw === "SINGLE_CHOICE" ||
    typeRaw === undefined ||
    typeRaw === null
  ) {
    return "SINGLE_CHOICE";
  }
  return null;
}

/** @param {"SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "LEAD" | "CONTEST_ENTRY"} type */
function requiresFormOnPositiveAnswer(type) {
  return type === "LEAD" || type === "CONTEST_ENTRY";
}

function normalizeLeadTriggerOrder(raw, labelsLength) {
  const max = Math.max(0, labelsLength - 1);
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, Math.floor(n)));
}

function normalizeContestPrize(raw) {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return t.slice(0, 240);
}

function normalizeContestWinnerCount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function normalizeQuizCorrectOrder(raw, labelsLength) {
  const max = Math.max(0, labelsLength - 1);
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 0 || i > max) return null;
  return i;
}

/** Extrait un tableau de sondages depuis le body (compat alias `questions`, chaîne JSON). */
function extraireTableauPolls(body) {
  let src = body.polls ?? body.questions;
  if (typeof src === "string") {
    try {
      src = JSON.parse(src);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(src) || src.length === 0) return null;
  return src;
}

/** Description optionnelle à la création d’événement (POST /polls). */
function extraireDescriptionCreation(body) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, "description")) {
    return null;
  }
  const d = body.description;
  if (d === null) return null;
  if (typeof d !== "string") return null;
  const t = d.trim();
  return t === "" ? null : t.slice(0, 2000);
}

app.post("/polls", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const body = req.body ?? {};

    /** --- Mode multi-questions : tableau `polls` (ou `questions`) non vide --- */
    const pollsListe = extraireTableauPolls(body);
    if (pollsListe) {
      const eventTitle =
        typeof body.title === "string" ? body.title.trim() : "";
      if (!eventTitle) {
        return res.status(400).json({
          error:
            'Le champ "title" (titre de l’événement) est requis lorsque tu envoies plusieurs questions dans "polls".',
        });
      }

      const descriptionInit = extraireDescriptionCreation(body);

      const saisis = pollsListe.map((p, idx) => {
        const ordreBrut = p?.order;
        const ordre =
          typeof ordreBrut === "number" &&
          Number.isFinite(ordreBrut) &&
          !Number.isNaN(ordreBrut)
            ? ordreBrut
            : idx;
        const qBrut =
          typeof p?.question === "string"
            ? p.question.trim()
            : typeof p?.title === "string"
              ? p.title.trim()
              : "";
        const labels = normaliserLibellesOptions(p?.options);
        const typ = parseTypeSondage(p?.type);
        const leadTriggerOrder = normalizeLeadTriggerOrder(
          p?.leadTriggerOrder,
          labels.length,
        );
        const contestPrize = normalizeContestPrize(p?.contestPrize);
        const contestWinnerCount = normalizeContestWinnerCount(
          p?.contestWinnerCount,
        );
        const quizCorrectOrder = normalizeQuizCorrectOrder(
          p?.quizCorrectOrder,
          labels.length,
        );
        return {
          order: ordre,
          question: qBrut,
          labels,
          type: typ,
          leadTriggerOrder,
          contestPrize,
          contestWinnerCount,
          quizCorrectOrder,
        };
      });

      saisis.sort((a, b) => a.order - b.order);

      for (let i = 0; i < saisis.length; i++) {
        const p = saisis[i];
        if (!p.question) {
          return res.status(400).json({
            error: `Question n°${i + 1} : le texte de la question est obligatoire.`,
          });
        }
        if (!p.type) {
          return res.status(400).json({
            error: `Question « ${p.question.slice(0, 48)}${p.question.length > 48 ? "…" : ""} » : type invalide (SINGLE_CHOICE, MULTIPLE_CHOICE, LEAD, CONTEST_ENTRY ou QUIZ).`,
          });
        }
        if (p.labels.length < 2) {
          return res.status(400).json({
            error: `Question « ${p.question.slice(0, 48)}${p.question.length > 48 ? "…" : ""} » : au moins 2 options non vides sont requises.`,
          });
        }
        if (p.type === "QUIZ" && p.quizCorrectOrder == null) {
          return res.status(400).json({
            error: `Question « ${p.question.slice(0, 48)}${p.question.length > 48 ? "…" : ""} » : QUIZ requiert exactement une bonne réponse.`,
          });
        }
      }

      const slug = await slugEvenementUnique();

      const firstPollId = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
          data: {
            userId,
            title: eventTitle,
            slug,
            description: descriptionInit,
            status: "PUBLISHED",
            /** Régie : premier sondage sélectionné, vote fermé jusqu’à « Lancer le vote » */
            liveState: "WAITING",
            voteState: "CLOSED",
            displayState: "WAITING",
          },
        });

        let premierId = null;
        for (let i = 0; i < saisis.length; i++) {
          const e = saisis[i];
          const poll = await tx.poll.create({
            data: {
              eventId: event.id,
              title: e.question,
              question: e.question,
              contestPrize: e.type === "CONTEST_ENTRY" ? e.contestPrize : null,
              contestWinnerCount:
                e.type === "CONTEST_ENTRY" ? e.contestWinnerCount : 1,
              type: e.type === "LEAD" ? "SINGLE_CHOICE" : e.type,
              leadEnabled: requiresFormOnPositiveAnswer(e.type),
              status: i === 0 ? "ACTIVE" : "DRAFT",
              order: i,
              options: {
                create: e.labels.map((label, order) => ({
                  label,
                  order,
                  isCorrect: e.type === "QUIZ" ? order === e.quizCorrectOrder : false,
                })),
              },
            },
            include: {
              options: { orderBy: { order: "asc" } },
            },
          });
          if (requiresFormOnPositiveAnswer(e.type)) {
            const trigger = poll.options.find(
              (opt) => opt.order === e.leadTriggerOrder,
            );
            await tx.poll.update({
              where: { id: poll.id },
              data: { leadTriggerOptionId: trigger?.id ?? poll.options[0]?.id ?? null },
            });
          }
          if (i === 0) premierId = poll.id;
        }

        await tx.event.update({
          where: { id: event.id },
          data: { activePollId: premierId },
        });

        return premierId;
      });

      const full = await loadPollFull(firstPollId);
      if (!full) {
        return res.status(500).json({ error: "Création incomplète." });
      }
      return res.status(201).json({
        ...pollToJson(full),
        activePollId: firstPollId,
      });
    }

    /** --- Mode legacy : une seule question --- */
    const title = body.title;
    const question = body.question;
    const optionsInput = body.options;
    const typeRaw = body.type;
    const contestPrize = normalizeContestPrize(body.contestPrize);
    const contestWinnerCount = normalizeContestWinnerCount(
      body.contestWinnerCount,
    );

    let titleTrim;
    let questionTrim;
    const rawTitle = typeof title === "string" ? title.trim() : "";
    const rawQuestion = typeof question === "string" ? question.trim() : "";
    if (rawQuestion !== "") {
      questionTrim = rawQuestion;
      /** Titre d’événement séparé si fourni (home multi + fallback legacy) */
      titleTrim = rawTitle !== "" ? rawTitle : rawQuestion;
    } else if (rawTitle !== "") {
      titleTrim = rawTitle;
      questionTrim = rawTitle;
    } else {
      return res.status(400).json({
        error:
          'Fournis une "question" ou un "title" (chaîne non vide) pour le sondage, ou un tableau "polls" pour plusieurs questions.',
      });
    }

    if (!Array.isArray(optionsInput)) {
      return res.status(400).json({
        error: 'Le champ "options" doit être un tableau.',
      });
    }

    const labels = normaliserLibellesOptions(optionsInput);

    if (labels.length < 2) {
      return res.status(400).json({
        error: "Au moins 2 options non vides sont requises.",
      });
    }

    const pollTypeParsed = parseTypeSondage(typeRaw);
    if (!pollTypeParsed) {
      return res.status(400).json({
        error:
          'Le type doit être "SINGLE_CHOICE", "MULTIPLE_CHOICE", "LEAD", "CONTEST_ENTRY" ou "QUIZ".',
      });
    }
    const leadTriggerOrder = normalizeLeadTriggerOrder(
      body.leadTriggerOrder,
      labels.length,
    );
    const quizCorrectOrder = normalizeQuizCorrectOrder(
      body.quizCorrectOrder,
      labels.length,
    );
    if (pollTypeParsed === "QUIZ" && quizCorrectOrder == null) {
      return res
        .status(400)
        .json({ error: "QUIZ: une seule bonne réponse doit être définie." });
    }

    const slug = await slugEvenementUnique();
    const descriptionInit = extraireDescriptionCreation(body);

    const event = await prisma.event.create({
      data: {
        userId,
        title: titleTrim,
        slug,
        description: descriptionInit,
        status: "PUBLISHED",
        /** Régie : sondage actif affichable, vote fermé jusqu’à POST /polls/:id/open */
        liveState: "WAITING",
        voteState: "CLOSED",
        displayState: "WAITING",
      },
    });

    const poll = await prisma.poll.create({
      data: {
        eventId: event.id,
        title: questionTrim,
        question: questionTrim,
        contestPrize: pollTypeParsed === "CONTEST_ENTRY" ? contestPrize : null,
        contestWinnerCount:
          pollTypeParsed === "CONTEST_ENTRY" ? contestWinnerCount : 1,
        type: pollTypeParsed === "LEAD" ? "SINGLE_CHOICE" : pollTypeParsed,
        leadEnabled: requiresFormOnPositiveAnswer(pollTypeParsed),
        status: "ACTIVE",
        order: 0,
        options: {
          create: labels.map((label, order) => ({
            label,
            order,
            isCorrect:
              pollTypeParsed === "QUIZ" ? order === quizCorrectOrder : false,
          })),
        },
      },
      include: {
        event: true,
        options: { orderBy: { order: "asc" } },
        votes: true,
      },
    });
    if (requiresFormOnPositiveAnswer(pollTypeParsed)) {
      const trigger = poll.options.find((opt) => opt.order === leadTriggerOrder);
      await prisma.poll.update({
        where: { id: poll.id },
        data: { leadTriggerOptionId: trigger?.id ?? poll.options[0]?.id ?? null },
      });
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { activePollId: poll.id },
    });

    const full = await loadPollFull(poll.id);
    res.status(201).json({
      ...pollToJson(full),
      activePollId: poll.id,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible de créer le sondage." });
  }
});

app.get("/polls/:pollId", async (req, res) => {
  try {
    const poll = await loadPollFull(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable" });
    }
    res.json(pollToJson(poll));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.patch("/polls/:pollId", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const body = req.body ?? {};
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        type: true,
        options: { select: { id: true }, orderBy: { order: "asc" } },
      },
    });
    if (!poll) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }

    /** @type {import("@prisma/client").Prisma.PollUpdateInput} */
    const data = {};
    if (typeof body.question === "string") {
      const q = body.question.trim();
      if (!q || q.length > 2000) {
        return res
          .status(400)
          .json({ error: "question requise (1 à 2000 caractères)." });
      }
      data.question = q;
      data.title = q.length > 120 ? `${q.slice(0, 117)}…` : q;
    }

    const isContestEntry = String(poll.type || "").toUpperCase() === "CONTEST_ENTRY";
    const isQuiz = String(poll.type || "").toUpperCase() === "QUIZ";
    if (isContestEntry) {
      if (Object.prototype.hasOwnProperty.call(body, "contestPrize")) {
        data.contestPrize = normalizeContestPrize(body.contestPrize);
      }
      if (Object.prototype.hasOwnProperty.call(body, "contestWinnerCount")) {
        data.contestWinnerCount = normalizeContestWinnerCount(
          body.contestWinnerCount,
        );
      }
    }
    let quizCorrectUpdated = false;
    if (isQuiz && Object.prototype.hasOwnProperty.call(body, "quizCorrectOrder")) {
      const quizCorrectOrder = normalizeQuizCorrectOrder(
        body.quizCorrectOrder,
        poll.options.length,
      );
      if (quizCorrectOrder == null) {
        return res
          .status(400)
          .json({ error: "QUIZ: une seule bonne réponse doit être définie." });
      }
      const target = poll.options[quizCorrectOrder];
      if (!target) {
        return res
          .status(400)
          .json({ error: "QUIZ: bonne réponse introuvable." });
      }
      await prisma.$transaction([
        prisma.pollOption.updateMany({
          where: { pollId },
          data: { isCorrect: false },
        }),
        prisma.pollOption.update({
          where: { id: target.id },
          data: { isCorrect: true },
        }),
      ]);
      quizCorrectUpdated = true;
    }

    if (Object.keys(data).length === 0 && !quizCorrectUpdated) {
      return res.status(400).json({ error: "Aucune modification détectée." });
    }

    if (Object.keys(data).length > 0) {
      await prisma.poll.update({
        where: { id: pollId },
        data,
      });
    }
    const full = await loadPollFull(pollId);
    if (!full) {
      return res.status(404).json({ error: "Sondage introuvable." });
    }
    return res.json(pollToJson(full));
  } catch (e) {
    console.error("patch /polls/:pollId", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/vote", async (req, res) => {
  const pollId = req.params.pollId;
  const body = req.body ?? {};

  let optionIds = body.optionIds;
  const voterSessionId =
    typeof body.voterSessionId === "string" ? body.voterSessionId.trim() : "";

  if (typeof body.optionId === "string" && body.optionId.trim()) {
    optionIds = [body.optionId.trim()];
  } else if (typeof body.optionId === "number") {
    return res.status(400).json({
      error:
        "Format obsolète : envoyez optionIds (tableau d'identifiants) et voterSessionId.",
    });
  }

  if (!Array.isArray(optionIds) || optionIds.length === 0) {
    return res.status(400).json({
      error: 'Le champ "optionIds" (tableau non vide) est requis.',
    });
  }

  const normalizedIds = optionIds.filter((id) => typeof id === "string" && id);

  if (normalizedIds.length === 0) {
    return res.status(400).json({
      error: "Chaque option doit être un identifiant chaîne valide.",
    });
  }

  if (!voterSessionId) {
    return res.status(400).json({
      error: 'Le champ "voterSessionId" (chaîne non vide) est requis.',
    });
  }

  try {
    const pollEvt = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { eventId: true },
    });
    if (pollEvt?.eventId) {
      await fermerVoteSiChronoEpuise(io, pollEvt.eventId);
    }

    const result = await submitVote({
      pollId,
      optionIds: normalizedIds,
      voterSessionId,
    });

    if (result.ok) {
      const poll = await loadPollFull(pollId);
      res.json(pollToJson(poll));

      void emitPollUpdated(io, pollId);
      return;
    }

    if (result.limitReached) {
      return res
        .status(403)
        .json({ error: "LIMIT_REACHED", message: "Limite de participants atteinte" });
    }
    if (result.locked) {
      return res.status(403).json({
        error: "EVENT_LOCKED",
        message: result.message || "Cet événement est verrouillé.",
      });
    }

    const status = result.alreadyVoted ? 409 : 400;
    res.status(status).json({
      error: result.message || "Vote refusé.",
      alreadyVoted: !!result.alreadyVoted,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/leads", async (req, res) => {
  const pollId = String(req.params.pollId || "").trim();
  const body = req.body ?? {};
  const voterSessionId =
    typeof body.voterSessionId === "string" ? body.voterSessionId.trim() : "";
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw === "" ? null : emailRaw.slice(0, 320);

  if (!pollId || !voterSessionId) {
    return res.status(400).json({ error: "pollId et voterSessionId requis." });
  }
  if (!firstName || !phone) {
    return res.status(400).json({ error: "Prénom et téléphone requis." });
  }

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        eventId: true,
        leadEnabled: true,
        leadTriggerOptionId: true,
      },
    });
    if (!poll) return res.status(404).json({ error: "Sondage introuvable." });
    if (!poll.leadEnabled || !poll.leadTriggerOptionId) {
      return res.status(400).json({ error: "Collecte lead non activée." });
    }

    const aDeclenche = await prisma.vote.findFirst({
      where: {
        pollId,
        voterSessionId,
        optionId: poll.leadTriggerOptionId,
      },
      select: { id: true },
    });
    if (!aDeclenche) {
      return res.status(403).json({ error: "Lead non autorisé pour ce vote." });
    }

    const lead = await prisma.leadCapture.upsert({
      where: {
        pollId_voterSessionId: {
          pollId,
          voterSessionId,
        },
      },
      update: { firstName, phone, email },
      create: {
        pollId,
        eventId: poll.eventId,
        voterSessionId,
        firstName,
        phone,
        email,
      },
    });
    return res.status(201).json({ ok: true, id: lead.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Préparation future « Tirer un gagnant » :
 * participants concours éligibles = question CONTEST_ENTRY + vote sur l’option déclencheuse + lead soumis.
 * @param {string} pollId
 * @param {{ excludeAlreadyDrawn?: boolean }} [opts]
 */
async function listContestEligibleParticipants(pollId, opts = {}) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      type: true,
      leadEnabled: true,
      leadTriggerOptionId: true,
    },
  });
  if (
    !poll ||
    poll.type !== "CONTEST_ENTRY" ||
    !poll.leadEnabled ||
    !poll.leadTriggerOptionId
  ) {
    return [];
  }
  const [votes, leads] = await Promise.all([
    prisma.vote.findMany({
      where: { pollId, optionId: poll.leadTriggerOptionId },
      select: { voterSessionId: true, createdAt: true },
    }),
    prisma.leadCapture.findMany({
      where: { pollId },
      select: {
        voterSessionId: true,
        firstName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    }),
  ]);
  const leadBySession = new Map(
    leads.map((l) => [
      l.voterSessionId,
      {
        firstName: l.firstName,
        phone: l.phone,
        email: l.email,
        leadCapturedAt: l.createdAt,
      },
    ]),
  );
  let participants = votes
    .map((v) => {
      const lead = leadBySession.get(v.voterSessionId);
      if (!lead) return null;
      return {
        voterSessionId: v.voterSessionId,
        votedAt: v.createdAt,
        ...lead,
      };
    })
    .filter(Boolean);
  if (!opts.excludeAlreadyDrawn) {
    return participants;
  }
  const winners = await prisma.contestDrawWinner.findMany({
    where: { pollId },
    select: { voterSessionId: true },
  });
  const excluded = new Set(winners.map((w) => w.voterSessionId));
  participants = participants.filter((p) => !excluded.has(p.voterSessionId));
  return participants;
}

app.get("/polls/:pollId/contest-eligible", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const participants = await listContestEligibleParticipants(pollId);
    return res.json({
      pollId,
      eligibleCount: participants.length,
      participants,
    });
  } catch (e) {
    console.error("polls/:pollId/contest-eligible", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/polls/:pollId/draw", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  const winnerCountRaw = Number(req.body?.winnerCount ?? 1);
  const winnerCount = Number.isFinite(winnerCountRaw)
    ? Math.max(1, Math.floor(winnerCountRaw))
    : 1;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        eventId: true,
        type: true,
        contestPrize: true,
        contestWinnerCount: true,
      },
    });
    if (!poll || poll.type !== "CONTEST_ENTRY") {
      return res
        .status(400)
        .json({ error: "Le tirage est réservé aux questions concours." });
    }

    const contestWinnerCount = normalizeContestWinnerCount(
      poll.contestWinnerCount,
    );
    const totalWinnersAlready = await prisma.contestDrawWinner.count({
      where: { pollId },
    });
    if (totalWinnersAlready >= contestWinnerCount) {
      return res.status(409).json({
        error: "Tous les gagnants ont déjà été tirés.",
        pollId,
        quotaReached: true,
        totalWinners: totalWinnersAlready,
        contestWinnerCount,
      });
    }
    const remainingSlots = contestWinnerCount - totalWinnersAlready;
    if (winnerCount > remainingSlots) {
      return res.status(400).json({
        error: `Nombre de gagnants demandé (${winnerCount}) supérieur au quota restant (${remainingSlots}).`,
        pollId,
        totalWinners: totalWinnersAlready,
        contestWinnerCount,
      });
    }

    const participants = await listContestEligibleParticipants(pollId, {
      excludeAlreadyDrawn: true,
    });
    if (participants.length < 1) {
      return res.status(409).json({
        error: "Aucun participant éligible disponible pour le tirage.",
        pollId,
        eligibleRemainingCount: 0,
        totalWinners: totalWinnersAlready,
        contestWinnerCount,
      });
    }
    if (winnerCount > participants.length) {
      return res.status(400).json({
        error: `Nombre de gagnants demandé (${winnerCount}) supérieur aux participants éligibles restants (${participants.length}).`,
      });
    }

    const pool = [...participants];
    const winners = [];
    for (let i = 0; i < winnerCount; i++) {
      const idx = crypto.randomInt(0, pool.length);
      const picked = pool[idx];
      winners.push(picked);
      pool.splice(idx, 1);
    }

    const draw = await prisma.$transaction(async (tx) => {
      const createdDraw = await tx.contestDraw.create({
        data: {
          pollId,
          eventId: poll.eventId,
          createdByUserId: req.userId,
          winnerCount,
          eligibleCountAtDraw: participants.length,
        },
      });
      await tx.contestDrawWinner.createMany({
        data: winners.map((w, index) => ({
          drawId: createdDraw.id,
          pollId,
          voterSessionId: w.voterSessionId,
          position: index + 1,
          firstName: w.firstName,
          phone: w.phone,
          email: w.email ?? null,
        })),
      });
      return createdDraw;
    });

    return res.json({
      ok: true,
      pollId,
      drawId: draw.id,
      winnerCount,
      eligibleCountAtDraw: participants.length,
      eligibleRemainingCount: participants.length - winners.length,
      contestPrize: poll.contestPrize ?? null,
      totalWinners: totalWinnersAlready + winners.length,
      contestWinnerCount,
      winners: winners.map((w, index) => ({
        position: index + 1,
        voterSessionId: w.voterSessionId,
        firstName: w.firstName,
        phone: w.phone,
        email: w.email ?? null,
      })),
    });
  } catch (e) {
    console.error("polls/:pollId/draw", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/polls/:pollId/draws/summary", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { contestWinnerCount: true },
    });
    const [totalDraws, totalWinners] = await prisma.$transaction([
      prisma.contestDraw.count({ where: { pollId } }),
      prisma.contestDrawWinner.count({ where: { pollId } }),
    ]);
    return res.json({
      pollId,
      totalDraws,
      totalWinners,
      contestWinnerCount: normalizeContestWinnerCount(poll?.contestWinnerCount),
    });
  } catch (e) {
    console.error("polls/:pollId/draws/summary", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/polls/:pollId/draws/winners", requireAuth, async (req, res) => {
  const { pollId } = req.params;
  try {
    const pOwn = await assertPollOwnedBy(pollId, req.userId);
    if (!pOwn.ok) {
      return res.status(pOwn.status).json({ error: "Sondage introuvable." });
    }
    const winners = await prisma.contestDrawWinner.findMany({
      where: { pollId },
      orderBy: [{ draw: { createdAt: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        drawId: true,
        position: true,
        firstName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });
    return res.json({
      pollId,
      totalWinners: winners.length,
      winners: winners.map((w) => ({
        id: w.id,
        drawId: w.drawId,
        position: w.position,
        firstName: w.firstName,
        phone: w.phone,
        email: w.email ?? null,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("polls/:pollId/draws/winners", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/**
 * Leads agrégés : tous les événements du compte connecté (filtres query).
 */
function parseQueryDateStart(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  const d =
    t.length === 10 ? new Date(`${t}T00:00:00.000Z`) : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseQueryDateEnd(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  const d =
    t.length === 10 ? new Date(`${t}T23:59:59.999Z`) : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

app.get("/me/leads", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const eventIdFilter =
      typeof req.query.eventId === "string" && req.query.eventId.trim()
        ? req.query.eventId.trim()
        : null;
    const sourceFilterRaw =
      typeof req.query.source === "string" ? req.query.source.trim().toLowerCase() : "";
    const sourceFilter =
      sourceFilterRaw === "lead" || sourceFilterRaw === "contest" ? sourceFilterRaw : null;
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitRaw = Number(req.query.limit ?? 500);
    const limit = Math.min(
      1000,
      Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 500),
    );
    const fromDate = parseQueryDateStart(
      typeof req.query.from === "string" ? req.query.from : "",
    );
    const toDate = parseQueryDateEnd(
      typeof req.query.to === "string" ? req.query.to : "",
    );

    if (eventIdFilter) {
      const owned = await assertEventOwnedBy(eventIdFilter, userId);
      if (!owned.ok) {
        return res
          .status(owned.status)
          .json({ error: "Événement introuvable." });
      }
    }

    /** @type {import("@prisma/client").Prisma.LeadCaptureWhereInput} */
    const where = {
      event: {
        userId,
        ...(eventIdFilter ? { id: eventIdFilter } : {}),
      },
    };

    const andParts =
      /** @type {import("@prisma/client").Prisma.LeadCaptureWhereInput[]} */ ([]);
    if (qRaw) {
      andParts.push({
        OR: [
          { firstName: { contains: qRaw, mode: "insensitive" } },
          { phone: { contains: qRaw, mode: "insensitive" } },
          { email: { contains: qRaw, mode: "insensitive" } },
        ],
      });
    }
    if (fromDate || toDate) {
      andParts.push({
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        },
      });
    }
    if (sourceFilter === "lead") {
      andParts.push({
        poll: {
          NOT: { type: "CONTEST_ENTRY" },
        },
      });
    } else if (sourceFilter === "contest") {
      andParts.push({
        poll: { type: "CONTEST_ENTRY" },
      });
    }
    if (andParts.length) {
      where.AND = andParts;
    }

    const [events, leads, total] = await prisma.$transaction([
      prisma.event.findMany({
        where: { userId },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.leadCapture.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          poll: { select: { id: true, question: true, order: true, type: true } },
          event: { select: { id: true, title: true } },
        },
      }),
      prisma.leadCapture.count({ where }),
    ]);

    return res.json({
      leads: leads.map((x) => ({
        id: x.id,
        eventId: x.eventId,
        eventTitle: x.event?.title ?? "",
        pollId: x.pollId,
        pollOrder: x.poll?.order ?? null,
        pollQuestion: x.poll?.question ?? "",
        pollType: x.poll?.type ?? null,
        firstName: x.firstName,
        phone: x.phone,
        email: x.email,
        createdAt: x.createdAt.toISOString(),
      })),
      events,
      total,
      limit,
    });
  } catch (e) {
    console.error("me/leads", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/events/:eventId/leads", requireAuth, async (req, res) => {
  const eventId = String(req.params.eventId || "").trim();
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const sourceFilterRaw =
      typeof req.query.source === "string" ? req.query.source.trim().toLowerCase() : "";
    const sourceFilter =
      sourceFilterRaw === "lead" || sourceFilterRaw === "contest" ? sourceFilterRaw : null;

    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const questionId =
      typeof req.query.questionId === "string" && req.query.questionId.trim()
        ? req.query.questionId.trim()
        : null;

    const fromDate = parseQueryDateStart(
      typeof req.query.from === "string" ? req.query.from : "",
    );
    const toDate = parseQueryDateEnd(
      typeof req.query.to === "string" ? req.query.to : "",
    );

    /** @type {import("@prisma/client").Prisma.LeadCaptureWhereInput} */
    const where = { eventId };

    /** @type {import("@prisma/client").Prisma.LeadCaptureWhereInput[]} */
    const andParts = [];

    if (qRaw) {
      andParts.push({
        OR: [
          { firstName: { contains: qRaw, mode: "insensitive" } },
          { phone: { contains: qRaw, mode: "insensitive" } },
          { email: { contains: qRaw, mode: "insensitive" } },
          { poll: { question: { contains: qRaw, mode: "insensitive" } } },
        ],
      });
    }

    if (fromDate || toDate) {
      andParts.push({
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        },
      });
    }

    if (sourceFilter === "lead") {
      andParts.push({ poll: { NOT: { type: "CONTEST_ENTRY" } } });
    } else if (sourceFilter === "contest") {
      andParts.push({ poll: { type: "CONTEST_ENTRY" } });
    }

    if (questionId) {
      andParts.push({ pollId: questionId });
    }

    if (andParts.length) {
      where.AND = andParts;
    }

    const leads = await prisma.leadCapture.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        poll: { select: { id: true, question: true, order: true, type: true } },
      },
    });
    return res.json(
      leads.map((x) => ({
        id: x.id,
        pollId: x.pollId,
        pollOrder: x.poll?.order ?? null,
        pollQuestion: x.poll?.question ?? "",
        pollType: x.poll?.type ?? null,
        firstName: x.firstName,
        phone: x.phone,
        email: x.email,
        createdAt: x.createdAt.toISOString(),
      })),
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/events/:eventId/analytics", requireAuth, async (req, res) => {
  const eventId = String(req.params.eventId || "").trim();
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        polls: {
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
              include: { _count: { select: { votes: true } } },
            },
            _count: { select: { votes: true } },
          },
        },
      },
    });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }

    const pollIds = Array.isArray(event.polls) ? event.polls.map((p) => p.id) : [];
    let participantsUnique = 0;
    /** @type {Map<string, number>} */
    const participantsByPoll = new Map();

    if (pollIds.length > 0) {
      const eventVotes = await prisma.vote.findMany({
        where: { pollId: { in: pollIds } },
        select: { pollId: true, voterSessionId: true },
      });
      const sessionsEvent = new Set();
      /** @type {Map<string, Set<string>>} */
      const sessionsPoll = new Map();
      for (const pid of pollIds) sessionsPoll.set(pid, new Set());
      for (const v of eventVotes) {
        sessionsEvent.add(v.voterSessionId);
        const set = sessionsPoll.get(v.pollId);
        if (set) set.add(v.voterSessionId);
      }
      participantsUnique = sessionsEvent.size;
      for (const [pid, set] of sessionsPoll.entries()) {
        participantsByPoll.set(pid, set.size);
      }
    }

    const questions = event.polls.map((p, i) => {
      const totalVotes = p._count?.votes ?? 0;
      const participantsQuestion = participantsByPoll.get(p.id) ?? 0;
      const responseRatePct =
        participantsUnique > 0
          ? Math.round((participantsQuestion / participantsUnique) * 1000) / 10
          : 0;
      const label =
        (typeof p.question === "string" && p.question.trim()) ||
        (typeof p.title === "string" && p.title.trim()) ||
        `Question ${i + 1}`;
      const options = Array.isArray(p.options)
        ? p.options.map((o) => {
            const votes = o._count?.votes ?? 0;
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 1000) / 10 : 0;
            return {
              id: o.id,
              label: o.label,
              order: o.order,
              voteCount: votes,
              votePct: pct,
            };
          })
        : [];
      return {
        id: p.id,
        order: typeof p.order === "number" ? p.order : i,
        label,
        status: p.status,
        voteCount: totalVotes,
        participantsQuestion,
        responseRatePct,
        options,
      };
    });

    const totalVotes = questions.reduce((acc, q) => acc + (q.voteCount || 0), 0);
    const avgResponseRatePct =
      questions.length > 0
        ? Math.round(
            (questions.reduce((acc, q) => acc + (q.responseRatePct || 0), 0) / questions.length) *
              10,
          ) / 10
        : 0;

    return res.json({
      event: {
        id: event.id,
        title: event.title,
      },
      summary: {
        questionsCount: questions.length,
        participantsUnique,
        totalVotes,
        avgResponseRatePct,
      },
      questions,
    });
  } catch (e) {
    console.error("events/:eventId/analytics", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/events/:eventId/analytics/v2", requireAuth, async (req, res) => {
  const eventId = String(req.params.eventId || "").trim();
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const fromRaw = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toRaw = typeof req.query.to === "string" ? req.query.to.trim() : "";
    const pollId = typeof req.query.pollId === "string" ? req.query.pollId.trim() : "";
    const typeFilter = typeof req.query.type === "string" ? req.query.type.trim().toUpperCase() : "";
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const liveStateFilter =
      typeof req.query.liveState === "string" ? req.query.liveState.trim().toUpperCase() : "";
    const underThresholdRaw =
      typeof req.query.underThresholdPct === "string" ? req.query.underThresholdPct.trim() : "";
    const topThresholdRaw =
      typeof req.query.topThresholdPct === "string" ? req.query.topThresholdPct.trim() : "";
    const underThresholdPct = Number.isFinite(Number(underThresholdRaw))
      ? Math.min(100, Math.max(0, Number(underThresholdRaw)))
      : 30;
    const topThresholdPct = Number.isFinite(Number(topThresholdRaw))
      ? Math.min(100, Math.max(0, Number(topThresholdRaw)))
      : 60;
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    if (from && Number.isNaN(from.getTime())) {
      return res.status(400).json({ error: "Paramètre from invalide." });
    }
    if (to && Number.isNaN(to.getTime())) {
      return res.status(400).json({ error: "Paramètre to invalide." });
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: "La période est invalide (from > to)." });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        liveState: true,
        polls: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            title: true,
            question: true,
            type: true,
            status: true,
            leadEnabled: true,
            _count: { select: { votes: true } },
          },
        },
      },
    });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }

    const normalizeQuestionType = (poll) => {
      const t = String(poll?.type || "").toUpperCase();
      if (t === "CONTEST_ENTRY") return "contest";
      if (t === "QUIZ") return "quiz";
      if (Boolean(poll?.leadEnabled)) return "lead";
      if (t === "MULTIPLE_CHOICE") return "multiple";
      return "single";
    };

    const liveStateNow = String(event.liveState || "").toUpperCase();
    if (liveStateFilter && liveStateFilter !== "ALL" && liveStateFilter !== liveStateNow) {
      return res.json({
        event: { id: event.id, title: event.title, liveState: liveStateNow },
        filters: { from: fromRaw || null, to: toRaw || null, pollId: pollId || null, type: typeFilter || null, status: statusFilter || null, liveState: liveStateFilter || null },
        availableFilters: {
          liveState: liveStateNow,
          questions: event.polls.map((p, i) => ({
            id: p.id,
            order: typeof p.order === "number" ? p.order : i,
            label:
              (typeof p.question === "string" && p.question.trim()) ||
              (typeof p.title === "string" && p.title.trim()) ||
              `Question ${i + 1}`,
            type: normalizeQuestionType(p),
            status: String(p.status || "").toUpperCase(),
          })),
        },
        timeline: [],
        funnel: [],
        segments: [],
        insights: { underperforming: [], topEngagement: [] },
      });
    }

    const filteredPolls = event.polls.filter((p) => {
      const normalizedType = normalizeQuestionType(p);
      const s = String(p.status || "").toUpperCase();
      if (pollId && p.id !== pollId) return false;
      if (typeFilter && typeFilter !== "ALL" && normalizedType.toUpperCase() !== typeFilter) return false;
      if (statusFilter && statusFilter !== "ALL" && s !== statusFilter) return false;
      return true;
    });
    const filteredPollIds = filteredPolls.map((p) => p.id);

    if (!filteredPollIds.length) {
      return res.json({
        event: { id: event.id, title: event.title, liveState: liveStateNow },
        filters: { from: fromRaw || null, to: toRaw || null, pollId: pollId || null, type: typeFilter || null, status: statusFilter || null, liveState: liveStateFilter || null },
        availableFilters: {
          liveState: liveStateNow,
          questions: event.polls.map((p, i) => ({
            id: p.id,
            order: typeof p.order === "number" ? p.order : i,
            label:
              (typeof p.question === "string" && p.question.trim()) ||
              (typeof p.title === "string" && p.title.trim()) ||
              `Question ${i + 1}`,
            type: normalizeQuestionType(p),
            status: String(p.status || "").toUpperCase(),
          })),
        },
        timeline: [],
        funnel: [],
        segments: [],
        insights: { underperforming: [], topEngagement: [] },
      });
    }

    const voteWhere = {
      pollId: { in: filteredPollIds },
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    const votes = await prisma.vote.findMany({
      where: voteWhere,
      select: { pollId: true, voterSessionId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    /** @type {Map<string, Set<string>>} */
    const sessionsByPoll = new Map();
    for (const p of filteredPolls) sessionsByPoll.set(p.id, new Set());
    const sessionsAll = new Set();
    for (const v of votes) {
      sessionsAll.add(v.voterSessionId);
      const set = sessionsByPoll.get(v.pollId);
      if (set) set.add(v.voterSessionId);
    }
    const participantsUnique = sessionsAll.size;
    /** @type {Map<string, number>} */
    const voteCountByPoll = new Map();
    for (const v of votes) {
      voteCountByPoll.set(v.pollId, (voteCountByPoll.get(v.pollId) || 0) + 1);
    }

    const firstVoteAt = votes[0]?.createdAt ? new Date(votes[0].createdAt) : null;
    const lastVoteAt = votes[votes.length - 1]?.createdAt ? new Date(votes[votes.length - 1].createdAt) : null;
    let bucketMin = 1;
    if (firstVoteAt && lastVoteAt) {
      const mins = Math.max(1, Math.ceil((lastVoteAt.getTime() - firstVoteAt.getTime()) / 60000));
      if (mins > 180) bucketMin = 5;
      if (mins > 600) bucketMin = 15;
    }

    /** @type {Map<string, number>} */
    const timelineMap = new Map();
    const bucketStartIso = (date) => {
      const d = new Date(date);
      d.setSeconds(0, 0);
      const m = d.getMinutes();
      d.setMinutes(Math.floor(m / bucketMin) * bucketMin);
      return d.toISOString();
    };
    for (const v of votes) {
      const k = bucketStartIso(v.createdAt);
      timelineMap.set(k, (timelineMap.get(k) || 0) + 1);
    }
    const timeline = [...timelineMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, voteCount]) => ({ bucketStart: iso, voteCount }));

    const questionRows = filteredPolls.map((p, i) => {
      const label =
        (typeof p.question === "string" && p.question.trim()) ||
        (typeof p.title === "string" && p.title.trim()) ||
        `Question ${i + 1}`;
      const participants = sessionsByPoll.get(p.id)?.size ?? 0;
      const responseRatePct =
        participantsUnique > 0 ? Math.round((participants / participantsUnique) * 1000) / 10 : 0;
      return {
        id: p.id,
        order: typeof p.order === "number" ? p.order : i,
        label,
        type: normalizeQuestionType(p),
        status: String(p.status || "").toUpperCase(),
        voteCount: voteCountByPoll.get(p.id) || 0,
        participants,
        responseRatePct,
      };
    });

    const funnel = questionRows
      .sort((a, b) => a.order - b.order)
      .map((q, i, arr) => {
        const prev = i > 0 ? arr[i - 1].participants : q.participants;
        const dropOffPct = i > 0 && prev > 0 ? Math.round(((prev - q.participants) / prev) * 1000) / 10 : 0;
        return {
          questionId: q.id,
          order: q.order,
          label: q.label,
          participants: q.participants,
          responseRatePct: q.responseRatePct,
          dropOffPct: dropOffPct < 0 ? 0 : dropOffPct,
        };
      });

    const segmentBase = new Map();
    for (const q of questionRows) {
      const key = q.type;
      const item = segmentBase.get(key) || {
        type: key,
        questions: 0,
        voteCount: 0,
        participantsTotal: 0,
        responseRateTotal: 0,
      };
      item.questions += 1;
      item.voteCount += q.voteCount;
      item.participantsTotal += q.participants;
      item.responseRateTotal += q.responseRatePct;
      segmentBase.set(key, item);
    }
    const segments = [...segmentBase.values()].map((s) => ({
      type: s.type,
      questions: s.questions,
      voteCount: s.voteCount,
      avgParticipants: s.questions > 0 ? Math.round((s.participantsTotal / s.questions) * 10) / 10 : 0,
      avgResponseRatePct:
        s.questions > 0 ? Math.round((s.responseRateTotal / s.questions) * 10) / 10 : 0,
    }));

    const sortedByRate = [...questionRows].sort((a, b) => a.responseRatePct - b.responseRatePct);
    const underperforming = sortedByRate.filter((q) => q.responseRatePct <= underThresholdPct).slice(0, 5);
    const topEngagement = [...sortedByRate]
      .reverse()
      .filter((q) => q.responseRatePct >= topThresholdPct)
      .slice(0, 5);

    return res.json({
      event: { id: event.id, title: event.title, liveState: liveStateNow },
      filters: {
        from: fromRaw || null,
        to: toRaw || null,
        pollId: pollId || null,
        type: typeFilter || null,
        status: statusFilter || null,
        liveState: liveStateFilter || null,
        underThresholdPct,
        topThresholdPct,
      },
      availableFilters: {
        liveState: liveStateNow,
        questions: event.polls.map((p, i) => ({
          id: p.id,
          order: typeof p.order === "number" ? p.order : i,
          label:
            (typeof p.question === "string" && p.question.trim()) ||
            (typeof p.title === "string" && p.title.trim()) ||
            `Question ${i + 1}`,
          type: normalizeQuestionType(p),
          status: String(p.status || "").toUpperCase(),
        })),
      },
      timeline: {
        bucketMinutes: bucketMin,
        series: timeline,
      },
      funnel,
      segments,
      insights: {
        underperforming,
        topEngagement,
      },
    });
  } catch (e) {
    console.error("events/:eventId/analytics/v2", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/events/:eventId/analytics/v2/export.csv", requireAuth, async (req, res) => {
  const eventId = String(req.params.eventId || "").trim();
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const eventMode = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLiveConsumed: true },
    });
    if (eventMode?.isLiveConsumed === false) {
      return res.status(403).json({ error: "Export disponible uniquement en mode réel" });
    }

    const fromRaw = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toRaw = typeof req.query.to === "string" ? req.query.to.trim() : "";
    const pollId = typeof req.query.pollId === "string" ? req.query.pollId.trim() : "";
    const typeFilter = typeof req.query.type === "string" ? req.query.type.trim().toUpperCase() : "";
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const underThresholdRaw =
      typeof req.query.underThresholdPct === "string" ? req.query.underThresholdPct.trim() : "";
    const topThresholdRaw =
      typeof req.query.topThresholdPct === "string" ? req.query.topThresholdPct.trim() : "";
    const underThresholdPct = Number.isFinite(Number(underThresholdRaw))
      ? Math.min(100, Math.max(0, Number(underThresholdRaw)))
      : 30;
    const topThresholdPct = Number.isFinite(Number(topThresholdRaw))
      ? Math.min(100, Math.max(0, Number(topThresholdRaw)))
      : 60;
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        polls: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            title: true,
            question: true,
            type: true,
            status: true,
            leadEnabled: true,
          },
        },
      },
    });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }
    const normalizeQuestionType = (poll) => {
      const t = String(poll?.type || "").toUpperCase();
      if (t === "CONTEST_ENTRY") return "contest";
      if (t === "QUIZ") return "quiz";
      if (Boolean(poll?.leadEnabled)) return "lead";
      if (t === "MULTIPLE_CHOICE") return "multiple";
      return "single";
    };
    const polls = event.polls.filter((p) => {
      const normalizedType = normalizeQuestionType(p);
      const s = String(p.status || "").toUpperCase();
      if (pollId && p.id !== pollId) return false;
      if (typeFilter && typeFilter !== "ALL" && normalizedType.toUpperCase() !== typeFilter) return false;
      if (statusFilter && statusFilter !== "ALL" && s !== statusFilter) return false;
      return true;
    });
    const pollIds = polls.map((p) => p.id);
    const votes = pollIds.length
      ? await prisma.vote.findMany({
          where: {
            pollId: { in: pollIds },
            ...(from || to
              ? {
                  createdAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
          },
          select: { pollId: true, voterSessionId: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        })
      : [];
    /** @type {Map<string, Set<string>>} */
    const sessionsByPoll = new Map();
    for (const p of polls) sessionsByPoll.set(p.id, new Set());
    const sessionsAll = new Set();
    /** @type {Map<string, number>} */
    const voteCountByPoll = new Map();
    for (const v of votes) {
      sessionsAll.add(v.voterSessionId);
      voteCountByPoll.set(v.pollId, (voteCountByPoll.get(v.pollId) || 0) + 1);
      const set = sessionsByPoll.get(v.pollId);
      if (set) set.add(v.voterSessionId);
    }
    const participantsUnique = sessionsAll.size;
    const rowsByQuestion = polls.map((p, i) => {
      const participants = sessionsByPoll.get(p.id)?.size ?? 0;
      const responseRatePct =
        participantsUnique > 0 ? Math.round((participants / participantsUnique) * 1000) / 10 : 0;
      return {
        id: p.id,
        order: typeof p.order === "number" ? p.order : i,
        label:
          (typeof p.question === "string" && p.question.trim()) ||
          (typeof p.title === "string" && p.title.trim()) ||
          `Question ${i + 1}`,
        type: normalizeQuestionType(p),
        status: String(p.status || "").toUpperCase(),
        voteCount: voteCountByPoll.get(p.id) || 0,
        participants,
        responseRatePct,
      };
    });
    const funnel = [...rowsByQuestion].sort((a, b) => a.order - b.order).map((q, i, arr) => {
      const prev = i > 0 ? arr[i - 1].participants : q.participants;
      return {
        ...q,
        dropOffPct:
          i > 0 && prev > 0 ? Math.max(0, Math.round(((prev - q.participants) / prev) * 1000) / 10) : 0,
      };
    });
    const sortedByRate = [...rowsByQuestion].sort((a, b) => a.responseRatePct - b.responseRatePct);
    const under = sortedByRate.filter((q) => q.responseRatePct <= underThresholdPct).slice(0, 5);
    const top = [...sortedByRate]
      .reverse()
      .filter((q) => q.responseRatePct >= topThresholdPct)
      .slice(0, 5);

    const firstVoteAt = votes[0]?.createdAt ? new Date(votes[0].createdAt) : null;
    const lastVoteAt = votes[votes.length - 1]?.createdAt ? new Date(votes[votes.length - 1].createdAt) : null;
    let bucketMin = 1;
    if (firstVoteAt && lastVoteAt) {
      const mins = Math.max(1, Math.ceil((lastVoteAt.getTime() - firstVoteAt.getTime()) / 60000));
      if (mins > 180) bucketMin = 5;
      if (mins > 600) bucketMin = 15;
    }
    /** @type {Map<string, number>} */
    const timelineMap = new Map();
    const bucketStartIso = (date) => {
      const d = new Date(date);
      d.setSeconds(0, 0);
      d.setMinutes(Math.floor(d.getMinutes() / bucketMin) * bucketMin);
      return d.toISOString();
    };
    for (const v of votes) {
      const k = bucketStartIso(v.createdAt);
      timelineMap.set(k, (timelineMap.get(k) || 0) + 1);
    }
    const timeline = [...timelineMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const escapeCsv = (v) => {
      const s = String(v ?? "");
      if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [];
    lines.push("section;event_title;question_order;question;type;status;metric;value;extra");
    timeline.forEach(([iso, c]) => {
      lines.push(
        ["timeline", escapeCsv(event.title), "", "", "", "", escapeCsv(iso), String(c), `bucket=${bucketMin}m`].join(";"),
      );
    });
    funnel.forEach((q) => {
      lines.push(
        [
          "funnel",
          escapeCsv(event.title),
          String(Number(q.order) + 1),
          escapeCsv(q.label),
          escapeCsv(q.type),
          escapeCsv(q.status),
          "participants",
          String(q.participants),
          `dropOffPct=${q.dropOffPct};ratePct=${q.responseRatePct}`,
        ].join(";"),
      );
    });
    under.forEach((q) => {
      lines.push(
        [
          "insight_under",
          escapeCsv(event.title),
          String(Number(q.order) + 1),
          escapeCsv(q.label),
          escapeCsv(q.type),
          escapeCsv(q.status),
          "responseRatePct",
          String(q.responseRatePct),
          `threshold<=${underThresholdPct}`,
        ].join(";"),
      );
    });
    top.forEach((q) => {
      lines.push(
        [
          "insight_top",
          escapeCsv(event.title),
          String(Number(q.order) + 1),
          escapeCsv(q.label),
          escapeCsv(q.type),
          escapeCsv(q.status),
          "responseRatePct",
          String(q.responseRatePct),
          `threshold>=${topThresholdPct}`,
        ].join(";"),
      );
    });
    const filename = `avote-analytics-v2-${eventId}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send("\ufeff" + lines.join("\n"));
  } catch (e) {
    console.error("events/:eventId/analytics/v2/export.csv", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

const SHARE_TOKEN_SECRET = process.env.JWT_SECRET || "avote-dev-share-secret";

function hashShareToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function signSharePayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SHARE_TOKEN_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyShareToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac("sha256", SHARE_TOKEN_SECRET).update(encoded).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    if (typeof payload.uid !== "string" || !payload.uid.trim()) return null;
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function buildAccountAnalyticsPayload(userId, from, to) {
  const events = await prisma.event.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      polls: {
        select: {
          id: true,
          type: true,
          leadEnabled: true,
        },
      },
      leads: {
        select: { id: true },
      },
    },
  });

  const pollIds = events.flatMap((e) => e.polls.map((p) => p.id));
  const votes = pollIds.length
    ? await prisma.vote.findMany({
        where: {
          pollId: { in: pollIds },
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
        select: { pollId: true, voterSessionId: true },
      })
    : [];

  /** @type {Map<string, string>} */
  const pollToEvent = new Map();
  /** @type {Map<string, string>} */
  const pollToType = new Map();
  for (const ev of events) {
    for (const p of ev.polls) {
      pollToEvent.set(p.id, ev.id);
      const t = String(p.type || "").toUpperCase();
      const typeNormalized =
        t === "CONTEST_ENTRY"
          ? "contest"
          : t === "QUIZ"
            ? "quiz"
            : p.leadEnabled
              ? "lead"
              : t === "MULTIPLE_CHOICE"
                ? "multiple"
                : "single";
      pollToType.set(p.id, typeNormalized);
    }
  }

  /** @type {Map<string, number>} */
  const votesByEvent = new Map();
  /** @type {Map<string, Set<string>>} */
  const participantsByEvent = new Map();
  /** @type {Map<string, {votes:number, sessions:Set<string>} >} */
  const benchmarkByType = new Map();
  for (const ev of events) participantsByEvent.set(ev.id, new Set());
  for (const v of votes) {
    const eid = pollToEvent.get(v.pollId);
    if (!eid) continue;
    votesByEvent.set(eid, (votesByEvent.get(eid) || 0) + 1);
    participantsByEvent.get(eid)?.add(v.voterSessionId);
    const type = pollToType.get(v.pollId) || "single";
    const item = benchmarkByType.get(type) || { votes: 0, sessions: new Set() };
    item.votes += 1;
    item.sessions.add(v.voterSessionId);
    benchmarkByType.set(type, item);
  }

  const eventRows = events.map((ev) => {
    const participants = participantsByEvent.get(ev.id)?.size || 0;
    const voteCount = votesByEvent.get(ev.id) || 0;
    const leadsCount = Array.isArray(ev.leads) ? ev.leads.length : 0;
    const participationRatePct =
      participants > 0 ? Math.round((voteCount / participants) * 10) / 10 : 0;
    const leadConversionPct =
      participants > 0 ? Math.round((leadsCount / participants) * 1000) / 10 : 0;
    return {
      id: ev.id,
      title: ev.title,
      slug: ev.slug,
      createdAt: ev.createdAt.toISOString(),
      pollCount: ev.polls.length,
      participants,
      voteCount,
      leadsCount,
      participationRatePct,
      leadConversionPct,
    };
  });

  const totalEvents = eventRows.length;
  const totalVotes = eventRows.reduce((s, e) => s + e.voteCount, 0);
  const totalParticipants = eventRows.reduce((s, e) => s + e.participants, 0);
  const totalLeads = eventRows.reduce((s, e) => s + e.leadsCount, 0);
  const avgParticipationRatePct =
    totalEvents > 0
      ? Math.round((eventRows.reduce((s, e) => s + e.participationRatePct, 0) / totalEvents) * 10) / 10
      : 0;
  const avgLeadConversionPct =
    totalEvents > 0
      ? Math.round((eventRows.reduce((s, e) => s + e.leadConversionPct, 0) / totalEvents) * 10) / 10
      : 0;

  const bestPerformer =
    [...eventRows].sort((a, b) => b.participationRatePct - a.participationRatePct)[0] || null;

  const monthlyMap = new Map();
  for (const e of eventRows) {
    const d = new Date(e.createdAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const m = monthlyMap.get(key) || {
      month: key,
      eventsCount: 0,
      votes: 0,
      participants: 0,
      leads: 0,
    };
    m.eventsCount += 1;
    m.votes += e.voteCount;
    m.participants += e.participants;
    m.leads += e.leadsCount;
    monthlyMap.set(key, m);
  }
  const monthlyEvolution = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const benchmarks = [...benchmarkByType.entries()].map(([type, x]) => ({
    type,
    avgVotesPerParticipant: x.sessions.size > 0 ? Math.round((x.votes / x.sessions.size) * 10) / 10 : 0,
    participants: x.sessions.size,
    votes: x.votes,
  }));

  return {
    summary: {
      totalEvents,
      totalVotes,
      totalParticipants,
      totalLeads,
      avgParticipationRatePct,
      avgLeadConversionPct,
    },
    bestPerformer,
    monthlyEvolution,
    benchmarks,
    events: eventRows,
  };
}

app.get("/analytics/account", requireAuth, async (req, res) => {
  try {
    const fromRaw = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toRaw = typeof req.query.to === "string" ? req.query.to.trim() : "";
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    if (from && Number.isNaN(from.getTime())) {
      return res.status(400).json({ error: "Paramètre from invalide." });
    }
    if (to && Number.isNaN(to.getTime())) {
      return res.status(400).json({ error: "Paramètre to invalide." });
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: "La période est invalide (from > to)." });
    }

    const payload = await buildAccountAnalyticsPayload(req.userId, from, to);
    return res.json({
      filters: { from: fromRaw || null, to: toRaw || null },
      ...payload,
    });
  } catch (e) {
    console.error("analytics/account", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/analytics/account/share-link", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const expiresInHoursRaw = Number(body.expiresInHours ?? 168);
    const expiresInHours = Math.min(24 * 30, Math.max(1, Number.isFinite(expiresInHoursRaw) ? Math.floor(expiresInHoursRaw) : 168));
    const fromRaw = typeof body.from === "string" ? body.from.trim() : "";
    const toRaw = typeof body.to === "string" ? body.to.trim() : "";
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    if (from && Number.isNaN(from.getTime())) {
      return res.status(400).json({ error: "Paramètre from invalide." });
    }
    if (to && Number.isNaN(to.getTime())) {
      return res.status(400).json({ error: "Paramètre to invalide." });
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: "La période est invalide (from > to)." });
    }
    const exp = Date.now() + expiresInHours * 60 * 60 * 1000;
    const shareId = crypto.randomUUID();
    const token = signSharePayload({
      sid: shareId,
      uid: req.userId,
      exp,
      from: fromRaw || null,
      to: toRaw || null,
    });
    await prisma.accountReportShareToken.create({
      data: {
        id: shareId,
        userId: req.userId,
        tokenHash: hashShareToken(token),
        expiresAt: new Date(exp),
        fromDate: from ? from : null,
        toDate: to ? to : null,
      },
    });
    return res.json({
      shareId,
      token,
      expiresAt: new Date(exp).toISOString(),
      readonlyUrl: `/report/account/${encodeURIComponent(token)}`,
    });
  } catch (e) {
    console.error("analytics/account/share-link", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/analytics/account/shared/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    const payload = verifyShareToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Lien invalide ou expiré." });
    }
    const sid = typeof payload.sid === "string" ? payload.sid.trim() : "";
    if (!sid) {
      return res.status(401).json({ error: "Lien invalide ou expiré." });
    }
    const share = await prisma.accountReportShareToken.findUnique({
      where: { id: sid },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        revokedAt: true,
        expiresAt: true,
        fromDate: true,
        toDate: true,
      },
    });
    if (!share) {
      return res.status(401).json({ error: "Lien invalide ou expiré." });
    }
    if (share.revokedAt) {
      return res.status(401).json({ error: "Lien révoqué." });
    }
    if (new Date(share.expiresAt).getTime() < Date.now()) {
      return res.status(401).json({ error: "Lien expiré." });
    }
    if (share.tokenHash !== hashShareToken(token)) {
      return res.status(401).json({ error: "Lien invalide ou expiré." });
    }
    const from = payload.from ? new Date(payload.from) : null;
    const to = payload.to ? new Date(payload.to) : null;
    const data = await buildAccountAnalyticsPayload(share.userId, from, to);
    return res.json({
      readonly: true,
      expiresAt: new Date(share.expiresAt).toISOString(),
      filters: { from: payload.from || null, to: payload.to || null },
      ...data,
    });
  } catch (e) {
    console.error("analytics/account/shared/:token", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/analytics/account/share-links", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.accountReportShareToken.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        fromDate: true,
        toDate: true,
      },
    });
    return res.json({
      links: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
        from: r.fromDate ? r.fromDate.toISOString() : null,
        to: r.toDate ? r.toDate.toISOString() : null,
      })),
    });
  } catch (e) {
    console.error("analytics/account/share-links", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/analytics/account/share-links/:shareId/revoke", requireAuth, async (req, res) => {
  try {
    const shareId = String(req.params.shareId || "").trim();
    if (!shareId) {
      return res.status(400).json({ error: "Identifiant de partage invalide." });
    }
    const existing = await prisma.accountReportShareToken.findFirst({
      where: {
        id: shareId,
        userId: req.userId,
      },
      select: { id: true, revokedAt: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Lien introuvable." });
    }
    if (!existing.revokedAt) {
      await prisma.accountReportShareToken.update({
        where: { id: shareId },
        data: { revokedAt: new Date() },
      });
    }
    return res.json({ ok: true, id: shareId });
  } catch (e) {
    console.error("analytics/account/share-links/:shareId/revoke", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/analytics/account/export.csv", requireAuth, async (req, res) => {
  try {
    const fromRaw = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toRaw = typeof req.query.to === "string" ? req.query.to.trim() : "";
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    const events = await prisma.event.findMany({
      where: {
        userId: req.userId,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        polls: { select: { id: true } },
        leads: { select: { id: true } },
      },
    });
    const pollIds = events.flatMap((e) => e.polls.map((p) => p.id));
    const votes = pollIds.length
      ? await prisma.vote.findMany({
          where: {
            pollId: { in: pollIds },
            ...(from || to
              ? {
                  createdAt: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
          },
          select: { pollId: true, voterSessionId: true },
        })
      : [];
    const pollToEvent = new Map();
    for (const ev of events) for (const p of ev.polls) pollToEvent.set(p.id, ev.id);
    const votesByEvent = new Map();
    const participantsByEvent = new Map();
    for (const ev of events) participantsByEvent.set(ev.id, new Set());
    for (const v of votes) {
      const eid = pollToEvent.get(v.pollId);
      if (!eid) continue;
      votesByEvent.set(eid, (votesByEvent.get(eid) || 0) + 1);
      participantsByEvent.get(eid)?.add(v.voterSessionId);
    }
    const esc = (v) => {
      const s = String(v ?? "");
      if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = [];
    rows.push(
      [
        "event_id",
        "event_title",
        "event_slug",
        "created_at",
        "poll_count",
        "participants",
        "votes",
        "leads",
        "participation_rate",
        "lead_conversion_pct",
      ].join(";"),
    );
    for (const ev of events) {
      const participants = participantsByEvent.get(ev.id)?.size || 0;
      const voteCount = votesByEvent.get(ev.id) || 0;
      const leads = ev.leads.length;
      const participationRate = participants > 0 ? Math.round((voteCount / participants) * 10) / 10 : 0;
      const leadConversionPct =
        participants > 0 ? Math.round((leads / participants) * 1000) / 10 : 0;
      rows.push(
        [
          esc(ev.id),
          esc(ev.title),
          esc(ev.slug),
          esc(ev.createdAt.toISOString()),
          String(ev.polls.length),
          String(participants),
          String(voteCount),
          String(leads),
          String(participationRate),
          String(leadConversionPct),
        ].join(";"),
      );
    }
    const filename = "avote-account-analytics.csv";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send("\ufeff" + rows.join("\n"));
  } catch (e) {
    console.error("analytics/account/export.csv", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/events/:eventId/analytics/export.csv", requireAuth, async (req, res) => {
  const eventId = String(req.params.eventId || "").trim();
  try {
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }

    const eventMode = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLiveConsumed: true },
    });
    if (eventMode?.isLiveConsumed === false) {
      return res.status(403).json({ error: "Export disponible uniquement en mode réel" });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        polls: {
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
              include: { _count: { select: { votes: true } } },
            },
            _count: { select: { votes: true } },
          },
        },
      },
    });
    if (!event) {
      return res.status(404).json({ error: "Événement introuvable." });
    }

    const escapeCsv = (v) => {
      const s = String(v ?? "");
      if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    /** @type {string[]} */
    const rows = [];
    rows.push(
      [
        "event_title",
        "question_order",
        "question",
        "question_status",
        "option_order",
        "option",
        "votes",
        "pct",
      ].join(";"),
    );
    event.polls.forEach((p, i) => {
      const qLabel =
        (typeof p.question === "string" && p.question.trim()) ||
        (typeof p.title === "string" && p.title.trim()) ||
        `Question ${i + 1}`;
      const totalVotes = p._count?.votes ?? 0;
      if (!Array.isArray(p.options) || p.options.length === 0) {
        rows.push(
          [
            escapeCsv(event.title),
            String((typeof p.order === "number" ? p.order : i) + 1),
            escapeCsv(qLabel),
            escapeCsv(p.status),
            "",
            "",
            "0",
            "0",
          ].join(";"),
        );
        return;
      }
      p.options.forEach((o, oi) => {
        const votes = o._count?.votes ?? 0;
        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 1000) / 10 : 0;
        rows.push(
          [
            escapeCsv(event.title),
            String((typeof p.order === "number" ? p.order : i) + 1),
            escapeCsv(qLabel),
            escapeCsv(p.status),
            String((typeof o.order === "number" ? o.order : oi) + 1),
            escapeCsv(o.label),
            String(votes),
            String(pct),
          ].join(";"),
        );
      });
    });

    const filename = `avote-analytics-${eventId}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send("\ufeff" + rows.join("\n"));
  } catch (e) {
    console.error("events/:eventId/analytics/export.csv", e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/** Réglages régie : auto-reveal (persisté sur l’événement). */
app.patch("/events/:eventId/auto-reveal-settings", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const body = req.body ?? {};
    const data = /** @type {Record<string, unknown>} */ ({});
    if (typeof body.autoReveal === "boolean") {
      data.autoReveal = body.autoReveal;
    }
    if (body.autoRevealDelaySec != null) {
      const n = Number(body.autoRevealDelaySec);
      if ([3, 5, 10].includes(n)) {
        data.autoRevealDelaySec = n;
      }
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error:
          "Corps attendu : { autoReveal?: boolean, autoRevealDelaySec?: 3 | 5 | 10 }.",
      });
    }
    await annulationAutoRevealProgrammee(eventId);
    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
    });
    await emitEventLiveUpdated(io, eventId);
    return res.json({
      ok: true,
      autoReveal: updated.autoReveal,
      autoRevealDelaySec: updated.autoRevealDelaySec,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

io.on("connection", (socket) => {
  socket.on("join_poll", (rawPollId) => {
    socket.join(roomPourPoll(String(rawPollId)));
  });

  socket.on("leave_poll", (rawPollId) => {
    socket.leave(roomPourPoll(String(rawPollId)));
  });

  socket.on("join_event", (rawEventId) => {
    const id = String(rawEventId);
    socket.join(roomPourEvent(id));
    void emitScreenCountToAdmins(io, id);
    void emitScreenPresenceToAdmins(io, id, "b");
  });

  socket.on("leave_event", (rawEventId) => {
    socket.leave(roomPourEvent(String(rawEventId)));
  });

  /** Clients /screen/[slug] : room = eventId (valeur brute) */
  socket.on("screen:join", (payload) => {
    const eventId =
      payload && typeof payload.eventId === "string"
        ? payload.eventId.trim()
        : "";
    if (!eventId) return;
    socket.join(eventId);
    const screenId = normalizeScreenId(payload?.screenId);
    if (screenId) {
      const room = roomPourScreen(eventId, screenId);
      socket.join(room);
      socket.data.screenTargetRoom = room;
      socket.data.screenId = screenId;
    } else {
      socket.data.screenTargetRoom = null;
      socket.data.screenId = null;
    }
    socket.data.screenEventId = eventId;
    void emitScreenCountToAdmins(io, eventId);
    void emitScreenPresenceToAdmins(io, eventId, "b");
  });

  socket.on("screen:leave", (payload) => {
    const eventId =
      payload && typeof payload.eventId === "string"
        ? payload.eventId.trim()
        : "";
    if (!eventId) return;
    socket.leave(eventId);
    const room = socket.data.screenTargetRoom;
    if (room) socket.leave(room);
    if (socket.data.screenEventId === eventId) {
      socket.data.screenEventId = null;
      socket.data.screenTargetRoom = null;
      socket.data.screenId = null;
    }
    void emitScreenCountToAdmins(io, eventId);
    void emitScreenPresenceToAdmins(io, eventId, "b");
  });

  /**
   * Régie → indication « mode automatique » sur les clients /screen (pas de persistance).
   */
  socket.on("screen:auto_rotate", (payload) => {
    const eventId =
      payload && typeof payload.eventId === "string"
        ? payload.eventId.trim()
        : "";
    if (!eventId) return;
    const screenId = normalizeScreenId(payload?.screenId);
    const targetedRoom = screenId ? roomPourScreen(eventId, screenId) : null;
    const enabled = Boolean(payload?.enabled);
    const msg = { eventId, enabled, screenId };
    if (targetedRoom) {
      io.to(targetedRoom).emit("screen:auto_rotate", msg);
      // Fallback robuste: passe aussi par la room event brute, filtrée côté client par screenId.
      io.to(eventId).emit("screen:auto_rotate", msg);
    } else {
      io.to(eventId).emit("screen:auto_rotate", msg);
    }
    io.to(roomPourEvent(eventId)).emit("screen:auto_rotate", msg);
  });

  /** Régie → persistance displayState + écrans (ne modifie pas voteState) */
  socket.on("screen:action", async (payload) => {
    const eventId =
      payload && typeof payload.eventId === "string"
        ? payload.eventId.trim()
        : "";
    const type = payload && payload.type != null ? String(payload.type) : "";
    const screenId = normalizeScreenId(payload?.screenId);
    const targetedRoom = screenId ? roomPourScreen(eventId, screenId) : null;
    if (!eventId || !type) return;
    const allowed = new Set(["RESULTS", "QUESTION", "WAITING", "BLACK"]);
    if (!allowed.has(type)) return;
    const displayMap = {
      RESULTS: "RESULTS",
      QUESTION: "QUESTION",
      WAITING: "WAITING",
      BLACK: "BLACK",
    };
    const displayState = displayMap[type];
    try {
      const ev = await prisma.event.findUnique({ where: { id: eventId } });
      if (!ev) return;
      if (targetedRoom) {
        const msg = {
          eventId,
          type,
          displayState: String(displayState).toLowerCase(),
          voteState: String(ev.voteState).toLowerCase(),
          pollId: ev.activePollId,
          screenId,
        };
        io.to(targetedRoom).emit("screen:update", msg);
        // Fallback robuste: passe aussi par la room event brute, filtrée côté client par screenId.
        io.to(eventId).emit("screen:update", msg);
        io.to(roomPourEvent(eventId)).emit("screen:update", msg);
        return;
      }
      await prisma.event.update({
        where: { id: eventId },
        data: { screenDisplayState: displayState },
      });
      const fresh = await prisma.event.findUnique({ where: { id: eventId } });
      if (!fresh) return;
      io.to(eventId).emit("screen:update", {
        eventId,
        type,
        displayState: String(
          fresh.screenDisplayState ?? fresh.displayState,
        ).toLowerCase(),
        voteState: String(fresh.voteState).toLowerCase(),
        pollId: fresh.activePollId,
        screenId: null,
      });
    } catch (e) {
      console.error("screen:action", e);
    }
  });

  socket.on("disconnect", () => {
    const id = socket.data.screenEventId;
    if (id) {
      void emitScreenCountToAdmins(io, id);
      void emitScreenPresenceToAdmins(io, id, "b");
    }
  });
});

const ENABLE_TIMERS = process.env.ENABLE_TIMERS === "true";

server.listen(PORT, "0.0.0.0", () => {
  console.log(`API Avote sur http://localhost:${PORT}`);
  console.log(`Socket.io sur le même port (${PORT})`);
  console.log(
    `Chrono question : durée max ${QUESTION_TIMER_SEC_MAX} s (${Math.floor(QUESTION_TIMER_SEC_MAX / 86400)} j)`,
  );

  if (ENABLE_TIMERS) {
    setInterval(async () => {
      try {
        const candidats = await prisma.event.findMany({
          where: {
            questionTimerTotalSec: { not: null },
            voteState: "OPEN",
            activePollId: { not: null },
          },
          select: { id: true },
          take: 100,
        });
        for (const row of candidats) {
          await fermerVoteSiChronoEpuise(io, row.id);
        }
      } catch (err) {
        console.error("scan chrono auto-close", err);
      }
    }, 2000);

    setInterval(async () => {
      try {
        const due = await prisma.event.findMany({
          where: {
            autoRevealShowResultsAt: { lte: new Date() },
            voteState: "CLOSED",
          },
          select: { id: true },
          take: 20,
        });
        for (const row of due) {
          await appliquerAutoRevealResultats(io, row.id);
        }
      } catch (err) {
        console.error("scan auto-reveal", err);
      }
    }, 1000);
  }
});
