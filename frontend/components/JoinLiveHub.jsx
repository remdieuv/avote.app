"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
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
  LIVE_UX_STATE,
  getLiveStatePresentation,
  getLiveStateTone,
} from "@/lib/liveStateUx";
import {
  normalizeLiveAxes,
  normalizePollJson,
} from "@/lib/normalizeLivePayload";
import {
  getParticipantFullLabel,
  getParticipantOfflineLabel,
  resolveJoinHistoriqueQuestions,
  shouldEmbedPollSurfaceInRoom,
  shouldJoinApplySocketLiveAxesImmediately,
  shouldJoinSocketJoinActivePoll,
  shouldShowParticipantFullUi,
} from "@/lib/participantLiveFlow";
import {
  buildJoinPollCardSurfaces,
  getLiveStateVisualTokens,
} from "@/lib/liveStateVisual";
import { ExperienceHeader } from "@/components/navigation/ExperienceHeader";
import { PollExperience } from "@/components/PollExperience";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";

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
 * Salle live permanente `/join/[slug]` — le contenu évolue (WAITING→…→FINISHED)
 * sans navigation automatique vers `/p`.
 * @param {{ slug: string }} props
 */
export function JoinLiveHub({ slug }) {
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
  /** ACTIVE | CLOSED | DRAFT | … — pour resolveLiveUxState (copie jamais lancée ≠ CLOSED UX). */
  /** @type {string | null} */
  const [activePollStatus, setActivePollStatus] = useState(null);
  /** @type {{ current: number; total: number } | null} */
  const [pollsProgress, setPollsProgress] = useState(null);
  /** @type {{ id: string; label: string }[]} */
  const [pastPolls, setPastPolls] = useState([]);
  /** @type {Record<string, boolean>} */
  const [contestWinByPollId, setContestWinByPollId] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  /** null = pas encore de socket ; true/false = statut connexion */
  const [socketOnline, setSocketOnline] = useState(/** @type {boolean | null} */ (null));
  /** Bump pour sync PollExperience embedded (un seul socket Join). */
  const [liveSyncRevision, setLiveSyncRevision] = useState(0);
  /** Snapshot `poll_updated` relayé (peers) — même io Join, pas de 2ᵉ socket. */
  const [embeddedPollSnapshot, setEmbeddedPollSnapshot] = useState(
    /** @type {object | null} */ (null),
  );
  const [embeddedPollRevision, setEmbeddedPollRevision] = useState(0);
  const socketRef = useRef(/** @type {import("socket.io-client").Socket | null} */ (null));
  const activePollIdRef = useRef(/** @type {string | null} */ (null));
  const joinedPollIdRef = useRef(/** @type {string | null} */ (null));
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
  /** Landing `/e/[slug]` activée (lien discret vers vitrine). */
  const [landingEnabled, setLandingEnabled] = useState(false);
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
      setActivePollStatus(null);
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
      setLandingEnabled(false);
      setIsLocked(false);
      setPreviewCustomization(null);
      return;
    }
    if (!res.ok) {
      setError(`Erreur ${res.status}`);
      return;
    }
    const data = await res.json();
    const axes = normalizeLiveAxes(data);
    setError(null);
    setIsLocked(
      axes.isLocked != null ? Boolean(axes.isLocked) : Boolean(data.isLocked),
    );
    setEventId(data.id ?? null);
    setEventTitle(
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : null,
    );
    setLiveState(axes.liveState);
    setVoteState(axes.voteState);
    setDisplayState(axes.displayState);
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
    const aps = data.activePollStatus;
    setActivePollStatus(
      typeof aps === "string" && aps.trim()
        ? String(aps).trim().toUpperCase()
        : null,
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
    setLandingEnabled(Boolean(data.landingEnabled));
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
    activePollIdRef.current = activePollId;
  }, [activePollId]);

  useEffect(() => {
    if (!eventId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    function syncPollRoom(pollId) {
      const next =
        typeof pollId === "string" && pollId.trim() ? pollId.trim() : null;
      const prev = joinedPollIdRef.current;
      if (prev && prev !== next) {
        socket.emit("leave_poll", prev);
      }
      if (next && shouldJoinSocketJoinActivePoll({ activePollId: next })) {
        socket.emit("join_poll", next);
        joinedPollIdRef.current = next;
      } else {
        joinedPollIdRef.current = null;
      }
    }

    function onConnect() {
      setSocketOnline(true);
      socket.emit("join_event", eventId);
      syncPollRoom(activePollIdRef.current);
      setLiveSyncRevision((n) => n + 1);
      void fetchMeta();
    }

    function onDisconnect() {
      setSocketOnline(false);
    }

    /** @param {any} payload */
    function onEventLive(payload) {
      if (
        payload?.eventId != null &&
        String(payload.eventId) !== String(eventId)
      ) {
        return;
      }
      // A8 — axes live immédiats, puis réconciliation fetchMeta (activePollStatus, pastPolls…).
      if (shouldJoinApplySocketLiveAxesImmediately()) {
        const axes = normalizeLiveAxes(payload);
        if (axes.liveState) setLiveState(axes.liveState);
        if (axes.voteState) setVoteState(axes.voteState);
        if (axes.displayState) setDisplayState(axes.displayState);
        if (axes.isLocked != null) setIsLocked(Boolean(axes.isLocked));
        if (payload?.activePollId != null) {
          const ap =
            typeof payload.activePollId === "string" &&
            payload.activePollId.trim()
              ? payload.activePollId.trim()
              : null;
          setActivePollId(ap);
          activePollIdRef.current = ap;
          syncPollRoom(ap);
        }
        if (typeof payload?.autoRevealShowResultsAt === "string") {
          setAutoRevealShowResultsAt(payload.autoRevealShowResultsAt);
        } else if (payload && "autoRevealShowResultsAt" in payload) {
          setAutoRevealShowResultsAt(null);
        }
        if (payload?.questionTimer && typeof payload.questionTimer === "object") {
          setQuestionTimer(payload.questionTimer);
        }
        if (payload?.poll && typeof payload.poll === "object") {
          const pollNorm = normalizePollJson(payload.poll);
          const st = pollNorm?.status;
          if (typeof st === "string" && st.trim()) {
            setActivePollStatus(String(st).trim().toUpperCase());
          }
          setEmbeddedPollSnapshot(pollNorm);
          setEmbeddedPollRevision((n) => n + 1);
        }
      }
      setLiveSyncRevision((n) => n + 1);
      void fetchMeta();
    }

    /** A3 — votes peers via room poll, sans second io(). */
    /** @param {any} payload */
    function onPollUpdated(payload) {
      if (!payload || typeof payload !== "object" || !payload.id) return;
      const current = activePollIdRef.current;
      if (current && String(payload.id) !== String(current)) return;
      const pollNorm = normalizePollJson(payload);
      const axes = normalizeLiveAxes(pollNorm);
      setEmbeddedPollSnapshot(pollNorm);
      setEmbeddedPollRevision((n) => n + 1);
      if (typeof pollNorm?.status === "string" && pollNorm.status.trim()) {
        setActivePollStatus(String(pollNorm.status).trim().toUpperCase());
      }
      if (axes.liveState) setLiveState(axes.liveState);
      if (axes.voteState) setVoteState(axes.voteState);
      if (axes.displayState) setDisplayState(axes.displayState);
    }

    /** @param {any} payload */
    function onCustomizationUpdated(payload) {
      if (
        !payload?.eventId ||
        String(payload.eventId) !== String(eventId)
      ) {
        return;
      }
      setLiveSyncRevision((n) => n + 1);
      void fetchMeta();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    else setSocketOnline(false);
    socket.on("event_live_updated", onEventLive);
    socket.on("poll_updated", onPollUpdated);
    socket.on("event:customization_updated", onCustomizationUpdated);

    return () => {
      const prevPoll = joinedPollIdRef.current;
      if (prevPoll) socket.emit("leave_poll", prevPoll);
      joinedPollIdRef.current = null;
      socket.emit("leave_event", eventId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("event_live_updated", onEventLive);
      socket.off("poll_updated", onPollUpdated);
      socket.off("event:customization_updated", onCustomizationUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId, fetchMeta]);

  /** Quand activePollId change (meta/socket), rejoindre la room poll sur le même io. */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const next =
      typeof activePollId === "string" && activePollId.trim()
        ? activePollId.trim()
        : null;
    const prev = joinedPollIdRef.current;
    if (prev && prev !== next) {
      socket.emit("leave_poll", prev);
    }
    if (next && shouldJoinSocketJoinActivePoll({ activePollId: next })) {
      socket.emit("join_poll", next);
      joinedPollIdRef.current = next;
    } else if (!next) {
      joinedPollIdRef.current = null;
    }
  }, [activePollId]);

  const sceneRaw = String(liveState || "").toLowerCase();
  const vs = String(voteState || "").toLowerCase();
  /** displayState API/socket réel — ne pas reconstruire depuis un collapse 3 états */
  const ds =
    typeof displayState === "string" && displayState.trim()
      ? displayState.toLowerCase()
      : null;

  const joinUxContextBase = useMemo(
    () => ({
      liveScene: sceneRaw || null,
      displayState: ds,
      voteState: vs || null,
      // Statut réel du poll pointé (ACTIVE sur une copie jamais lancée → WAITING, pas CLOSED).
      pollStatus: activePollStatus,
      hasActivePoll: Boolean(activePollId),
    }),
    [sceneRaw, ds, vs, activePollStatus, activePollId],
  );

  const joinPresCore = useMemo(
    () => getLiveStatePresentation(joinUxContextBase),
    [joinUxContextBase],
  );

  /** Scène UX canonique (6 états) via resolveLiveUxState — plus de finished|voting|waiting seul */
  const scene = String(joinPresCore.ux || LIVE_UX_STATE.WAITING).toLowerCase();

  const enAttenteRevealAuto = useMemo(() => {
    if (vs !== "closed") return false;
    if (String(ds || "").toLowerCase() === "results") return false;
    if (scene === "results" || scene === "finished") return false;
    if (typeof autoRevealShowResultsAt !== "string") return false;
    return (
      new Date(autoRevealShowResultsAt).getTime() > Date.now() - 500
    );
  }, [vs, ds, scene, autoRevealShowResultsAt]);

  const joinUxContext = useMemo(
    () => ({
      ...joinUxContextBase,
      autoReveal: enAttenteRevealAuto,
      autoRevealShowResultsAt,
    }),
    [joinUxContextBase, enAttenteRevealAuto, autoRevealShowResultsAt],
  );

  const joinPres = useMemo(
    () => getLiveStatePresentation(joinUxContext),
    [joinUxContext],
  );

  /** isLocked peut être true après Terminer (réel) — ne pas confondre avec FULL. */
  const roomIsFull = shouldShowParticipantFullUi({
    isLocked,
    uxState: scene,
  });
  const isOffline = socketOnline === false;

  /** Vote / confirmation / CLOSED / RESULTS — dans la Salle, sans quitter `/join`. */
  const embedPollSurface = shouldEmbedPollSurfaceInRoom({
    uxState: scene,
    isFull: roomIsFull,
    loading: loading || !!error || !eventId,
  });

  const getPollUrlForRoom = useCallback(() => {
    const base = `${API_URL}/p/${encodeURIComponent(slug)}`;
    if (activePollId) {
      return `${base}?poll=${encodeURIComponent(activePollId)}`;
    }
    return base;
  }, [slug, activePollId]);

  const progressionLigne = useMemo(() => {
    if (!pollsProgress) return null;
    const { current, total } = pollsProgress;
    const rest = total - current;
    if (rest > 0) {
      return `Question ${current} sur ${total} · ${rest} restante${rest > 1 ? "s" : ""}`;
    }
    return `Question ${current} sur ${total}`;
  }, [pollsProgress]);
  /** pastPolls API uniquement — pas de préfixe de la question active (isolation copie). */
  const historiqueQuestions = useMemo(
    () => resolveJoinHistoriqueQuestions(pastPolls),
    [pastPolls],
  );
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
      padding:
        "clamp(1rem, 4vw, 2rem) clamp(1rem, 5vw, 2.5rem) max(2rem, env(safe-area-inset-bottom, 0px))",
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

  const piedEncouragement =
    roomIsFull || embedPollSurface
      ? null
      : scene === "finished"
        ? null
        : "Garde cette page ouverte : la session continue en direct.";

  let corps = null;

  if (!loading && !error && eventId && !embedPollSurface) {
    if (roomIsFull) {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: `clamp(${1.2 * joinVisualTokens.titleClampMul}rem, ${4.2 * joinVisualTokens.titleClampMul}vw, ${1.75 * joinVisualTokens.titleClampMul}rem)`,
              fontWeight: joinVisualTokens.stateBadgeWeight,
              lineHeight: 1.35,
              color: palette.fg2,
            }}
          >
            {getParticipantFullLabel()}
          </p>
          <p
            style={{
              margin: "0.85rem 0 0 0",
              fontSize: "clamp(0.98rem, 3.1vw, 1.12rem)",
              fontWeight: 500,
              color: palette.muted,
              lineHeight: 1.55,
              maxWidth: "26rem",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Impossible de rejoindre le vote pour le moment. Réessaie plus tard ou demande à l’organisateur.
          </p>
        </>
      );
    } else if (scene === "finished") {
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
            padding: 0.75rem 0.8rem max(1.25rem, env(safe-area-inset-bottom, 0px)) !important;
          }
          .join-live-card {
            max-width: 100% !important;
            padding: 1rem 0.9rem !important;
            border-radius: 16px !important;
          }
          .join-landing-link-label-long {
            display: none !important;
          }
          .join-landing-link-label-short {
            display: inline !important;
          }
        }
        .join-landing-link-label-short {
          display: none;
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
        {!loading && !error && landingEnabled ? (
          <div style={{ marginTop: "0.65rem" }}>
            <Link
              href={`/e/${encodeURIComponent(slug)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "2.1rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "10px",
                border: `1px solid ${palette.headerBorder}`,
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.82)",
                color: palette.fg2,
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              <span className="join-landing-link-label-long">📸 Voir les photos & infos</span>
              <span className="join-landing-link-label-short">📸 Photos & infos</span>
            </Link>
          </div>
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
        {isOffline && !loading ? (
          <div
            role="status"
            style={{
              width: "100%",
              maxWidth: "min(36rem, 100%)",
              marginBottom: "0.85rem",
              padding: "0.85rem 1rem",
              borderRadius: "14px",
              border: isDark
                ? "1px solid rgba(251, 191, 36, 0.4)"
                : "1px solid rgba(217, 119, 6, 0.35)",
              background: isDark
                ? "rgba(120, 53, 15, 0.35)"
                : "rgba(254, 243, 199, 0.95)",
              color: isDark ? "#fde68a" : "#92400e",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>
              {getParticipantOfflineLabel()}
            </p>
            <button
              type="button"
              onClick={() => {
                void fetchMeta();
              }}
              style={{
                marginTop: "0.65rem",
                minHeight: "44px",
                padding: "0.55rem 1.1rem",
                borderRadius: "10px",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                background: accent,
                color: "#fff",
              }}
            >
              Réessayer
            </button>
          </div>
        ) : null}

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

        {!loading && !error && embedPollSurface ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            <PollExperience
              key={`room-poll-${activePollId || "live"}`}
              getPollUrl={getPollUrlForRoom}
              titrePage={eventTitle || "Salle live"}
              slugPublic={slug}
              embedded
              parentSocketOnline={socketOnline}
              parentLiveRevision={liveSyncRevision}
              parentPollSnapshot={embeddedPollSnapshot}
              parentPollRevision={embeddedPollRevision}
              parentEventId={eventId}
              parentLiveState={liveState}
              parentVoteState={voteState}
              parentDisplayState={displayState}
              parentIsLocked={isLocked}
              parentPrimaryColor={effectivePrimaryColor}
              parentThemeMode={effectiveThemeMode}
              parentOverlayStrength={effectiveOverlayStrength}
            />
          </div>
        ) : null}

        {!loading && !error && !embedPollSurface && corps ? (
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
              {joinPres.title}
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
