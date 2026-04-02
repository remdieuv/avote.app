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

const API_ORIGIN = "http://localhost:4000";
const API_POLLS = `${API_ORIGIN}/polls`;
const SOCKET_URL = API_ORIGIN;

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

/** @param {string} scene */
function libelleScene(scene) {
  switch (scene) {
    case "waiting":
      return "En attente du direct — le contenu apparaîtra dès que l’organisateur l’aura lancé.";
    case "finished":
      return "Événement terminé. Merci d’avoir participé.";
    case "paused":
      return "En pause côté régie.";
    case "results":
      return "Résultats";
    case "voting":
      return "Vote ouvert";
    default:
      return "";
  }
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
          Vote terminé
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
  const [infoMessage, setInfoMessage] = useState(null);
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
  const [merciPourVote, setMerciPourVote] = useState(false);
  const [storageVerifie, setStorageVerifie] = useState(false);
  /** Barres résultats : anim 0% → % après paint */
  const [resultsBarsAnimated, setResultsBarsAnimated] = useState(false);
  const [chronoTick, setChronoTick] = useState(0);
  /** Recalcul affichage auto-reveal (sans attendre le socket) */
  const [autoRevealUiTick, setAutoRevealUiTick] = useState(0);

  /** Identité salle /join (continuité visuelle sur /p) */
  const [eventTitleFromApi, setEventTitleFromApi] = useState(null);
  const [roomDescription, setRoomDescription] = useState(null);
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
        `${API_ORIGIN}/events/slug/${encodeURIComponent(slugToFetch)}`,
        { cache: "no-store" },
      );

      if (res.status === 404) {
        if (slugPublic) {
          evenementInvalideRef.current = true;
          setError("Événement introuvable.");
          setEventId(null);
        }
        return;
      }
      if (!res.ok) {
        if (slugPublic) setError(`Erreur ${res.status}`);
        return;
      }
      const meta = await res.json();
      setEventId(meta.id);
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
      const rd = meta.description;
      setRoomDescription(
        typeof rd === "string" && rd.trim() ? rd.trim() : null,
      );
      const lu = meta.logoUrl;
      setRoomLogoUrl(typeof lu === "string" && lu.trim() ? lu.trim() : null);
      const bu = meta.backgroundUrl;
      setRoomBackgroundUrl(
        typeof bu === "string" && bu.trim() ? bu.trim() : null,
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
    if (!pollId) {
      setStorageVerifie(true);
      return;
    }
    try {
      if (typeof window !== "undefined") {
        const marqueur = window.localStorage.getItem(cleVotePourPoll(pollId));
        setADejaVoteEnStockage(marqueur === "true" || marqueur === "1");
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
              "Aucun sondage à l’écran pour l’instant — la régie contrôle le direct.",
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

      setLiveScene(payload.liveState ?? null);
      if (typeof payload.voteState === "string") {
        setEventVoteStateUi(payload.voteState.toLowerCase());
      }
      if (typeof payload.displayState === "string") {
        setEventDisplayStateUi(payload.displayState.toLowerCase());
      }

      if (payload.poll) {
        setPoll(payload.poll);
        if (payload.poll.eventLiveState) {
          setLiveScene(payload.poll.eventLiveState);
        }
        const pv = payload.poll?.eventVoteState;
        const pd = payload.poll?.eventDisplayState;
        if (typeof pv === "string") setEventVoteStateUi(pv.toLowerCase());
        if (typeof pd === "string") setEventDisplayStateUi(pd.toLowerCase());
        setError(null);
        setInfoMessage(null);
      } else {
        const ls = String(payload.liveState ?? "").toLowerCase();
        if (ls === "waiting") {
          setInfoMessage(null);
        } else {
          setInfoMessage(libelleScene(payload.liveState ?? "") || null);
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
      if (data.eventLiveState) {
        setLiveScene(data.eventLiveState);
      }
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

  const affichageResultatsPublic =
    poll?.eventDisplayState === "results" ||
    String(liveScene || "").toLowerCase() === "results";

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
  const prevMerciRef = useRef(false);
  useEffect(() => {
    if (merciPourVote && !prevMerciRef.current) {
      requestAnimationFrame(() => {
        resultsAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
    prevMerciRef.current = merciPourVote;
  }, [merciPourVote]);

  const isMultipleChoice = poll?.type === "MULTIPLE_CHOICE";

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

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(cleVotePourPoll(pollId), "true");
        }
      } catch {
        // ignore
      }

      await loadPoll({ silent: true });
      flushSync(() => {
        setSelectedOptionId(null);
        setSelectedOptionIds([]);
        setMerciPourVote(true);
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

  const titreBlocResultats =
    voteFerme &&
    affichageResultatsPublic &&
    Boolean(poll?.autoReveal)
      ? "Résultats finaux du vote"
      : "Résultats en direct";

  /** Même intent que attenteProjectionResultats, mais quand le socket a vidé le poll avant refetch */
  const sansPollMaisVoteFermeSansResultatsSalle =
    !poll &&
    slugPublic &&
    String(eventVoteStateUi || "").toLowerCase() === "closed" &&
    String(eventDisplayStateUi || "").toLowerCase() !== "results";

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
  const panelStyle = useMemo(
    () => glassPanelStyle({ palette, isDark, textAlign: "left" }),
    [palette, isDark],
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
        <header
          style={{
            flexShrink: 0,
            padding:
              "clamp(0.85rem, 3vw, 1.15rem) clamp(1rem, 4vw, 1.75rem)",
            borderBottom: `1px solid ${palette.headerBorder}`,
            background: palette.headerBg,
            backdropFilter: "blur(8px)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            <Link
              href={retourHref}
              style={{
                color: palette.link,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {retourLabel}
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
            {roomLogoUrl ? (
              <img
                src={roomLogoUrl}
                alt=""
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  objectFit: "contain",
                  borderRadius: "10px",
                  flexShrink: 0,
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
                minWidth: 0,
              }}
            >
              {eventTitleFromApi ?? titrePage}
            </h1>
          </div>
          {roomDescription ? (
            <p
              style={{
                margin: "0.45rem 0 0 0",
                fontSize: "0.82rem",
                color: palette.muted,
                lineHeight: 1.45,
                maxWidth: "40rem",
              }}
            >
              {roomDescription}
            </p>
          ) : null}
          <p
            style={{
              margin: "0.45rem 0 0 0",
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            Espace vote
          </p>
        </header>

        <div
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
          <div style={panelStyle}>
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
          String(liveScene || "").toLowerCase() === "waiting" ||
          infoMessage) && (
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
            ) : String(liveScene || "").toLowerCase() === "waiting" ? (
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
                  En attente du direct
                </h2>
                <p style={{ margin: "0 0 0.65rem 0", lineHeight: 1.55 }}>
                  <strong>Rien ne fonctionne mal</strong> : vous êtes sur la
                  bonne page pour cet événement. Pour l’instant, la salle est en
                  pause ou entre deux moments — le vote et les résultats sont
                  lancés depuis le poste de régie (celui qui pilote le grand
                  écran).
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: palette.muted,
                    lineHeight: 1.5,
                  }}
                >
                  Dès que l’organisateur ouvrira le vote ou affichera une
                  question, le formulaire ou les résultats apparaîtront ici
                  automatiquement. Vous pouvez garder cet onglet ouvert ;
                  inutile d’actualiser en continu.
                </p>
              </>
            ) : (
              <p style={{ margin: 0, lineHeight: 1.55 }}>{infoMessage}</p>
            )}
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
                  background: `color-mix(in srgb, ${accent} 22%, transparent)`,
                  borderRadius: "10px",
                  border: `1px solid color-mix(in srgb, ${accent} 38%, transparent)`,
                  color: isDark ? palette.fg : palette.fg2,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {libelleScene("voting")}
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
              border: `1px solid ${palette.cardBorder}`,
              borderRadius: "16px",
              padding: "1.25rem 1.35rem",
              marginBottom: "1rem",
              background: isDark
                ? "rgba(15, 23, 42, 0.4)"
                : "rgba(255,255,255,0.55)",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(1.2rem, 4vw, 1.55rem)",
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
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {optionsPourVote.map((opt) => (
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
                      border: `1px solid ${palette.cardBorder}`,
                      background: isDark
                        ? "rgba(15, 23, 42, 0.35)"
                        : "rgba(255,255,255,0.65)",
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
              <div style={{ marginTop: "1.15rem" }}>
                <button
                  type="button"
                  onClick={submitVote}
                  disabled={votesBloques || !hasSelectionValide}
                  style={{
                    width: "100%",
                    maxWidth: "22rem",
                    padding: "1.05rem 1.4rem",
                    fontSize: "clamp(1rem, 3.5vw, 1.1rem)",
                    borderRadius: "14px",
                    border: "none",
                    background:
                      votesBloques || !hasSelectionValide
                        ? isDark
                          ? "rgba(148, 163, 184, 0.35)"
                          : "#94a3b8"
                        : `linear-gradient(135deg, ${accent}, #6366f1)`,
                    color: "#fff",
                    cursor:
                      votesBloques || !hasSelectionValide
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 700,
                    boxShadow:
                      votesBloques || !hasSelectionValide
                        ? "none"
                        : "0 8px 28px rgba(0, 0, 0, 0.22)",
                  }}
                >
                  {voteSubmitting ? "Envoi…" : "Valider mon vote"}
                </button>
              </div>
            </div>
          ) : null}

          {showBlocResultatsEnDirect && !enAttenteAutoRevealResultats ? (
            <section
              ref={resultsAnchorRef}
              style={{
                marginTop: voteOuvert ? 0 : "0.5rem",
                padding: "1.25rem 1.35rem",
                borderRadius: "16px",
                border: `1px solid ${palette.cardBorder}`,
                background: isDark
                  ? "rgba(15, 23, 42, 0.5)"
                  : "rgba(255,255,255,0.75)",
                boxShadow: isDark
                  ? "0 16px 40px rgba(0, 0, 0, 0.25)"
                  : "0 12px 32px rgba(15, 23, 42, 0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3
                style={{
                  fontSize: "1.05rem",
                  margin: "0 0 0.35rem 0",
                  color: palette.fg,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {titreBlocResultats}
              </h3>
              {voteOuvert && affichageResultatsPublic ? (
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
              {pollEstNotation ? (
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
                Résultats
              </h3>
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
