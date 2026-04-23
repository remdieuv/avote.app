"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { io } from "socket.io-client";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";
import { formatCountdownVerbose } from "@/lib/chronoFormat";
import {
  buildJoinRoomShellStyle,
  createJoinRoomPalette,
  glassPanelStyle,
  joinRoomAccent,
  joinRoomOverlayAlpha,
  resolveJoinRoomIsDark,
} from "@/lib/joinRoomVisual";
import {
  estPollNotation,
  optionsNotationOrdonnees,
} from "@/lib/notationPoll";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { API_URL, SOCKET_URL } from "@/lib/config";
import {
  LIVE_UX_BODY_POLL_NO_POLL_SLUG,
  LIVE_UX_BODY_POLL_WAITING,
  LIVE_UX_STATE,
  getUxState,
  getLiveStatePresentation,
  getLiveStateTone,
} from "@/lib/liveStateUx";
import {
  buildJoinPollCardSurfaces,
  getLiveStateVisualTokens,
  mergeCardBorderWithAccent,
  stateBadgeTypography,
} from "@/lib/liveStateVisual";
import { ExperienceHeader } from "@/components/navigation/ExperienceHeader";

const API_POLLS = `${API_URL}/polls`;

/** @param {number | null | undefined} x */
function formatNotationMoyenneUneDecimale(x) {
  if (x == null || Number.isNaN(x)) return "—";
  return x.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** @param {string} pollId */
function cleVotePourPoll(pollId) {
  return `avote_voted_poll_${pollId}`;
}
/** @param {string} pollId */
function cleOptionsVotePourPoll(pollId) {
  return `avote_voted_options_poll_${pollId}`;
}

function contestEligibleCountFromPoll(poll) {
  const opts = Array.isArray(poll?.options) ? poll.options : [];
  const triggerId = String(poll?.leadTriggerOptionId || "");
  if (!triggerId) return 0;
  const trigger = opts.find((o) => String(o?.id || "") === triggerId);
  return Number(trigger?.voteCount ?? trigger?.votes ?? 0) || 0;
}

/**
 * /p ne doit pas suivre les bascules d'affichage projection.
 * On garde une scène participant stable: vote ouvert => voting, sinon waiting, sauf finished.
 * @param {string | null | undefined} liveState
 * @param {string | null | undefined} voteState
 */
function deriveParticipantLiveScene(liveState, voteState) {
  const ls = String(liveState || "").toLowerCase();
  if (ls === "finished") return "finished";
  const vs = String(voteState || "").toLowerCase();
  return vs === "open" ? "voting" : "waiting";
}

/**
 * Carte « vote clos, résultats pas encore à la salle » — teintée par l’accent événement.
 * @param {{ accent: string; isDark: boolean }} props
 */
function CarteVoteTermineAttenteResultats({ accent, isDark }) {
  const a = joinRoomAccent(accent);
  return (
    <>
      <style>
        {`
          @keyframes avote-attente-pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 color-mix(in srgb, ${a} 40%, transparent); }
            50% { opacity: 0.97; box-shadow: 0 0 0 8px transparent; }
          }
          @keyframes avote-dot-fade {
            0%, 80%, 100% { opacity: 0.25; }
            40% { opacity: 1; }
          }
        `}
      </style>
      <div
        role="status"
        aria-live="polite"
        style={{
          marginBottom: "1.25rem",
          padding: "1.35rem 1.5rem",
          borderRadius: "16px",
          border: `1px solid color-mix(in srgb, ${a} 42%, transparent)`,
          background: isDark
            ? `color-mix(in srgb, ${a} 22%, rgba(15, 23, 42, 0.88))`
            : `color-mix(in srgb, ${a} 16%, #ffffff)`,
          animation: "avote-attente-pulse 2.4s ease-in-out infinite",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            fontSize: "1.2rem",
            fontWeight: 800,
            color: a,
            letterSpacing: "-0.02em",
          }}
        >
          {getUxState({ liveState: "CLOSED" }).label}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.98rem",
            color: isDark ? "rgba(226, 232, 240, 0.92)" : "#334155",
            fontWeight: 500,
            lineHeight: 1.45,
          }}
        >
          Les résultats vont être affichés dans quelques instants
          <span
            aria-hidden
            style={{
              display: "inline-block",
              marginLeft: "0.15em",
              fontWeight: 800,
            }}
          >
            <span
              style={{
                animation: "avote-dot-fade 1.2s ease-in-out infinite",
              }}
            >
              .
            </span>
            <span
              style={{
                animation: "avote-dot-fade 1.2s ease-in-out infinite",
                animationDelay: "0.2s",
              }}
            >
              .
            </span>
            <span
              style={{
                animation: "avote-dot-fade 1.2s ease-in-out infinite",
                animationDelay: "0.4s",
              }}
            >
              .
            </span>
          </span>
        </p>
      </div>
    </>
  );
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

/**
 * @param {{
 *   getPollUrl: () => string;
 *   titrePage: string;
 *   retourHref?: string;
 *   retourLabel?: string;
 *   slugPublic?: string | null;
 * }} props
 */
export function PollExperience({
  getPollUrl,
  titrePage,
  retourHref = "/",
  retourLabel = "← Retour",
  slugPublic = null,
}) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollFetch404Slug, setPollFetch404Slug] = useState(false);
  const [activePollIdFromSlug, setActivePollIdFromSlug] = useState(
    /** @type {string | null} */ (null),
  );
  /** voting | results | waiting | finished | paused | null */
  const [liveScene, setLiveScene] = useState(null);
  const [eventId, setEventId] = useState(null);
  /** Contexte événement quand le JSON poll manque (ex. socket sans payload.poll après fin de chrono) */
  const [eventVoteStateUi, setEventVoteStateUi] = useState(null);
  const [eventDisplayStateUi, setEventDisplayStateUi] = useState(null);

  const [voteError, setVoteError] = useState(null);
  /** SINGLE_CHOICE */
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  /** MULTIPLE_CHOICE */
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [aDejaVoteEnStockage, setADejaVoteEnStockage] = useState(false);
  const [votedOptionIdsEnStockage, setVotedOptionIdsEnStockage] = useState([]);
  const [merciPourVote, setMerciPourVote] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState(null);
  const [contestPublicWinners, setContestPublicWinners] = useState([]);
  const [isContestWinnerMe, setIsContestWinnerMe] = useState(false);
  const [storageVerifie, setStorageVerifie] = useState(false);
  /** Barres résultats : anim 0% → % après paint */
  const [resultsBarsAnimated, setResultsBarsAnimated] = useState(false);
  const [chronoTick, setChronoTick] = useState(0);
  /** Recalcul affichage auto-reveal (sans attendre le socket) */
  const [autoRevealUiTick, setAutoRevealUiTick] = useState(0);

  /** Identité salle /join (continuité visuelle sur /p) */
  const [eventTitleFromApi, setEventTitleFromApi] = useState(null);
  const [roomLogoUrl, setRoomLogoUrl] = useState(null);
  const [roomBackgroundUrl, setRoomBackgroundUrl] = useState(null);
  const [roomPrimaryColor, setRoomPrimaryColor] = useState(null);
  const [roomThemeMode, setRoomThemeMode] = useState(null);
  const [roomOverlayStrength, setRoomOverlayStrength] = useState(null);
  const [roomSolidBackgroundColor, setRoomSolidBackgroundColor] =
    useState(null);
  const [prefersDark, setPrefersDark] = useState(true);

  const voteLockRef = useRef(false);
  /** True si GET /events/slug a renvoyé 404 — évite d’écraser l’erreur avec un message « en attente » */
  const evenementInvalideRef = useRef(false);
  /** Annule le fetch GET /p/:slug si la régie (socket) a déjà poussé un état plus récent → évite flicker 404→poll */
  const loadPollAbortRef = useRef(null);
  const finChronoRefetchEffectueRef = useRef(false);
  const pollId = poll?.id ?? null;

  const loadEventMetaForBranding = useCallback(async () => {
    const slugToFetch =
      (typeof slugPublic === "string" && slugPublic.trim()) ||
      (typeof poll?.eventSlug === "string" && poll.eventSlug.trim()) ||
      null;

    if (!slugToFetch) {
      if (!slugPublic) evenementInvalideRef.current = false;
      return;
    }

    if (slugPublic) evenementInvalideRef.current = false;

    try {
      const res = await fetch(
        `${API_URL}/events/slug/${encodeURIComponent(slugToFetch)}`,
        { cache: "no-store" },
      );

      if (res.status === 404) {
        if (slugPublic) {
          evenementInvalideRef.current = true;
          setError("Événement introuvable.");
          setEventId(null);
          setActivePollIdFromSlug(null);
        }
        return;
      }
      if (!res.ok) {
        if (slugPublic) setError(`Erreur ${res.status}`);
        return;
      }
      const meta = await res.json();
      setEventId(meta.id);
      if (typeof meta.activePollId === "string" && meta.activePollId.trim()) {
        setActivePollIdFromSlug(meta.activePollId.trim());
      } else {
        setActivePollIdFromSlug(null);
      }
      setLiveScene(meta.liveState ?? null);
      setEventVoteStateUi(
        typeof meta.voteState === "string"
          ? meta.voteState.toLowerCase()
          : null,
      );
      setEventDisplayStateUi(
        typeof meta.displayState === "string"
          ? meta.displayState.toLowerCase()
          : null,
      );

      setEventTitleFromApi(
        typeof meta.title === "string" && meta.title.trim()
          ? meta.title.trim()
          : null,
      );
      const lu = meta.logoUrl;
      setRoomLogoUrl(
        typeof lu === "string" && lu.trim()
          ? resolveApiAssetUrlNullable(lu.trim())
          : null,
      );
      const bu = meta.backgroundUrl;
      setRoomBackgroundUrl(
        typeof bu === "string" && bu.trim()
          ? resolveApiAssetUrlNullable(bu.trim())
          : null,
      );
      const pc = meta.primaryColor;
      setRoomPrimaryColor(
        typeof pc === "string" && /^#[0-9A-Fa-f]{6}$/.test(pc.trim())
          ? pc.trim()
          : null,
      );
      const tm = meta.themeMode;
      setRoomThemeMode(
        typeof tm === "string" && tm.trim() ? tm.trim().toLowerCase() : null,
      );
      const os = meta.backgroundOverlayStrength;
      setRoomOverlayStrength(
        typeof os === "string" && os.trim() ? os.trim().toLowerCase() : null,
      );
      const rbc = meta.roomBackgroundColor;
      setRoomSolidBackgroundColor(
        typeof rbc === "string" && /^#[0-9A-Fa-f]{6}$/.test(rbc.trim())
          ? rbc.trim()
          : null,
      );
    } catch {
      if (slugPublic) {
        setError("Impossible de joindre l’API (port 4000 ?).");
      }
    }
  }, [slugPublic, poll?.eventSlug]);

  useEffect(() => {
    void loadEventMetaForBranding();
  }, [loadEventMetaForBranding]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setPrefersDark(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    setMerciPourVote(false);
    setVotedOptionIdsEnStockage([]);
    if (!pollId) {
      setStorageVerifie(true);
      return;
    }
    try {
      if (typeof window !== "undefined") {
        const marqueur = window.localStorage.getItem(cleVotePourPoll(pollId));
        setADejaVoteEnStockage(marqueur === "true" || marqueur === "1");
        const rawOpts = window.localStorage.getItem(cleOptionsVotePourPoll(pollId));
        const parsed = rawOpts ? JSON.parse(rawOpts) : [];
        if (Array.isArray(parsed)) {
          const ids = parsed
            .map((x) => String(x || "").trim())
            .filter(Boolean);
          setVotedOptionIdsEnStockage(ids);
          setSelectedOptionIds(ids);
          setSelectedOptionId(ids[0] || null);
        }
      }
    } catch {
      // navigation privée, etc.
    } finally {
      setStorageVerifie(true);
    }
  }, [pollId]);

  useEffect(() => {
    setSelectedOptionId(null);
    setSelectedOptionIds([]);
  }, [pollId]);

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
        setPollFetch404Slug(false);
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
            setPollFetch404Slug(true);
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

        setLiveScene(
          deriveParticipantLiveScene(data.eventLiveState, data.eventVoteState),
        );
        if (data.eventId) {
          setEventId(data.eventId);
        }
        if (typeof data.eventVoteState === "string") {
          setEventVoteStateUi(data.eventVoteState.toLowerCase());
        }
        if (typeof data.eventDisplayState === "string") {
          setEventDisplayStateUi(data.eventDisplayState.toLowerCase());
        }
        if (silent) {
          flushSync(() => {
            setPoll(data);
            setVoteError(null);
          });
        } else {
          setPoll(data);
          setVoteError(null);
        }
        setPollFetch404Slug(false);
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

  useEffect(() => {
    const iso = poll?.autoRevealShowResultsAt;
    if (
      !poll?.autoReveal ||
      typeof iso !== "string" ||
      new Date(iso).getTime() <= Date.now() + 800
    ) {
      return;
    }
    const id = window.setInterval(
      () => setAutoRevealUiTick((n) => n + 1),
      1000,
    );
    return () => window.clearInterval(id);
  }, [poll?.autoReveal, poll?.autoRevealShowResultsAt]);

  useEffect(() => {
    return () => {
      loadPollAbortRef.current?.abort();
      loadPollAbortRef.current = null;
    };
  }, []);

  useEffect(() => {
    finChronoRefetchEffectueRef.current = false;
  }, [pollId]);

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

  useEffect(() => {
    const sessionVoteOuverte =
      (typeof poll?.eventVoteState === "string"
        ? poll.eventVoteState.toLowerCase() === "open"
        : liveScene === "voting") && poll?.status === "ACTIVE";
    if (!sessionVoteOuverte) return;
    if (secondesChronoVote == null) return;
    if (secondesChronoVote >= 1) return;
    if (finChronoRefetchEffectueRef.current) return;
    finChronoRefetchEffectueRef.current = true;
    void loadPoll({ silent: true });
  }, [liveScene, poll?.eventVoteState, poll?.status, secondesChronoVote, loadPoll]);

  /** Socket : room événement + room poll pour les mises à jour fines */
  useEffect(() => {
    const eid = eventId;
    const pid = pollId;

    if (!eid && !pid) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    function rejoindreSalles() {
      if (eid) socket.emit("join_event", eid);
      if (pid) socket.emit("join_poll", pid);
    }

    function onEventLiveUpdated(payload) {
      if (!payload || !eid || String(payload.eventId) !== String(eid)) {
        return;
      }
      /** Priorité régie : coupe un GET /p/:slug obsolète + retire le spinner tout de suite (pas de flash chargement→contenu) */
      loadPollAbortRef.current?.abort();
      setLoading(false);

      setLiveScene(
        deriveParticipantLiveScene(payload.liveState, payload.voteState),
      );
      if (typeof payload.voteState === "string") {
        setEventVoteStateUi(payload.voteState.toLowerCase());
      }
      if (typeof payload.displayState === "string") {
        setEventDisplayStateUi(payload.displayState.toLowerCase());
      }

      if (payload.poll) {
        setPoll(payload.poll);
        setLiveScene(
          deriveParticipantLiveScene(
            payload.poll?.eventLiveState,
            payload.poll?.eventVoteState,
          ),
        );
        const pv = payload.poll?.eventVoteState;
        const pd = payload.poll?.eventDisplayState;
        if (typeof pv === "string") setEventVoteStateUi(pv.toLowerCase());
        if (typeof pd === "string") setEventDisplayStateUi(pd.toLowerCase());
        setError(null);
        setPollFetch404Slug(false);
        if (payload.activePollId != null && String(payload.activePollId).trim()) {
          setActivePollIdFromSlug(String(payload.activePollId).trim());
        } else if (payload.poll?.id) {
          setActivePollIdFromSlug(String(payload.poll.id));
        }
      } else {
        const ls = String(payload.liveState ?? "").toLowerCase();
        if (ls === "waiting") {
          setPollFetch404Slug(false);
        }
        if (payload.activePollId != null && String(payload.activePollId).trim()) {
          setActivePollIdFromSlug(String(payload.activePollId).trim());
        } else {
          setActivePollIdFromSlug(null);
        }
        /** Ne pas vider le poll : le socket peut omettre poll alors que GET /p/:slug le renvoie encore (vote fermé). */
        if (slugPublic) {
          void loadPoll({ silent: true });
        } else {
          setPoll(null);
        }
      }
    }

    function onCustomizationUpdated(payload) {
      if (!payload?.eventId || !eid || String(payload.eventId) !== String(eid)) {
        return;
      }
      void loadEventMetaForBranding();
    }

    function onPollUpdated(data) {
      if (!data?.id) return;
      if (
        eid &&
        data.eventId != null &&
        String(data.eventId) !== String(eid)
      ) {
        return;
      }
      setPoll((prev) => {
        if (prev && String(prev.id) === String(data.id)) {
          return data;
        }
        if (pid && String(pid) === String(data.id)) {
          return data;
        }
        if (
          !prev &&
          (data.eventId == null || String(data.eventId) === String(eid))
        ) {
          return data;
        }
        return prev;
      });
      setLiveScene(
        deriveParticipantLiveScene(data.eventLiveState, data.eventVoteState),
      );
    }

    socket.on("connect", rejoindreSalles);
    if (socket.connected) {
      rejoindreSalles();
    }

    socket.on("event_live_updated", onEventLiveUpdated);
    socket.on("event:customization_updated", onCustomizationUpdated);
    socket.on("poll_updated", onPollUpdated);

    return () => {
      if (eid) {
        socket.emit("leave_event", eid);
      }
      if (pid) {
        socket.emit("leave_poll", pid);
      }
      socket.off("connect", rejoindreSalles);
      socket.off("event_live_updated", onEventLiveUpdated);
      socket.off("event:customization_updated", onCustomizationUpdated);
      socket.off("poll_updated", onPollUpdated);
      socket.disconnect();
    };
  }, [eventId, pollId, slugPublic, loadPoll, loadEventMetaForBranding]);

  const voteStateParticipant = String(
    poll?.eventVoteState ?? eventVoteStateUi ?? "",
  ).toLowerCase();
  const sceneParticipant =
    String(liveScene || "").toLowerCase() === "finished"
      ? "finished"
      : voteStateParticipant === "open"
        ? "voting"
        : "waiting";
  const affichageResultatsPublic =
    voteStateParticipant === "closed" ||
    String(liveScene || "").toLowerCase() === "finished";

  /** Bloc sous le formulaire : après vote, déjà voté (stockage), ou régie en mode résultats live */
  const showBlocResultatsEnDirect =
    !!poll &&
    (merciPourVote ||
      aDejaVoteEnStockage ||
      affichageResultatsPublic);

  const optionsPourVote = useMemo(() => {
    return [...(poll?.options ?? [])].sort(
      (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
    );
  }, [poll?.options]);

  const optionsPourResultatsTriees = useMemo(() => {
    if (!showBlocResultatsEnDirect) return [];
    return [...(poll?.options ?? [])].sort(
      (a, b) =>
        (Number(b.voteCount ?? b.votes ?? 0) || 0) -
        (Number(a.voteCount ?? a.votes ?? 0) || 0),
    );
  }, [poll?.options, showBlocResultatsEnDirect]);

  const resultsVoteSignature =
    showBlocResultatsEnDirect && poll
      ? (poll.options || [])
          .map(
            (o) =>
              `${String(o.id)}:${Number(o.voteCount ?? o.votes ?? 0) || 0}`,
          )
          .join("|")
      : "";

  const pollEstNotation = useMemo(() => {
    if (!poll) return false;
    if (String(poll.type ?? "").toUpperCase() === "MULTIPLE_CHOICE") {
      return false;
    }
    return estPollNotation(poll);
  }, [poll]);

  const notationResultStats = useMemo(() => {
    if (!poll || !pollEstNotation) {
      return { total: 0, moyenne: null };
    }
    const ord = optionsNotationOrdonnees(poll.options ?? []);
    const total = ord.reduce(
      (sum, { opt }) =>
        sum + (Number(opt.voteCount ?? opt.votes ?? 0) || 0),
      0,
    );
    if (total === 0) return { total: 0, moyenne: null };
    let s = 0;
    for (const { opt, valeur } of ord) {
      s += valeur * (Number(opt.voteCount ?? opt.votes ?? 0) || 0);
    }
    return { total, moyenne: s / total };
  }, [poll, pollEstNotation, resultsVoteSignature]);

  const [notationMoyennePulse, setNotationMoyennePulse] = useState(0);
  const prevNotationSigRef = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    prevNotationSigRef.current = null;
  }, [pollId]);

  useEffect(() => {
    if (!pollEstNotation || !showBlocResultatsEnDirect) return;
    const sig = resultsVoteSignature;
    if (
      prevNotationSigRef.current !== null &&
      prevNotationSigRef.current !== sig
    ) {
      setNotationMoyennePulse((n) => n + 1);
    }
    prevNotationSigRef.current = sig;
  }, [
    resultsVoteSignature,
    pollEstNotation,
    showBlocResultatsEnDirect,
  ]);

  useEffect(() => {
    if (!showBlocResultatsEnDirect) {
      setResultsBarsAnimated(false);
      return;
    }
    setResultsBarsAnimated(false);
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setResultsBarsAnimated(true);
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      if (id2 != null) cancelAnimationFrame(id2);
    };
  }, [showBlocResultatsEnDirect, pollId, resultsVoteSignature]);

  const resultsAnchorRef = useRef(null);
  const leadFormAnchorRef = useRef(null);
  const prevMerciRef = useRef(false);
  useEffect(() => {
    if (merciPourVote && !prevMerciRef.current) {
      requestAnimationFrame(() => {
        if (showLeadForm) {
          leadFormAnchorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else {
          resultsAnchorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }
    prevMerciRef.current = merciPourVote;
  }, [merciPourVote, showLeadForm]);

  const isMultipleChoice = poll?.type === "MULTIPLE_CHOICE";
  const isContestEntry = String(poll?.type || "").toUpperCase() === "CONTEST_ENTRY";

  useEffect(() => {
    if (!poll?.id || !isContestEntry || !poll?.eventSlug) {
      setContestPublicWinners([]);
      setIsContestWinnerMe(false);
      return;
    }
    const voterSessionId = getOrCreateVoterSessionId();
    const qs = new URLSearchParams();
    qs.set("pollId", String(poll.id));
    if (voterSessionId) qs.set("voterSessionId", voterSessionId);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/p/${encodeURIComponent(poll.eventSlug)}/contest-status?${qs.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data || cancelled) return;
        setContestPublicWinners(Array.isArray(data.winners) ? data.winners : []);
        setIsContestWinnerMe(Boolean(data.isCurrentVoterWinner));
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poll?.id, poll?.eventSlug, isContestEntry, resultsVoteSignature]);

  function toggleOptionMultiple(optionId) {
    if (
      voteLockRef.current ||
      aDejaVoteEnStockage ||
      merciPourVote ||
      !storageVerifie ||
      voteSubmitting
    ) {
      return;
    }
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((x) => x !== optionId)
        : [...prev, optionId],
    );
  }

  async function submitVote() {
    const sessionOuverte =
      (typeof poll?.eventVoteState === "string"
        ? poll.eventVoteState.toLowerCase() === "open"
        : liveScene === "voting") && poll?.status === "ACTIVE";
    if (
      !pollId ||
      !sessionOuverte ||
      voteLockRef.current ||
      aDejaVoteEnStockage ||
      merciPourVote ||
      !storageVerifie
    ) {
      return;
    }

    const optionIds = isMultipleChoice
      ? selectedOptionIds
      : selectedOptionId
        ? [selectedOptionId]
        : [];

    if (isMultipleChoice && optionIds.length === 0) {
      setVoteError("Sélectionne au moins une réponse.");
      return;
    }
    if (!isMultipleChoice && optionIds.length === 0) {
      setVoteError("Sélectionne une réponse.");
      return;
    }

    const sessionId = getOrCreateVoterSessionId();
    if (!sessionId) {
      setVoteError("Session votant indisponible (navigateur).");
      return;
    }

    voteLockRef.current = true;
    setVoteSubmitting(true);
    setVoteError(null);
    try {
      const res = await fetch(`${API_POLLS}/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds,
          voterSessionId: sessionId,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Erreur ${res.status}`);
      }

      const pollAfterVote = await res.json().catch(() => null);

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(cleVotePourPoll(pollId), "true");
          window.localStorage.setItem(
            cleOptionsVotePourPoll(pollId),
            JSON.stringify(optionIds),
          );
        }
      } catch {
        // ignore
      }
      setVotedOptionIdsEnStockage(optionIds);

      await loadPoll({ silent: true });
      const leadTriggered =
        Boolean(pollAfterVote?.leadEnabled) &&
        typeof pollAfterVote?.leadTriggerOptionId === "string" &&
        optionIds.includes(pollAfterVote.leadTriggerOptionId);
      flushSync(() => {
        setSelectedOptionId(null);
        setSelectedOptionIds([]);
        setMerciPourVote(true);
        setShowLeadForm(leadTriggered);
        setLeadSuccess(false);
        setLeadError(null);
      });
    } catch (e) {
      setVoteError(
        e.message || "Impossible d’enregistrer ton vote. Réessaie plus tard.",
      );
    } finally {
      voteLockRef.current = false;
      setVoteSubmitting(false);
    }
  }

  async function submitLead() {
    if (!pollId) return;
    const voterSessionId = getOrCreateVoterSessionId();
    if (!voterSessionId) return;
    const firstName = leadFirstName.trim();
    const phone = leadPhone.trim();
    const email = leadEmail.trim();
    if (!firstName || !phone) {
      setLeadError("Prénom et téléphone requis.");
      return;
    }
    setLeadSubmitting(true);
    setLeadError(null);
    try {
      const res = await fetch(`${API_POLLS}/${pollId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterSessionId,
          firstName,
          phone,
          email: email || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
      setLeadSuccess(true);
      setShowLeadForm(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resultsAnchorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    } catch (e) {
      setLeadError(e?.message || "Lead non enregistré.");
    } finally {
      setLeadSubmitting(false);
    }
  }

  const voteOuvert =
    (typeof poll?.eventVoteState === "string"
      ? poll.eventVoteState.toLowerCase() === "open"
      : liveScene === "voting") && poll?.status === "ACTIVE";
  const hasSelectionValide = isMultipleChoice
    ? selectedOptionIds.length > 0
    : !!selectedOptionId;
  const votesBloques =
    !voteOuvert ||
    aDejaVoteEnStockage ||
    merciPourVote ||
    !storageVerifie ||
    voteSubmitting;
  const enModeDejaVote = voteOuvert && (aDejaVoteEnStockage || merciPourVote);
  const optionsDejaVote = useMemo(() => {
    if (!enModeDejaVote) return optionsPourVote;
    const setIds = new Set(
      (isMultipleChoice
        ? selectedOptionIds
        : selectedOptionId
          ? [selectedOptionId]
          : []
      ).filter(Boolean),
    );
    if (setIds.size === 0) {
      votedOptionIdsEnStockage.forEach((id) => setIds.add(String(id)));
    }
    return optionsPourVote.filter((opt) => setIds.has(String(opt.id)));
  }, [
    enModeDejaVote,
    isMultipleChoice,
    optionsPourVote,
    selectedOptionId,
    selectedOptionIds,
    votedOptionIdsEnStockage,
  ]);
  const isQuiz = String(poll?.type || "").toUpperCase() === "QUIZ";
  const quizRevealed = Boolean(poll?.quizRevealed);
  const quizCorrectOptionIds = useMemo(() => {
    if (!isQuiz || !quizRevealed) return [];
    return (Array.isArray(poll?.options) ? poll.options : [])
      .filter((opt) => Boolean(opt?.isCorrect))
      .map((opt) => String(opt.id));
  }, [isQuiz, quizRevealed, poll?.options]);
  const quizVotedOptionIds = useMemo(() => {
    const ids = (votedOptionIdsEnStockage || []).map((id) => String(id));
    if (ids.length > 0) return ids;
    if (selectedOptionId) return [String(selectedOptionId)];
    return (selectedOptionIds || []).map((id) => String(id));
  }, [votedOptionIdsEnStockage, selectedOptionId, selectedOptionIds]);
  const quizAnsweredCorrectly =
    isQuiz &&
    quizRevealed &&
    quizCorrectOptionIds.length === 1 &&
    quizVotedOptionIds.includes(quizCorrectOptionIds[0]);

  const pollOptions = poll?.options ?? [];
  const totalVotesResults = showBlocResultatsEnDirect
    ? pollOptions.reduce(
        (sum, o) => sum + (Number(o.voteCount ?? o.votes ?? 0) || 0),
        0,
      )
    : 0;

  const maxVotesResults =
    showBlocResultatsEnDirect && pollOptions.length > 0
      ? Math.max(
          ...pollOptions.map(
            (o) => Number(o.voteCount ?? o.votes ?? 0) || 0,
          ),
        )
      : -1;

  const chronoVoteActif =
    voteOuvert &&
    chronometreApi &&
    typeof chronometreApi.totalSec === "number";
  const chronoVoteUrgent =
    chronoVoteActif &&
    secondesChronoVote !== null &&
    !chronometreApi?.isPaused &&
    secondesChronoVote <= 10;

  const evtVoteState = String(poll?.eventVoteState ?? "").toLowerCase();
  const voteFerme = evtVoteState === "closed";
  /** voteState CLOSED et pas de projection résultats (displayState !== results, cf. affichageResultatsPublic) */
  const attenteProjectionResultats = voteFerme && !affichageResultatsPublic;

  /** Auto-reveal actif : délai avant passage écran résultats (aligné ~800 ms avec la projection). */
  const enAttenteAutoRevealResultats = useMemo(() => {
    if (
      !poll?.autoReveal ||
      typeof poll?.autoRevealShowResultsAt !== "string"
    ) {
      return false;
    }
    return (
      new Date(poll.autoRevealShowResultsAt).getTime() > Date.now() - 800
    );
  }, [poll?.autoReveal, poll?.autoRevealShowResultsAt, autoRevealUiTick]);

  /** Même intent que attenteProjectionResultats, mais quand le socket a vidé le poll avant refetch */
  const sansPollMaisVoteFermeSansResultatsSalle =
    !poll &&
    slugPublic &&
    String(eventVoteStateUi || "").toLowerCase() === "closed" &&
    String(eventDisplayStateUi || "").toLowerCase() !== "results";

  const voteStateForUx = useMemo(() => {
    if (
      poll &&
      typeof poll.eventVoteState === "string" &&
      poll.eventVoteState.trim()
    ) {
      return poll.eventVoteState.toLowerCase();
    }
    return eventVoteStateUi;
  }, [poll, eventVoteStateUi]);
  const displayStateForUx = useMemo(() => {
    return voteStateForUx === "open" ? "question" : "waiting";
  }, [voteStateForUx]);
  const liveStateForUx = useMemo(() => {
    if (String(liveScene || "").toLowerCase() === "finished") return "finished";
    return voteStateForUx === "open" ? "voting" : "waiting";
  }, [liveScene, voteStateForUx]);

  const pollUxCtx = useMemo(
    () => ({
      liveScene,
      displayState: displayStateForUx,
      voteState: voteStateForUx,
      pollStatus: poll?.status ?? null,
      hasActivePoll: Boolean(poll?.id ?? activePollIdFromSlug),
      autoReveal: Boolean(poll?.autoReveal),
      autoRevealShowResultsAt: poll?.autoRevealShowResultsAt ?? null,
    }),
    [
      liveScene,
      displayStateForUx,
      voteStateForUx,
      poll?.id,
      poll?.status,
      poll?.autoReveal,
      poll?.autoRevealShowResultsAt,
      activePollIdFromSlug,
    ],
  );

  const pollUxPres = useMemo(
    () => getLiveStatePresentation(pollUxCtx),
    [pollUxCtx],
  );
  const ux = useMemo(
    () =>
      getUxState({
        liveState: liveStateForUx,
        voteState: voteStateForUx,
        displayState: displayStateForUx,
      }),
    [liveStateForUx, voteStateForUx, displayStateForUx],
  );
  const votingLabel = useMemo(
    () =>
      getUxState({
        liveState: "VOTING",
        voteState: "OPEN",
        displayState: "QUESTION",
      }).label,
    [],
  );
  const resultsLabel = useMemo(
    () =>
      getUxState({
        liveState: "RESULTS",
        voteState: "CLOSED",
        displayState: "RESULTS",
      }).label,
    [],
  );
  const voteTakenLabel = useMemo(
    () =>
      getUxState({
        liveState: "CLOSED",
        voteState: "CLOSED",
        displayState: "QUESTION",
      }).label,
    [],
  );
  const topUxLabel =
    voteOuvert && (merciPourVote || aDejaVoteEnStockage)
      ? voteTakenLabel
      : ux.label;

  const pollUxTone = getLiveStateTone(pollUxPres.ux);
  const pollVisualTokens = useMemo(
    () => getLiveStateVisualTokens(pollUxTone, "poll"),
    [pollUxTone],
  );

  const isDark = resolveJoinRoomIsDark(roomThemeMode, prefersDark);
  const accent = useMemo(
    () => joinRoomAccent(roomPrimaryColor),
    [roomPrimaryColor],
  );
  const palette = useMemo(
    () => createJoinRoomPalette(isDark, accent),
    [isDark, accent],
  );
  const overlayAlpha = joinRoomOverlayAlpha(roomOverlayStrength);
  const shellStyle = useMemo(
    () =>
      buildJoinRoomShellStyle({
        hasBackgroundImage: !!roomBackgroundUrl,
        roomSolidColor: roomSolidBackgroundColor,
        isDark,
        fg: palette.fg,
      }),
    [roomBackgroundUrl, roomSolidBackgroundColor, isDark, palette.fg],
  );
  const pollPanelSurfaces = useMemo(
    () =>
      buildJoinPollCardSurfaces({
        palette,
        isDark,
        accent,
        tokens: pollVisualTokens,
      }),
    [palette, isDark, accent, pollVisualTokens],
  );

  const panelStyle = useMemo(
    () => ({
      ...glassPanelStyle({ palette, isDark, textAlign: "left" }),
      border: pollPanelSurfaces.border,
      background: pollPanelSurfaces.background,
      boxShadow: pollPanelSurfaces.boxShadow,
    }),
    [palette, isDark, pollPanelSurfaces],
  );

  const pollCtaGradient = useMemo(
    () =>
      `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 40%, ${isDark ? "#1e1b4b" : "#c7d2fe"}))`,
    [accent, isDark],
  );

  const pollBadgeEtat = useMemo(
    () => ({
      ...stateBadgeTypography(pollVisualTokens),
      fontSize: "0.82rem",
    }),
    [pollVisualTokens],
  );

  const resultsLook =
    pollUxPres.ux === LIVE_UX_STATE.RESULTS ||
    (!voteOuvert && affichageResultatsPublic);

  const resultsCardTokens = useMemo(
    () =>
      getLiveStateVisualTokens(
        resultsLook ? getLiveStateTone(LIVE_UX_STATE.RESULTS) : pollUxTone,
        "poll",
      ),
    [resultsLook, pollUxTone],
  );

  const resultsBlockSurfaces = useMemo(
    () =>
      buildJoinPollCardSurfaces({
        palette,
        isDark,
        accent,
        tokens: resultsCardTokens,
      }),
    [palette, isDark, accent, resultsCardTokens],
  );

  return (
    <>
      {roomBackgroundUrl ? (
        <>
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${roomBackgroundUrl})`,
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
      <main
        style={{
          ...shellStyle,
          lineHeight: 1.5,
        }}
      >
        <style>{`
          @media (max-width: 640px) {
            .poll-live-zone {
              padding: 0.8rem 0.8rem 1.35rem !important;
            }
            .poll-live-panel {
              max-width: 100% !important;
              padding: 1rem 0.9rem !important;
              border-radius: 16px !important;
            }
            .poll-live-submit {
              max-width: 100% !important;
              min-height: 50px !important;
              font-size: 1rem !important;
            }
          }
        `}</style>
        <ExperienceHeader
          backHref={retourHref}
          backLabel={retourLabel}
          title={eventTitleFromApi ?? titrePage}
          logoUrl={roomLogoUrl}
          palette={palette}
          isDark={isDark}
          badgeText="Page votant"
          badgeColor={accent}
        />

        <div
          className="poll-live-zone"
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding:
              "clamp(1rem, 4vw, 1.75rem) clamp(1rem, 5vw, 2rem) 2rem",
            boxSizing: "border-box",
          }}
        >
          <div className="poll-live-panel" style={panelStyle}>
      {!loading && !error ? (
        <div
          className="text-center text-sm opacity-80 mb-2"
          style={{
            textAlign: "center",
            fontSize: "0.86rem",
            opacity: 0.82,
            marginBottom: "0.6rem",
            color: palette.muted,
          }}
        >
          {topUxLabel}
        </div>
      ) : null}
      {loading && (
        <p style={{ color: palette.muted, marginTop: 0 }}>Chargement...</p>
      )}

      {!loading && error && (
        <p
          style={{
            color: isDark ? "#fecaca" : "#991b1b",
            margin: "0 0 1rem",
            padding: "0.75rem 1rem",
            background: isDark
              ? "rgba(127, 29, 29, 0.35)"
              : "rgba(254, 242, 242, 0.95)",
            borderRadius: "12px",
            border: isDark
              ? "1px solid rgba(248, 113, 113, 0.35)"
              : "1px solid #fecaca",
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        !poll &&
        (sansPollMaisVoteFermeSansResultatsSalle ||
          sceneParticipant === "waiting" ||
          pollFetch404Slug) && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: sansPollMaisVoteFermeSansResultatsSalle
                ? 0
                : "1rem 1.15rem",
              background: sansPollMaisVoteFermeSansResultatsSalle
                ? "transparent"
                : isDark
                  ? "rgba(15, 23, 42, 0.45)"
                  : "rgba(255,255,255,0.55)",
              borderRadius: sansPollMaisVoteFermeSansResultatsSalle
                ? 0
                : "14px",
              border: sansPollMaisVoteFermeSansResultatsSalle
                ? "none"
                : `1px solid ${palette.cardBorder}`,
              color: palette.fg2,
            }}
          >
            {sansPollMaisVoteFermeSansResultatsSalle ? (
              <CarteVoteTermineAttenteResultats
                accent={accent}
                isDark={isDark}
              />
            ) : sceneParticipant === "waiting" ||
              pollFetch404Slug ? (
              <>
                <h2
                  style={{
                    margin: "0 0 0.65rem 0",
                    fontSize: "clamp(1.15rem, 3.5vw, 1.35rem)",
                    fontWeight: 800,
                    color: palette.fg,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {pollUxPres.title}
                </h2>
                {pollFetch404Slug ? (
                  <p style={{ margin: "0 0 0.65rem 0", lineHeight: 1.55 }}>
                    {LIVE_UX_BODY_POLL_NO_POLL_SLUG}
                  </p>
                ) : null}
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: palette.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {pollFetch404Slug
                    ? "La salle est en attente d’une question active. Revenez ici dès l’ouverture du vote."
                    : LIVE_UX_BODY_POLL_WAITING}
                </p>
              </>
            ) : null}
          </div>
        )}

      {!loading && poll && (
        <>
          {voteOuvert && (
            <div style={{ marginBottom: "1rem" }}>
              <p
                style={{
                  margin: 0,
                  padding: "0.55rem 0.85rem",
                  background: `color-mix(in srgb, ${accent} ${14 + pollVisualTokens.borderAccentMixPct * 0.28}%, transparent)`,
                  borderRadius: "10px",
                  border: mergeCardBorderWithAccent(
                    palette.cardBorder,
                    accent,
                    Math.min(52, 26 + pollVisualTokens.borderAccentMixPct * 0.55),
                  ),
                  color: isDark ? palette.fg : palette.fg2,
                  ...pollBadgeEtat,
                  textTransform: "none",
                  letterSpacing: "0.04em",
                }}
              >
                {votingLabel}
              </p>
              {chronoVoteActif ? (
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    padding: "0.6rem 0.9rem",
                    background: isDark
                      ? "rgba(15, 23, 42, 0.5)"
                      : "rgba(255,255,255,0.7)",
                    borderRadius: "10px",
                    border: `1px solid ${palette.cardBorder}`,
                    color: palette.fg2,
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  }}
                >
                  {chronometreApi?.isPaused ? (
                    <>
                      Chrono en pause
                      {secondesChronoVote !== null ? (
                        <>
                          {" "}
                          <span
                            style={{
                              color: palette.muted,
                              fontWeight: 500,
                            }}
                          >
                            ·
                          </span>{" "}
                          <span
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 700,
                              color: accent,
                            }}
                          >
                            {formatCountdownVerbose(secondesChronoVote)}
                          </span>
                        </>
                      ) : null}
                    </>
                  ) : secondesChronoVote !== null ? (
                    <>
                      Temps restant{" "}
                      <span
                        style={{ color: palette.muted, fontWeight: 500 }}
                      >
                        ·
                      </span>{" "}
                      <span
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 800,
                          color: chronoVoteUrgent ? "#f87171" : accent,
                        }}
                      >
                        {formatCountdownVerbose(secondesChronoVote)}
                      </span>
                    </>
                  ) : (
                    "Chrono actif"
                  )}
                </p>
              ) : null}
            </div>
          )}

          <section
            style={{
              border: voteOuvert
                ? mergeCardBorderWithAccent(
                    palette.cardBorder,
                    accent,
                    Math.min(48, 18 + pollVisualTokens.borderAccentMixPct * 0.65),
                  )
                : `1px solid ${palette.cardBorder}`,
              borderRadius: "16px",
              padding: "1.25rem 1.35rem",
              marginBottom: "1rem",
              background: voteOuvert
                ? isDark
                  ? `color-mix(in srgb, ${accent} ${4 + pollVisualTokens.cardAccentTintPct * 0.9}%, rgba(15, 23, 42, 0.4))`
                  : `color-mix(in srgb, ${accent} ${2.5 + pollVisualTokens.cardAccentTintPct * 0.55}%, rgba(255,255,255,0.55))`
                : isDark
                  ? "rgba(15, 23, 42, 0.4)"
                  : "rgba(255,255,255,0.55)",
              boxShadow: voteOuvert
                ? isDark
                  ? `0 ${Math.round(12 * pollVisualTokens.shadowScale)}px ${Math.round(28 * pollVisualTokens.shadowScale)}px rgba(0,0,0,${0.22 + pollVisualTokens.shadowScale * 0.04})`
                  : `0 ${Math.round(10 * pollVisualTokens.shadowScale)}px ${Math.round(24 * pollVisualTokens.shadowScale)}px rgba(15,23,42,${0.06 + pollVisualTokens.shadowScale * 0.02})`
                : undefined,
            }}
          >
            <h2
              style={{
                fontSize: `clamp(${1.2 * (voteOuvert ? pollVisualTokens.titleClampMul : 1)}rem, 4vw, ${1.55 * (voteOuvert ? pollVisualTokens.titleClampMul : 1)}rem)`,
                fontWeight: 800,
                margin: "0 0 0.5rem 0",
                color: palette.fg,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}
            >
              {poll.title}
            </h2>
            {poll.question && poll.question !== poll.title ? (
              <p
                style={{
                  margin: "0 0 0.65rem 0",
                  color: palette.fg2,
                  fontSize: "1.02rem",
                  lineHeight: 1.45,
                }}
              >
                {poll.question}
              </p>
            ) : null}
            <p style={{ margin: 0, fontSize: "0.85rem", color: palette.muted }}>
              Créé le :{" "}
              {poll.createdAt
                ? new Date(poll.createdAt).toLocaleString("fr-FR")
                : "—"}
            </p>
            {poll.eventSlug ? (
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.82rem" }}>
                Lien public :{" "}
                <Link
                  href={`/p/${poll.eventSlug}`}
                  style={{ color: palette.link, fontWeight: 600 }}
                >
                  /p/{poll.eventSlug}
                </Link>
              </p>
            ) : null}
          </section>

          {attenteProjectionResultats ? (
            <CarteVoteTermineAttenteResultats
              accent={accent}
              isDark={isDark}
            />
          ) : null}

          {voteSubmitting && voteOuvert && (
            <p style={{ color: accent, marginBottom: "0.75rem", fontWeight: 600 }}>
              Envoi du vote...
            </p>
          )}

          {merciPourVote && voteOuvert && (
            <>
              <p
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 1rem",
                  background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                  borderRadius: "12px",
                  border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                  color: palette.fg,
                  fontWeight: 600,
                }}
              >
                Merci pour votre vote !
              </p>
              {showLeadForm ? (
                <div
                  ref={leadFormAnchorRef}
                  style={{
                    marginBottom: "1rem",
                    padding: "0.9rem",
                    borderRadius: "12px",
                    border: `1px solid ${palette.cardBorder}`,
                    background: palette.card,
                  }}
                >
                  <p style={{ margin: "0 0 0.65rem", fontWeight: 700, color: palette.fg }}>
                    Restez en contact
                  </p>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Prénom *"
                      value={leadFirstName}
                      onChange={(e) => setLeadFirstName(e.target.value)}
                      disabled={leadSubmitting}
                      style={{ padding: "0.55rem 0.65rem", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone *"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      disabled={leadSubmitting}
                      style={{ padding: "0.55rem 0.65rem", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    />
                    <input
                      type="email"
                      placeholder="E-mail (optionnel)"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      disabled={leadSubmitting}
                      style={{ padding: "0.55rem 0.65rem", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={submitLead}
                      disabled={leadSubmitting}
                      style={{
                        border: "none",
                        borderRadius: "10px",
                        padding: "0.65rem 0.85rem",
                        background: pollCtaGradient,
                        color: "#fff",
                        fontWeight: 700,
                        cursor: leadSubmitting ? "wait" : "pointer",
                      }}
                    >
                      {leadSubmitting ? "Envoi…" : "Envoyer"}
                    </button>
                    <p
                      style={{
                        margin: "0.1rem 0 0",
                        fontSize: "0.72rem",
                        lineHeight: 1.4,
                        color: palette.muted,
                      }}
                    >
                      En envoyant ce formulaire, vous acceptez que vos données
                      soient utilisées pour vous recontacter dans le cadre de
                      cet événement.
                    </p>
                    {leadError ? (
                      <p role="alert" style={{ margin: 0, color: isDark ? "#fecaca" : "#b91c1c", fontSize: "0.84rem" }}>
                        {leadError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {leadSuccess ? (
                <p style={{ margin: "0 0 1rem", color: palette.fg2, fontSize: "0.88rem" }}>
                  Merci, vos coordonnées ont bien été enregistrées.
                </p>
              ) : null}
            </>
          )}

          {!merciPourVote &&
            aDejaVoteEnStockage &&
            storageVerifie &&
            voteOuvert && (
              <p
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 1rem",
                  background: isDark
                    ? "rgba(15, 23, 42, 0.45)"
                    : "rgba(255,255,255,0.6)",
                  borderRadius: "12px",
                  border: `1px solid ${palette.cardBorder}`,
                  color: palette.fg2,
                  fontWeight: 500,
                }}
              >
                Vous avez déjà voté pour ce sondage.
              </p>
            )}
          {isQuiz && quizRevealed && quizVotedOptionIds.length > 0 ? (
            <p
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                background: quizAnsweredCorrectly
                  ? (isDark ? "rgba(22, 163, 74, 0.24)" : "rgba(220, 252, 231, 0.9)")
                  : (isDark ? "rgba(239, 68, 68, 0.22)" : "rgba(254, 226, 226, 0.92)"),
                borderRadius: "12px",
                border: quizAnsweredCorrectly
                  ? (isDark
                      ? "1px solid rgba(74, 222, 128, 0.45)"
                      : "1px solid rgba(22, 163, 74, 0.35)")
                  : (isDark
                      ? "1px solid rgba(248, 113, 113, 0.4)"
                      : "1px solid rgba(239, 68, 68, 0.35)"),
                color: quizAnsweredCorrectly ? (isDark ? "#bbf7d0" : "#166534") : (isDark ? "#fecaca" : "#991b1b"),
                fontWeight: 700,
              }}
            >
              {quizAnsweredCorrectly ? "Bonne réponse ✅" : "Mauvaise réponse ❌"}
            </p>
          ) : null}

          {voteError && (
            <p
              style={{
                color: isDark ? "#fecaca" : "#991b1b",
                marginBottom: "1rem",
                padding: "0.75rem",
                background: isDark
                  ? "rgba(127, 29, 29, 0.35)"
                  : "rgba(254, 242, 242, 0.95)",
                borderRadius: "12px",
                border: isDark
                  ? "1px solid rgba(248, 113, 113, 0.35)"
                  : "1px solid #fecaca",
              }}
              role="alert"
            >
              {voteError}
            </p>
          )}

          {voteOuvert ? (
            <div
              style={{
                opacity: merciPourVote ? 0.58 : 1,
                transition: "opacity 0.35s ease",
                marginBottom: showBlocResultatsEnDirect ? "1.75rem" : 0,
                paddingBottom: showBlocResultatsEnDirect ? "1.25rem" : 0,
                borderBottom: showBlocResultatsEnDirect
                  ? `1px solid ${palette.cardBorder}`
                  : "none",
              }}
            >
              <h3
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "0.75rem",
                  color: accent,
                }}
              >
                Votre choix
              </h3>
              {!votesBloques && (
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: palette.muted,
                    marginBottom: "0.85rem",
                    lineHeight: 1.45,
                  }}
                >
                  {isMultipleChoice
                    ? "Coche une ou plusieurs réponses, puis valide."
                    : "Choisis une réponse, puis valide."}
                </p>
              )}
              {enModeDejaVote ? (
                <p
                  style={{
                    margin: "0 0 0.85rem 0",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.34rem 0.62rem",
                    borderRadius: "9999px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: isDark ? "#bbf7d0" : "#166534",
                    background: isDark
                      ? "rgba(22, 163, 74, 0.22)"
                      : "rgba(34, 197, 94, 0.16)",
                    border: isDark
                      ? "1px solid rgba(34, 197, 94, 0.45)"
                      : "1px solid rgba(22, 163, 74, 0.35)",
                  }}
                >
                  Choix valide
                </p>
              ) : null}
              {enModeDejaVote && optionsDejaVote.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: palette.muted,
                  }}
                >
                  Votre vote est bien enregistré.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {optionsDejaVote.map((opt) => (
                  <li
                    key={opt.id}
                    style={{
                      marginBottom: "0.75rem",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      gap: "0.65rem",
                      padding: "0.85rem 1rem",
                      borderRadius: "14px",
                      border: mergeCardBorderWithAccent(
                        palette.cardBorder,
                        accent,
                        Math.min(42, 12 + pollVisualTokens.borderAccentMixPct * 0.5),
                      ),
                      background: isDark
                        ? `color-mix(in srgb, ${accent} ${2.5 + pollVisualTokens.cardAccentTintPct * 0.5}%, rgba(15, 23, 42, 0.35))`
                        : `color-mix(in srgb, ${accent} ${1.5 + pollVisualTokens.cardAccentTintPct * 0.35}%, rgba(255,255,255,0.65))`,
                      boxSizing: "border-box",
                    }}
                  >
                    {isMultipleChoice ? (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          cursor: votesBloques ? "not-allowed" : "pointer",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOptionIds.includes(opt.id)}
                          disabled={votesBloques}
                          onChange={() => toggleOptionMultiple(opt.id)}
                          style={{ marginTop: "0.25rem" }}
                        />
                        <span style={{ color: palette.fg }}>
                          <strong>{opt.label}</strong>
                        </span>
                      </label>
                    ) : (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          cursor: votesBloques ? "not-allowed" : "pointer",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <input
                          type="radio"
                          name={`avote-poll-${pollId}`}
                          checked={selectedOptionId === opt.id}
                          disabled={votesBloques}
                          onChange={() => setSelectedOptionId(opt.id)}
                          style={{ marginTop: "0.25rem" }}
                        />
                        <span style={{ color: palette.fg }}>
                          <strong>{opt.label}</strong>
                        </span>
                      </label>
                    )}
                  </li>
                ))}
              </ul>
              )}
              {!enModeDejaVote ? (
                <div style={{ marginTop: "1.15rem" }}>
                <button
                  className="poll-live-submit"
                  type="button"
                  onClick={submitVote}
                  disabled={votesBloques || !hasSelectionValide}
                  style={{
                    width: "100%",
                    maxWidth: "22rem",
                    padding: `${1.05 * pollVisualTokens.ctaScale}rem ${1.4 * pollVisualTokens.ctaScale}rem`,
                    fontSize: `clamp(${1 * pollVisualTokens.ctaScale}rem, 3.5vw, ${1.1 * pollVisualTokens.ctaScale}rem)`,
                    borderRadius: "14px",
                    border: "none",
                    background:
                      votesBloques || !hasSelectionValide
                        ? isDark
                          ? "rgba(148, 163, 184, 0.35)"
                          : "#94a3b8"
                        : pollCtaGradient,
                    color: "#fff",
                    cursor:
                      votesBloques || !hasSelectionValide
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 800,
                    boxShadow:
                      votesBloques || !hasSelectionValide
                        ? "none"
                        : `0 ${Math.round(8 * pollVisualTokens.shadowScale)}px ${Math.round(30 * pollVisualTokens.shadowScale)}px rgba(0, 0, 0, ${isDark ? 0.3 : 0.2})`,
                  }}
                >
                  {voteSubmitting ? "Envoi…" : "Valider mon vote"}
                </button>
              </div>
              ) : null}
            </div>
          ) : null}

          {showBlocResultatsEnDirect && !enAttenteAutoRevealResultats ? (
            <section
              ref={resultsAnchorRef}
              style={{
                marginTop: voteOuvert ? 0 : "0.5rem",
                padding: "1.25rem 1.35rem",
                borderRadius: "16px",
                border: resultsBlockSurfaces.border,
                background: resultsBlockSurfaces.background,
                boxShadow: resultsBlockSurfaces.boxShadow,
                backdropFilter: "blur(10px)",
              }}
            >
              <h3
                style={{
                  fontSize: `clamp(${1 * resultsCardTokens.titleClampMul}rem, 2.8vw, ${1.12 * resultsCardTokens.titleClampMul}rem)`,
                  margin: "0 0 0.35rem 0",
                  color: palette.fg,
                  fontWeight: resultsCardTokens.stateBadgeWeight,
                  letterSpacing: "-0.02em",
                }}
              >
                {isContestEntry ? "Concours en cours" : resultsLabel}
              </h3>
              {isContestEntry ? (
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.82rem",
                    color: palette.muted,
                  }}
                >
                  Le tirage est piloté par l’organisateur.
                </p>
              ) : voteOuvert && affichageResultatsPublic ? (
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.82rem",
                    color: palette.muted,
                  }}
                >
                  Totaux mis à jour en temps réel pendant le vote.
                </p>
              ) : (
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "0.82rem",
                    color: palette.muted,
                  }}
                >
                  Classement par nombre de votes.
                </p>
              )}
              {isContestEntry ? (
                <div
                  style={{
                    borderRadius: "12px",
                    border: `1px solid ${palette.cardBorder}`,
                    background: isDark
                      ? "rgba(15, 23, 42, 0.45)"
                      : "rgba(255,255,255,0.6)",
                    padding: "0.9rem 1rem",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.82rem", color: palette.muted }}>
                    Lot à gagner
                  </p>
                  <p
                    style={{
                      margin: "0.22rem 0 0 0",
                      fontSize: "1rem",
                      fontWeight: 800,
                      color: accent,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {String(poll?.contestPrize || "").trim() || "Lot à gagner non précisé"}
                  </p>
                  <p
                    style={{
                      margin: "0.75rem 0 0 0",
                      fontSize: "0.86rem",
                      color: palette.fg2,
                      fontWeight: 700,
                    }}
                  >
                    Participants inscrits : {contestEligibleCountFromPoll(poll)}
                  </p>
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", color: palette.muted }}>
                    Les gagnants seront annoncés par l’organisateur.
                  </p>
                  {isContestWinnerMe ? (
                    <p
                      style={{
                        margin: "0.65rem 0 0 0",
                        fontSize: "0.86rem",
                        fontWeight: 800,
                        color: "#16a34a",
                      }}
                    >
                      Felicitations, vous avez ete tire au sort !
                    </p>
                  ) : null}
                  {contestPublicWinners.length > 0 ? (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        borderTop: `1px solid ${palette.cardBorder}`,
                        paddingTop: "0.65rem",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: palette.muted,
                        }}
                      >
                        Gagnants tires
                      </p>
                      <ul style={{ margin: "0.45rem 0 0 1rem", padding: 0, color: palette.fg2 }}>
                        {contestPublicWinners.map((w) => (
                          <li key={String(w.id)} style={{ marginBottom: "0.28rem" }}>
                            {String(w.displayName || "Gagnant")} - {String(w.displayContact || "")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : pollEstNotation ? (
                <>
                  <style>{`
                    @keyframes avote-poll-moyenne-pulse {
                      0% { transform: scale(1.06); opacity: 0.75; }
                      100% { transform: scale(1); opacity: 1; }
                    }
                  `}</style>
                  <div
                    style={{
                      marginBottom: "1.15rem",
                      padding:
                        "clamp(1rem, 2.5vw, 1.35rem) clamp(1.1rem, 3vw, 1.5rem)",
                      borderRadius: "16px",
                      background: isDark
                        ? "linear-gradient(165deg, rgba(13, 148, 136, 0.2) 0%, rgba(15, 23, 42, 0.75) 100%)"
                        : "linear-gradient(165deg, rgba(13, 148, 136, 0.14) 0%, rgba(255, 255, 255, 0.92) 100%)",
                      border: isDark
                        ? "1px solid rgba(45, 212, 191, 0.35)"
                        : "1px solid rgba(45, 212, 191, 0.45)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: isDark ? "#99f6e4" : "#0d9488",
                      }}
                    >
                      MOYENNE
                    </p>
                    <p
                      key={notationMoyennePulse}
                      style={{
                        margin: "0.4rem 0 0 0",
                        fontSize: "clamp(2.35rem, 11vw, 3.85rem)",
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1,
                        color: isDark ? "#f0fdfa" : "#0f172a",
                        letterSpacing: "-0.04em",
                        animation:
                          notationMoyennePulse > 0
                            ? "avote-poll-moyenne-pulse 0.48s cubic-bezier(0.33, 1, 0.68, 1)"
                            : "none",
                      }}
                    >
                      {formatNotationMoyenneUneDecimale(
                        notationResultStats.moyenne,
                      )}
                    </p>
                    <p
                      style={{
                        margin: "0.65rem 0 0 0",
                        fontSize: "0.92rem",
                        fontWeight: 600,
                        color: palette.muted,
                      }}
                    >
                      {notationResultStats.total} vote
                      {notationResultStats.total !== 1 ? "s" : ""} au total
                    </p>
                  </div>
                </>
              ) : null}
              {!isContestEntry ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {optionsPourResultatsTriees.map((opt) => {
                  const badgeLeaderLabel = voteOuvert ? "En tête" : "Gagnant";
                  const optVotes =
                    Number(opt.voteCount ?? opt.votes ?? 0) || 0;
                  const percentRaw =
                    totalVotesResults > 0
                      ? (optVotes / totalVotesResults) * 100
                      : 0;
                  const percentRounded = Math.round(percentRaw * 10) / 10;
                  const percentLabel =
                    percentRounded === 0
                      ? "0"
                      : Number.isInteger(percentRounded)
                        ? String(percentRounded)
                        : percentRounded.toFixed(1);
                  const isWinner =
                    maxVotesResults > 0 && optVotes === maxVotesResults;
                  const barWidthPct = resultsBarsAnimated
                    ? Math.min(100, percentRaw)
                    : 0;

                  return (
                    <li
                      key={opt.id}
                      style={{
                        marginBottom: "1rem",
                        display: "block",
                        ...(isWinner
                          ? {
                              padding: "0.65rem 0.75rem",
                              marginLeft: "-0.25rem",
                              marginRight: "-0.25rem",
                              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                              borderRadius: "10px",
                              borderLeft: `4px solid ${accent}`,
                            }
                          : {}),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "0.35rem",
                          fontSize: "0.875rem",
                          lineHeight: 1.4,
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            minWidth: 0,
                            flexWrap: "wrap",
                          }}
                        >
                          <strong>{opt.label}</strong>
                          {isWinner ? (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.02em",
                                color: "#fff",
                                background: accent,
                                padding: "0.15rem 0.45rem",
                                borderRadius: "9999px",
                              }}
                            >
                              {badgeLeaderLabel}
                            </span>
                          ) : null}
                        </span>
                        <span
                          style={{
                            color: palette.muted,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {percentLabel}% ({optVotes} vote
                          {optVotes !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: isDark
                            ? "rgba(148, 163, 184, 0.25)"
                            : "rgba(15, 23, 42, 0.1)",
                          borderRadius: "9999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${barWidthPct}%`,
                            height: "100%",
                            background: isWinner
                              ? accent
                              : `color-mix(in srgb, ${accent} 75%, #6366f1)`,
                            borderRadius: "9999px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
                </ul>
              ) : null}
            </section>
          ) : null}

          {!voteOuvert &&
          !showBlocResultatsEnDirect &&
          !attenteProjectionResultats ? (
            <>
              <h3
                style={{
                  fontSize: "1rem",
                  marginBottom: "0.75rem",
                  color: palette.fg,
                  fontWeight: 800,
                }}
              >
                {isContestEntry ? "Concours" : "Résultats"}
              </h3>
              {isContestEntry ? (
                <div
                  style={{
                    borderRadius: "12px",
                    border: `1px solid ${palette.cardBorder}`,
                    background: isDark
                      ? "rgba(15, 23, 42, 0.45)"
                      : "rgba(255,255,255,0.6)",
                    padding: "0.85rem 0.95rem",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.82rem", color: palette.muted }}>
                    Lot à gagner
                  </p>
                  <p
                    style={{
                      margin: "0.22rem 0 0 0",
                      fontSize: "0.98rem",
                      fontWeight: 800,
                      color: accent,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {String(poll?.contestPrize || "").trim() || "Lot à gagner non précisé"}
                  </p>
                  <p
                    style={{
                      margin: "0.7rem 0 0 0",
                      color: palette.fg2,
                      fontSize: "0.86rem",
                      fontWeight: 700,
                    }}
                  >
                    Participants inscrits : {contestEligibleCountFromPoll(poll)}
                  </p>
                </div>
              ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {optionsPourVote.map((opt) => {
                  const optVotes =
                    Number(opt.voteCount ?? opt.votes ?? 0) || 0;
                  return (
                    <li
                      key={opt.id}
                      style={{ marginBottom: "0.85rem" }}
                    >
                      <span style={{ color: palette.fg }}>
                        <strong>{opt.label}</strong>{" "}
                        <span
                          style={{
                            color: palette.muted,
                            fontSize: "0.9rem",
                          }}
                        >
                          — {optVotes} vote{optVotes !== 1 ? "s" : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              )}
            </>
          ) : null}
        </>
      )}
          </div>
        </div>
        <footer
          style={{
            flexShrink: 0,
            padding: "0.85rem clamp(1rem, 4vw, 1.5rem)",
            borderTop: `1px solid ${palette.headerBorder}`,
            background: palette.footerBg,
            backdropFilter: "blur(8px)",
            textAlign: "center",
          }}
        >
          <Link
            href={retourHref}
            style={{
              color: palette.muted,
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {retourLabel}
          </Link>
        </footer>
      </main>
    </>
  );
}
