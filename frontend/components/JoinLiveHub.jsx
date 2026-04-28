"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { formatCountdownVerbose } from "@/lib/chronoFormat";
import {
  buildJoinRoomShellStyle,
  createJoinRoomPalette,
  joinRoomAccent,
  joinRoomOverlayAlpha,
  resolveJoinRoomIsDark,
} from "@/lib/joinRoomVisual";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { API_URL, SOCKET_URL } from "@/lib/config";
import {
  LIVE_UX_BODY_FINISHED_MERCI,
  LIVE_UX_BODY_JOIN_PAUSED,
  LIVE_UX_BODY_JOIN_WAITING,
  LIVE_UX_SUBTITLE_REVEAL_PENDING,
  getUxState,
  getLiveStatePresentation,
  getLiveStateTone,
} from "@/lib/liveStateUx";
import {
  buildJoinPollCardSurfaces,
  getLiveStateVisualTokens,
  stateBadgeTypography,
} from "@/lib/liveStateVisual";
import { ExperienceHeader } from "@/components/navigation/ExperienceHeader";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";

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

/**
 * @param {{ accent: string; pulseAllowed: boolean }} props
 */
function AttenteAnimee({ accent, pulseAllowed }) {
  const barGrad = `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent} 80%, white), transparent)`;
  const track = `color-mix(in srgb, ${accent} 14%, rgba(148, 163, 184, 0.22))`;
  const dotColor = `color-mix(in srgb, ${accent} 38%, #94a3b8)`;
  return (
    <>
      <style>{`
        @keyframes join-hub-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes join-hub-dot {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          width: "100%",
        }}
      >
        <div
          aria-hidden
          style={{
            width: "min(12rem, 70vw)",
            height: "4px",
            borderRadius: "999px",
            background: track,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              borderRadius: "999px",
              background: barGrad,
              animation: pulseAllowed
                ? "join-hub-bar 1.85s ease-in-out infinite"
                : "none",
              opacity: pulseAllowed ? 1 : 0.45,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            fontSize: "2rem",
            fontWeight: 800,
            color: dotColor,
            letterSpacing: "0.02em",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                animation: pulseAllowed
                  ? "join-hub-dot 1.25s ease-in-out infinite"
                  : "none",
                animationDelay: pulseAllowed ? `${i * 0.18}s` : undefined,
                opacity: pulseAllowed ? undefined : 0.35,
              }}
            >
              ·
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Hub salle live /join : écran d’attente et lien vers /p/[slug].
 * @param {{ slug: string }} props
 */
export function JoinLiveHub({ slug }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [eventTitle, setEventTitle] = useState(null);
  /** @type {string | null} */
  const [liveState, setLiveState] = useState(null);
  /** @type {string | null} */
  const [voteState, setVoteState] = useState(null);
  /** @type {string | null} */
  const [displayState, setDisplayState] = useState(null);
  /** @type {string | null} */
  const [autoRevealShowResultsAt, setAutoRevealShowResultsAt] =
    useState(null);
  /** @type {Record<string, unknown> | null} */
  const [questionTimer, setQuestionTimer] = useState(null);
  /** @type {string | null} */
  const [activePollId, setActivePollId] = useState(null);
  /** @type {string | null} */
  const [activePollQuestion, setActivePollQuestion] = useState(null);
  /** @type {{ current: number; total: number } | null} */
  const [pollsProgress, setPollsProgress] = useState(null);
  /** @type {{ id: string; label: string }[]} */
  const [pastPolls, setPastPolls] = useState([]);
  /** @type {Record<string, boolean>} */
  const [contestWinByPollId, setContestWinByPollId] = useState({});
  const [hasVotedActivePoll, setHasVotedActivePoll] = useState(false);
  const [chronoTick, setChronoTick] = useState(0);
  /** Personnalisation salle (/admin/.../customization) */
  const [roomDescription, setRoomDescription] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [primaryColor, setPrimaryColor] = useState(null);
  const [themeMode, setThemeMode] = useState(null);
  const [backgroundOverlayStrength, setBackgroundOverlayStrength] =
    useState(null);
  /** Fond uni /join si pas d’image (#RRGGBB ou null côté API). */
  const [roomBackgroundColor, setRoomBackgroundColor] = useState(null);
  const [infoSectionTitle, setInfoSectionTitle] = useState(null);
  const [infoSectionText, setInfoSectionText] = useState(null);
  const [infoPrimaryCtaLabel, setInfoPrimaryCtaLabel] = useState(null);
  const [infoPrimaryCtaUrl, setInfoPrimaryCtaUrl] = useState(null);
  const [infoSecondaryCtaLabel, setInfoSecondaryCtaLabel] = useState(null);
  const [infoSecondaryCtaUrl, setInfoSecondaryCtaUrl] = useState(null);
  const [infoShowOnFinished, setInfoShowOnFinished] = useState(true);
  const [prefersDark, setPrefersDark] = useState(true);
  /**
   * Surcharge visuelle depuis la page admin (iframe + postMessage), non persistée.
   * @type {null | {
   *   description: string | null;
   *   logoUrl: string | null;
   *   backgroundUrl: string | null;
   *   primaryColor: string | null;
   *   themeMode: string | null;
   *   backgroundOverlayStrength: string | null;
   *   roomBackgroundColor: string | null;
 *   infoSectionTitle: string | null;
 *   infoSectionText: string | null;
 *   infoPrimaryCtaLabel: string | null;
 *   infoPrimaryCtaUrl: string | null;
 *   infoSecondaryCtaLabel: string | null;
 *   infoSecondaryCtaUrl: string | null;
 *   infoShowOnFinished: boolean;
   * }}
   */
  const [previewCustomization, setPreviewCustomization] = useState(null);

  const fetchMeta = useCallback(async () => {
    const res = await fetch(
      `${API_URL}/events/slug/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (res.status === 404) {
      setError("Événement introuvable.");
      setEventId(null);
      setEventTitle(null);
      setLiveState(null);
      setVoteState(null);
      setDisplayState(null);
      setAutoRevealShowResultsAt(null);
      setQuestionTimer(null);
      setActivePollId(null);
      setActivePollQuestion(null);
      setPollsProgress(null);
      setPastPolls([]);
      setRoomDescription(null);
      setLogoUrl(null);
      setBackgroundUrl(null);
      setPrimaryColor(null);
      setThemeMode(null);
      setBackgroundOverlayStrength(null);
      setRoomBackgroundColor(null);
      setInfoSectionTitle(null);
      setInfoSectionText(null);
      setInfoPrimaryCtaLabel(null);
      setInfoPrimaryCtaUrl(null);
      setInfoSecondaryCtaLabel(null);
      setInfoSecondaryCtaUrl(null);
      setInfoShowOnFinished(true);
      setPreviewCustomization(null);
      return;
    }
    if (!res.ok) {
      setError(`Erreur ${res.status}`);
      return;
    }
    const data = await res.json();
    setError(null);
    setEventId(data.id ?? null);
    setEventTitle(
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : null,
    );
    setLiveState(
      typeof data.liveState === "string" ? data.liveState.toLowerCase() : null,
    );
    setVoteState(
      typeof data.voteState === "string"
        ? data.voteState.toLowerCase()
        : null,
    );
    setDisplayState(
      typeof data.displayState === "string"
        ? data.displayState.toLowerCase()
        : null,
    );
    setAutoRevealShowResultsAt(
      typeof data.autoRevealShowResultsAt === "string"
        ? data.autoRevealShowResultsAt
        : null,
    );
    setQuestionTimer(
      data.questionTimer &&
        typeof data.questionTimer === "object" &&
        data.questionTimer !== null
        ? data.questionTimer
        : null,
    );
    setActivePollId(
      typeof data.activePollId === "string" && data.activePollId.trim()
        ? data.activePollId.trim()
        : null,
    );
    const q = data.activePollQuestion;
    setActivePollQuestion(
      typeof q === "string" && q.trim() ? q.trim() : null,
    );
    const pp = data.pollsProgress;
    if (
      pp &&
      typeof pp.current === "number" &&
      typeof pp.total === "number" &&
      pp.total > 0 &&
      pp.current >= 1
    ) {
      setPollsProgress({ current: pp.current, total: pp.total });
    } else {
      setPollsProgress(null);
    }
    if (Array.isArray(data.pastPolls)) {
      setPastPolls(
        data.pastPolls
          .filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              x.id.trim() &&
              typeof x.label === "string" &&
              x.label.trim(),
          )
          .map((x) => ({ id: x.id.trim(), label: x.label.trim() })),
      );
    } else {
      setPastPolls([]);
    }

    const rd = data.description;
    setRoomDescription(
      typeof rd === "string" && rd.trim() ? rd.trim() : null,
    );
    const lu = data.logoUrl;
    setLogoUrl(
      typeof lu === "string" && lu.trim()
        ? resolveApiAssetUrlNullable(lu.trim())
        : null,
    );
    const bu = data.backgroundUrl;
    setBackgroundUrl(
      typeof bu === "string" && bu.trim()
        ? resolveApiAssetUrlNullable(bu.trim())
        : null,
    );
    const pc = data.primaryColor;
    setPrimaryColor(
      typeof pc === "string" && /^#[0-9A-Fa-f]{6}$/.test(pc.trim())
        ? pc.trim()
        : null,
    );
    const tm = data.themeMode;
    setThemeMode(typeof tm === "string" && tm.trim() ? tm.trim() : null);
    const os = data.backgroundOverlayStrength;
    setBackgroundOverlayStrength(
      typeof os === "string" && os.trim() ? os.trim() : null,
    );
    const rbc = data.roomBackgroundColor;
    setRoomBackgroundColor(
      typeof rbc === "string" && /^#[0-9A-Fa-f]{6}$/.test(rbc.trim())
        ? rbc.trim()
        : null,
    );
    const ist = data.infoSectionTitle;
    const isx = data.infoSectionText;
    const ipcl = data.infoPrimaryCtaLabel;
    const ipcu = data.infoPrimaryCtaUrl;
    const iscl = data.infoSecondaryCtaLabel;
    const iscu = data.infoSecondaryCtaUrl;
    const isof = data.infoShowOnFinished;
    setInfoSectionTitle(
      typeof ist === "string" && ist.trim() ? ist.trim() : null,
    );
    setInfoSectionText(typeof isx === "string" && isx.trim() ? isx.trim() : null);
    setInfoPrimaryCtaLabel(
      typeof ipcl === "string" && ipcl.trim() ? ipcl.trim() : null,
    );
    setInfoPrimaryCtaUrl(
      typeof ipcu === "string" && /^https?:\/\/\S+$/i.test(ipcu.trim())
        ? ipcu.trim()
        : null,
    );
    setInfoSecondaryCtaLabel(
      typeof iscl === "string" && iscl.trim() ? iscl.trim() : null,
    );
    setInfoSecondaryCtaUrl(
      typeof iscu === "string" && /^https?:\/\/\S+$/i.test(iscu.trim())
        ? iscu.trim()
        : null,
    );
    setInfoShowOnFinished(typeof isof === "boolean" ? isof : true);
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setPrefersDark(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  /** Brouillon personnalisation (aperçu admin uniquement, même origine + parent). */
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      if (window.parent === window) return;
      if (ev.source !== window.parent) return;
      const d = ev.data;
      if (!d || d.type !== "preview_customization") return;
      if (d.payload == null) {
        setPreviewCustomization(null);
        return;
      }
      const p = d.payload;
      if (typeof p !== "object") return;
      setPreviewCustomization({
        description:
          p.description === undefined
            ? null
            : typeof p.description === "string"
              ? p.description
              : p.description == null
                ? null
                : String(p.description),
        logoUrl:
          p.logoUrl === undefined || p.logoUrl === ""
            ? null
            : typeof p.logoUrl === "string"
              ? resolveApiAssetUrlNullable(p.logoUrl)
              : null,
        backgroundUrl:
          p.backgroundUrl === undefined || p.backgroundUrl === ""
            ? null
            : typeof p.backgroundUrl === "string"
              ? resolveApiAssetUrlNullable(p.backgroundUrl)
              : null,
        primaryColor:
          p.primaryColor === undefined || p.primaryColor === ""
            ? null
            : typeof p.primaryColor === "string" &&
                /^#[0-9A-Fa-f]{6}$/.test(p.primaryColor)
              ? p.primaryColor
              : null,
        themeMode:
          p.themeMode === undefined || p.themeMode === ""
            ? null
            : typeof p.themeMode === "string"
              ? p.themeMode.toLowerCase()
              : null,
        backgroundOverlayStrength:
          p.backgroundOverlayStrength === undefined ||
          p.backgroundOverlayStrength === ""
            ? null
            : typeof p.backgroundOverlayStrength === "string"
              ? p.backgroundOverlayStrength.toLowerCase()
              : null,
        roomBackgroundColor:
          p.roomBackgroundColor === undefined || p.roomBackgroundColor === ""
            ? null
            : typeof p.roomBackgroundColor === "string" &&
                /^#[0-9A-Fa-f]{6}$/.test(p.roomBackgroundColor)
              ? p.roomBackgroundColor
              : null,
        infoSectionTitle:
          p.infoSectionTitle === undefined
            ? null
            : typeof p.infoSectionTitle === "string"
              ? p.infoSectionTitle
              : p.infoSectionTitle == null
                ? null
                : String(p.infoSectionTitle),
        infoSectionText:
          p.infoSectionText === undefined
            ? null
            : typeof p.infoSectionText === "string"
              ? p.infoSectionText
              : p.infoSectionText == null
                ? null
                : String(p.infoSectionText),
        infoPrimaryCtaLabel:
          p.infoPrimaryCtaLabel === undefined
            ? null
            : typeof p.infoPrimaryCtaLabel === "string"
              ? p.infoPrimaryCtaLabel
              : p.infoPrimaryCtaLabel == null
                ? null
                : String(p.infoPrimaryCtaLabel),
        infoPrimaryCtaUrl:
          p.infoPrimaryCtaUrl === undefined || p.infoPrimaryCtaUrl === ""
            ? null
            : typeof p.infoPrimaryCtaUrl === "string" &&
                /^https?:\/\/\S+$/i.test(p.infoPrimaryCtaUrl.trim())
              ? p.infoPrimaryCtaUrl.trim()
              : null,
        infoSecondaryCtaLabel:
          p.infoSecondaryCtaLabel === undefined
            ? null
            : typeof p.infoSecondaryCtaLabel === "string"
              ? p.infoSecondaryCtaLabel
              : p.infoSecondaryCtaLabel == null
                ? null
                : String(p.infoSecondaryCtaLabel),
        infoSecondaryCtaUrl:
          p.infoSecondaryCtaUrl === undefined || p.infoSecondaryCtaUrl === ""
            ? null
            : typeof p.infoSecondaryCtaUrl === "string" &&
                /^https?:\/\/\S+$/i.test(p.infoSecondaryCtaUrl.trim())
              ? p.infoSecondaryCtaUrl.trim()
              : null,
        infoShowOnFinished:
          typeof p.infoShowOnFinished === "boolean"
            ? p.infoShowOnFinished
            : true,
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchMeta();
      } catch {
        if (!cancelled) setError("Impossible de joindre le serveur.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMeta]);

  useEffect(() => {
    if (!eventId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    function onConnect() {
      socket.emit("join_event", eventId);
    }

    /** @param {any} _payload */
    function onEventLive(_payload) {
      void fetchMeta();
    }

    /** @param {any} payload */
    function onCustomizationUpdated(payload) {
      if (
        !payload?.eventId ||
        String(payload.eventId) !== String(eventId)
      ) {
        return;
      }
      void fetchMeta();
    }

    socket.on("connect", onConnect);
    if (socket.connected) onConnect();
    socket.on("event_live_updated", onEventLive);
    socket.on("event:customization_updated", onCustomizationUpdated);

    return () => {
      socket.emit("leave_event", eventId);
      socket.off("connect", onConnect);
      socket.off("event_live_updated", onEventLive);
      socket.off("event:customization_updated", onCustomizationUpdated);
      socket.disconnect();
    };
  }, [eventId, fetchMeta]);

  const sceneRaw = String(liveState || "").toLowerCase();
  const vs = String(voteState || "").toLowerCase();
  const scene =
    sceneRaw === "finished" ? "finished" : vs === "open" ? "voting" : "waiting";
  const ds = scene === "voting" ? "question" : "waiting";

  const enAttenteRevealAuto = useMemo(() => {
    if (vs !== "closed") return false;
    if (ds === "results") return false;
    if (typeof autoRevealShowResultsAt !== "string") return false;
    return (
      new Date(autoRevealShowResultsAt).getTime() > Date.now() - 500
    );
  }, [vs, ds, autoRevealShowResultsAt]);

  const chronoVoteActif =
    scene === "voting" &&
    questionTimer &&
    typeof questionTimer.totalSec === "number";

  const tickReveal = enAttenteRevealAuto;
  const tickChronoVote =
    !!chronoVoteActif &&
    !!questionTimer &&
    questionTimer.running &&
    !questionTimer.isPaused;

  useEffect(() => {
    if (!tickReveal && !tickChronoVote) return;
    const id = window.setInterval(() => setChronoTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [tickReveal, tickChronoVote]);

  const secondesChronoQuestion = useMemo(() => {
    void chronoTick;
    return chronoRestantSecondes(questionTimer);
  }, [questionTimer, chronoTick]);

  const secondesAvantResultats = useMemo(() => {
    void chronoTick;
    if (!autoRevealShowResultsAt) return null;
    const t = new Date(autoRevealShowResultsAt).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.ceil((t - Date.now()) / 1000));
  }, [autoRevealShowResultsAt, chronoTick]);

  const joinUxContext = useMemo(
    () => ({
      liveScene: scene,
      displayState: ds,
      voteState: vs,
      pollStatus: null,
      hasActivePoll: Boolean(activePollId),
      autoReveal: enAttenteRevealAuto,
      autoRevealShowResultsAt,
    }),
    [
      scene,
      ds,
      vs,
      activePollId,
      enAttenteRevealAuto,
      autoRevealShowResultsAt,
    ],
  );

  const joinPres = useMemo(
    () => getLiveStatePresentation(joinUxContext),
    [joinUxContext],
  );
  const ux = useMemo(
    () => getUxState({ liveState: scene, voteState: vs, displayState: ds }),
    [scene, vs, ds],
  );

  const votePath = `/p/${encodeURIComponent(slug)}`;

  function participer() {
    router.push(votePath);
  }

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!activePollId) {
      setHasVotedActivePoll(false);
      return undefined;
    }
    const key = `avote_voted_poll_${activePollId}`;
    const sync = () => {
      try {
        const v = window.localStorage.getItem(key);
        setHasVotedActivePoll(v === "true" || v === "1");
      } catch {
        setHasVotedActivePoll(false);
      }
    };
    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [activePollId]);

  const progressionLigne = useMemo(() => {
    if (!pollsProgress) return null;
    const { current, total } = pollsProgress;
    const rest = total - current;
    if (rest > 0) {
      return `Question ${current} sur ${total} · ${rest} restante${rest > 1 ? "s" : ""}`;
    }
    return `Question ${current} sur ${total}`;
  }, [pollsProgress]);
  const historiqueQuestions = useMemo(() => {
    const base = Array.isArray(pastPolls) ? pastPolls : [];
    const activeLabel =
      typeof activePollQuestion === "string" ? activePollQuestion.trim() : "";
    if (!activeLabel) return base;
    const exists = base.some((p) => String(p?.label || "").trim() === activeLabel);
    if (exists) return base;
    return [{ id: "__active__", label: activeLabel }, ...base];
  }, [pastPolls, activePollQuestion]);
  const winningContestPolls = useMemo(
    () =>
      historiqueQuestions.filter(
        (p) => p?.id && p.id !== "__active__" && Boolean(contestWinByPollId[p.id]),
      ),
    [historiqueQuestions, contestWinByPollId],
  );

  useEffect(() => {
    if (!slug || !Array.isArray(historiqueQuestions) || historiqueQuestions.length === 0) {
      setContestWinByPollId({});
      return;
    }
    const voterSessionId = getOrCreateVoterSessionId();
    if (!voterSessionId) {
      setContestWinByPollId({});
      return;
    }
    const pollIds = historiqueQuestions
      .map((p) => String(p?.id || "").trim())
      .filter((id) => id && id !== "__active__");
    if (pollIds.length === 0) {
      setContestWinByPollId({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      for (const pollId of pollIds) {
        try {
          const qs = new URLSearchParams({
            pollId,
            voterSessionId,
          });
          const res = await fetch(
            `${API_URL}/p/${encodeURIComponent(slug)}/contest-status?${qs.toString()}`,
            { cache: "no-store" },
          );
          if (!res.ok) continue;
          const body = await res.json().catch(() => null);
          if (!body) continue;
          if (Boolean(body.isCurrentVoterWinner)) {
            next[pollId] = true;
          }
        } catch {
          // Ignore non-concours / indisponible
        }
      }
      if (!cancelled) {
        setContestWinByPollId(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historiqueQuestions, slug]);

  const effectiveDescription = previewCustomization
    ? previewCustomization.description
    : roomDescription;
  const effectiveLogoUrl = previewCustomization
    ? previewCustomization.logoUrl
    : logoUrl;
  const effectiveBackgroundUrl = previewCustomization
    ? previewCustomization.backgroundUrl
    : backgroundUrl;
  const effectivePrimaryColor = previewCustomization
    ? previewCustomization.primaryColor
    : primaryColor;
  const effectiveThemeMode = previewCustomization
    ? previewCustomization.themeMode
    : themeMode;
  const effectiveOverlayStrength = previewCustomization
    ? previewCustomization.backgroundOverlayStrength
    : backgroundOverlayStrength;
  const effectiveRoomBackgroundColor = previewCustomization
    ? previewCustomization.roomBackgroundColor
    : roomBackgroundColor;
  const effectiveInfoSectionTitle = previewCustomization
    ? previewCustomization.infoSectionTitle
    : infoSectionTitle;
  const effectiveInfoSectionText = previewCustomization
    ? previewCustomization.infoSectionText
    : infoSectionText;
  const effectiveInfoPrimaryCtaLabel = previewCustomization
    ? previewCustomization.infoPrimaryCtaLabel
    : infoPrimaryCtaLabel;
  const effectiveInfoPrimaryCtaUrl = previewCustomization
    ? previewCustomization.infoPrimaryCtaUrl
    : infoPrimaryCtaUrl;
  const effectiveInfoSecondaryCtaLabel = previewCustomization
    ? previewCustomization.infoSecondaryCtaLabel
    : infoSecondaryCtaLabel;
  const effectiveInfoSecondaryCtaUrl = previewCustomization
    ? previewCustomization.infoSecondaryCtaUrl
    : infoSecondaryCtaUrl;
  const effectiveInfoShowOnFinished = previewCustomization
    ? previewCustomization.infoShowOnFinished
    : infoShowOnFinished;
  const showInfoSection =
    !loading &&
    !error &&
    (scene !== "finished" || effectiveInfoShowOnFinished) &&
    (effectiveInfoSectionTitle ||
      effectiveInfoSectionText ||
      (effectiveInfoPrimaryCtaLabel && effectiveInfoPrimaryCtaUrl) ||
      (effectiveInfoSecondaryCtaLabel && effectiveInfoSecondaryCtaUrl));

  const isDark = resolveJoinRoomIsDark(effectiveThemeMode, prefersDark);
  const accent = joinRoomAccent(effectivePrimaryColor);
  const palette = useMemo(
    () => createJoinRoomPalette(isDark, accent),
    [isDark, accent],
  );

  const joinCardTone = useMemo(() => {
    if (loading || error || !eventId) return "neutral";
    return getLiveStateTone(joinPres.ux);
  }, [loading, error, eventId, joinPres.ux]);

  const joinVisualTokens = useMemo(
    () => getLiveStateVisualTokens(joinCardTone, "join"),
    [joinCardTone],
  );

  const joinCardSurfaces = useMemo(
    () =>
      buildJoinPollCardSurfaces({
        palette,
        isDark,
        accent,
        tokens: joinVisualTokens,
      }),
    [palette, isDark, accent, joinVisualTokens],
  );

  const overlayAlpha = joinRoomOverlayAlpha(effectiveOverlayStrength);

  const shell = useMemo(
    () =>
      buildJoinRoomShellStyle({
        hasBackgroundImage: !!effectiveBackgroundUrl,
        roomSolidColor: effectiveRoomBackgroundColor,
        isDark,
        fg: palette.fg,
      }),
    [effectiveBackgroundUrl, effectiveRoomBackgroundColor, isDark, palette.fg],
  );

  const zoneMain = useMemo(
    () => ({
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      padding: "clamp(1rem, 4vw, 2rem) clamp(1rem, 5vw, 2.5rem) 2rem",
      boxSizing: "border-box",
    }),
    [],
  );

  const carteCentral = useMemo(
    () => ({
      width: "100%",
      maxWidth: "min(36rem, 100%)",
      padding: "clamp(1.35rem, 4vw, 2.35rem) clamp(1.1rem, 4vw, 2rem)",
      borderRadius: "20px",
      border: joinCardSurfaces.border,
      background: joinCardSurfaces.background,
      boxShadow: joinCardSurfaces.boxShadow,
      textAlign: "center",
      boxSizing: "border-box",
    }),
    [joinCardSurfaces],
  );

  const joinBadgeEtat = useMemo(
    () => ({
      ...stateBadgeTypography(joinVisualTokens),
      fontSize: "0.75rem",
      color: accent,
    }),
    [joinVisualTokens, accent],
  );

  const joinCtaGradient = useMemo(
    () =>
      `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 40%, ${isDark ? "#1e1b4b" : "#c7d2fe"}))`,
    [accent, isDark],
  );

  const piedEncouragement =
    scene === "finished"
      ? null
      : scene === "voting"
        ? hasVotedActivePoll
          ? "Réponse envoyée. Vous pouvez suivre le direct depuis cette page."
          : "Le vote est ouvert : appuyez sur « Voter maintenant »."
        : scene === "results"
          ? "Les résultats sont visibles ici, puis la prochaine question arrive."
          : "Gardez cette page ouverte : la session continue en direct.";

  let corps = null;

  if (!loading && !error && eventId) {
    if (scene === "finished") {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: `clamp(${1.12 * joinVisualTokens.titleClampMul}rem, ${3.8 * joinVisualTokens.titleClampMul}vw, ${1.48 * joinVisualTokens.titleClampMul}rem)`,
              fontWeight: joinVisualTokens.stateBadgeWeight,
              lineHeight: 1.45,
              color: palette.fg2,
            }}
          >
            {joinPres.title}
          </p>
          <p
            style={{
              margin: "0.85rem 0 0 0",
              fontSize: "clamp(0.95rem, 3vw, 1.1rem)",
              color: palette.muted,
              lineHeight: 1.5,
            }}
          >
            {LIVE_UX_BODY_FINISHED_MERCI}
          </p>
        </>
      );
    } else if (enAttenteRevealAuto) {
      corps =
        secondesAvantResultats != null ? (
          <>
            <p style={{ margin: 0, ...joinBadgeEtat }}>{joinPres.title}</p>
            <p
              style={{
                margin: "0.65rem 0 0 0",
                fontSize: "clamp(1rem, 3.5vw, 1.2rem)",
                fontWeight: 600,
                color: palette.muted2,
              }}
            >
              Résultats dans
            </p>
            <p
              style={{
                margin: "0.35rem 0 0 0",
                fontSize: "clamp(3.25rem, 14vw, 5.5rem)",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
                color: accent,
                textShadow: `0 0 36px color-mix(in srgb, ${accent} 40%, transparent)`,
              }}
            >
              {formatCountdownVerbose(secondesAvantResultats)}
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: 0, ...joinBadgeEtat }}>{joinPres.title}</p>
            <p
              style={{
                margin: "0.75rem 0 0 0",
                fontSize: "clamp(1.1rem, 3.5vw, 1.35rem)",
                fontWeight: 600,
                color: palette.muted2,
              }}
            >
              {joinPres.subtitle ?? LIVE_UX_SUBTITLE_REVEAL_PENDING}
            </p>
            <div style={{ marginTop: "1.25rem" }}>
              <AttenteAnimee
                accent={accent}
                pulseAllowed={joinVisualTokens.pulseAllowed}
              />
            </div>
          </>
        );
    } else if (scene === "voting") {
      corps = (
        <>
          <p style={{ margin: 0, ...joinBadgeEtat }}>
            {hasVotedActivePoll ? "Votre réponse est prise en compte" : joinPres.title}
          </p>
          <h2
            style={{
              margin: "0.65rem 0 0 0",
              fontSize: `clamp(${1.2 * joinVisualTokens.titleClampMul}rem, ${4.2 * joinVisualTokens.titleClampMul}vw, ${1.65 * joinVisualTokens.titleClampMul}rem)`,
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "-0.02em",
              color: palette.fg,
            }}
          >
            {activePollQuestion || "—"}
          </h2>
          {chronoVoteActif && secondesChronoQuestion != null ? (
            <>
          <p
            style={{
              margin: "1rem 0 0 0",
              fontSize: "0.88rem",
              fontWeight: 600,
              color: palette.link,
              letterSpacing: "0.02em",
            }}
          >
            {questionTimer && questionTimer.isPaused
              ? "Chrono en pause"
              : "Temps restant pour voter"}
          </p>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "clamp(2.5rem, 11vw, 4rem)",
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  color:
                    questionTimer && questionTimer.isPaused
                      ? palette.muted
                      : accent,
                }}
              >
                {formatCountdownVerbose(secondesChronoQuestion)}
              </p>
            </>
          ) : null}
          <button
            className="join-live-cta"
            type="button"
            onClick={participer}
            style={{
              marginTop: "1.35rem",
              width: "100%",
              maxWidth: "20rem",
              alignSelf: "center",
              padding: `${1.05 * joinVisualTokens.ctaScale}rem ${1.4 * joinVisualTokens.ctaScale}rem`,
              fontSize: `clamp(${1.05 * joinVisualTokens.ctaScale}rem, 3.5vw, ${1.15 * joinVisualTokens.ctaScale}rem)`,
              fontWeight: 800,
              border: "none",
              borderRadius: "14px",
              background: hasVotedActivePoll ? "transparent" : joinCtaGradient,
              color: hasVotedActivePoll ? palette.link : "#fff",
              border: hasVotedActivePoll ? `1px solid ${palette.cardBorder}` : "none",
              cursor: "pointer",
              boxShadow: `0 ${Math.round(8 * joinVisualTokens.shadowScale)}px ${Math.round(30 * joinVisualTokens.shadowScale)}px rgba(0, 0, 0, ${isDark ? 0.32 : 0.18})`,
            }}
          >
            {hasVotedActivePoll ? "Voir mon vote" : "Voter maintenant"}
          </button>
        </>
      );
    } else if (scene === "results") {
      const resultHref =
        activePollId != null
          ? `/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(activePollId)}`
          : null;
      corps = (
        <>
          <p
            style={{
              margin: 0,
              ...joinBadgeEtat,
              color: `color-mix(in srgb, ${accent} 72%, ${palette.fg})`,
            }}
          >
            {joinPres.title}
          </p>
          <h2
            style={{
              margin: "0.75rem 0 0 0",
              fontSize: `clamp(${1.15 * joinVisualTokens.titleClampMul}rem, ${4 * joinVisualTokens.titleClampMul}vw, ${1.55 * joinVisualTokens.titleClampMul}rem)`,
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "-0.02em",
              color: palette.fg,
            }}
          >
            {activePollQuestion || "—"}
          </h2>
          <div style={{ marginTop: "1rem" }}>
            {resultHref ? (
              <Link
                href={resultHref}
                style={{
                  display: "inline-block",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: palette.link,
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Consulter les résultats
              </Link>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: palette.muted,
                }}
              >
                Détail des scores : ouvrez l’onglet vote dès qu’il sera à jour.
              </p>
            )}
          </div>
          <p
            style={{
              margin: "1.15rem 0 0 0",
              fontSize: "clamp(0.95rem, 3vw, 1.08rem)",
              fontWeight: 500,
              color: palette.muted,
              lineHeight: 1.55,
              maxWidth: "28rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            La prochaine question arrive bientôt. Restez sur cette page.
          </p>
        </>
      );
    } else if (scene === "paused") {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: `clamp(${1.2 * joinVisualTokens.titleClampMul}rem, ${4.2 * joinVisualTokens.titleClampMul}vw, ${1.75 * joinVisualTokens.titleClampMul}rem)`,
              fontWeight: joinVisualTokens.stateBadgeWeight,
              color: palette.muted2,
              letterSpacing: "-0.02em",
            }}
          >
            {joinPres.title}
          </p>
          <p
            style={{
              margin: "0.85rem 0 0 0",
              fontSize: "clamp(1rem, 3.2vw, 1.15rem)",
              color: palette.muted,
              lineHeight: 1.5,
            }}
          >
            {LIVE_UX_BODY_JOIN_PAUSED}
          </p>
          <div style={{ marginTop: "1.35rem" }}>
            <AttenteAnimee
              accent={accent}
              pulseAllowed={joinVisualTokens.pulseAllowed}
            />
          </div>
        </>
      );
    } else {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: `clamp(${1.45 * joinVisualTokens.titleClampMul}rem, ${5.5 * joinVisualTokens.titleClampMul}vw, ${2.35 * joinVisualTokens.titleClampMul}rem)`,
              fontWeight: joinVisualTokens.stateBadgeWeight,
              lineHeight: 1.25,
              color: palette.fg2,
            }}
          >
            {joinPres.title}
          </p>
          <p
            style={{
              margin: "0.9rem 0 0 0",
              fontSize: "clamp(0.98rem, 3.1vw, 1.12rem)",
              fontWeight: 500,
              color: palette.muted,
              lineHeight: 1.55,
              maxWidth: "26rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {LIVE_UX_BODY_JOIN_WAITING}
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <AttenteAnimee
              accent={accent}
              pulseAllowed={joinVisualTokens.pulseAllowed}
            />
          </div>
        </>
      );
    }
  }

  return (
    <>
      {effectiveBackgroundUrl ? (
        <>
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${effectiveBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              background: `rgba(0, 0, 0, ${overlayAlpha})`,
            }}
          />
        </>
      ) : null}
      <main style={shell}>
      <style>{`
        @keyframes join-hub-glow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @media (max-width: 640px) {
          .join-live-zone {
            padding: 0.75rem 0.8rem 1.25rem !important;
          }
          .join-live-card {
            max-width: 100% !important;
            padding: 1rem 0.9rem !important;
            border-radius: 16px !important;
          }
          .join-live-cta {
            max-width: 100% !important;
            min-height: 50px !important;
            font-size: 1rem !important;
          }
        }
      `}</style>

      <ExperienceHeader
        backHref="/"
        backLabel="← Accueil"
        title={eventTitle || "Événement live"}
        subtitle={!loading && !error ? effectiveDescription : null}
        logoUrl={effectiveLogoUrl}
        palette={palette}
        isDark={isDark}
      >
        {!loading && !error && progressionLigne ? (
          <p
            style={{
              margin: "0.45rem 0 0 0",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: palette.muted,
            }}
          >
            {progressionLigne}
          </p>
        ) : null}
        {showInfoSection ? (
          <section
            style={{
              marginTop: "0.75rem",
              borderRadius: "12px",
              border: `1px solid ${palette.headerBorder}`,
              background: palette.cardBg,
              padding: "0.75rem 0.85rem",
              boxSizing: "border-box",
              maxWidth: "40rem",
            }}
          >
            {effectiveInfoSectionTitle ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: palette.fg2,
                }}
              >
                {effectiveInfoSectionTitle}
              </p>
            ) : null}
            {effectiveInfoSectionText ? (
              <p
                style={{
                  margin: effectiveInfoSectionTitle ? "0.32rem 0 0" : "0",
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                  color: palette.muted,
                }}
              >
                {effectiveInfoSectionText}
              </p>
            ) : null}
            <div
              style={{
                marginTop:
                  effectiveInfoSectionTitle || effectiveInfoSectionText
                    ? "0.58rem"
                    : 0,
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {effectiveInfoPrimaryCtaLabel && effectiveInfoPrimaryCtaUrl ? (
                <a
                  href={effectiveInfoPrimaryCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.45rem 0.68rem",
                    borderRadius: "9px",
                    textDecoration: "none",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#fff",
                    background: palette.link,
                  }}
                >
                  ↗ {effectiveInfoPrimaryCtaLabel}
                </a>
              ) : null}
              {effectiveInfoSecondaryCtaLabel && effectiveInfoSecondaryCtaUrl ? (
                <a
                  href={effectiveInfoSecondaryCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0.45rem 0.68rem",
                    borderRadius: "9px",
                    textDecoration: "none",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: palette.fg2,
                    border: `1px solid ${palette.headerBorder}`,
                    background: palette.cardBg,
                  }}
                >
                  ↗ {effectiveInfoSecondaryCtaLabel}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </ExperienceHeader>

      <div className="join-live-zone" style={zoneMain}>
        {loading ? (
          <div className="join-live-card" style={carteCentral}>
            <p
              style={{
                margin: 0,
                color: palette.muted,
                fontSize: "1.05rem",
                animation: "join-hub-glow 1.4s ease-in-out infinite",
              }}
            >
              Connexion au live…
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="join-live-card" style={carteCentral}>
            <p style={{ margin: 0, color: "#fca5a5" }} role="alert">
              {error}
            </p>
          </div>
        ) : null}

        {!loading && !error && corps ? (
          <div className="join-live-card" style={carteCentral}>
            <div
              className="text-center text-sm opacity-80 mb-2"
              style={{
                textAlign: "center",
                fontSize: "0.86rem",
                opacity: 0.82,
                marginBottom: "0.5rem",
                color: palette.muted,
              }}
            >
              {ux.label}
            </div>
            {corps}
          </div>
        ) : null}

        {!loading && !error && historiqueQuestions.length > 0 ? (
          scene === "finished" ? (
            <section
              style={{
                width: "100%",
                maxWidth: "36rem",
                marginTop: "1rem",
                textAlign: "left",
                borderRadius: "14px",
                border: `1px solid ${palette.headerBorder}`,
                background: palette.cardBg,
                boxShadow: "0 8px 28px rgba(15,23,42,0.08)",
                padding: "0.85rem 0.95rem",
                boxSizing: "border-box",
              }}
            >
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: palette.fg2,
                }}
              >
                Historique des questions ({historiqueQuestions.length})
              </p>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: "1.1rem",
                  color: palette.muted,
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                  listStylePosition: "outside",
                }}
              >
                {historiqueQuestions.map((p) => (
                  <li key={p.id} style={{ marginBottom: "0.5rem" }}>
                    <span style={{ display: "block", marginBottom: "0.22rem" }}>
                      {p.label}
                    </span>
                    {p.id !== "__active__" ? (
                      <Link
                        href={`/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(p.id)}`}
                        style={{
                          display: "inline-block",
                          color: palette.link,
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        Voir les résultats
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
              {winningContestPolls.length > 0 ? (
                <div
                  style={{
                    marginTop: "0.75rem",
                    borderTop: `1px solid ${palette.headerBorder}`,
                    paddingTop: "0.68rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#16a34a",
                    }}
                  >
                    🎉 Félicitations, vous avez été tiré au sort !
                  </p>
                  <Link
                    href={`/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(
                      winningContestPolls[0].id,
                    )}`}
                    style={{
                      display: "inline-block",
                      marginTop: "0.3rem",
                      color: palette.link,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    Voir le résultat du tirage
                  </Link>
                </div>
              ) : null}
            </section>
          ) : (
            <details
              style={{
                width: "100%",
                maxWidth: "36rem",
                marginTop: "1.25rem",
                textAlign: "left",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  color: palette.link,
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  listStyle: "none",
                }}
              >
                Questions déjà passées ({historiqueQuestions.length})
              </summary>
              <ol
                style={{
                  margin: "0.65rem 0 0 0",
                  paddingLeft: "1.2rem",
                  color: palette.muted,
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                  listStylePosition: "outside",
                }}
              >
                {historiqueQuestions.map((p) => (
                  <li key={p.id} style={{ marginBottom: "0.75rem" }}>
                    <span style={{ display: "block", marginBottom: "0.3rem" }}>
                      {p.label}
                    </span>
                    {p.id !== "__active__" ? (
                      <Link
                        href={`/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(p.id)}`}
                        style={{
                          display: "inline-block",
                          color: palette.link,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        Voir le sondage (résultats)
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
              {winningContestPolls.length > 0 ? (
                <div
                  style={{
                    marginTop: "0.72rem",
                    borderTop: `1px solid ${palette.headerBorder}`,
                    paddingTop: "0.62rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#16a34a",
                    }}
                  >
                    🎉 Félicitations, vous avez été tiré au sort !
                  </p>
                  <Link
                    href={`/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(
                      winningContestPolls[0].id,
                    )}`}
                    style={{
                      display: "inline-block",
                      marginTop: "0.3rem",
                      color: palette.link,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    Voir le résultat du tirage
                  </Link>
                </div>
              ) : null}
            </details>
          )
        ) : null}
      </div>

      {!loading && !error && eventId && scene !== "finished" ? (
        <footer
          style={{
            flexShrink: 0,
            padding: "1rem clamp(1rem, 4vw, 2rem) 1.35rem",
            textAlign: "center",
            borderTop: `1px solid ${palette.headerBorder}`,
            background: palette.footerBg,
            backdropFilter: "blur(8px)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.88rem, 2.8vw, 1rem)",
              fontWeight: 500,
              color: palette.muted,
              lineHeight: 1.5,
              maxWidth: "28rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {piedEncouragement}
          </p>
        </footer>
      ) : null}
    </main>
    </>
  );
}
