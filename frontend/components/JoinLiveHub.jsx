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
import { API_URL, SOCKET_URL } from "@/lib/config";

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

function AttenteAnimee() {
  return (
    <>
      <style>{`
        @keyframes join-hub-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
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
            background: "rgba(148, 163, 184, 0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, transparent, #38bdf8, transparent)",
              animation: "join-hub-bar 1.8s ease-in-out infinite",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            fontSize: "2rem",
            fontWeight: 800,
            color: "#94a3b8",
            letterSpacing: "0.02em",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                animation: "join-hub-dot 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
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
    setLogoUrl(typeof lu === "string" && lu.trim() ? lu.trim() : null);
    const bu = data.backgroundUrl;
    setBackgroundUrl(typeof bu === "string" && bu.trim() ? bu.trim() : null);
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
              ? p.logoUrl
              : null,
        backgroundUrl:
          p.backgroundUrl === undefined || p.backgroundUrl === ""
            ? null
            : typeof p.backgroundUrl === "string"
              ? p.backgroundUrl
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

  const scene = String(liveState || "").toLowerCase();
  const vs = String(voteState || "").toLowerCase();
  const ds = String(displayState || "").toLowerCase();

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

  const votePath = `/p/${encodeURIComponent(slug)}`;

  function participer() {
    router.push(votePath);
  }

  const progressionLigne = useMemo(() => {
    if (!pollsProgress) return null;
    const { current, total } = pollsProgress;
    const rest = total - current;
    if (rest > 0) {
      return `Question ${current} sur ${total} · ${rest} restante${rest > 1 ? "s" : ""}`;
    }
    return `Question ${current} sur ${total}`;
  }, [pollsProgress]);

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

  const isDark = resolveJoinRoomIsDark(effectiveThemeMode, prefersDark);
  const accent = joinRoomAccent(effectivePrimaryColor);
  const palette = useMemo(
    () => createJoinRoomPalette(isDark, accent),
    [isDark, accent],
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
      border: `1px solid ${palette.cardBorder}`,
      background: palette.cardBg,
      boxShadow: isDark
        ? "0 24px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
        : "0 20px 40px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
      textAlign: "center",
      boxSizing: "border-box",
    }),
    [palette, isDark],
  );

  let piedEncouragement =
    "Restez connectés — le direct continue.";
  if (scene === "results") {
    piedEncouragement = "Préparez-vous à voter pour la suite.";
  } else if (enAttenteRevealAuto) {
    piedEncouragement = "Les résultats s’affichent aussi sur grand écran.";
  } else if (scene === "voting") {
    piedEncouragement = "Touchez le bouton lorsque vous êtes prêt à voter.";
  } else if (scene === "paused") {
    piedEncouragement = "La reprise du direct est imminente.";
  }

  let corps = null;

  if (!loading && !error && eventId) {
    if (scene === "finished") {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1.15rem, 4vw, 1.5rem)",
              fontWeight: 700,
              lineHeight: 1.45,
              color: palette.fg2,
            }}
          >
            Événement terminé
          </p>
          <p
            style={{
              margin: "0.85rem 0 0 0",
              fontSize: "clamp(0.95rem, 3vw, 1.1rem)",
              color: palette.muted,
              lineHeight: 1.5,
            }}
          >
            Merci d’avoir participé.
          </p>
        </>
      );
    } else if (enAttenteRevealAuto) {
      corps =
        secondesAvantResultats != null ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              Vote terminé
            </p>
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
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              Vote terminé
            </p>
            <p
              style={{
                margin: "0.75rem 0 0 0",
                fontSize: "clamp(1.1rem, 3.5vw, 1.35rem)",
                fontWeight: 600,
                color: palette.muted2,
              }}
            >
              Résultats dans quelques instants
            </p>
            <div style={{ marginTop: "1.25rem" }}>
              <AttenteAnimee />
            </div>
          </>
        );
    } else if (scene === "voting") {
      corps = (
        <>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(1.2rem, 4.2vw, 1.65rem)",
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "-0.02em",
              color: palette.fg,
            }}
          >
            {activePollQuestion || "Vote ouvert"}
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
            type="button"
            onClick={participer}
            style={{
              marginTop: "1.35rem",
              width: "100%",
              maxWidth: "20rem",
              alignSelf: "center",
              padding: "1.05rem 1.4rem",
              fontSize: "clamp(1.05rem, 3.5vw, 1.15rem)",
              fontWeight: 700,
              border: "none",
              borderRadius: "14px",
              background: `linear-gradient(135deg, ${accent}, #6366f1)`,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 8px 28px rgba(0, 0, 0, 0.22)",
            }}
          >
            Participer au vote
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
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#fde68a",
            }}
          >
            Vote terminé
          </p>
          <h2
            style={{
              margin: "0.75rem 0 0 0",
              fontSize: "clamp(1.15rem, 4vw, 1.55rem)",
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "-0.02em",
              color: palette.fg,
            }}
          >
            {activePollQuestion || "Dernier sondage"}
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
                Voir les résultats
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
            Préparez-vous pour la prochaine question…
          </p>
          <div style={{ marginTop: "1.35rem" }}>
            <AttenteAnimee />
          </div>
        </>
      );
    } else if (scene === "paused") {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 5vw, 2rem)",
              fontWeight: 800,
              color: "#fbbf24",
            }}
          >
            Pause
          </p>
          <p
            style={{
              margin: "0.85rem 0 0 0",
              fontSize: "clamp(1rem, 3.2vw, 1.15rem)",
              color: palette.muted,
              lineHeight: 1.5,
            }}
          >
            Le direct reprend bientôt.
          </p>
          <div style={{ marginTop: "1.35rem" }}>
            <AttenteAnimee />
          </div>
        </>
      );
    } else {
      corps = (
        <>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1.45rem, 5.5vw, 2.35rem)",
              fontWeight: 800,
              lineHeight: 1.25,
              color: palette.fg2,
            }}
          >
            Prochaine question bientôt
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
            La régie prépare la suite du live.
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <AttenteAnimee />
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
      `}</style>

      <header
        style={{
          flexShrink: 0,
          padding: "clamp(0.85rem, 3vw, 1.15rem) clamp(1rem, 4vw, 1.75rem)",
          borderBottom: `1px solid ${palette.headerBorder}`,
          background: palette.headerBg,
          backdropFilter: "blur(8px)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.875rem" }}>
          <Link href="/" style={{ color: palette.link, fontWeight: 600 }}>
            ← Accueil
          </Link>
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          {effectiveLogoUrl ? (
            <img
              src={effectiveLogoUrl}
              alt=""
              style={{
                width: "2.5rem",
                height: "2.5rem",
                objectFit: "contain",
                borderRadius: "10px",
                background: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              }}
            />
          ) : null}
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.05rem, 3.2vw, 1.35rem)",
              fontWeight: 800,
              color: palette.fg,
              letterSpacing: "-0.02em",
              lineHeight: 1.35,
              flex: "1 1 12rem",
            }}
          >
            {eventTitle || "Événement live"}
          </h1>
        </div>
        {!loading && !error && effectiveDescription ? (
          <p
            style={{
              margin: "0.45rem 0 0 0",
              fontSize: "0.82rem",
              color: palette.muted,
              lineHeight: 1.45,
              maxWidth: "40rem",
            }}
          >
            {effectiveDescription}
          </p>
        ) : null}
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
      </header>

      <div style={zoneMain}>
        {loading ? (
          <div style={carteCentral}>
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
          <div style={carteCentral}>
            <p style={{ margin: 0, color: "#fca5a5" }} role="alert">
              {error}
            </p>
          </div>
        ) : null}

        {!loading && !error && corps ? (
          <div style={carteCentral}>{corps}</div>
        ) : null}

        {!loading && !error && pastPolls.length > 0 ? (
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
              Questions déjà passées ({pastPolls.length})
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
              {pastPolls.map((p) => (
                <li key={p.id} style={{ marginBottom: "0.75rem" }}>
                  <span style={{ display: "block", marginBottom: "0.3rem" }}>
                    {p.label}
                  </span>
                  <Link
                    href={`/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(p.id)}`}
                    style={{
                      color: palette.link,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    Voir le sondage (résultats)
                  </Link>
                </li>
              ))}
            </ol>
          </details>
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
