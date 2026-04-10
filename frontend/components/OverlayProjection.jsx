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
import { QRCodeSVG } from "qrcode.react";
import { formatCountdownVerbose } from "@/lib/chronoFormat";
import { API_URL, SOCKET_URL } from "@/lib/config";
import {
  LIVE_UX_DETAIL_SCREEN_WAITING_SLUG,
  getUxState,
} from "@/lib/liveStateUx";

const FADE_MS = 260;

/** @param {string} search */
export function parseOverlayQuery(search) {
  const raw = search.startsWith("?") ? search : `?${search}`;
  const params = new URLSearchParams(
    raw === "?" ? "" : raw.slice(1),
  );

  const modeRaw = (params.get("mode") || "auto").toLowerCase();
  const modeOverride = ["question", "results", "auto"].includes(modeRaw)
    ? modeRaw
    : "auto";

  const variantRaw = (params.get("variant") || "standard").toLowerCase();
  const variant = [
    "compact",
    "standard",
    "large",
    "minimal",
  ].includes(variantRaw)
    ? variantRaw
    : "standard";

  const qrRaw = params.get("qr");
  /** minimal : pas de QR par défaut ; sinon `qr=1` / `qr=0` explicite. */
  let showQR;
  if (qrRaw === "0" || qrRaw === "false") {
    showQR = false;
  } else if (qrRaw === "1" || qrRaw === "true") {
    showQR = true;
  } else {
    showQR = variant !== "minimal";
  }

  const themeRaw = (params.get("theme") || "dark").toLowerCase();
  const theme = themeRaw === "light" ? "light" : "dark";

  const positionRaw = (params.get("position") || "center").toLowerCase();
  const position = ["tl", "tr", "bl", "br", "center"].includes(positionRaw)
    ? positionRaw
    : "center";

  const onlyRaw = (params.get("only") || "").toLowerCase();
  const onlyQr = onlyRaw === "qr";

  return { modeOverride, variant, showQR, theme, position, onlyQr };
}

/** @type {Record<string, { maxWidth: number; maxResults: number; qrQuestion: number; qrResults: number; pad: string; questionRem: string; headerRem: string; rowRem: string; barH: number; chronoRem: string; gap: string; revealTitleRem: string; revealCountRem: string; muted: string }>} */
const VARIANT = {
  compact: {
    maxWidth: 360,
    maxResults: 3,
    qrQuestion: 58,
    qrResults: 46,
    pad: "0.65rem 0.75rem",
    questionRem: "0.82rem",
    headerRem: "0.62rem",
    rowRem: "0.7rem",
    barH: 5,
    chronoRem: "0.68rem",
    gap: "0.5rem",
    revealTitleRem: "0.58rem",
    revealCountRem: "0.92rem",
    muted: "0.65rem",
  },
  standard: {
    maxWidth: 560,
    maxResults: 5,
    qrQuestion: 78,
    qrResults: 56,
    pad: "0.85rem 1rem",
    questionRem: "0.95rem",
    headerRem: "0.72rem",
    rowRem: "0.78rem",
    barH: 6,
    chronoRem: "0.75rem",
    gap: "0.75rem",
    revealTitleRem: "0.65rem",
    revealCountRem: "1rem",
    muted: "0.72rem",
  },
  large: {
    maxWidth: 780,
    maxResults: 5,
    qrQuestion: 104,
    qrResults: 72,
    pad: "1.05rem 1.2rem",
    questionRem: "1.08rem",
    headerRem: "0.78rem",
    rowRem: "0.88rem",
    barH: 8,
    chronoRem: "0.92rem",
    gap: "0.95rem",
    revealTitleRem: "0.72rem",
    revealCountRem: "1.2rem",
    muted: "0.78rem",
  },
  minimal: {
    maxWidth: 320,
    maxResults: 3,
    qrQuestion: 48,
    qrResults: 40,
    pad: "0.5rem 0.58rem",
    questionRem: "0.76rem",
    headerRem: "0.55rem",
    rowRem: "0.65rem",
    barH: 4,
    chronoRem: "0.62rem",
    gap: "0.4rem",
    revealTitleRem: "0.52rem",
    revealCountRem: "0.82rem",
    muted: "0.6rem",
  },
};

/** @param {"dark" | "light"} theme */
function glassTheme(theme) {
  if (theme === "light") {
    return {
      background: "rgba(255,255,255,0.78)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderRadius: "16px",
      border: "1px solid rgba(15,23,42,0.1)",
      boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
      text: "#0f172a",
      textMuted: "#475569",
      accent: "#1d4ed8",
      accentSoft: "#3b82f6",
      teal: "#0d9488",
      tealBright: "#0f766e",
      qrBg: "#ffffff",
      qrFg: "#0f172a",
      barTrack: "rgba(15,23,42,0.12)",
    };
  }
  return {
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    accent: "#93c5fd",
    accentSoft: "#60a5fa",
    teal: "#5eead4",
    tealBright: "#2dd4bf",
    qrBg: "rgba(255,255,255,0.95)",
    qrFg: "#0f172a",
    barTrack: "rgba(255,255,255,0.12)",
  };
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

function contestEligibleCountFromPoll(poll) {
  const opts = Array.isArray(poll?.options) ? poll.options : [];
  const triggerId = String(poll?.leadTriggerOptionId || "");
  if (!triggerId) return 0;
  const trigger = opts.find((o) => String(o?.id || "") === triggerId);
  return Number(trigger?.voteCount ?? trigger?.votes ?? 0) || 0;
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

/**
 * @param {{
 *   modeOverride: string;
 *   ds: string;
 *   enAttenteAutoReveal: boolean;
 *   liveScene: string | null;
 * }} arg
 */
function computeEffectivePanel({
  modeOverride,
  ds,
  enAttenteAutoReveal,
  liveScene,
}) {
  if (ds === "black") return "empty";

  if (modeOverride === "results") return "results";
  if (modeOverride === "question") return "question";

  if (enAttenteAutoReveal) return "reveal";
  if (ds === "results") return "results";
  if (liveScene === "finished" || liveScene === "paused") return "empty";
  if (ds === "waiting" && liveScene !== "finished") return "empty";
  return "question";
}

/**
 * Overlay transparent pour OBS / stream / conférence.
 * Query : mode, variant, qr, theme, position, only=qr (QR seul, lien /join)
 * @param {{
 *   slugPublic: string;
 *   getPollUrl: () => string;
 * }} props
 */
export function OverlayProjection({ slugPublic, getPollUrl }) {
  const searchParams = useSearchParams();

  const { modeOverride, variant, showQR, theme, position, onlyQr } = useMemo(
    () => parseOverlayQuery(searchParams?.toString() ?? ""),
    [searchParams],
  );

  const v = VARIANT[variant] ?? VARIANT.standard;

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayNoPoll404, setOverlayNoPoll404] = useState(false);
  const [liveScene, setLiveScene] = useState(null);
  const [displayState, setDisplayState] = useState(null);
  const [eventId, setEventId] = useState(null);
  /** Couleur d’accent événement (#RRGGBB) pour le verre overlay */
  const [eventPrimaryHex, setEventPrimaryHex] = useState(null);

  const th = useMemo(() => {
    const base = glassTheme(theme);
    if (
      typeof eventPrimaryHex === "string" &&
      /^#[0-9A-Fa-f]{6}$/.test(eventPrimaryHex)
    ) {
      return {
        ...base,
        accent: eventPrimaryHex,
        accentSoft: eventPrimaryHex,
      };
    }
    return base;
  }, [theme, eventPrimaryHex]);
  const [chronoTick, setChronoTick] = useState(0);
  const [joinUrl, setJoinUrl] = useState("");
  const [panelOpacity, setPanelOpacity] = useState(1);
  const [resultsBarsAnimated, setResultsBarsAnimated] = useState(false);
  const [contestWinners, setContestWinners] = useState([]);

  const evenementInvalideRef = useRef(false);
  const loadPollAbortRef = useRef(null);
  const finChronoRefetchEffectueRef = useRef(false);
  const panelFadeSkipRef = useRef(true);
  const pollId = poll?.id ?? null;

  useEffect(() => {
    if (typeof window === "undefined" || !slugPublic) return;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, [slugPublic]);

  useEffect(() => {
    if (typeof window === "undefined" || !slugPublic) return;
    setJoinUrl(
      `${window.location.origin}/join/${encodeURIComponent(slugPublic)}`,
    );
  }, [slugPublic]);

  const applyEventSlugMeta = useCallback((meta) => {
    setEventId(meta.id);
    setLiveScene(meta.liveState ?? null);
    setDisplayState(
      typeof meta.screenDisplayState === "string"
        ? meta.screenDisplayState.toLowerCase()
        : typeof meta.displayState === "string"
          ? meta.displayState.toLowerCase()
        : deriveDisplayFromLive(meta.liveState),
    );
    const pc = meta.primaryColor;
    setEventPrimaryHex(
      typeof pc === "string" && /^#[0-9A-Fa-f]{6}$/.test(pc) ? pc : null,
    );
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
          setEventPrimaryHex(null);
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
          setError("Impossible de joindre l’API.");
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
        setOverlayNoPoll404(false);
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
            setOverlayNoPoll404(true);
          } else {
            setError("Sondage introuvable.");
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
        setOverlayNoPoll404(false);
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
      if (typeof payload.screenDisplayState === "string") {
        setDisplayState(payload.screenDisplayState.toLowerCase());
      } else if (typeof payload.displayState === "string") {
        setDisplayState(payload.displayState.toLowerCase());
      } else {
        setDisplayState(deriveDisplayFromLive(payload.liveState));
      }

      if (payload.poll) {
        setPoll(payload.poll);
        if (payload.poll.eventLiveState) {
          setLiveScene(payload.poll.eventLiveState);
        }
        if (typeof payload.poll.eventScreenDisplayState === "string") {
          setDisplayState(payload.poll.eventScreenDisplayState.toLowerCase());
        } else if (typeof payload.poll.eventDisplayState === "string") {
          setDisplayState(payload.poll.eventDisplayState.toLowerCase());
        }
        setError(null);
        setOverlayNoPoll404(false);
      } else {
        setPoll(null);
        setOverlayNoPoll404(false);
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
      if (typeof data.eventScreenDisplayState === "string") {
        setDisplayState(data.eventScreenDisplayState.toLowerCase());
      } else if (typeof data.eventDisplayState === "string") {
        setDisplayState(data.eventDisplayState.toLowerCase());
      }
    }

    socket.on("connect", rejoindreSalles);
    if (socket.connected) {
      rejoindreSalles();
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
      socket.off("event:customization_updated", onCustomizationUpdated);
      socket.disconnect();
    };
  }, [eventId, pollId, loadPoll, fetchEventSlugMeta]);

  const effectivePanel = useMemo(
    () =>
      computeEffectivePanel({
        modeOverride,
        ds,
        enAttenteAutoReveal,
        liveScene,
      }),
    [modeOverride, ds, enAttenteAutoReveal, liveScene],
  );

  useEffect(() => {
    const isContest = String(poll?.type || "").toUpperCase() === "CONTEST_ENTRY";
    if (!isContest || !poll?.id || !poll?.eventSlug) {
      setContestWinners([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ pollId: String(poll.id) });
        const res = await fetch(
          `${API_URL}/p/${encodeURIComponent(poll.eventSlug)}/contest-status?${qs.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || cancelled) return;
        setContestWinners(Array.isArray(data.winners) ? data.winners : []);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poll?.id, poll?.eventSlug, poll?.options]);
  const overlayVoteState = useMemo(() => {
    if (typeof poll?.eventVoteState === "string" && poll.eventVoteState.trim()) {
      return poll.eventVoteState;
    }
    return null;
  }, [poll?.eventVoteState]);
  const overlayUx = useMemo(
    () =>
      getUxState({
        liveState: liveScene,
        voteState: overlayVoteState,
        displayState: ds,
      }),
    [liveScene, overlayVoteState, ds],
  );

  const fadeKey = `${effectivePanel}|${pollId}|${variant}|${theme}|${position}|only:${onlyQr ? "qr" : "0"}|brand:${eventPrimaryHex || ""}`;

  useLayoutEffect(() => {
    if (panelFadeSkipRef.current) {
      panelFadeSkipRef.current = false;
      return;
    }
    setPanelOpacity(0);
    const t = window.setTimeout(() => setPanelOpacity(1), FADE_MS);
    return () => window.clearTimeout(t);
  }, [fadeKey]);

  const voteOuvert =
    ds === "question" &&
    String(poll?.eventVoteState ?? "").toLowerCase() === "open";
  const voteOuvertResultats =
    String(poll?.eventVoteState ?? "").toLowerCase() === "open";

  const questionText =
    (poll?.question && poll.question !== poll?.title
      ? poll.question
      : null) ||
    poll?.title ||
    poll?.question ||
    "";

  const topOptions = useMemo(() => {
    if (!poll?.options?.length) return [];
    return [...poll.options]
      .sort(
        (a, b) =>
          (Number(b.voteCount ?? b.votes ?? 0) || 0) -
          (Number(a.voteCount ?? a.votes ?? 0) || 0),
      )
      .slice(0, v.maxResults);
  }, [poll?.options, v.maxResults]);

  const totalVotesResults = useMemo(() => {
    if (!poll?.options?.length) return 0;
    return poll.options.reduce(
      (sum, o) => sum + (Number(o.voteCount ?? o.votes ?? 0) || 0),
      0,
    );
  }, [poll?.options]);

  const maxTop = useMemo(() => {
    if (!topOptions.length) return 0;
    return Math.max(
      ...topOptions.map((o) => Number(o.voteCount ?? o.votes ?? 0) || 0),
    );
  }, [topOptions]);

  const resultsVoteSignature =
    effectivePanel === "results" && poll
      ? (poll.options || [])
          .map(
            (o) =>
              `${String(o.id)}:${Number(o.voteCount ?? o.votes ?? 0) || 0}`,
          )
          .join("|")
      : "";

  useEffect(() => {
    if (effectivePanel !== "results") {
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
    const t = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setResultsBarsAnimated(true));
      });
    }, 120);
    return () => window.clearTimeout(t);
  }, [effectivePanel, pollId, resultsVoteSignature, poll?.eventVoteState]);

  const shell = useMemo(() => {
    const base = {
      boxSizing: "border-box",
      fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
      color: th.text,
      background: "transparent",
    };
    if (position === "center") {
      return {
        ...base,
        minHeight: "100vh",
        width: "100%",
        padding: "0.75rem",
        display: "flex",
        alignItems: variant === "large" ? "center" : "flex-start",
        justifyContent: "center",
      };
    }
    return {
      ...base,
      position: "fixed",
      zIndex: 2147483000,
      margin: 0,
      padding: 0,
      minHeight: 0,
      top: position === "tl" || position === "tr" ? 16 : undefined,
      bottom: position === "bl" || position === "br" ? 16 : undefined,
      left: position === "tl" || position === "bl" ? 16 : undefined,
      right: position === "tr" || position === "br" ? 16 : undefined,
    };
  }, [th.text, position, variant]);

  const shellEmptyTransparent = useMemo(
    () => ({
      ...shell,
      minHeight: position === "center" ? "100vh" : 0,
    }),
    [shell, position],
  );

  const qrSoloPixelSize = Math.round(v.qrQuestion * 1.22);

  const wrapGlass = (children, opts = {}) => {
    const centered = opts.centered === true;
    const qrOnly = opts.qrOnly === true;
    return (
      <div
        style={{
          width: "100%",
          maxWidth: qrOnly
            ? `min(${qrSoloPixelSize + 28}px, 100%)`
            : `min(${v.maxWidth}px, 100%)`,
          background: th.background,
          backdropFilter: th.backdropFilter,
          WebkitBackdropFilter: th.WebkitBackdropFilter,
          borderRadius: th.borderRadius,
          border: th.border,
          boxShadow: th.boxShadow,
          padding: qrOnly ? "0.5rem" : v.pad,
          boxSizing: "border-box",
          opacity: panelOpacity,
          transition: `opacity ${FADE_MS}ms ease`,
          ...(centered || qrOnly
            ? {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }
            : {}),
        }}
      >
        {children}
      </div>
    );
  };

  if (ds === "black") {
    return (
      <main style={shellEmptyTransparent} aria-hidden>
        {}
      </main>
    );
  }

  if (loading) {
    return (
      <main style={shell}>
        {wrapGlass(
          <p style={{ margin: 0, fontSize: v.rowRem, color: th.textMuted }}>
            Chargement…
          </p>,
        )}
      </main>
    );
  }

  if (error) {
    return (
      <main style={shell}>
        {wrapGlass(
          <p style={{ margin: 0, fontSize: v.rowRem, color: "#fecaca" }}>
            {error}
          </p>,
        )}
      </main>
    );
  }

  if (onlyQr && joinUrl) {
    return (
      <main style={shell}>
        {wrapGlass(
          <QRCodeSVG
            value={joinUrl}
            size={qrSoloPixelSize}
            level="M"
            marginSize={1}
            bgColor={th.qrBg}
            fgColor={th.qrFg}
          />,
          { qrOnly: true },
        )}
      </main>
    );
  }

  if (!poll && overlayNoPoll404) {
    return (
      <main style={shell}>
        {wrapGlass(
          <>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: v.questionRem,
                fontWeight: 700,
                color: th.text,
              }}
            >
              {overlayUx.label}
            </p>
            <p style={{ margin: 0, fontSize: v.muted, color: th.textMuted }}>
              {LIVE_UX_DETAIL_SCREEN_WAITING_SLUG}
            </p>
          </>,
        )}
      </main>
    );
  }

  if (
    !poll &&
    (ds === "waiting" ||
      liveScene === "finished" ||
      liveScene === "paused" ||
      ds === "black")
  ) {
    return <main style={shellEmptyTransparent} aria-hidden />;
  }

  if (!poll) {
    return <main style={shellEmptyTransparent} aria-hidden />;
  }

  if (effectivePanel === "empty") {
    return <main style={shellEmptyTransparent} aria-hidden />;
  }

  if (effectivePanel === "reveal") {
    const untilIso = poll.autoRevealShowResultsAt;
    const secondesRestantes = (() => {
      void chronoTick;
      const t = new Date(String(untilIso)).getTime();
      if (Number.isNaN(t)) return 0;
      return Math.max(0, Math.ceil((t - Date.now()) / 1000));
    })();

    return (
      <main style={shell}>
        {wrapGlass(
          <>
            <p
              style={{
                margin: "0 0 0.35rem 0",
                fontSize: v.revealTitleRem,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: th.teal,
              }}
            >
              {getUxState({ liveState: "CLOSED" }).label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: v.revealCountRem,
                fontWeight: 700,
                lineHeight: 1.35,
                color: th.text,
              }}
            >
              Résultats dans{" "}
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: th.tealBright,
                }}
              >
                {secondesRestantes}
              </span>{" "}
              seconde{secondesRestantes !== 1 ? "s" : ""}
            </p>
          </>,
          { centered: true },
        )}
      </main>
    );
  }

  if (effectivePanel === "results") {
    const isContestEntry = String(poll?.type || "").toUpperCase() === "CONTEST_ENTRY";
    return (
      <main style={shell}>
        {wrapGlass(
          <>
            <p
              style={{
                margin: "0 0 0.6rem 0",
                fontSize: v.headerRem,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: th.accent,
              }}
            >
              {isContestEntry
                ? "Concours en cours"
                : getUxState({ liveState: "RESULTS", displayState: "RESULTS" }).label}
            </p>
            {isContestEntry ? (
              <div
                style={{
                  borderRadius: "10px",
                  border: `1px solid ${theme === "light" ? "rgba(91,33,182,0.25)" : "rgba(167,139,250,0.3)"}`,
                  background: theme === "light" ? "rgba(245,243,255,0.75)" : "rgba(76,29,149,0.18)",
                  padding: "0.55rem 0.65rem",
                }}
              >
                <p style={{ margin: 0, fontSize: v.muted, color: th.textMuted }}>
                  Lot à gagner
                </p>
                <p
                  style={{
                    margin: "0.18rem 0 0 0",
                    fontSize: v.rowRem,
                    color: th.accent,
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                  }}
                >
                  {String(poll?.contestPrize || "").trim() || "Lot à gagner non précisé"}
                </p>
                <p
                  style={{
                    margin: "0.45rem 0 0 0",
                    fontSize: `calc(${v.rowRem} * 0.92)`,
                    color: th.textMuted,
                    fontWeight: 700,
                  }}
                >
                  Participants inscrits : {contestEligibleCountFromPoll(poll)}
                </p>
                {contestWinners.length > 0 ? (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      borderTop: `1px solid ${theme === "light" ? "rgba(91,33,182,0.22)" : "rgba(167,139,250,0.28)"}`,
                      paddingTop: "0.45rem",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: `calc(${v.rowRem} * 0.9)`, color: th.textMuted, fontWeight: 700 }}>
                      Gagnants tirés
                    </p>
                    <ol style={{ margin: "0.3rem 0 0 1rem", padding: 0, color: th.text, fontSize: `calc(${v.rowRem} * 0.9)` }}>
                      {contestWinners.map((w) => (
                        <li key={String(w.id)} style={{ marginBottom: "0.12rem" }}>
                          {String(w.displayName || "Gagnant")} - {String(w.displayContact || "")}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {topOptions.map((opt, i) => {
                const optVotes =
                  Number(opt.voteCount ?? opt.votes ?? 0) || 0;
                const percentRaw =
                  totalVotesResults > 0
                    ? (optVotes / totalVotesResults) * 100
                    : 0;
                const percentRounded = Math.round(percentRaw * 10) / 10;
                const isTop = maxTop > 0 && optVotes === maxTop;
                const isQuizCorrect =
                  String(poll?.type || "").toUpperCase() === "QUIZ" &&
                  Boolean(poll?.quizRevealed) &&
                  Boolean(opt?.isCorrect);
                const barW = resultsBarsAnimated
                  ? Math.min(100, percentRaw)
                  : 0;
                return (
                  <li
                    key={opt.id}
                    style={{
                      marginBottom: i === topOptions.length - 1 ? 0 : "0.55rem",
                      padding: isQuizCorrect ? "0.35rem 0.42rem" : 0,
                      borderRadius: isQuizCorrect ? "10px" : undefined,
                      background: isQuizCorrect
                        ? (theme === "light"
                            ? "rgba(22,163,74,0.11)"
                            : "rgba(74,222,128,0.16)")
                        : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "0.5rem",
                        marginBottom: "0.2rem",
                        fontSize: v.rowRem,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          minWidth: 0,
                          color: isQuizCorrect ? "#22c55e" : th.text,
                        }}
                      >
                        {opt.label}
                      </span>
                      <span
                        style={{
                          color: th.textMuted,
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                          fontSize: `calc(${v.rowRem} * 0.92)`,
                        }}
                      >
                        {percentRounded}% · {optVotes}
                      </span>
                    </div>
                    <div
                      style={{
                        height: `${v.barH}px`,
                        background: th.barTrack,
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${barW}%`,
                          height: "100%",
                          background: isQuizCorrect
                            ? "#22c55e"
                            : isTop
                              ? "#22c55e"
                              : th.accentSoft,
                          borderRadius: "999px",
                          transition: "width 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            )}
            {showQR && joinUrl ? (
              <div
                style={{
                  marginTop: "0.75rem",
                  paddingTop: "0.65rem",
                  borderTop: `1px solid ${theme === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    variant === "compact" || variant === "minimal"
                      ? "center"
                      : "flex-start",
                  gap: v.gap,
                }}
              >
                <QRCodeSVG
                  value={joinUrl}
                  size={v.qrResults}
                  level="M"
                  marginSize={1}
                  bgColor={th.qrBg}
                  fgColor={th.qrFg}
                />
                {variant !== "compact" && variant !== "minimal" ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: v.muted,
                      color: th.textMuted,
                      fontWeight: 500,
                    }}
                  >
                    Voter / détail
                  </p>
                ) : null}
              </div>
            ) : null}
          </>,
        )}
      </main>
    );
  }

  const chronoActif =
    voteOuvert &&
    chronometreApi &&
    typeof chronometreApi.totalSec === "number";

  const questionStack = variant === "compact" || variant === "minimal";

  return (
    <main style={shell}>
      {wrapGlass(
        <>
          <div
            style={{
              display: "flex",
              flexDirection: questionStack ? "column" : "row",
              alignItems: questionStack ? "stretch" : "flex-start",
              gap: v.gap,
            }}
          >
            {showQR && joinUrl ? (
              <div
                style={{
                  flexShrink: 0,
                  alignSelf: questionStack ? "center" : undefined,
                  order: questionStack ? -1 : 0,
                }}
              >
                <QRCodeSVG
                  value={joinUrl}
                  size={v.qrQuestion}
                  level="M"
                  marginSize={1}
                  bgColor={th.qrBg}
                  fgColor={th.qrFg}
                />
              </div>
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: "0 0 0.45rem 0",
                  fontSize: v.questionRem,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: th.text,
                }}
              >
                {questionText}
              </p>
              {chronoActif ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: v.chronoRem,
                    fontWeight: 700,
                    color: th.tealBright,
                  }}
                >
                  {chronometreApi?.isPaused ? (
                    <>
                      Pause
                      {secondesChronoVote != null ? (
                        <>
                          {" "}
                          <span
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              color: th.textMuted,
                              fontWeight: 600,
                            }}
                          >
                            · {formatCountdownVerbose(secondesChronoVote)}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : secondesChronoVote != null ? (
                    <>
                      Temps restant{" "}
                      <span
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          color: th.teal,
                        }}
                      >
                        {formatCountdownVerbose(secondesChronoVote)}
                      </span>
                    </>
                  ) : (
                    "Chrono actif"
                  )}
                </p>
              ) : showQR ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: v.muted,
                    color: th.textMuted,
                  }}
                >
                  Scannez pour voter
                </p>
              ) : null}
            </div>
          </div>
        </>,
      )}
    </main>
  );
}
