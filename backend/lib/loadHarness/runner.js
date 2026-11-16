/**
 * Exécuteur réseau HTTP + Socket.IO (staging uniquement).
 * Ne contourne pas rate-limit / protections vote.
 */

const { randomUUID } = require("crypto");
const { assertLoadRunAuthorized } = require("./prodGuard");
const { buildReport } = require("./metrics");
const { evaluateStopConditions } = require("./stopConditions");
const {
  buildTierPlan,
  evaluateVoteCoherence,
} = require("./scenarios");
const { voteStartDelayMs, sleep } = require("./pacing");
const { simulateCapacityTopUp } = require("./topupSim");

/**
 * @param {string} apiBase
 * @param {string} path
 * @param {RequestInit & { timeoutMs?: number }} [init]
 */
async function fetchJson(apiBase, path, init = {}) {
  const base = String(apiBase || "").replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const timeoutMs = Math.max(1000, Number(init.timeoutMs) || 15_000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    return {
      ok: res.ok,
      status: res.status,
      body,
      latencyMs: Date.now() - started,
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object} cfg
 */
async function runLoadTier(cfg = {}) {
  const auth = assertLoadRunAuthorized({
    apiUrl: cfg.apiUrl,
    allowRun: cfg.allowRun,
    confirmIsolated: cfg.confirmIsolated,
  });
  if (!auth.ok) {
    return { ok: false, code: auth.code, error: auth.error };
  }

  const eventId = String(cfg.eventId || "").trim();
  const pollId = String(cfg.pollId || "").trim();
  const optionId = String(cfg.optionId || "").trim();
  if (!eventId || !pollId || !optionId) {
    return {
      ok: false,
      code: "LOAD_IDS_MISSING",
      error: "eventId, pollId et optionId requis.",
    };
  }

  const plan = buildTierPlan({
    tier: cfg.tier,
    participantsLimit: cfg.participantsLimit,
    maxVotesPerSec: cfg.maxVotesPerSec,
    tierTimeoutMs: cfg.tierTimeoutMs,
    sharedIp: true,
    includeSaturationProbe: cfg.includeSaturationProbe !== false,
    includeSimulatedTopUp: cfg.includeSimulatedTopUp !== false,
  });
  if (!plan.ok) return plan;

  let ioClient;
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    ioClient = require("socket.io-client");
  } catch {
    return {
      ok: false,
      code: "SOCKET_IO_CLIENT_MISSING",
      error:
        "socket.io-client manquant. Installez les devDependencies du backend.",
    };
  }

  const apiUrl = auth.url.origin;
  const deadline = Date.now() + plan.tierTimeoutMs;
  /** @type {number[]} */
  const latenciesMs = [];
  let httpAttempts = 0;
  let httpErrors = 0;
  let socketAttempts = 0;
  let socketErrors = 0;
  let voteOk = 0;
  let voteLimitReached = 0;
  let voteAlreadyVoted = 0;
  let voteOtherReject = 0;
  let peakConnections = 0;
  let pollUpdatedSeen = 0;
  let openConnections = 0;
  /** @type {import("socket.io-client").Socket[]} */
  const sockets = [];
  /** @type {string[]} */
  const stopReasons = [];

  const maybeStop = () => {
    const report = buildReport({
      httpAttempts,
      httpErrors,
      socketAttempts,
      socketErrors,
      latenciesMs,
      voteOk,
      voteLimitReached,
      voteAlreadyVoted,
      voteOtherReject,
      peakConnections,
      pollUpdatedSeen,
    });
    const ev = evaluateStopConditions(report);
    if (ev.stop) {
      stopReasons.push(...ev.reasons);
      return true;
    }
    if (Date.now() > deadline) {
      stopReasons.push("tierTimeout");
      return true;
    }
    return false;
  };

  try {
    const n = plan.tier;
    /** @type {Promise<void>[]} */
    const connectJobs = [];
    for (let i = 0; i < n; i += 1) {
      connectJobs.push(
        (async () => {
          socketAttempts += 1;
          const socket = ioClient(apiUrl, {
            transports: ["websocket", "polling"],
            reconnection: false,
            timeout: 12_000,
          });
          sockets.push(socket);
          await new Promise((resolve, reject) => {
            const to = setTimeout(
              () => reject(new Error("socket_connect_timeout")),
              12_000,
            );
            socket.on("connect", () => {
              clearTimeout(to);
              openConnections += 1;
              peakConnections = Math.max(peakConnections, openConnections);
              resolve(undefined);
            });
            socket.on("connect_error", (err) => {
              clearTimeout(to);
              reject(err);
            });
          }).catch((err) => {
            socketErrors += 1;
            try {
              socket.close();
            } catch {
              /* ignore */
            }
            throw err;
          });
          socket.on("poll_updated", () => {
            pollUpdatedSeen += 1;
          });
          socket.on("disconnect", () => {
            openConnections = Math.max(0, openConnections - 1);
          });
          socket.emit("join_event", eventId);
          socket.emit("join_poll", pollId);
        })(),
      );
      // petite cadence de connexion pour éviter storm TCP
      if (i > 0 && i % 50 === 0) await sleep(100);
      if (maybeStop()) break;
    }

    const connectResults = await Promise.allSettled(connectJobs);
    const connectFails = connectResults.filter((r) => r.status === "rejected")
      .length;
    if (connectFails > 0 && stopReasons.length === 0) {
      // déjà comptés en socketErrors
    }
    if (maybeStop()) {
      /* continue to report */
    } else {
      /** @type {Promise<void>[]} */
      const voteJobs = [];
      for (let i = 0; i < n; i += 1) {
        const sessionId = `load-${plan.tier}-${i}-${randomUUID()}`;
        const delay = voteStartDelayMs(i, plan.maxVotesPerSec);
        voteJobs.push(
          (async () => {
            await sleep(delay);
            if (stopReasons.length) return;
            httpAttempts += 1;
            const res = await fetchJson(apiUrl, `/polls/${pollId}/vote`, {
              method: "POST",
              body: JSON.stringify({
                optionIds: [optionId],
                voterSessionId: sessionId,
              }),
              timeoutMs: 20_000,
            });
            latenciesMs.push(res.latencyMs);
            if (res.status >= 500 || res.status === 0) {
              httpErrors += 1;
              return;
            }
            if (res.status === 429) {
              // rate-limit = protection respectée, comptée comme erreur HTTP métier
              httpErrors += 1;
              voteOtherReject += 1;
              return;
            }
            if (res.ok) {
              voteOk += 1;
              return;
            }
            if (
              res.status === 403 &&
              (res.body?.error === "LIMIT_REACHED" || res.body?.limitReached)
            ) {
              voteLimitReached += 1;
              return;
            }
            if (res.status === 409 || res.body?.alreadyVoted) {
              voteAlreadyVoted += 1;
              return;
            }
            voteOtherReject += 1;
            if (res.status >= 400) httpErrors += 1;
          })(),
        );
      }
      await Promise.allSettled(voteJobs);
      maybeStop();
    }

    // Saturation probe : sessions supplémentaires si limite connue
    let saturation = null;
    if (
      !stopReasons.length &&
      plan.participantsLimit != null &&
      voteOk >= plan.participantsLimit
    ) {
      const overflow = Math.min(5, Math.max(1, Math.ceil(n * 0.02)));
      for (let i = 0; i < overflow; i += 1) {
        httpAttempts += 1;
        const res = await fetchJson(apiUrl, `/polls/${pollId}/vote`, {
          method: "POST",
          body: JSON.stringify({
            optionIds: [optionId],
            voterSessionId: `load-overflow-${i}-${randomUUID()}`,
          }),
        });
        latenciesMs.push(res.latencyMs);
        if (res.status === 403 && res.body?.error === "LIMIT_REACHED") {
          voteLimitReached += 1;
        } else if (!res.ok && res.status >= 400) {
          httpErrors += 1;
          voteOtherReject += 1;
        } else if (res.ok) {
          voteOk += 1;
        }
      }
      saturation = {
        probed: true,
        limitReachedCount: voteLimitReached,
        expectBlocked: true,
      };
      maybeStop();
    }

    const topup = simulateCapacityTopUp({
      participantsLimit: plan.participantsLimit ?? plan.tier,
      liveState: "LIVE",
      isLocked: false,
      delta: 50,
    });

    const report = buildReport({
      httpAttempts,
      httpErrors,
      socketAttempts,
      socketErrors,
      latenciesMs,
      voteOk,
      voteLimitReached,
      voteAlreadyVoted,
      voteOtherReject,
      peakConnections,
      pollUpdatedSeen,
    });
    const stop = evaluateStopConditions(report);
    const coherence = evaluateVoteCoherence({
      voteOk,
      expectedParticipants:
        plan.participantsLimit != null
          ? Math.min(plan.tier, plan.participantsLimit)
          : plan.tier,
      limitReached: voteLimitReached,
    });

    return {
      ok: !stop.stop && stopReasons.length === 0,
      aborted: stop.stop || stopReasons.length > 0,
      abortReasons: [...new Set([...stopReasons, ...stop.reasons])],
      plan,
      report,
      coherence,
      saturation,
      topupSimulated: topup,
      apiUrl,
      eventId,
      pollId,
    };
  } finally {
    for (const s of sockets) {
      try {
        s.removeAllListeners();
        s.close();
      } catch {
        /* ignore */
      }
    }
  }
}

module.exports = {
  fetchJson,
  runLoadTier,
};
