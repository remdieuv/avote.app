"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { ScreenAutoRevealWait } from "./ScreenAutoRevealWait";
import { ScreenQuestion } from "./ScreenQuestion";
import { ScreenResults } from "./ScreenResults";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { API_URL, SOCKET_URL } from "@/lib/config";
import {
  LIVE_UX_DETAIL_SCREEN_WAITING_SLUG,
  getUxState,
  getLiveStatePresentation,
  getLiveStateTone,
} from "@/lib/liveStateUx";
import {
  getLiveStateVisualTokens,
  screenShellTopBorderStyle,
  screenStateSubtitleOpacity,
  screenStateTitleFontSizeClamp,
} from "@/lib/liveStateVisual";

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
  const searchParams = useSearchParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** GET /p/:slug → 404 alors que le slug événement est valide (contenu pas encore servi). */
  const [noPollFromHttp404, setNoPollFromHttp404] = useState(false);
  const [eventActivePollId, setEventActivePollId] = useState(
    /** @type {string | null} */ (null),
  );
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
  /** Vote / auto-reveal événement quand le JSON poll n’est pas affiché (socket, meta slug). */
  const [eventVoteState, setEventVoteState] = useState(
    /** @type {string | null} */ (null),
  );
  const [eventAutoReveal, setEventAutoReveal] = useState(false);
  const [eventAutoRevealAt, setEventAutoRevealAt] = useState(
    /** @type {string | null} */ (null),
  );

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
  const projectionMode = useMemo(() => {
    const raw = String(searchParams?.get("pm") || "standard")
      .trim()
      .toLowerCase();
    if (raw === "xlarge_qr" || raw === "qr_fullscreen" || raw === "results_focus") return raw;
    return "standard";
  }, [searchParams]);
  const projectionModeHint =
    projectionMode === "qr_fullscreen"
      ? "Mode: QR plein écran"
      :
    projectionMode === "xlarge_qr"
      ? "Mode: Grande salle"
      : projectionMode === "results_focus"
        ? "Mode: Résultats focus"
        : null;
  const isModeQrFullscreen = projectionMode === "qr_fullscreen";
  const isModeXlargeQr = projectionMode === "xlarge_qr";
  const isModeResultsFocus = projectionMode === "results_focus";

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
      logoUrl: resolveApiAssetUrlNullable(meta.logoUrl),
      backgroundUrl: resolveApiAssetUrlNullable(meta.backgroundUrl),
      primaryColor: meta.primaryColor ?? null,
      themeMode: meta.themeMode ?? null,
      backgroundOverlayStrength: meta.backgroundOverlayStrength ?? null,
    });
    if (typeof meta.voteState === "string" && meta.voteState.trim()) {
      setEventVoteState(meta.voteState.toLowerCase());
    }
    if (typeof meta.autoReveal === "boolean") {
      setEventAutoReveal(meta.autoReveal);
    }
    if (meta.autoRevealShowResultsAt != null) {
      setEventAutoRevealAt(
        typeof meta.autoRevealShowResultsAt === "string"
          ? meta.autoRevealShowResultsAt
          : null,
      );
    } else {
      setEventAutoRevealAt(null);
    }
    if (typeof meta.activePollId === "string" && meta.activePollId.trim()) {
      setEventActivePollId(meta.activePollId.trim());
    } else {
      setEventActivePollId(null);
    }
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
          setEventVoteState(null);
          setEventAutoReveal(false);
          setEventAutoRevealAt(null);
          setEventActivePollId(null);
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
        setNoPollFromHttp404(false);
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
            setNoPollFromHttp404(true);
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
        if (typeof data.eventVoteState === "string" && data.eventVoteState.trim()) {
          setEventVoteState(data.eventVoteState.toLowerCase());
        }
        if (typeof data.autoReveal === "boolean") {
          setEventAutoReveal(data.autoReveal);
        }
        if (data.autoRevealShowResultsAt != null) {
          setEventAutoRevealAt(
            typeof data.autoRevealShowResultsAt === "string"
              ? data.autoRevealShowResultsAt
              : null,
          );
        } else {
          setEventAutoRevealAt(null);
        }
        setNoPollFromHttp404(false);
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

  const voteStatePourAttente = useMemo(() => {
    const p = poll?.eventVoteState;
    if (typeof p === "string" && p.trim()) return p.toLowerCase();
    if (typeof eventVoteState === "string" && eventVoteState.trim()) {
      return eventVoteState.toLowerCase();
    }
    /** Si l’API / socket omet eventVoteState, le statut du sondage suffit après fin de chrono (CLOSED). */
    const st = poll?.status;
    if (typeof st === "string") {
      const u = st.toUpperCase();
      if (u === "CLOSED") return "closed";
      if (u === "ACTIVE") return "open";
    }
    return null;
  }, [poll?.eventVoteState, poll?.status, eventVoteState]);

  const autoRevealUntilIso = useMemo(() => {
    if (poll && typeof poll.autoRevealShowResultsAt === "string") {
      return poll.autoRevealShowResultsAt;
    }
    if (!poll && eventAutoReveal && typeof eventAutoRevealAt === "string") {
      return eventAutoRevealAt;
    }
    return null;
  }, [poll, poll?.autoRevealShowResultsAt, eventAutoReveal, eventAutoRevealAt]);

  const projectionUxCtx = useMemo(
    () => ({
      liveScene,
      displayState: ds,
      voteState: voteStatePourAttente,
      pollStatus: poll?.status ?? null,
      hasActivePoll: Boolean(poll?.id ?? eventActivePollId),
      autoReveal: poll ? Boolean(poll.autoReveal) : eventAutoReveal,
      autoRevealShowResultsAt: autoRevealUntilIso,
    }),
    [
      liveScene,
      ds,
      voteStatePourAttente,
      poll?.id,
      poll?.status,
      poll?.autoReveal,
      eventActivePollId,
      eventAutoReveal,
      autoRevealUntilIso,
    ],
  );

  const projectionPres = useMemo(
    () => getLiveStatePresentation(projectionUxCtx),
    [projectionUxCtx],
  );
  const ux = useMemo(
    () =>
      getUxState({
        liveState: liveScene,
        voteState: voteStatePourAttente,
        displayState: ds,
      }),
    [liveScene, voteStatePourAttente, ds],
  );

  const screenTone = getLiveStateTone(projectionPres.ux);
  const screenTok = useMemo(
    () => getLiveStateVisualTokens(screenTone, "screen"),
    [screenTone],
  );

  const screenStateSubStyle = useMemo(
    () => ({
      margin: "clamp(0.75rem, 2vw, 1.25rem) auto 0",
      fontSize: `clamp(${1 * screenTok.titleClampMul}rem, ${2.5 * screenTok.titleClampMul}vw, ${1.35 * screenTok.titleClampMul}rem)`,
      fontWeight: screenTone === "highlight" ? 600 : 500,
      lineHeight: 1.4,
      maxWidth: "36ch",
      color: `rgba(226, 232, 240, ${screenStateSubtitleOpacity(screenTone)})`,
    }),
    [screenTok, screenTone],
  );

  const screenTitleStyle = useMemo(
    () => ({
      ...screenStateTitleFontSizeClamp(screenTok),
      fontWeight:
        screenTone === "soft"
          ? 600
          : screenTone === "dynamic" || screenTone === "highlight"
            ? 800
            : 700,
      lineHeight: 1.2,
      maxWidth: "22ch",
      margin: "0 auto",
      color:
        screenTone === "highlight"
          ? "#f8fafc"
          : screenTone === "soft"
            ? "#94a3b8"
            : "#e2e8f0",
    }),
    [screenTok, screenTone],
  );

  const screenTitleStyleLarge = useMemo(
    () => ({
      ...screenStateTitleFontSizeClamp(screenTok),
      fontWeight:
        screenTone === "soft"
          ? 600
          : screenTone === "dynamic" || screenTone === "highlight"
            ? 800
            : 700,
      lineHeight: 1.25,
      maxWidth: "28ch",
      margin: "0 auto",
      color: "#cbd5e1",
    }),
    [screenTok, screenTone],
  );

  const enAttenteAutoReveal =
    ds !== "black" &&
    ds !== "results" &&
    String(voteStatePourAttente ?? "").toLowerCase() === "closed" &&
    typeof autoRevealUntilIso === "string" &&
    new Date(autoRevealUntilIso).getTime() > Date.now() - 800;

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

      if (typeof payload.voteState === "string" && payload.voteState.trim()) {
        setEventVoteState(payload.voteState.toLowerCase());
      }
      if (typeof payload.autoReveal === "boolean") {
        setEventAutoReveal(payload.autoReveal);
      }
      if (payload.autoRevealShowResultsAt != null) {
        setEventAutoRevealAt(
          typeof payload.autoRevealShowResultsAt === "string"
            ? payload.autoRevealShowResultsAt
            : null,
        );
      } else {
        setEventAutoRevealAt(null);
      }

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
        setNoPollFromHttp404(false);
        if (payload.activePollId != null && String(payload.activePollId).trim()) {
          setEventActivePollId(String(payload.activePollId).trim());
        } else if (payload.poll?.id) {
          setEventActivePollId(String(payload.poll.id));
        }
      } else {
        setPoll(null);
        setNoPollFromHttp404(false);
        if (payload.activePollId != null && String(payload.activePollId).trim()) {
          setEventActivePollId(String(payload.activePollId).trim());
        } else {
          setEventActivePollId(null);
        }
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
      if (typeof data.eventVoteState === "string" && data.eventVoteState.trim()) {
        setEventVoteState(data.eventVoteState.toLowerCase());
      }
      if (typeof data.autoReveal === "boolean") {
        setEventAutoReveal(data.autoReveal);
      }
      if (data.autoRevealShowResultsAt != null) {
        setEventAutoRevealAt(
          typeof data.autoRevealShowResultsAt === "string"
            ? data.autoRevealShowResultsAt
            : null,
        );
      } else {
        setEventAutoRevealAt(null);
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

  const voteOuvert =
    ds === "question" &&
    String(poll?.eventVoteState ?? "").toLowerCase() === "open";
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
      ...screenShellTopBorderStyle(roomTopAccent, screenTok),
      overflow: "hidden",
      position: "relative",
      zIndex: 1,
      transition: "border-color 0.35s ease, border-width 0.35s ease",
    }),
    [roomTopAccent, screenTok],
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
      {projectionModeHint ? (
        <div
          style={{
            position: "fixed",
            top: "clamp(0.55rem, 1.6vh, 0.85rem)",
            right: "clamp(0.6rem, 1.8vw, 1rem)",
            zIndex: 92,
            fontSize: "clamp(0.62rem, 1.05vw, 0.72rem)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "rgba(226, 232, 240, 0.92)",
            padding: "0.2rem 0.45rem",
            borderRadius: "999px",
            background: "rgba(15, 23, 42, 0.34)",
            border: "1px solid rgba(148, 163, 184, 0.26)",
            pointerEvents: "none",
          }}
        >
          {projectionModeHint}
        </div>
      ) : null}
      {!poll || (ds !== "question" && ds !== "results") ? (
        <div
          className="text-center text-sm opacity-80 mb-2"
          style={{
            position: "fixed",
            top: "clamp(0.6rem, 2vh, 1rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            textAlign: "center",
            fontSize: "clamp(0.76rem, 1.3vw, 0.88rem)",
            opacity: 0.82,
            color: "rgba(226, 232, 240, 0.9)",
            padding: "0.3rem 0.65rem",
            borderRadius: "999px",
            background: "rgba(15, 23, 42, 0.38)",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            pointerEvents: "none",
          }}
        >
          {ux.label}
        </div>
      ) : null}
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

  if (!poll && noPollFromHttp404) {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p style={screenTitleStyleLarge}>{projectionPres.title}</p>
        {projectionPres.subtitle ? (
          <p style={screenStateSubStyle}>{projectionPres.subtitle}</p>
        ) : (
          <p style={screenStateSubStyle}>
            {LIVE_UX_DETAIL_SCREEN_WAITING_SLUG}
          </p>
        )}
      </main>,
    );
  }

  if (enAttenteAutoReveal) {
    const autoAccent = `color-mix(in srgb, #14b8a6 50%, ${roomTopAccent})`;
    const shellAuto = {
      ...shell,
      ...screenShellTopBorderStyle(autoAccent, screenTok),
    };
    return wrapOut(
      false,
      <ScreenAutoRevealWait
        shell={shellAuto}
        untilIso={autoRevealUntilIso}
        chronoTick={chronoTick}
      />,
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
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p style={screenTitleStyle}>{projectionPres.title}</p>
        {projectionPres.subtitle ? (
          <p style={screenStateSubStyle}>{projectionPres.subtitle}</p>
        ) : null}
      </main>,
    );
  }

  if (!poll) {
    return wrapOut(
      ds === "black",
      <main
        style={{
          ...shell,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p style={screenTitleStyle}>{projectionPres.title}</p>
        {projectionPres.subtitle ? (
          <p style={screenStateSubStyle}>{projectionPres.subtitle}</p>
        ) : null}
      </main>,
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
        <p style={screenTitleStyle}>{projectionPres.title}</p>
        {projectionPres.subtitle ? (
          <p style={screenStateSubStyle}>{projectionPres.subtitle}</p>
        ) : null}
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
        <p style={screenTitleStyle}>{projectionPres.title}</p>
        {projectionPres.subtitle ? (
          <p style={screenStateSubStyle}>{projectionPres.subtitle}</p>
        ) : null}
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
        <p style={screenTitleStyle}>{projectionPres.title}</p>
        {projectionPres.subtitle ? (
          <p style={screenStateSubStyle}>{projectionPres.subtitle}</p>
        ) : null}
      </main>,
    );
  }

  if (poll && ds === "results" && qToRPhase === "fadeQ") {
    const shellVote = {
      ...shell,
      ...screenShellTopBorderStyle(
        roomTopAccent,
        getLiveStateVisualTokens("dynamic", "screen"),
      ),
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
          qrScale={isModeQrFullscreen ? 2 : isModeXlargeQr ? 1.35 : isModeResultsFocus ? 0.82 : 1}
          compactQuestionText={isModeQrFullscreen || isModeXlargeQr || isModeResultsFocus}
          fullScreenQr={isModeQrFullscreen}
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
      qrScale={isModeQrFullscreen ? 2 : isModeXlargeQr ? 1.35 : isModeResultsFocus ? 0.82 : 1}
      compactQuestionText={isModeQrFullscreen || isModeXlargeQr || isModeResultsFocus}
      fullScreenQr={isModeQrFullscreen}
    />,
  );
}
