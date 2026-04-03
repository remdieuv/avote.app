"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { ScreenAutoRevealWait } from "./ScreenAutoRevealWait";
import { ScreenQuestion } from "./ScreenQuestion";
import { ScreenResults } from "./ScreenResults";
import { API_URL, SOCKET_URL } from "@/lib/config";

function libelleSceneAttente(scene) {
  switch (scene) {
    case "waiting":
      return "Préparez-vous, la prochaine question arrive";
    case "finished":
      return "Merci pour votre participation";
    case "paused":
      return "Pause — reprise bientôt";
    default:
      return "";
  }
}

/** @param {Record<string, unknown> | null | undefined} tm */
function chronoRestantSecondes(tm) {
  if (!tm || typeof tm.totalSec !== "number") return null;
  if (!tm.running || tm.isPaused) {
    return typeof tm.remainingSec === "number" ? tm.remainingSec : null;
  }
  if (typeof tm.startedAt !== "string") return tm.remainingSec ?? null;
  const seg = Math.floor(
    (Date.now() - new Date(tm.startedAt).getTime()) / 1000,
  );
  const acc = typeof tm.accumulatedSec === "number" ? tm.accumulatedSec : 0;
  return Math.max(0, tm.totalSec - acc - seg);
}

/** @param {boolean} showModeAuto */
function wrapWithBlackout(blackout, node, showModeAuto = false) {
  return (
    <>
      {node}
      {showModeAuto ? (
        <div
          style={{
            position: "fixed",
            bottom: "clamp(0.45rem, 1.8vh, 0.85rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            fontSize: "clamp(0.62rem, 1.15vw, 0.76rem)",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(226, 232, 240, 0.55)",
            pointerEvents: "none",
            textShadow: "0 1px 10px rgba(0,0,0,0.65)",
          }}
        >
          Mode automatique
        </div>
      ) : null}
      {blackout ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            background: "#000",
          }}
          aria-hidden
        />
      ) : null}
    </>
  );
}

/** VOTABLE vert, RÉSULTATS bleu, attente / autres gris */
function accentEcranLive(scene) {
  const s = String(scene || "").toLowerCase();
  if (s === "voting" || s === "question") return "#22c55e";
  if (s === "results") return "#3b82f6";
  return "#64748b";
}

/** @param {string | null | undefined} live */
function deriveDisplayFromLive(live) {
  const s = String(live || "").toLowerCase();
  if (s === "results") return "results";
  if (s === "voting") return "question";
  if (s === "paused") return "black";
  if (s === "finished") return "waiting";
  if (s === "waiting") return "waiting";
  return "waiting";
}

function roomOverlayAlpha(strength) {
  const s = String(strength || "").toLowerCase();
  if (s === "low") return 0.3;
  if (s === "strong") return 0.65;
  return 0.48;
}

/**
 * Projection salle : même flux live que /p/[slug], sans vote.
 * @param {{
 *   slugPublic: string;
 *   getPollUrl: () => string;
 *   onSurfaceChange?: (surface: "question" | "results" | "other") => void;
 * }} props
 */
export function ScreenProjection({ slugPublic, getPollUrl, onSurfaceChange }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [liveScene, setLiveScene] = useState(null);
  /** question | results | black | waiting — prioritaire sur liveScene legacy */
  const [displayState, setDisplayState] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [resultsBarsAnimated, setResultsBarsAnimated] = useState(false);
  /** Rafraîchit l’affichage du chrono chaque seconde quand il est actif */
  const [chronoTick, setChronoTick] = useState(0);
  /** Synchro régie : affichage discret sur /screen */
  const [modeAutoProjection, setModeAutoProjection] = useState(false);
  /** Branding salle (GET /events/slug + socket event:customization_updated) */
  const [roomCustomization, setRoomCustomization] = useState(null);

  const evenementInvalideRef = useRef(false);
  const loadPollAbortRef = useRef(null);
  const finChronoRefetchEffectueRef = useRef(false);
  const pollId = poll?.id ?? null;
  /** QUESTION → RESULTS : séquence fade → interstice → résultats */
  const prevDsRef = useRef(/** @type {string | null} */ (null));
  const barTransitionDelayMsRef = useRef(0);
  const [qToRPhase, setQToRPhase] = useState(
    /** @type {null | "fadeQ" | "inter" | "fadeR"} */ (null),
  );
  const [questionFadeOp, setQuestionFadeOp] = useState(1);
  const [resultsFadeOp, setResultsFadeOp] = useState(1);

  const applyEventSlugMeta = useCallback((meta) => {
    setEventId(meta.id);
    setLiveScene(meta.liveState ?? null);
    setDisplayState(
      typeof meta.displayState === "string"
        ? meta.displayState.toLowerCase()
        : deriveDisplayFromLive(meta.liveState),
    );
    setRoomCustomization({
      description: meta.description ?? null,
      logoUrl: meta.logoUrl ?? null,
      backgroundUrl: meta.backgroundUrl ?? null,
      primaryColor: meta.primaryColor ?? null,
      themeMode: meta.themeMode ?? null,
      backgroundOverlayStrength: meta.backgroundOverlayStrength ?? null,
    });
  }, []);

  const fetchEventSlugMeta = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      if (!slugPublic) return;
      try {
        const res = await fetch(
          `${API_URL}/events/slug/${encodeURIComponent(slugPublic)}`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          evenementInvalideRef.current = true;
          if (!silent) {
            setError("Événement introuvable.");
          }
          setEventId(null);
          setRoomCustomization(null);
          return;
        }
        if (!res.ok) {
          if (!silent) {
            setError(`Erreur ${res.status}`);
          }
          return;
        }
        const meta = await res.json();
        applyEventSlugMeta(meta);
      } catch {
        if (!silent) {
          setError("Impossible de joindre l’API (port 4000 ?).");
        }
      }
    },
    [slugPublic, applyEventSlugMeta],
  );

  useEffect(() => {
    if (!slugPublic) {
      evenementInvalideRef.current = false;
      return;
    }
    evenementInvalideRef.current = false;
    void fetchEventSlugMeta();
  }, [slugPublic, fetchEventSlugMeta]);

  const loadPoll = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;
      let signal = undefined;

      if (!silent) {
        loadPollAbortRef.current?.abort();
        const ac = new AbortController();
        loadPollAbortRef.current = ac;
        signal = ac.signal;

        setError(null);
        setInfoMessage(null);
        setLoading(true);
      }

      try {
        const res = await fetch(getPollUrl(), {
          cache: "no-store",
          signal,
        });

        if (signal?.aborted) return;

        if (res.status === 404) {
          setPoll(null);
          if (slugPublic && evenementInvalideRef.current) {
            return;
          }
          if (slugPublic) {
            setError(null);
            setInfoMessage(
              "En attente du direct — la régie affichera la prochaine question.",
            );
          } else {
            setError("Ce sondage n’existe pas ou n’est plus actif.");
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }
        const data = await res.json();

        if (signal?.aborted) return;

        if (data.eventLiveState) {
          setLiveScene(data.eventLiveState);
        } else if (data.status === "ACTIVE") {
          setLiveScene("voting");
        } else {
          setLiveScene("results");
        }
        if (typeof data.eventDisplayState === "string") {
          setDisplayState(data.eventDisplayState.toLowerCase());
        } else {
          setDisplayState(deriveDisplayFromLive(data.eventLiveState));
        }
        if (data.eventId) {
          setEventId(data.eventId);
        }
        setPoll(data);
        setInfoMessage(null);
      } catch (e) {
        if (e?.name === "AbortError") {
          return;
        }
        setPoll(null);
        setError(
          e.message ||
            "Impossible de charger le sondage (API sur le port 4000 ?)",
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [getPollUrl, slugPublic],
  );

  useEffect(() => {
    void loadPoll();
  }, [loadPoll]);

  const chronometreApi = poll?.questionTimer;
  useEffect(() => {
    if (!chronometreApi?.running || chronometreApi.isPaused) return;
    const id = setInterval(() => setChronoTick((k) => k + 1), 1000);
    return () => clearInterval(id);
  }, [
    chronometreApi?.running,
    chronometreApi?.isPaused,
    chronometreApi?.startedAt,
  ]);

  const secondesChronoVote = useMemo(() => {
    void chronoTick;
    return chronoRestantSecondes(chronometreApi ?? null);
  }, [chronometreApi, chronoTick]);

  const ds = displayState ?? deriveDisplayFromLive(liveScene);

  const enAttenteAutoReveal =
    !!poll &&
    ds !== "black" &&
    String(poll?.eventVoteState ?? "").toLowerCase() === "closed" &&
    ds !== "results" &&
    typeof poll?.autoRevealShowResultsAt === "string" &&
    new Date(poll.autoRevealShowResultsAt).getTime() > Date.now() - 800;

  useEffect(() => {
    if (!enAttenteAutoReveal) return;
    const id = setInterval(() => setChronoTick((k) => k + 1), 1000);
    return () => clearInterval(id);
  }, [enAttenteAutoReveal]);

  useEffect(() => {
    const prev = prevDsRef.current;
    if (
      poll &&
      prev === "question" &&
      ds === "results"
    ) {
      barTransitionDelayMsRef.current = 600;
      setQToRPhase("fadeQ");
      const t1 = setTimeout(() => setQToRPhase("inter"), 200);
      const t2 = setTimeout(() => setQToRPhase("fadeR"), 600);
      const t3 = setTimeout(() => {
        setQToRPhase(null);
        prevDsRef.current = "results";
      }, 900);
      /** Ne pas mettre prevDsRef à results avant la fin : sinon au re-run Strict Mode, prev !== question et la séquence ne redémarre pas, qToRPhase reste sur fadeQ avec opacité 0 (page blanche). */
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        setQToRPhase(null);
      };
    }
    if (ds !== "results") {
      setQToRPhase(null);
    }
    prevDsRef.current = ds;
  }, [ds, poll]);

  useLayoutEffect(() => {
    if (qToRPhase === "fadeQ") {
      setQuestionFadeOp(1);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setQuestionFadeOp(0));
      });
      return () => cancelAnimationFrame(id);
    }
    setQuestionFadeOp(1);
  }, [qToRPhase]);

  useLayoutEffect(() => {
    if (qToRPhase === "fadeR") {
      setResultsFadeOp(0);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setResultsFadeOp(1));
      });
      return () => cancelAnimationFrame(id);
    }
    if (qToRPhase === null && ds === "results") {
      setResultsFadeOp(1);
    }
  }, [qToRPhase, ds]);

  useEffect(() => {
    if (!onSurfaceChange) return;
    if (enAttenteAutoReveal) {
      onSurfaceChange("other");
      return;
    }
    const surface =
      ds === "results"
        ? "results"
        : ds === "question"
          ? "question"
          : "other";
    onSurfaceChange(surface);
  }, [ds, onSurfaceChange, enAttenteAutoReveal]);

  useEffect(() => {
    finChronoRefetchEffectueRef.current = false;
  }, [pollId]);

  useEffect(() => {
    if (ds !== "question" || poll?.status !== "ACTIVE") return;
    if (secondesChronoVote == null) return;
    if (secondesChronoVote >= 1) return;
    if (finChronoRefetchEffectueRef.current) return;
    finChronoRefetchEffectueRef.current = true;
    void loadPoll({ silent: true });
  }, [ds, poll?.status, secondesChronoVote, loadPoll]);

  useEffect(() => {
    return () => {
      loadPollAbortRef.current?.abort();
      loadPollAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    const eid = eventId;
    const pid = pollId;

    if (!eid && !pid) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    function rejoindreSalles() {
      if (eid) {
        socket.emit("screen:join", { eventId: eid });
        socket.emit("join_event", eid);
      }
      if (pid) socket.emit("join_poll", pid);
    }

    function onScreenUpdate(payload) {
      if (!payload || !eid || String(payload.eventId) !== String(eid)) return;
      if (typeof payload.displayState === "string") {
        setDisplayState(payload.displayState.toLowerCase());
      }
      const dsNow = String(payload.displayState || "").toLowerCase();
      if (dsNow !== "black") {
        void loadPoll({ silent: true });
      }
    }

    function onEventLiveUpdated(payload) {
      if (!payload || !eid || String(payload.eventId) !== String(eid)) {
        return;
      }
      loadPollAbortRef.current?.abort();
      setLoading(false);

      setLiveScene(payload.liveState ?? null);
      if (typeof payload.displayState === "string") {
        setDisplayState(payload.displayState.toLowerCase());
      } else {
        setDisplayState(deriveDisplayFromLive(payload.liveState));
      }

      if (payload.poll) {
        setPoll(payload.poll);
        if (payload.poll.eventLiveState) {
          setLiveScene(payload.poll.eventLiveState);
        }
        if (typeof payload.poll.eventDisplayState === "string") {
          setDisplayState(payload.poll.eventDisplayState.toLowerCase());
        }
        setError(null);
        setInfoMessage(null);
      } else {
        setPoll(null);
        setInfoMessage(libelleSceneAttente(payload.liveState ?? "") || null);
      }
    }

    function onPollUpdated(data) {
      if (!data?.id) return;
      setPoll((prev) => {
        if (prev && String(prev.id) === String(data.id)) {
          return data;
        }
        if (pid && String(pid) === String(data.id)) {
          return data;
        }
        return prev;
      });
      if (data.eventLiveState) {
        setLiveScene(data.eventLiveState);
      }
      if (typeof data.eventDisplayState === "string") {
        setDisplayState(data.eventDisplayState.toLowerCase());
      }
    }

    socket.on("connect", rejoindreSalles);
    if (socket.connected) {
      rejoindreSalles();
    }

    function onScreenAutoRotate(payload) {
      if (!eid || String(payload?.eventId) !== String(eid)) return;
      setModeAutoProjection(Boolean(payload?.enabled));
    }

    function onCustomizationUpdated(payload) {
      if (!payload?.eventId || String(payload.eventId) !== String(eid)) {
        return;
      }
      void fetchEventSlugMeta({ silent: true });
    }

    socket.on("event_live_updated", onEventLiveUpdated);
    socket.on("poll_updated", onPollUpdated);
    socket.on("screen:update", onScreenUpdate);
    socket.on("screen:auto_rotate", onScreenAutoRotate);
    socket.on("event:customization_updated", onCustomizationUpdated);

    return () => {
      if (eid) {
        socket.emit("screen:leave", { eventId: eid });
        socket.emit("leave_event", eid);
      }
      if (pid) socket.emit("leave_poll", pid);
      socket.off("connect", rejoindreSalles);
      socket.off("event_live_updated", onEventLiveUpdated);
      socket.off("poll_updated", onPollUpdated);
      socket.off("screen:update", onScreenUpdate);
      socket.off("screen:auto_rotate", onScreenAutoRotate);
      socket.off("event:customization_updated", onCustomizationUpdated);
      socket.disconnect();
    };
  }, [eventId, pollId, loadPoll, fetchEventSlugMeta]);

  const resultsVoteSignature =
    ds === "results" && poll
      ? (poll.options || [])
          .map(
            (o) =>
              `${String(o.id)}:${Number(o.voteCount ?? o.votes ?? 0) || 0}`,
          )
          .join("|")
      : "";

  useEffect(() => {
    if (ds !== "results") {
      setResultsBarsAnimated(false);
      return;
    }
    const voteOpenLive =
      String(poll?.eventVoteState ?? "").toLowerCase() === "open";
    if (!voteOpenLive) {
      setResultsBarsAnimated(true);
      return;
    }
    setResultsBarsAnimated(false);
    const delayMs = barTransitionDelayMsRef.current;
    barTransitionDelayMsRef.current = 0;
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setResultsBarsAnimated(true);
        });
      });
    }, delayMs);
    return () => clearTimeout(t);
  }, [ds, pollId, resultsVoteSignature, poll?.eventVoteState]);

  const voteOuvert = ds === "question" && poll?.status === "ACTIVE";
  const voteOuvertResultats =
    String(poll?.eventVoteState ?? "").toLowerCase() === "open";

  const barreEtat = accentEcranLive(ds === "question" ? "voting" : ds);

  const roomTopAccent = useMemo(() => {
    const pc = roomCustomization?.primaryColor;
    if (typeof pc === "string" && /^#[0-9A-Fa-f]{6}$/.test(pc)) {
      return pc;
    }
    return barreEtat;
  }, [roomCustomization?.primaryColor, barreEtat]);

  const shell = useMemo(
    () => ({
      minHeight: "100vh",
      maxHeight: "100vh",
      boxSizing: "border-box",
      padding: "clamp(2.25rem, 5.5vw, 4.5rem)",
      fontFamily:
        'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      background: "#0c1222",
      color: "#e2e8f0",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      borderTop: `5px solid ${roomTopAccent}`,
      overflow: "hidden",
      position: "relative",
      zIndex: 1,
      transition: "border-color 0.35s ease",
    }),
    [roomTopAccent],
  );

  const ambientBg = useMemo(() => {
    const url = roomCustomization?.backgroundUrl;
    if (!url || typeof url !== "string" || !url.trim()) return null;
    const oa = roomOverlayAlpha(roomCustomization?.backgroundOverlayStrength);
    return (
      <>
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${url.trim()})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transition: "opacity 0.35s ease",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            background: `rgba(0,0,0,${oa})`,
            transition: "opacity 0.35s ease",
          }}
        />
      </>
    );
  }, [
    roomCustomization?.backgroundUrl,
    roomCustomization?.backgroundOverlayStrength,
  ]);

  const wrap = (blackoutFlag, node) =>
    wrapWithBlackout(blackoutFlag, node, modeAutoProjection);

  const wrapOut = (blackoutFlag, node) => (
    <>
      {ambientBg}
      {wrap(blackoutFlag, node)}
    </>
  );

  if (loading) {
    return wrapOut(
      ds === "black",
      <main style={shell}>
        <p style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: "#94a3b8" }}>
          Chargement…
        </p>
      </main>,
    );
  }

  if (error) {
    return wrapOut(
      ds === "black",
      <main style={shell}>
        <p
          style={{
            fontSize: "clamp(1.25rem, 3vw, 2rem)",
            color: "#fca5a5",
          }}
          role="alert"
        >
          {error}
        </p>
      </main>,
    );
  }

  if (!poll && infoMessage) {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 6vw, 4rem)",
            fontWeight: 700,
            lineHeight: 1.25,
            maxWidth: "28ch",
            margin: "0 auto",
            color: "#cbd5e1",
          }}
        >
          {infoMessage}
        </p>
      </main>,
    );
  }

  /** États plein écran sans poll actif */
  if (
    !poll &&
    (ds === "waiting" ||
      liveScene === "finished" ||
      liveScene === "paused" ||
      ds === "black")
  ) {
    const text = libelleSceneAttente(
      liveScene === "finished" ? "finished" : ds === "black" ? "paused" : "waiting",
    );
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 7vw, 5rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: "20ch",
            margin: "0 auto",
          }}
        >
          {text || "…"}
        </p>
      </main>,
    );
  }

  if (!poll) {
    return wrapOut(
      ds === "black",
      <main style={{ ...shell, justifyContent: "center", textAlign: "center" }}>
        <p style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: "#94a3b8" }}>
          Aucun contenu à afficher pour l’instant.
        </p>
      </main>,
    );
  }

  if (enAttenteAutoReveal) {
    const shellAuto = {
      ...shell,
      borderTop: "5px solid #14b8a6",
    };
    return wrapOut(
      false,
      <ScreenAutoRevealWait
        shell={shellAuto}
        untilIso={poll.autoRevealShowResultsAt}
        chronoTick={chronoTick}
      />,
    );
  }

  if (ds === "waiting" && liveScene !== "finished") {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 7vw, 5rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: "22ch",
            margin: "0 auto",
          }}
        >
          {libelleSceneAttente("waiting")}
        </p>
      </main>,
    );
  }

  if (liveScene === "finished") {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 7vw, 5rem)",
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {libelleSceneAttente("finished")}
        </p>
      </main>,
    );
  }

  if (liveScene === "paused" && ds !== "black") {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "clamp(2rem, 6vw, 4rem)",
            fontWeight: 600,
            color: "#94a3b8",
          }}
        >
          {libelleSceneAttente("paused")}
        </p>
      </main>,
    );
  }

  if (poll && ds === "results" && qToRPhase === "fadeQ") {
    const shellVote = {
      ...shell,
      borderTop: `5px solid ${accentEcranLive("voting")}`,
    };
    return wrapOut(
      ds === "black",
      <div
        style={{
          opacity: questionFadeOp,
          transition: "opacity 200ms ease-out",
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScreenQuestion
          shell={shellVote}
          poll={poll}
          chronometreApi={chronometreApi}
          chronoTick={chronoTick}
          voteOuvert={
            poll?.status === "ACTIVE" &&
            (ds === "question" || qToRPhase === "fadeQ")
          }
          joinSlug={slugPublic}
        />
      </div>,
    );
  }

  if (poll && qToRPhase === "inter") {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(1.75rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: "-0.02em",
          }}
        >
          Calcul des résultats…
        </p>
      </main>,
    );
  }

  if (ds === "results") {
    const fadeResults =
      qToRPhase === "fadeR"
        ? {
            opacity: resultsFadeOp,
            transition: "opacity 300ms ease-out",
          }
        : {};
    return wrapOut(
      ds === "black",
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          ...fadeResults,
        }}
      >
        <ScreenResults
          shell={shell}
          poll={poll}
          chronometreApi={chronometreApi}
          chronoTick={chronoTick}
          voteOuvertResultats={voteOuvertResultats}
          barsAnimated={resultsBarsAnimated}
        />
      </div>,
    );
  }

  return wrapOut(
    ds === "black",
    <ScreenQuestion
      shell={shell}
      poll={poll}
      chronometreApi={chronometreApi}
      chronoTick={chronoTick}
      voteOuvert={voteOuvert}
      joinSlug={slugPublic}
    />,
  );
}
