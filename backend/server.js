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
  };
}

const CUSTOM_THEME_MODES = new Set(["dark", "light", "auto"]);
const CUSTOM_OVERLAY = new Set(["low", "medium", "strong"]);

const uploadStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const eventId = String(req.params.eventId || "").trim();
    const dir = path.join(UPLOAD_ROOT, "events", eventId);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      return cb(/** @type {Error} */ (e));
    }
    cb(null, dir);
  },
  filename(req, file, cb) {
    const qk = String(req.query.kind || "").toLowerCase();
    const kind = qk === "background" ? "bg" : "logo";
    const ext = path.extname(file.originalname || "") || ".png";
    const safeExt = /^\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : ".png";
    cb(
      null,
      `${kind}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`,
    );
  },
});

const uploadMiddleware = multer({
  storage: uploadStorage,
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
  const voteCounts = {};
  for (const v of poll.votes) {
    voteCounts[v.optionId] = (voteCounts[v.optionId] || 0) + 1;
  }
  return {
    id: poll.id,
    title: poll.title,
    question: poll.question,
    type: poll.type,
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
    autoReveal: Boolean(poll.event?.autoReveal),
    autoRevealDelaySec: poll.event?.autoRevealDelaySec ?? 5,
    autoRevealShowResultsAt:
      poll.event?.autoRevealShowResultsAt?.toISOString() ?? null,
    questionTimer: poll.event
      ? questionTimerSnapshot(poll.event)
      : null,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      order: option.order,
      votes: voteCounts[option.id] || 0,
    })),
  };
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
    liveState: event.liveState.toLowerCase(),
    voteState: String(event.voteState).toLowerCase(),
    displayState: String(event.displayState).toLowerCase(),
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
      ...QUESTION_TIMER_RESET,
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
      select: { id: true, email: true },
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
    return res.json({
      id: event.id,
      title: event.title,
      ...eventCustomizationJson(event),
      slug: event.slug,
      status: event.status,
      liveState: event.liveState.toLowerCase(),
      voteState: String(event.voteState).toLowerCase(),
      displayState: String(event.displayState).toLowerCase(),
      activePollId: event.activePollId,
      autoReveal: event.autoReveal,
      autoRevealDelaySec: event.autoRevealDelaySec,
      autoRevealShowResultsAt:
        event.autoRevealShowResultsAt?.toISOString() ?? null,
      questionTimer: questionTimerSnapshot(event),
      polls: event.polls.map((p) => ({
        id: p.id,
        title: p.title,
        question: p.question,
        order: p.order,
        status: p.status,
        type: p.type,
        voteCount: p._count.votes,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

/** Mise à jour champ description (régie / admin) */
app.patch("/events/:eventId", requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const owned = await assertEventOwnedBy(eventId, req.userId);
    if (!owned.ok) {
      return res.status(owned.status).json({ error: "Événement introuvable." });
    }
    const body = req.body ?? {};
    if (!Object.prototype.hasOwnProperty.call(body, "description")) {
      return res
        .status(400)
        .json({ error: "Corps attendu : { description: string | null }." });
    }
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
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { description: value },
      select: { id: true, description: true },
    });
    return res.json({ id: event.id, description: event.description });
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
    const prefix = `${PUBLIC_API_ORIGIN}/uploads/`;
    if (t.startsWith(prefix)) return t.slice(PUBLIC_API_ORIGIN.length);
    return t;
  }
  return undefined;
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
    const rel = `/uploads/events/${eventId}/${req.file.filename}`;
    const url = absolutizeStoredAssetUrl(rel);
    return res.json({ url, path: rel });
  } catch (e) {
    if (e && typeof e === "object" && e.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Fichier trop volumineux (max 3 Mo)." });
    }
    console.error(e);
    return res
      .status(400)
      .json({ error: e?.message || "Upload impossible." });
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
 * Régie : créer un sondage à la volée (file ou lancement immédiat).
 * Corpo : { question, type?: SINGLE_CHOICE|MULTIPLE_CHOICE, options: string[], launchNow?: boolean }
 */
app.post("/events/:eventId/polls/live", requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const owned = await assertEventOwnedBy(eventId, req.userId);
  if (!owned.ok) {
    return res.status(owned.status).json({ error: "Événement introuvable." });
  }
  const body = req.body ?? {};
  const questionBrute =
    typeof body.question === "string" ? body.question.trim() : "";
  const typeBrut =
    typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  const launchNow = body.launchNow === true;
  const optionsBrutes = Array.isArray(body.options) ? body.options : [];

  if (!questionBrute || questionBrute.length > 2000) {
    return res
      .status(400)
      .json({ error: "question requise (1 à 2000 caractères)." });
  }

  const pollType =
    typeBrut === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE";

  const labels = optionsBrutes
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (labels.length < 2) {
    return res.status(400).json({ error: "Au moins 2 réponses non vides." });
  }
  if (labels.length > 32) {
    return res.status(400).json({ error: "Maximum 32 réponses." });
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

    const created = await prisma.poll.create({
      data: {
        eventId,
        title: titreCourt,
        question: questionBrute,
        type: pollType,
        status: "CLOSED",
        order: nextOrder,
        options: {
          create: labels.map((label, order) => ({ label, order })),
        },
      },
    });

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
      data: { status: "ACTIVE" },
    });

    const event = await prisma.event.update({
      where: { id: poll.eventId },
      data: {
        activePollId: poll.id,
        voteState: "OPEN",
        displayState: "QUESTION",
        liveState: "VOTING",
        autoRevealShowResultsAt: null,
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

/** @returns {"SINGLE_CHOICE" | "MULTIPLE_CHOICE" | null} */
function parseTypeSondage(typeRaw) {
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
        return { order: ordre, question: qBrut, labels, type: typ };
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
            error: `Question « ${p.question.slice(0, 48)}${p.question.length > 48 ? "…" : ""} » : type invalide (SINGLE_CHOICE ou MULTIPLE_CHOICE).`,
          });
        }
        if (p.labels.length < 2) {
          return res.status(400).json({
            error: `Question « ${p.question.slice(0, 48)}${p.question.length > 48 ? "…" : ""} » : au moins 2 options non vides sont requises.`,
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
              type: e.type,
              status: i === 0 ? "ACTIVE" : "DRAFT",
              order: i,
              options: {
                create: e.labels.map((label, order) => ({ label, order })),
              },
            },
          });
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
        error: 'Le type doit être "SINGLE_CHOICE" ou "MULTIPLE_CHOICE".',
      });
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
        type: pollTypeParsed,
        status: "ACTIVE",
        order: 0,
        options: {
          create: labels.map((label, order) => ({ label, order })),
        },
      },
      include: {
        event: true,
        options: { orderBy: { order: "asc" } },
        votes: true,
      },
    });

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
    socket.data.screenEventId = eventId;
    void emitScreenCountToAdmins(io, eventId);
  });

  socket.on("screen:leave", (payload) => {
    const eventId =
      payload && typeof payload.eventId === "string"
        ? payload.eventId.trim()
        : "";
    if (!eventId) return;
    socket.leave(eventId);
    if (socket.data.screenEventId === eventId) {
      socket.data.screenEventId = null;
    }
    void emitScreenCountToAdmins(io, eventId);
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
    const enabled = Boolean(payload?.enabled);
    const msg = { eventId, enabled };
    io.to(eventId).emit("screen:auto_rotate", msg);
    io.to(roomPourEvent(eventId)).emit("screen:auto_rotate", msg);
  });

  /** Régie → persistance displayState + écrans (ne modifie pas voteState) */
  socket.on("screen:action", async (payload) => {
    const eventId =
      payload && typeof payload.eventId === "string"
        ? payload.eventId.trim()
        : "";
    const type = payload && payload.type != null ? String(payload.type) : "";
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
      await annulationAutoRevealProgrammee(eventId);
      const live = computeLiveState(ev.voteState, displayState);
      await prisma.event.update({
        where: { id: eventId },
        data: { displayState, liveState: live },
      });
      const fresh = await prisma.event.findUnique({ where: { id: eventId } });
      if (!fresh) return;
      io.to(eventId).emit("screen:update", {
        eventId,
        type,
        displayState: String(fresh.displayState).toLowerCase(),
        voteState: String(fresh.voteState).toLowerCase(),
        pollId: fresh.activePollId,
      });
      await emitEventLiveUpdated(io, eventId);
    } catch (e) {
      console.error("screen:action", e);
    }
  });

  socket.on("disconnect", () => {
    const id = socket.data.screenEventId;
    if (id) {
      void emitScreenCountToAdmins(io, id);
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
