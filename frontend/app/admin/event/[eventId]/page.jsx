"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import {
  QUESTION_TIMER_MAX_SEC,
  decomposeTimerSeconds,
  formatCountdownVerbose,
} from "@/lib/chronoFormat";
import { AjouterQuestionLiveModal } from "@/components/AjouterQuestionLiveModal";
import { adminFetch, apiBaseBrowser, SOCKET_URL as SOCKET } from "@/lib/config";
import {
  getEventUxPanelStyles,
  getEventUxSceneBadge,
  getEventUxSceneBadgeFromKey,
  getEventUxState,
} from "@/lib/eventUxState";

const VOTE_STATE_LABELS = {
  open: "Vote ouvert",
  closed: "Vote fermé",
};

const DISPLAY_STATE_LABELS = {
  question: "Question (réponses à l’écran)",
  results: "Résultats (barres)",
  black: "Pause",
  waiting:
    "Attente — la salle ne voit rien. Relancez la projection : « Afficher la question » ou « Afficher les résultats en direct ».",
};

const AUTO_ROTATE_SEC_MIN = 3;
const AUTO_ROTATE_SEC_MAX = 120;

/** @param {unknown} n */
function clampAutoRotateSec(n) {
  const x =
    typeof n === "number" ? n : parseInt(String(n ?? "").trim(), 10);
  if (!Number.isFinite(x)) return AUTO_ROTATE_SEC_MIN;
  return Math.min(
    AUTO_ROTATE_SEC_MAX,
    Math.max(AUTO_ROTATE_SEC_MIN, Math.floor(x)),
  );
}

/** @param {string | undefined} live */
function deriveRegieDisplayFallback(live) {
  const s = String(live || "").toLowerCase();
  if (s === "results") return "results";
  if (s === "voting") return "question";
  if (s === "paused") return "black";
  return "waiting";
}

/** Normalise la valeur affichée côté UI avant getEventUxState. */
function normalizeRegieLiveStateForUx(raw) {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === "" || s === "—") return undefined;
  return s;
}

/** ≥1024px : dashboard 3 colonnes (équivalent lg) */
function useBreakpointMin(px) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const apply = () => setOk(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [px]);
  return ok;
}

/** Carte type dashboard */
const CARD = {
  borderRadius: "12px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: "1rem",
  boxSizing: "border-box",
};

function chronoRestantAffiche(tm, tick) {
  void tick;
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

function badgeStyle(status) {
  switch (status) {
    case "ACTIVE":
      return { bg: "#dcfce7", color: "#166534", border: "#22c55e" };
    case "CLOSED":
      return { bg: "#f3f4f6", color: "#374151", border: "#9ca3af" };
    case "DRAFT":
      return { bg: "#e0f2fe", color: "#075985", border: "#38bdf8" };
    case "SCHEDULED":
      return { bg: "#fef3c7", color: "#92400e", border: "#f59e0b" };
    case "ARCHIVED":
      return { bg: "#f5f5f4", color: "#57534e", border: "#a8a29e" };
    default:
      return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
  }
}

function isContestPoll(poll) {
  return String(poll?.type || "").toUpperCase() === "CONTEST_ENTRY";
}

function isLeadPoll(poll) {
  return Boolean(poll?.leadEnabled) && !isContestPoll(poll);
}

function isStandardPoll(poll) {
  return !isContestPoll(poll) && !isLeadPoll(poll);
}

function pollKindStyle(poll) {
  if (isContestPoll(poll)) {
    return {
      label: "Concours",
      bg: "#faf5ff",
      border: "#d8b4fe",
      color: "#6d28d9",
      cardBg: "#fcfaff",
    };
  }
  if (isLeadPoll(poll)) {
    return {
      label: "Lead",
      bg: "#ecfeff",
      border: "#99f6e4",
      color: "#0f766e",
      cardBg: "#f7feff",
    };
  }
  if (isStandardPoll(poll)) {
    return {
      label: "Sondage",
      bg: "#f8fafc",
      border: "#cbd5e1",
      color: "#475569",
      cardBg: "#ffffff",
    };
  }
  return {
    label: "Sondage",
    bg: "#f8fafc",
    border: "#cbd5e1",
    color: "#475569",
    cardBg: "#ffffff",
  };
}

function PollCard({
  poll,
  isActive,
  busy,
  liveState,
  activePollId,
  /** État vote événement (open | closed) — le sondage peut être ACTIVE sans vote ouvert */
  voteState,
  onOpen,
  onCloseRegie,
  onResults,
  onContestShortcut,
  onLeadShortcut,
  desktop,
  compact = false,
}) {
  const badge = badgeStyle(poll.status);
  const kind = pollKindStyle(poll);
  const scene = String(liveState || "").toLowerCase();
  const voteOuvertSurCeSondage =
    String(activePollId || "") === String(poll.id) &&
    String(voteState || "").toLowerCase().trim() === "open";
  const disableLancer =
    busy ||
    poll.status === "ARCHIVED" ||
    voteOuvertSurCeSondage;
  const disableStop = busy || poll.status !== "ACTIVE";
  const disableResultats = busy;

  const boutons = (
    <>
      <button
        type="button"
        disabled={disableLancer}
        onClick={() => onOpen(poll.id)}
        style={btnLancerVote(disableLancer)}
        title={
          voteOuvertSurCeSondage
            ? "Le vote est déjà lancé sur ce sondage."
            : undefined
        }
      >
        Lancer le vote
      </button>
      <button
        type="button"
        disabled={disableStop}
        onClick={() => onCloseRegie(poll.id)}
        style={btnStopVote(disableStop)}
        title={
          poll.status !== "ACTIVE"
            ? "Ce sondage n’est pas ouvert au vote."
            : undefined
        }
      >
        Stop vote
      </button>
      <button
        type="button"
        disabled={disableResultats}
        onClick={() => onResults(poll.id)}
        style={btnAfficherResultats(disableResultats)}
        title="Affiche les barres à la salle. Même commande que « Afficher les résultats en direct » (le vote peut rester ouvert)."
      >
        Projeter les résultats finaux
      </button>
    </>
  );

  const quickAction = isContestPoll(poll) ? (
    <button
      type="button"
      disabled={busy}
      onClick={() => onContestShortcut?.(poll)}
      style={btnSecondaryAction(busy)}
      title="Raccourci vers le tirage concours"
    >
      Tirer un gagnant
    </button>
  ) : isLeadPoll(poll) ? (
    <button
      type="button"
      disabled={busy}
      onClick={() => onLeadShortcut?.(poll)}
      style={btnSecondaryAction(busy)}
      title="Ouvrir la page leads de cet événement"
    >
      Voir les leads
    </button>
  ) : null;

  const metaRow = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: desktop ? "0.45rem" : "0.5rem",
        marginBottom: desktop ? "0.4rem" : "0.55rem",
      }}
    >
      {isActive ? (
        <span
          title="Sondage actuellement relié à l’événement (affiches & commandes). Peut être ouvert ou fermé au vote."
          style={{
            fontSize: "0.62rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            background: "#1d4ed8",
            color: "#fff",
          }}
        >
          Antenne
        </span>
      ) : null}
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "0.2rem 0.45rem",
          borderRadius: "6px",
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
        }}
      >
        {poll.status}
      </span>
      <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
        Ordre {poll.order} · {poll.type}
      </span>
          <span
            style={{
              fontSize: "0.66rem",
              fontWeight: 800,
              padding: "0.17rem 0.45rem",
              borderRadius: "999px",
              background: kind.bg,
              color: kind.color,
              border: `1px solid ${kind.border}`,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {kind.label}
          </span>
      <span
        style={{
          fontSize: "0.82rem",
          color: "#4b5563",
          marginLeft: desktop ? undefined : "auto",
        }}
      >
        <strong>{poll.voteCount ?? 0}</strong> vote
        {(poll.voteCount ?? 0) !== 1 ? "s" : ""}
      </span>
    </div>
  );

  const titre = (
    <p
      style={{
        margin: compact ? "0.35rem 0 0 0" : desktop ? "0" : "0 0 0.85rem 0",
        fontWeight: 600,
        fontSize: compact ? "0.8rem" : desktop ? "1rem" : "0.98rem",
        color: "#111827",
        lineHeight: 1.35,
      }}
    >
      {poll.question || poll.title}
    </p>
  );

  if (compact) {
    return (
      <div
        id={`regie-poll-${poll.id}`}
        style={{
          border: isActive ? "2px solid #2563eb" : "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0.55rem 0.65rem",
          marginBottom: "0.45rem",
          background: isActive ? "#eff6ff" : kind.cardBg,
          boxShadow: isActive
            ? "0 1px 8px rgba(37, 99, 235, 0.14)"
            : "0 1px 2px rgba(0,0,0,0.04)",
          cursor: "default",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.35rem",
            marginBottom: "0.2rem",
          }}
        >
          {isActive ? (
            <span
              title="Sondage relié à l’événement (voir carte étendue)."
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                padding: "0.12rem 0.35rem",
                borderRadius: "4px",
                background: "#1d4ed8",
                color: "#fff",
              }}
            >
              Antenne
            </span>
          ) : null}
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "0.15rem 0.38rem",
              borderRadius: "5px",
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}
          >
            {poll.status}
          </span>
          <span style={{ fontSize: "0.68rem", color: "#6b7280", marginLeft: "auto" }}>
            <strong style={{ color: "#374151" }}>{poll.voteCount ?? 0}</strong> vote
            {(poll.voteCount ?? 0) !== 1 ? "s" : ""}
          </span>
          <span
            style={{
              fontSize: "0.58rem",
              fontWeight: 800,
              padding: "0.11rem 0.34rem",
              borderRadius: "999px",
              background: kind.bg,
              color: kind.color,
              border: `1px solid ${kind.border}`,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {kind.label}
          </span>
        </div>
        {titre}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            marginTop: "0.4rem",
          }}
        >
          <button
            type="button"
            disabled={disableLancer}
            onClick={() => onOpen(poll.id)}
            style={{
              ...btnLancerVote(disableLancer),
              width: "100%",
              padding: "0.38rem 0.5rem",
              fontSize: "0.72rem",
            }}
          >
            Lancer le vote
          </button>
          <button
            type="button"
            disabled={disableStop}
            onClick={() => onCloseRegie(poll.id)}
            style={{
              ...btnStopVote(disableStop),
              width: "100%",
              padding: "0.38rem 0.5rem",
              fontSize: "0.72rem",
            }}
          >
            Stop vote
          </button>
          <button
            type="button"
            disabled={disableResultats}
            onClick={() => onResults(poll.id)}
            title="Affiche les barres à la salle. Même commande que « Afficher les résultats en direct »."
            style={{
              ...btnAfficherResultats(disableResultats),
              width: "100%",
              padding: "0.38rem 0.5rem",
              fontSize: "0.72rem",
            }}
          >
            Projeter les résultats finaux
          </button>
          {quickAction ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                isContestPoll(poll)
                  ? onContestShortcut?.(poll)
                  : onLeadShortcut?.(poll)
              }
              style={{
                ...btnSecondaryAction(busy),
                width: "100%",
                padding: "0.38rem 0.5rem",
                fontSize: "0.72rem",
              }}
            >
              {isContestPoll(poll) ? "Tirer un gagnant" : "Voir les leads"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: isActive ? "2px solid #2563eb" : "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: desktop ? "0.85rem 1.1rem" : "0.8rem 0.95rem",
        marginBottom: desktop ? "0.6rem" : "0.7rem",
        background: isActive ? "#eff6ff" : kind.cardBg,
        boxShadow: isActive
          ? "0 2px 12px rgba(37, 99, 235, 0.12)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {desktop ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem 1rem",
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            {metaRow}
            {titre}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.45rem",
              justifyContent: "flex-end",
              alignItems: "center",
              flex: "0 1 340px",
            }}
          >
            {boutons}
            {quickAction}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {isActive ? (
              <span
                title="Sondage actuellement relié à l’événement (affiches & commandes). Peut être ouvert ou fermé au vote."
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "4px",
                  background: "#1d4ed8",
                  color: "#fff",
                }}
              >
                Antenne
              </span>
            ) : null}
            <span
              title="Statut Prisma du sondage (ACTIVE = vote possible si session ouverte, CLOSED = vote arrêté sur ce sondage)."
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              {poll.status}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              Ordre {poll.order} · {poll.type}
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 800,
                padding: "0.15rem 0.4rem",
                borderRadius: "999px",
                background: kind.bg,
                color: kind.color,
                border: `1px solid ${kind.border}`,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {kind.label}
            </span>
            <span style={{ fontSize: "0.85rem", color: "#4b5563", marginLeft: "auto" }}>
              <strong>{poll.voteCount ?? 0}</strong> vote
              {(poll.voteCount ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
          {titre}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {boutons}
            {quickAction}
          </div>
        </>
      )}
    </div>
  );
}

function btnPrimary(disabled) {
  return {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "8px",
    border: "1px solid #1d4ed8",
    background: disabled ? "#93c5fd" : "#2563eb",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}

function btnSecondary(disabled) {
  return {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: disabled ? "#f3f4f6" : "#fff",
    color: "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}

function btnLancerVote(disabled) {
  return {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "8px",
    border: `1px solid ${disabled ? "#bbf7d0" : "#15803d"}`,
    background: disabled ? "#f0fdf4" : "#22c55e",
    color: disabled ? "#94a3b8" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

function btnStopVote(disabled) {
  return {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "8px",
    border: `1px solid ${disabled ? "#e5e7eb" : "#f87171"}`,
    background: disabled ? "#f9fafb" : "#fef2f2",
    color: disabled ? "#9ca3af" : "#b91c1c",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.75 : 1,
  };
}

function btnAfficherResultats(disabled) {
  return {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "8px",
    border: `1px solid ${disabled ? "#bfdbfe" : "#1d4ed8"}`,
    background: disabled ? "#f8fafc" : "#2563eb",
    color: disabled ? "#9ca3af" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

function btnSecondaryAction(disabled) {
  return {
    padding: "0.46rem 0.82rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    borderRadius: "8px",
    border: "1px solid #c4b5fd",
    background: disabled ? "#f5f3ff" : "#faf5ff",
    color: disabled ? "#a1a1aa" : "#5b21b6",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

function btnDanger(disabled) {
  return {
    padding: "0.55rem 1.1rem",
    fontSize: "0.95rem",
    borderRadius: "8px",
    border: "1px solid #b91c1c",
    background: disabled ? "#fecaca" : "#dc2626",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    opacity: disabled ? 0.65 : 1,
  };
}

function btnFinish(disabled) {
  return {
    padding: "0.5rem 0.95rem",
    fontSize: "0.82rem",
    borderRadius: "8px",
    border: `1px solid ${disabled ? "#e5e7eb" : "#f59e0b"}`,
    background: disabled ? "#f9fafb" : "#fff7ed",
    color: disabled ? "#9ca3af" : "#b45309",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.7 : 1,
  };
}

function lienDiffusionAbsolu(path) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${path}`;
}

/**
 * Projection salle — mis en avant sous l’état live (liens + actions + présence).
 * @param {{
 *   slug: string;
 *   activePollId: string | null;
 *   liveState: string;
 *   displayState: string;
 *   busy: boolean;
 *   postAction: (path: string) => Promise<boolean>;
 *   sendScreenAction: (type: "RESULTS" | "QUESTION" | "WAITING" | "BLACK") => void;
 *   screenCount: number;
 *   desktop: boolean;
 *   chronoSection?: import("react").ReactNode;
 *   autoRotate: boolean;
 *   onAutoRotateChange: (v: boolean) => void;
 *   autoRotateAllowed: boolean;
 *   autoRotateQuestionSec: number;
 *   autoRotateResultsSec: number;
 *   onAutoRotateQuestionSecChange: (n: number) => void;
 *   onAutoRotateResultsSecChange: (n: number) => void;
 * }} props
 */
function BlocProjectionEcran({
  slug,
  activePollId,
  liveState,
  displayState: displayStateProp,
  busy,
  postAction,
  sendScreenAction,
  screenCount,
  desktop,
  chronoSection = null,
  autoRotate,
  onAutoRotateChange,
  autoRotateAllowed,
  autoRotateQuestionSec,
  autoRotateResultsSec,
  onAutoRotateQuestionSecChange,
  onAutoRotateResultsSecChange,
}) {
  const [clientPret, setClientPret] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setClientPret(true);
  }, []);

  const enc = encodeURIComponent(slug);
  const pathScreen = `/screen/${enc}`;

  function ouvrirEcran() {
    const url = lienDiffusionAbsolu(pathScreen);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const d = String(displayStateProp || deriveRegieDisplayFallback(liveState)).toLowerCase();
  const ls = String(liveState || "").toLowerCase();
  /** Aligné sur le serveur — évite un bouton « noir » désynchronisé après refresh */
  const affichageNoir = d === "black" || ls === "paused";
  const ecranConnecte = screenCount > 0;
  const statutEcran =
    screenCount <= 0
      ? "🔴 Aucun écran connecté"
      : screenCount === 1
        ? "🟢 1 écran connecté"
        : `🟢 ${screenCount} écrans connectés`;

  const full = { width: "100%", boxSizing: "border-box" };
  const btnOuvrir = {
    ...full,
    padding: desktop ? "0.88rem 1.35rem" : "0.9rem 1.15rem",
    fontSize: desktop ? "1rem" : "0.98rem",
    fontWeight: 800,
    borderRadius: "12px",
    border: "1px solid #5b21b6",
    background: "linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(109, 40, 217, 0.35)",
    letterSpacing: "-0.02em",
    maxWidth: desktop ? "600px" : "none",
    marginLeft: "auto",
    marginRight: "auto",
    display: "block",
  };
  const btnOutlineSecondaire = {
    ...full,
    padding: desktop ? "0.6rem 0.85rem" : "0.55rem 0.75rem",
    fontSize: "0.84rem",
    fontWeight: 600,
    borderRadius: "10px",
    border: "1px solid #a78bfa",
    background: "#fff",
    color: "#5b21b6",
    cursor: busy ? "wait" : "pointer",
  };
  const btnDangerNoir = {
    ...full,
    padding: desktop ? "0.62rem 1rem" : "0.58rem 0.95rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    borderRadius: "10px",
    border: "1px solid #292524",
    background: "linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)",
    color: "#fafaf9",
    cursor: busy ? "wait" : "pointer",
    boxShadow: "0 3px 10px rgba(12, 10, 9, 0.35)",
  };
  const btnRevenirDirect = {
    ...full,
    padding: desktop ? "0.62rem 1rem" : "0.58rem 0.95rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    borderRadius: "10px",
    border: "1px solid #86efac",
    background: "#f0fdf4",
    color: "#166534",
    cursor: busy ? "wait" : "pointer",
  };

  const secDisabled = (extra) => ({
    opacity: extra ? 0.5 : 1,
    cursor: extra || busy ? "not-allowed" : "pointer",
  });

  return (
    <section
      style={{
        ...CARD,
        padding: desktop ? "1.35rem 1.45rem" : "1.2rem 1rem",
        background: "linear-gradient(165deg, #f5f3ff 0%, #ede9fe 40%, #faf5ff 100%)",
        border: "1px solid #c4b5fd",
        boxShadow: "0 4px 20px rgba(91, 33, 182, 0.12)",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            fontSize: desktop ? "1.28rem" : "1.12rem",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.02em",
            color: "#3b0764",
          }}
        >
          Projection écran
        </h2>
        <p
          style={{
            margin: "0.45rem 0 0 0",
            fontSize: desktop ? "1.08rem" : "1.02rem",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.35,
            color: ecranConnecte ? "#14532d" : "#991b1b",
          }}
        >
          {statutEcran}
        </p>
        <p
          style={{
            margin: "0.35rem 0 0 0",
            fontSize: "0.78rem",
            color: "#6b21a8",
            lineHeight: 1.45,
            fontWeight: 500,
            opacity: 0.92,
          }}
        >
          Affichage en direct pour votre audience
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "1.35rem",
        }}
      >
        <button type="button" onClick={ouvrirEcran} style={btnOuvrir}>
          Ouvrir l’écran
        </button>
      </div>

      <div style={{ marginBottom: "1.35rem" }}>
        <p
          style={{
            margin: "0 0 0.55rem 0",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7c3aed",
            opacity: 0.9,
          }}
        >
          Contrôle de la scène
        </p>
        <div className="proj-ecran-secondaires">
          <div className="proj-ecran-action">
            <button
              type="button"
              disabled={busy || !activePollId}
              onClick={async () => {
                await postAction(`/polls/${activePollId}/show-results`);
              }}
              style={{
                ...btnOutlineSecondaire,
                ...secDisabled(busy || !activePollId),
              }}
            >
              Afficher les résultats en direct
            </button>
            <p
              style={{
                margin: "0.35rem 0 0 0",
                fontSize: "0.72rem",
                lineHeight: 1.4,
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              Les votes continuent et les résultats évoluent en temps réel
            </p>
          </div>
          <div className="proj-ecran-action">
            <button
              type="button"
              disabled={busy || !activePollId || d !== "results"}
              onClick={async () => {
                await postAction(`/polls/${activePollId}/display-question`);
              }}
              style={{
                ...btnOutlineSecondaire,
                ...secDisabled(busy || !activePollId || d !== "results"),
              }}
            >
              Afficher la question
            </button>
            <p
              style={{
                margin: "0.35rem 0 0 0",
                fontSize: "0.72rem",
                lineHeight: 1.4,
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              Les participants répondent depuis leur téléphone
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          padding: desktop ? "0.85rem 1rem" : "0.75rem 0.85rem",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(91, 33, 182, 0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.65rem 0.85rem",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "#4c1d95",
            }}
          >
            Rotation automatique
          </span>
          <button
            type="button"
            disabled={busy || (!autoRotateAllowed && !autoRotate)}
            aria-pressed={autoRotate}
            onClick={() => onAutoRotateChange(!autoRotate)}
            style={{
              flexShrink: 0,
              padding: "0.42rem 1rem",
              minWidth: "7.5rem",
              borderRadius: "9999px",
              border: autoRotate
                ? "1px solid #15803d"
                : "1px solid #cbd5e1",
              background: autoRotate
                ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
                : "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
              color: autoRotate ? "#fff" : "#475569",
              fontSize: "0.8rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              cursor:
                busy || (!autoRotateAllowed && !autoRotate)
                  ? "not-allowed"
                  : "pointer",
              opacity: busy || (!autoRotateAllowed && !autoRotate) ? 0.55 : 1,
              boxShadow: autoRotate
                ? "0 2px 8px rgba(22, 163, 74, 0.35)"
                : "0 1px 3px rgba(15, 23, 42, 0.08)",
            }}
          >
            {autoRotate ? "Activé" : "Désactivé"}
          </button>
        </div>
        <div
          style={{
            marginTop: "0.65rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "0.75rem 1.1rem",
          }}
        >
          <label
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Question (s)
            <input
              type="number"
              min={AUTO_ROTATE_SEC_MIN}
              max={AUTO_ROTATE_SEC_MAX}
              value={autoRotateQuestionSec}
              disabled={busy}
              onChange={(e) =>
                onAutoRotateQuestionSecChange(
                  clampAutoRotateSec(e.target.value),
                )
              }
              style={{
                display: "block",
                marginTop: "0.22rem",
                width: "3.6rem",
                padding: "0.28rem 0.35rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            />
          </label>
          <label
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#64748b",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Résultats (s)
            <input
              type="number"
              min={AUTO_ROTATE_SEC_MIN}
              max={AUTO_ROTATE_SEC_MAX}
              value={autoRotateResultsSec}
              disabled={busy}
              onChange={(e) =>
                onAutoRotateResultsSecChange(
                  clampAutoRotateSec(e.target.value),
                )
              }
              style={{
                display: "block",
                marginTop: "0.22rem",
                width: "3.6rem",
                padding: "0.28rem 0.35rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            />
          </label>
          <span
            style={{
              fontSize: "0.62rem",
              color: "#94a3b8",
              fontWeight: 500,
              paddingBottom: "0.15rem",
              maxWidth: "14rem",
              lineHeight: 1.35,
            }}
          >
            {AUTO_ROTATE_SEC_MIN}–{AUTO_ROTATE_SEC_MAX} s chacun.
          </span>
        </div>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            fontSize: "0.68rem",
            color: "#64748b",
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          Alterne la question puis les résultats live selon ces durées.
          Désactivée si écran noir, vote fermé ou changement de sondage ; toute
          action manuelle l’arrête.
        </p>
      </div>

      <div
        style={{
          marginBottom: chronoSection ? "1.2rem" : 0,
          padding: desktop ? "1.1rem 1rem" : "1rem 0.85rem",
          borderRadius: "12px",
          border: "1px dashed rgba(91, 33, 182, 0.35)",
          background: "rgba(255,255,255,0.4)",
        }}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (affichageNoir) {
              sendScreenAction("WAITING");
            } else {
              sendScreenAction("BLACK");
            }
          }}
          style={
            affichageNoir
              ? { ...btnRevenirDirect, ...secDisabled(busy) }
              : { ...btnDangerNoir, ...secDisabled(busy) }
          }
        >
          {affichageNoir ? "Revenir au direct" : "Écran noir"}
        </button>
        <p
          style={{
            margin: "0.45rem 0 0 0",
            fontSize: "0.7rem",
            color: "#64748b",
            lineHeight: 1.35,
          }}
        >
          {affichageNoir
            ? "La salle est en noir (confirmé côté serveur). « Revenir au direct » enlève le noir puis affiche l’attente : vous devez choisir « Afficher la question » ou « Afficher les résultats » (le vote peut rester ouvert)."
            : "Masque la projection sans fermer le vote. État synchronisé avec l’API après chaque action."}
        </p>
      </div>

      {chronoSection ? (
        <div
          style={{
            marginBottom: "0.75rem",
            padding: desktop ? "1.1rem 1.05rem" : "1rem 0.85rem",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid #ddd6fe",
          }}
        >
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6d28d9",
            }}
          >
            Chrono scène
          </p>
          {chronoSection}
        </div>
      ) : null}

      {clientPret ? (
        <p
          style={{
            margin: chronoSection ? "0.35rem 0 0 0" : "0.75rem 0 0 0",
            paddingTop: chronoSection ? "0.75rem" : "0.85rem",
            borderTop: "1px solid #e9d5ff",
            fontSize: "0.65rem",
            color: "#64748b",
            wordBreak: "break-all",
            fontFamily: "ui-monospace, monospace",
            lineHeight: 1.35,
          }}
        >
          {lienDiffusionAbsolu(pathScreen)}
        </p>
      ) : null}

      <style>{`
        .proj-ecran-secondaires {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .proj-ecran-action {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .proj-ecran-action > button {
          width: 100%;
        }
        @media (min-width: 640px) {
          .proj-ecran-secondaires {
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: flex-start;
            gap: 0.65rem;
          }
          .proj-ecran-action {
            flex: 1 1 50%;
          }
        }
      `}</style>
    </section>
  );
}

/**
 * Panneau droit / mobile : QR + lien rapide uniquement (pas d’écran ni liste technique).
 * Toggle Participants ↔ Vote direct.
 * @param {{ slug: string; liveState: string; stateLabel: string; variant: "rail" | "mobile"; embedded?: boolean; sceneBadge?: { label: string; bg: string; color: string; border: string } | null }} props
 */
function PanneauQrParticipant({
  slug,
  liveState,
  stateLabel,
  variant,
  embedded = false,
  sceneBadge = null,
}) {
  const [mode, setMode] = useState(/** @type {"join" | "vote"} */ ("join"));
  const [targetUrl, setTargetUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const rail = variant === "rail";

  const enc = encodeURIComponent(slug);
  const pathJoin = `/join/${enc}`;
  const pathVote = `/p/${enc}`;
  const pathActif = mode === "join" ? pathJoin : pathVote;

  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    setTargetUrl(`${window.location.origin}${pathActif}`);
  }, [slug, pathActif]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copierLien() {
    const url = lienDiffusionAbsolu(pathActif);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // ignore
    }
  }

  function ouvrirLien() {
    const url = lienDiffusionAbsolu(pathActif);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const qrSize = rail ? 252 : 196;
  const badge =
    sceneBadge ??
    getEventUxSceneBadge({ liveState: normalizeRegieLiveStateForUx(liveState) });

  const wrap = {
    ...CARD,
    padding: rail ? "1.1rem" : "1rem",
    ...(rail && !embedded
      ? {
          position: "sticky",
          top: "1.5rem",
          alignSelf: "start",
          maxWidth: "320px",
          width: "100%",
        }
      : {}),
  };

  const toggleWrap = {
    display: "flex",
    gap: "3px",
    padding: "3px",
    borderRadius: "10px",
    background: "#f1f5f9",
    marginBottom: "0.85rem",
  };

  /** @param {"join" | "vote"} m */
  function styleSeg(m) {
    const on = mode === m;
    return {
      flex: 1,
      padding: "0.42rem 0.5rem",
      fontSize: "0.74rem",
      fontWeight: 700,
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      background: on ? "#fff" : "transparent",
      color: on ? "#0f172a" : "#64748b",
      boxShadow: on ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
    };
  }

  return (
    <aside style={wrap} aria-label="Accès participants rapide">
      {embedded ? null : (
        <>
          <h3
            style={{
              margin: "0 0 0.2rem 0",
              fontSize: "0.98rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Accès participants
          </h3>
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontSize: "0.72rem",
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            QR & lien rapides
          </p>
        </>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "0.65rem",
        }}
      >
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            padding: "0.18rem 0.45rem",
            borderRadius: "6px",
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.label}
        </span>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#475569",
            lineHeight: 1.3,
          }}
        >
          {stateLabel}
        </span>
      </div>

      <div style={toggleWrap} role="group" aria-label="Type de lien pour le QR">
        <button
          type="button"
          aria-pressed={mode === "join"}
          onClick={() => setMode("join")}
          style={styleSeg("join")}
        >
          Participants
        </button>
        <button
          type="button"
          aria-pressed={mode === "vote"}
          onClick={() => setMode("vote")}
          style={styleSeg("vote")}
        >
          Vote direct
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "0.85rem 0.65rem",
          background: "#fafafa",
          borderRadius: "14px",
          border: "1px solid #e5e7eb",
          marginBottom: "0.55rem",
        }}
      >
        {targetUrl ? (
          <QRCodeSVG
            value={targetUrl}
            size={qrSize}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        ) : (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
            Chargement…
          </p>
        )}
      </div>

      {targetUrl ? (
        <p
          title={targetUrl}
          style={{
            margin: "0 0 0.55rem 0",
            textAlign: "center",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "#64748b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pathActif}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.55rem",
        }}
      >
        <button
          type="button"
          onClick={ouvrirLien}
          style={{
            padding: "0.42rem 0.95rem",
            fontSize: "0.76rem",
            fontWeight: 600,
            borderRadius: "8px",
            border: "1px solid #7c3aed",
            background: "#faf5ff",
            color: "#5b21b6",
            cursor: "pointer",
            flex: rail ? undefined : 1,
            minWidth: "5rem",
          }}
        >
          Ouvrir
        </button>
        <button
          type="button"
          onClick={copierLien}
          style={{
            padding: "0.42rem 0.85rem",
            fontSize: "0.76rem",
            fontWeight: 600,
            borderRadius: "8px",
            border: "1px solid transparent",
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            flex: rail ? undefined : 1,
            minWidth: "5rem",
          }}
        >
          Copier le lien
        </button>
        {copied ? (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#15803d",
              alignSelf: "center",
            }}
          >
            Copié
          </span>
        ) : null}
      </div>
    </aside>
  );
}

/** Copie du lien /screen — discret, colonne partage */
function CopierLienEcranLeger({ slug }) {
  const [copied, setCopied] = useState(false);
  const pathScreen = `/screen/${encodeURIComponent(slug)}`;

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copier() {
    const url = lienDiffusionAbsolu(pathScreen);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // ignore
    }
  }

  return (
    <div
      style={{
        padding: "0.65rem 0",
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        margin: "0.15rem 0",
      }}
    >
      <p
        style={{
          margin: "0 0 0.35rem 0",
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        Projection salle
      </p>
      <button
        type="button"
        onClick={() => void copier()}
        style={{
          border: "none",
          background: "none",
          padding: 0,
          margin: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: copied ? "#15803d" : "#7c3aed",
          textDecoration: copied ? "none" : "underline",
          textUnderlineOffset: "3px",
          cursor: "pointer",
        }}
      >
        {copied ? "Lien copié" : "Copier le lien de l’écran"}
      </button>
    </div>
  );
}

/** Presets overlay : liens prêts pour OBS / stream / conférence */
function BlocOverlayStreamPresets({ slug, onCopied }) {
  const [copiedId, setCopiedId] = useState(/** @type {string | null} */ (null));

  const presets = useMemo(() => {
    const enc = encodeURIComponent(slug);
    const path = `/overlay/${enc}`;
    return [
      {
        id: "stream-compact",
        label: "Stream compact",
        desc: "Parfait pour Twitch / OBS",
        query: "variant=compact&mode=auto&qr=0",
      },
      {
        id: "results-live",
        label: "Résultats live",
        desc: "Plein cadre résultats, idéal en incrustation",
        query: "variant=compact&mode=results&qr=0",
      },
      {
        id: "sans-qr",
        label: "Sans QR",
        desc: "Question et chrono, interface épurée",
        query: "variant=standard&qr=0",
      },
      {
        id: "conference",
        label: "Conférence / scène",
        desc: "Grand format, QR visible — salle ou keynote",
        query: "variant=large&mode=auto",
      },
      {
        id: "minimal",
        label: "Minimal",
        desc: "Coin discret, sans QR par défaut",
        query: "variant=minimal&qr=0",
      },
      {
        id: "qr-seul",
        label: "QR seul",
        desc: "Code uniquement — incrustation discrète (ex. coin stream)",
        query: "only=qr&variant=compact&position=br",
      },
    ].map((p) => ({ ...p, path: `${path}?${p.query}` }));
  }, [slug]);

  useEffect(() => {
    if (!copiedId) return;
    const id = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(id);
  }, [copiedId]);

  async function copier(p) {
    const url = lienDiffusionAbsolu(p.path);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(p.id);
      onCopied?.();
    } catch {
      // ignore
    }
  }

  return (
    <div
      style={{
        padding: "0.65rem 0",
        borderBottom: "1px solid #e5e7eb",
        margin: "0 0 0.15rem 0",
      }}
    >
      <p
        style={{
          margin: "0 0 0.2rem 0",
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        Overlay stream
      </p>
      <p
        style={{
          margin: "0 0 0.55rem 0",
          fontSize: "0.72rem",
          color: "#64748b",
          lineHeight: 1.35,
        }}
      >
        Utilisable dans OBS, streaming ou affichage discret
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {presets.map((p) => (
          <div
            key={p.id}
            style={{
              padding: "0.55rem 0.65rem",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {p.label}
              </p>
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.68rem",
                  color: "#64748b",
                  lineHeight: 1.35,
                }}
              >
                {p.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copier(p)}
              style={{
                alignSelf: "flex-start",
                padding: "0.35rem 0.65rem",
                fontSize: "0.74rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid #99f6e4",
                background: copiedId === p.id ? "#ecfdf5" : "#f0fdfa",
                color: copiedId === p.id ? "#15803d" : "#0f766e",
                cursor: "pointer",
              }}
            >
              {copiedId === p.id ? "Copié" : "Copier le lien"}
            </button>
          </div>
        ))}
      </div>
      <p
        style={{
          margin: "0.55rem 0 0 0",
          fontSize: "0.65rem",
          color: "#94a3b8",
          lineHeight: 1.4,
        }}
      >
        Astuce : <code style={{ fontSize: "0.62rem" }}>?position=br</code>{" "}
        (tl, tr, bl, br, center) · QR seul :{" "}
        <code style={{ fontSize: "0.62rem" }}>?only=qr</code>
      </p>
    </div>
  );
}

/** Liens participant / vote — version compacte pour colonne partage */
function LiensDiffusionCompact({ slug }) {
  const [clientPret, setClientPret] = useState(false);
  const [copied, setCopied] = useState(/** @type {null | "join" | "vote"} */ (null));

  useEffect(() => {
    if (typeof window !== "undefined") setClientPret(true);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const enc = encodeURIComponent(slug);
  const pathJoin = `/join/${enc}`;
  const pathVote = `/p/${enc}`;

  const linkAct = {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#7c3aed",
    background: "none",
    border: "none",
    padding: "0.15rem 0",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  };

  async function copier(path, key) {
    const url = lienDiffusionAbsolu(path);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
    } catch {
      // ignore
    }
  }

  function ouvrir(path) {
    const url = lienDiffusionAbsolu(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  /** @param {{ titre: string; path: string; k: "join" | "vote"; hint: string }} p */
  function cell(p) {
    const abs = clientPret ? lienDiffusionAbsolu(p.path) : "";
    return (
      <div
        style={{
          padding: "0.55rem 0.65rem",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          minWidth: 0,
        }}
      >
        <p
          style={{
            margin: "0 0 0.25rem 0",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.25,
          }}
        >
          {p.titre}
        </p>
        <p
          title={abs || undefined}
          style={{
            margin: "0 0 0.4rem 0",
            fontSize: "0.62rem",
            color: "#94a3b8",
            fontFamily: "ui-monospace, monospace",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.hint}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
          <button type="button" onClick={() => ouvrir(p.path)} style={linkAct}>
            Ouvrir
          </button>
          <span style={{ color: "#e2e8f0", fontSize: "0.65rem" }}>·</span>
          <button type="button" onClick={() => copier(p.path, p.k)} style={linkAct}>
            Copier
          </button>
          {copied === p.k ? (
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#15803d" }}>OK</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Liens utiles"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "0.45rem",
      }}
      className="liens-partage-grid"
    >
      {cell({
        titre: "Entrée participant",
        path: pathJoin,
        k: "join",
        hint: pathJoin,
      })}
      {cell({
        titre: "Vote direct",
        path: pathVote,
        k: "vote",
        hint: pathVote,
      })}
      <style>{`
        @media (min-width: 260px) {
          .liens-partage-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Colonne droite desktop : QR + liens diffusion.
 * @param {{ slug: string; liveState: string; stateLabel: string; showHeader?: boolean; noSticky?: boolean; qrVariant?: "rail" | "mobile"; sceneBadge?: { label: string; bg: string; color: string; border: string } | null }} props
 */
function SidebarPartageDroit({
  slug,
  liveState,
  stateLabel,
  showHeader = true,
  noSticky = false,
  qrVariant = "rail",
  sceneBadge = null,
  onOverlayCopied,
}) {
  return (
    <aside
      style={{
        position: noSticky ? "static" : "sticky",
        top: noSticky ? undefined : "1.5rem",
        alignSelf: "start",
        width: "100%",
        maxWidth: noSticky ? "none" : "300px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      {showHeader ? (
        <div>
          <h2
            style={{
              margin: "0 0 0.2rem 0",
              fontSize: "1.02rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Partage & accès
          </h2>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b", lineHeight: 1.35 }}>
            QR et liens pour votre audience
          </p>
        </div>
      ) : null}
      <PanneauQrParticipant
        slug={slug}
        liveState={liveState}
        stateLabel={stateLabel}
        variant={qrVariant}
        embedded
        sceneBadge={sceneBadge}
      />
      <CopierLienEcranLeger slug={slug} />
      <BlocOverlayStreamPresets slug={slug} onCopied={onOverlayCopied} />
      <div
        style={{
          paddingTop: "0.55rem",
        }}
      >
        <p
          style={{
            margin: "0 0 0.45rem 0",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Liens utiles
        </p>
        <LiensDiffusionCompact slug={slug} />
      </div>
    </aside>
  );
}

const REGIE_SIDEBAR_DEFAULT_DESC =
  "Pilotez la diffusion, le vote et l’écran en direct.";

const btnGhost = {
  padding: "0.35rem 0.65rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
};

const REGIE_PREVIEW_JOIN_LS_PREFIX = "avote_regie_preview_join_";
const LEADS_LAST_SEEN_LS_PREFIX = "avote_leads_seen_at_";

/**
 * @param {{
 *   slug: string;
 *   eventId: string | null;
 *   newLeadCount?: number;
 *   layout: "beside" | "below" | "drawer";
 *   onHide?: () => void;
 * }} props
 */
function RegiePublicPreviewPanel({
  slug,
  eventId,
  newLeadCount = 0,
  layout,
  onHide,
}) {
  const [iframeError, setIframeError] = useState(false);
  const joinPath = `/join/${encodeURIComponent(slug)}`;

  const shell =
    layout === "drawer"
      ? {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          flex: 1,
        }
      : layout === "beside"
        ? {
            flex: "0 0 34%",
            minWidth: "min(100%, 300px)",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: "min(calc(100vh - 6rem), 920px)",
            maxHeight: "min(calc(100vh - 6rem), 920px)",
          }
        : {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: "min(480px, 52vh)",
            maxHeight: "min(640px, 62vh)",
          };

  return (
    <section
      style={{
        ...shell,
        borderRadius: "14px",
        border: "1px solid #cbd5e1",
        background: "#fff",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
      aria-label="Aperçu public salle"
    >
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.55rem 0.75rem",
          borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 120px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Aperçu public
          </p>
          <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.65rem", color: "#64748b" }}>
            Vue participant en direct
          </p>
        </div>
        {eventId ? (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <Link
              href={`/admin/event/${encodeURIComponent(eventId)}/leads`}
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.35rem 0.65rem",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#166534",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Leads
              {newLeadCount > 0 ? (
                <span
                  style={{
                    marginLeft: "0.4rem",
                    display: "inline-flex",
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    borderRadius: "999px",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 0.35rem",
                    background: "#dcfce7",
                    border: "1px solid #86efac",
                    color: "#166534",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                  aria-label={`${newLeadCount} nouveaux leads`}
                  title={`${newLeadCount} nouveaux leads`}
                >
                  {newLeadCount > 99 ? "99+" : newLeadCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={`/admin/events/${encodeURIComponent(eventId)}/customization`}
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.35rem 0.65rem",
                borderRadius: "8px",
                border: "1px solid #c7d2fe",
                background: "#eef2ff",
                color: "#3730a3",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Personnalisation de la salle
            </Link>
          </div>
        ) : null}
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          padding: "0.45rem 0.75rem",
          borderBottom: "1px solid #f1f5f9",
          background: "#fff",
        }}
      >
        <button
          type="button"
          onClick={() =>
            window.open(
              `${window.location.origin}${joinPath}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
          style={{
            ...btnGhost,
            fontSize: "0.72rem",
            padding: "0.32rem 0.55rem",
          }}
        >
          Ouvrir dans un nouvel onglet
        </button>
        {onHide ? (
          <button
            type="button"
            onClick={onHide}
            style={{
              ...btnGhost,
              fontSize: "0.72rem",
              padding: "0.32rem 0.55rem",
            }}
          >
            Masquer l’aperçu
          </button>
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: "#0f172a",
        }}
      >
        {iframeError ? (
          <div
            style={{
              padding: "1.25rem",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "0.85rem",
            }}
          >
            <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600 }}>
              Impossible de charger l’aperçu.
            </p>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `${window.location.origin}${joinPath}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              style={{
                ...btnGhost,
                fontSize: "0.78rem",
                background: "#1e293b",
                color: "#e2e8f0",
                borderColor: "#475569",
              }}
            >
              Ouvrir /join dans un nouvel onglet
            </button>
          </div>
        ) : (
          <iframe
            key={slug}
            title={`Aperçu salle ${slug}`}
            src={joinPath}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setIframeError(false)}
            onError={() => setIframeError(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
          />
        )}
      </div>
    </section>
  );
}

/**
 * Option auto-reveal : délai après fermeture du vote avant passage écran résultats.
 */
function RegieAutoRevealCard({
  eventId,
  autoReveal,
  autoRevealDelaySec,
  onSaved,
}) {
  const [enabled, setEnabled] = useState(Boolean(autoReveal));
  const [delaySec, setDelaySec] = useState(
    [3, 5, 10].includes(Number(autoRevealDelaySec))
      ? Number(autoRevealDelaySec)
      : 5,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setEnabled(Boolean(autoReveal));
    setDelaySec(
      [3, 5, 10].includes(Number(autoRevealDelaySec))
        ? Number(autoRevealDelaySec)
        : 5,
    );
  }, [autoReveal, autoRevealDelaySec]);

  async function patch(body) {
    if (!eventId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/auto-reveal-settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      await onSaved?.();
    } catch (e) {
      setErr(e.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (!eventId) return null;

  return (
    <div
      style={{
        ...CARD,
        padding: "0.65rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.62rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: "#6b7280",
          textTransform: "uppercase",
        }}
      >
        Affichage salle
      </p>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#374151",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.checked;
            setEnabled(v);
            void patch({ autoReveal: v, autoRevealDelaySec: delaySec });
          }}
          style={{ marginTop: "0.12rem" }}
        />
        <span>Révélation automatique des résultats</span>
      </label>
      {enabled ? (
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "#475569",
          }}
        >
          Délai
          <select
            value={delaySec}
            disabled={busy}
            onChange={(e) => {
              const n = Number(e.target.value);
              setDelaySec(n);
              void patch({ autoReveal: true, autoRevealDelaySec: n });
            }}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.8rem",
            }}
          >
            <option value={3}>3 secondes</option>
            <option value={5}>5 secondes</option>
            <option value={10}>10 secondes</option>
          </select>
        </label>
      ) : null}
      {err ? (
        <p
          style={{ color: "#b91c1c", fontSize: "0.72rem", margin: 0 }}
          role="alert"
        >
          {err}
        </p>
      ) : null}
      <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
        Désactivé par défaut : vous projetez les résultats quand vous voulez. Si
        activé, un compte à rebours s’affiche puis les résultats — annulé si vous
        enchaînez manuellement (noir, question, etc.).
      </p>
    </div>
  );
}

/**
 * Contenu structuré sidebar / drawer (header, corps, pied optionnel).
 * @param {{
 *   title?: string | null;
 *   slug?: string | null;
 *   descriptionText: string;
 *   descriptionStored?: string | null;
 *   eventId?: string | null;
 *   onDescriptionSaved?: () => void | Promise<void>;
 *   stateLabel: string;
 *   liveState: string;
 *   sceneBadge?: { label: string; bg: string; color: string; border: string } | null;
 *   onCloseDrawer?: () => void;
 *   autoReveal?: boolean;
 *   autoRevealDelaySec?: number;
 *   onAutoRevealSaved?: () => void | Promise<void>;
 *   joinPreviewDesktop?: boolean;
 *   previewJoinOpen?: boolean;
 *   onTogglePreviewJoin?: () => void;
 *   onOpenJoinPreviewMobile?: () => void;
 *   newLeadCount?: number;
 * }} props
 */
function RegieSidebarInner({
  title,
  slug,
  descriptionText,
  descriptionStored = null,
  eventId = null,
  onDescriptionSaved,
  stateLabel,
  liveState,
  sceneBadge = null,
  onCloseDrawer,
  autoReveal = false,
  autoRevealDelaySec = 5,
  onAutoRevealSaved,
  joinPreviewDesktop = false,
  previewJoinOpen = false,
  onTogglePreviewJoin,
  onOpenJoinPreviewMobile,
  newLeadCount = 0,
}) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [descError, setDescError] = useState(null);

  const badge =
    sceneBadge ??
    getEventUxSceneBadge({ liveState: normalizeRegieLiveStateForUx(liveState) });
  const secondary = {
    fontSize: "0.78rem",
    color: "#64748b",
    lineHeight: 1.45,
    margin: 0,
  };

  const hasCustomDescription =
    typeof descriptionStored === "string" && descriptionStored.trim() !== "";

  function ouvrirEditionDescription() {
    setDraftDesc(hasCustomDescription ? descriptionStored.trim() : "");
    setDescError(null);
    setEditingDesc(true);
  }

  async function enregistrerDescription() {
    if (!eventId || !onDescriptionSaved) return;
    setSavingDesc(true);
    setDescError(null);
    try {
      const trimmed = draftDesc.trim();
      const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmed === "" ? null : trimmed.slice(0, 2000),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      setEditingDesc(false);
      await onDescriptionSaved();
    } catch (e) {
      setDescError(e.message || "Enregistrement impossible.");
    } finally {
      setSavingDesc(false);
    }
  }

  return (
    <>
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem 0.75rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 0.75rem", alignItems: "center" }}>
            <Link
              href="/"
              style={{
                color: "#2563eb",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              ← Accueil
            </Link>
            <Link
              href="/admin/events"
              style={{
                color: "#7c3aed",
                fontWeight: 600,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              Mes événements
            </Link>
            {eventId ? (
              <Link
                href={`/admin/event/${encodeURIComponent(eventId)}/leads`}
                style={{
                  color: "#166534",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                }}
              >
                Leads
                {newLeadCount > 0 ? (
                  <span
                    style={{
                      marginLeft: "0.35rem",
                      display: "inline-flex",
                      minWidth: "1.1rem",
                      height: "1.1rem",
                      borderRadius: "999px",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 0.3rem",
                      background: "#dcfce7",
                      border: "1px solid #86efac",
                      color: "#166534",
                      fontSize: "0.66rem",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                    aria-label={`${newLeadCount} nouveaux leads`}
                    title={`${newLeadCount} nouveaux leads`}
                  >
                    {newLeadCount > 99 ? "99+" : newLeadCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
          </div>
          {onCloseDrawer ? (
            <button type="button" onClick={onCloseDrawer} style={btnGhost}>
              Fermer
            </button>
          ) : null}
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#6b7280",
            textTransform: "uppercase",
          }}
        >
          Régie
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.98rem",
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          {title || "Événement"}
        </p>
        {slug ? (
          <code
            style={{
              display: "block",
              margin: 0,
              fontSize: "0.7rem",
              color: "#64748b",
              fontFamily: "ui-monospace, monospace",
              wordBreak: "break-all",
            }}
          >
            {slug}
          </code>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <p style={{ ...secondary, margin: 0 }}>{descriptionText}</p>
        <p
          style={{
            fontSize: "0.7rem",
            color: "#94a3b8",
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {hasCustomDescription
            ? "Description enregistrée pour cet événement."
            : "Aucune description en base : texte d’aide par défaut ci-dessus."}
        </p>
        {eventId && onDescriptionSaved ? (
          !editingDesc ? (
            <button
              type="button"
              onClick={ouvrirEditionDescription}
              style={{
                ...btnGhost,
                fontSize: "0.75rem",
                alignSelf: "flex-start",
              }}
            >
              {hasCustomDescription
                ? "Modifier la description"
                : "Ajouter une description"}
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
              }}
            >
              <label
                htmlFor="regie-desc-edit"
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Texte affiché dans la régie
              </label>
              <textarea
                id="regie-desc-edit"
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                disabled={savingDesc}
                maxLength={2000}
                rows={3}
                placeholder="Ex. Soirée quiz — votez depuis votre mobile."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.45rem 0.55rem",
                  fontSize: "0.8125rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "inherit",
                  resize: "vertical",
                  minHeight: "4rem",
                }}
              />
              {descError ? (
                <p
                  style={{
                    color: "#b91c1c",
                    fontSize: "0.72rem",
                    margin: 0,
                  }}
                  role="alert"
                >
                  {descError}
                </p>
              ) : null}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                }}
              >
                <button
                  type="button"
                  disabled={savingDesc}
                  onClick={() => void enregistrerDescription()}
                  style={btnPrimary(savingDesc)}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  disabled={savingDesc}
                  onClick={() => {
                    setEditingDesc(false);
                    setDescError(null);
                  }}
                  style={btnGhost}
                >
                  Annuler
                </button>
              </div>
              <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: 0 }}>
                Laisser vide puis enregistrer pour revenir au texte par défaut.
              </p>
            </div>
          )
        ) : null}
      </div>

      <div
        style={{
          ...CARD,
          padding: "0.65rem 0.75rem",
          background: "#fafafa",
          borderColor: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              padding: "0.18rem 0.45rem",
              borderRadius: "6px",
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}
          >
            {badge.label}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#374151",
              lineHeight: 1.3,
            }}
          >
            {stateLabel}
          </span>
        </div>
      </div>

      {slug &&
      (joinPreviewDesktop ? onTogglePreviewJoin : onOpenJoinPreviewMobile) ? (
        <div
          style={{
            ...CARD,
            padding: "0.65rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            borderColor: "#e0e7ff",
            background: "linear-gradient(180deg, #fafbff 0%, #f5f7ff 100%)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#6b7280",
              textTransform: "uppercase",
            }}
          >
            Ma salle
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.68rem",
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            Aperçu de la page participant (join), pas l’écran de projection.
          </p>
          <button
            type="button"
            onClick={() =>
              joinPreviewDesktop
                ? onTogglePreviewJoin?.()
                : onOpenJoinPreviewMobile?.()
            }
            style={{
              width: "100%",
              padding: "0.45rem 0.6rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              borderRadius: "9px",
              border: "1px solid #c7d2fe",
              background: "linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)",
              color: "#312e81",
              cursor: "pointer",
            }}
          >
            {joinPreviewDesktop
              ? previewJoinOpen
                ? "Masquer l’aperçu public"
                : "Aperçu public"
              : "Aperçu public"}
          </button>
        </div>
      ) : null}

      <RegieAutoRevealCard
        eventId={eventId}
        autoReveal={autoReveal}
        autoRevealDelaySec={autoRevealDelaySec}
        onSaved={onAutoRevealSaved}
      />
    </>
  );
}

/**
 * @param {{
 *   title?: string | null;
 *   slug?: string | null;
 *   descriptionText: string;
 *   descriptionStored?: string | null;
 *   eventId?: string | null;
 *   onDescriptionSaved?: () => void | Promise<void>;
 *   stateLabel: string;
 *   liveState: string;
 *   sceneBadge?: { label: string; bg: string; color: string; border: string } | null;
 *   pollsBlock?: import("react").ReactNode;
 *   autoReveal?: boolean;
 *   autoRevealDelaySec?: number;
 *   onAutoRevealSaved?: () => void | Promise<void>;
 *   joinPreviewDesktop?: boolean;
 *   previewJoinOpen?: boolean;
 *   onTogglePreviewJoin?: () => void;
 *   onOpenJoinPreviewMobile?: () => void;
 * }} props
 */
function SidebarRegieDesktop(props) {
  const { pollsBlock, ...inner } = props;
  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        alignSelf: "start",
        width: "min(260px, 100%)",
        maxWidth: "260px",
        maxHeight: "100vh",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: "1.2rem 0.9rem",
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <RegieSidebarInner {...inner} />
      {pollsBlock}
    </aside>
  );
}

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   title?: string | null;
 *   slug?: string | null;
 *   descriptionText: string;
 *   descriptionStored?: string | null;
 *   eventId?: string | null;
 *   onDescriptionSaved?: () => void | Promise<void>;
 *   stateLabel: string;
 *   liveState: string;
 *   sceneBadge?: { label: string; bg: string; color: string; border: string } | null;
 *   pollsBlock?: import("react").ReactNode;
 *   autoReveal?: boolean;
 *   autoRevealDelaySec?: number;
 *   onAutoRevealSaved?: () => void | Promise<void>;
 *   joinPreviewDesktop?: boolean;
 *   previewJoinOpen?: boolean;
 *   onTogglePreviewJoin?: () => void;
 *   onOpenJoinPreviewMobile?: () => void;
 * }} props
 */
function RegieSidebarDrawer({
  open,
  onClose,
  title,
  slug,
  descriptionText,
  descriptionStored,
  eventId,
  onDescriptionSaved,
  stateLabel,
  liveState,
  sceneBadge = null,
  pollsBlock = null,
  autoReveal = false,
  autoRevealDelaySec = 5,
  onAutoRevealSaved,
  joinPreviewDesktop = false,
  previewJoinOpen = false,
  onTogglePreviewJoin,
  onOpenJoinPreviewMobile,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "auto",
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Menu régie"
    >
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          padding: 0,
          margin: 0,
          background: "rgba(15, 23, 42, 0.45)",
          cursor: "pointer",
        }}
      />
      <div
        id="regie-menu-drawer"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(88vw, 280px)",
          maxWidth: "280px",
          background: "#fff",
          boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
          boxSizing: "border-box",
          padding: "1.15rem 1rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
        }}
      >
        <RegieSidebarInner
          title={title}
          slug={slug}
          descriptionText={descriptionText}
          descriptionStored={descriptionStored}
          eventId={eventId}
          onDescriptionSaved={onDescriptionSaved}
          stateLabel={stateLabel}
          liveState={liveState}
          sceneBadge={sceneBadge}
          onCloseDrawer={onClose}
          autoReveal={autoReveal}
          autoRevealDelaySec={autoRevealDelaySec}
          onAutoRevealSaved={onAutoRevealSaved}
          joinPreviewDesktop={joinPreviewDesktop}
          previewJoinOpen={previewJoinOpen}
          onTogglePreviewJoin={onTogglePreviewJoin}
          onOpenJoinPreviewMobile={onOpenJoinPreviewMobile}
        />
        {pollsBlock}
      </div>
    </div>
  );
}

/**
 * Plein écran mobile : aperçu /join (iframe), temps réel inchangé.
 */
function RegiePreviewJoinDrawerMobile({ open, onClose, slug, eventId }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !slug) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1002,
        display: "flex",
        flexDirection: "column",
        background: "#f1f5f9",
        padding: "max(0.5rem, env(safe-area-inset-top)) max(0.5rem, env(safe-area-inset-right)) max(0.65rem, env(safe-area-inset-bottom)) max(0.5rem, env(safe-area-inset-left))",
        boxSizing: "border-box",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu public salle"
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          boxSizing: "border-box",
        }}
      >
        <RegiePublicPreviewPanel
          key={slug}
          slug={slug}
          eventId={eventId}
          layout="drawer"
          onHide={onClose}
        />
      </div>
    </div>
  );
}

export default function RegieEventPage() {
  const router = useRouter();
  const desktop = useBreakpointMin(1024);
  const desktopSplitWide = useBreakpointMin(1400);
  const params = useParams();
  const rawId = params?.eventId;
  const eventId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null;

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [chronoDays, setChronoDays] = useState(0);
  const [chronoHours, setChronoHours] = useState(0);
  const [chronoMinutes, setChronoMinutes] = useState(2);
  const [chronoSeconds, setChronoSeconds] = useState(0);
  const [chronoTick, setChronoTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Aperçu /join intégré (desktop split) — persistant par événement */
  const [previewJoinOpen, setPreviewJoinOpen] = useState(false);
  const [mobileJoinPreviewOpen, setMobileJoinPreviewOpen] = useState(false);
  /** Nombre de clients /screen connectés (socket room dédiée) */
  const [screenCount, setScreenCount] = useState(0);
  /** Alternance automatique question ↔ résultats (régie uniquement) */
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateQuestionSec, setAutoRotateQuestionSec] = useState(10);
  const [autoRotateResultsSec, setAutoRotateResultsSec] = useState(5);
  const [addQuestionModalOpen, setAddQuestionModalOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState(/** @type {string | null} */ (null));
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [contestEligibleCount, setContestEligibleCount] = useState(0);
  const [contestEligibleLoading, setContestEligibleLoading] = useState(false);
  const [contestEligibleError, setContestEligibleError] = useState(
    /** @type {string | null} */ (null),
  );
  const [contestDrawModalOpen, setContestDrawModalOpen] = useState(false);
  const [contestDrawResult, setContestDrawResult] = useState(
    /** @type {{
     *   pollId: string;
     *   drawId: string;
     *   winner: { firstName: string; phone: string; email: string | null } | null;
     *   contestPrize: string | null;
   } | null} */ (null),
  );

  const loadPollAbortRef = useRef(null);
  const socketRef = useRef(null);
  const autoRotateRef = useRef(false);
  const pollIdRef = useRef(/** @type {string | null} */ (null));
  const displayStateRefRegie = useRef("waiting");
  const voteStateRefRegie = useRef("closed");
  const prevPollForAutoRef = useRef(
    /** @type {string | null | undefined} */ (undefined),
  );
  /** Ids des sondages de l’événement (pour ignorer poll_updated d’un autre event) */
  const eventPollIdsRef = useRef(new Set());

  const fetchEvent = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!eventId) return;
    const ac = new AbortController();
    loadPollAbortRef.current?.abort();
    loadPollAbortRef.current = ac;

    if (!silent) {
      setError(null);
      setLoading(true);
    }
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      if (res.status === 404) {
        setEventData(null);
        setError("Événement introuvable.");
        return;
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      if (ac.signal.aborted) return;
      setEventData(data);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setEventData(null);
      setError(e.message || "Chargement impossible.");
    } finally {
      if (!ac.signal.aborted && !silent) {
        setLoading(false);
      }
    }
  }, [eventId]);

  const handleQuestionLiveAdded = useCallback(
    async ({ pollId }) => {
      await fetchEvent({ silent: true });
      setToastNotif("Question ajoutée");
      window.setTimeout(() => setToastNotif(null), 3200);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document
            .getElementById(`regie-poll-${pollId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    },
    [fetchEvent],
  );

  useEffect(() => {
    void fetchEvent();
    return () => {
      loadPollAbortRef.current?.abort();
    };
  }, [fetchEvent]);

  useEffect(() => {
    if (!eventId || typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(
        REGIE_PREVIEW_JOIN_LS_PREFIX + eventId,
      );
      setPreviewJoinOpen(v === "1");
    } catch {
      /* ignore */
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    const activePollId = eventData?.activePollId ?? null;
    const activePollType = String(
      eventData?.polls?.find((p) => p.id === activePollId)?.type || "",
    ).toUpperCase();
    if (!activePollId || activePollType !== "CONTEST_ENTRY") {
      setContestEligibleCount(0);
      setContestEligibleLoading(false);
      setContestEligibleError(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setContestEligibleLoading(true);
      setContestEligibleError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/polls/${encodeURIComponent(activePollId)}/contest-eligible`,
          { cache: "no-store" },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setContestEligibleError(body?.error || `Erreur ${res.status}`);
          return;
        }
        const n =
          typeof body?.eligibleCount === "number"
            ? body.eligibleCount
            : Array.isArray(body?.participants)
              ? body.participants.length
              : 0;
        setContestEligibleCount(Math.max(0, n));
      } catch {
        if (!cancelled) {
          setContestEligibleError("Chargement indisponible.");
        }
      } finally {
        if (!cancelled) {
          setContestEligibleLoading(false);
        }
      }
    };
    void run();
    const id = window.setInterval(() => void run(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [eventId, eventData?.activePollId, eventData?.polls]);

  useEffect(() => {
    if (!eventId || typeof window === "undefined") return;
    let cancelled = false;
    const seenKey = LEADS_LAST_SEEN_LS_PREFIX + eventId;
    const run = async () => {
      try {
        const seenRaw = window.localStorage.getItem(seenKey);
        const seenMs = Number(seenRaw || "0");
        const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}/leads`);
        const body = await res.json().catch(() => []);
        if (!res.ok || !Array.isArray(body) || cancelled) return;
        const count = body.filter((x) => {
          const ts = Date.parse(String(x?.createdAt || ""));
          return Number.isFinite(ts) && ts > seenMs;
        }).length;
        setNewLeadCount(count);
      } catch {
        /* ignore */
      }
    };
    void run();
    const id = window.setInterval(() => void run(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [eventId]);

  const persistPreviewJoinOpen = useCallback(
    (open) => {
      setPreviewJoinOpen(open);
      if (!eventId || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          REGIE_PREVIEW_JOIN_LS_PREFIX + eventId,
          open ? "1" : "0",
        );
      } catch {
        /* ignore */
      }
    },
    [eventId],
  );

  const togglePreviewJoin = useCallback(() => {
    setPreviewJoinOpen((prev) => {
      const next = !prev;
      if (eventId && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            REGIE_PREVIEW_JOIN_LS_PREFIX + eventId,
            next ? "1" : "0",
          );
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [eventId]);

  useEffect(() => {
    if (!eventData) {
      eventPollIdsRef.current = new Set();
      return;
    }
    if (Array.isArray(eventData.polls)) {
      eventPollIdsRef.current = new Set(eventData.polls.map((p) => p.id));
    }
  }, [eventData]);

  useEffect(() => {
    if (!eventId) return;

    const activePollId = eventData?.activePollId ?? null;

    const socket = io(SOCKET, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    function joinSalles() {
      socket.emit("join_event", eventId);
      if (activePollId) {
        socket.emit("join_poll", activePollId);
      }
      socket.emit("screen:auto_rotate", {
        eventId,
        enabled: autoRotateRef.current,
      });
    }

    function onScreenCount(payload) {
      if (!payload || String(payload.eventId) !== String(eventId)) return;
      setScreenCount(
        typeof payload.count === "number" && Number.isFinite(payload.count)
          ? payload.count
          : 0,
      );
    }

    function onLive(payload) {
      if (!payload || String(payload.eventId) !== String(eventId)) return;
      loadPollAbortRef.current?.abort();
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              liveState: payload.liveState ?? prev.liveState,
              voteState: payload.voteState ?? prev.voteState,
              displayState: payload.displayState ?? prev.displayState,
              activePollId:
                payload.activePollId !== undefined
                  ? payload.activePollId
                  : prev.activePollId,
              questionTimer:
                payload.questionTimer !== undefined
                  ? payload.questionTimer
                  : prev.questionTimer,
              autoReveal:
                typeof payload.autoReveal === "boolean"
                  ? payload.autoReveal
                  : prev.autoReveal,
              autoRevealDelaySec:
                payload.autoRevealDelaySec != null
                  ? payload.autoRevealDelaySec
                  : prev.autoRevealDelaySec,
              autoRevealShowResultsAt:
                payload.autoRevealShowResultsAt !== undefined
                  ? payload.autoRevealShowResultsAt
                  : prev.autoRevealShowResultsAt,
            }
          : prev,
      );
      void fetchEvent({ silent: true });
    }

    function onPollUpdated(data) {
      if (!data?.id) return;
      if (!eventPollIdsRef.current.has(String(data.id))) return;
      loadPollAbortRef.current?.abort();
      void fetchEvent({ silent: true });
    }

    socket.on("connect", joinSalles);
    if (socket.connected) {
      joinSalles();
    }
    socket.on("event_live_updated", onLive);
    socket.on("poll_updated", onPollUpdated);
    socket.on("screen:count", onScreenCount);

    return () => {
      socketRef.current = null;
      socket.emit("leave_event", eventId);
      if (activePollId) {
        socket.emit("leave_poll", activePollId);
      }
      socket.off("connect", joinSalles);
      socket.off("event_live_updated", onLive);
      socket.off("poll_updated", onPollUpdated);
      socket.off("screen:count", onScreenCount);
      socket.disconnect();
    };
  }, [eventId, fetchEvent, eventData?.activePollId]);

  const tm = eventData?.questionTimer;
  useEffect(() => {
    if (!tm?.running || tm.isPaused) return;
    const id = setInterval(() => setChronoTick((k) => k + 1), 1000);
    return () => clearInterval(id);
  }, [tm?.running, tm?.isPaused, tm?.startedAt]);

  const secondesChrono = useMemo(
    () => chronoRestantAffiche(tm, chronoTick),
    [tm, chronoTick],
  );

  const regieDescriptionText = useMemo(() => {
    const d = eventData?.description;
    if (typeof d === "string" && d.trim()) return d.trim();
    return REGIE_SIDEBAR_DEFAULT_DESC;
  }, [eventData?.description]);

  const sendScreenAction = useCallback(
    /** @param {"RESULTS" | "QUESTION" | "WAITING" | "BLACK"} type */
    (type) => {
      setAutoRotate(false);
      if (!eventId) return;
      socketRef.current?.emit("screen:action", { eventId, type });
    },
    [eventId],
  );

  /** @returns {Promise<boolean>} */
  async function postAction(path) {
    setAutoRotate(false);
    setBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}${path}`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      await fetchEvent({ silent: true });
      return true;
    } catch (e) {
      setActionError(e.message || "Action échouée.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function postQuestionTimer(body) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/question-timer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(out.error || `Erreur ${res.status}`);
      }
      if (out.questionTimer !== undefined) {
        setEventData((prev) =>
          prev ? { ...prev, questionTimer: out.questionTimer } : prev,
        );
      }
      const action =
        typeof body?.action === "string" ? body.action.trim().toLowerCase() : "";
      if (action === "pause" && out.questionTimer) {
        const r = out.questionTimer.remainingSec;
        if (typeof r === "number" && r >= 0) {
          const x = decomposeTimerSeconds(r);
          setChronoDays(x.days);
          setChronoHours(x.hours);
          setChronoMinutes(x.minutes);
          setChronoSeconds(x.seconds);
        }
      }
      if (action === "reset") {
        setChronoDays(0);
        setChronoHours(0);
        setChronoMinutes(2);
        setChronoSeconds(0);
      }
      await fetchEvent({ silent: true });
    } catch (e) {
      setActionError(e.message || "Action chrono échouée.");
    } finally {
      setBusy(false);
    }
  }

  async function postContestDraw(pollId) {
    if (!pollId) return false;
    setBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/polls/${encodeURIComponent(pollId)}/draw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerCount: 1 }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      const winner = Array.isArray(body?.winners) ? body.winners[0] : null;
      setContestDrawResult({
        pollId,
        drawId: String(body?.drawId || ""),
        winner: winner
          ? {
              firstName: String(winner.firstName || ""),
              phone: String(winner.phone || ""),
              email: winner.email ? String(winner.email) : null,
            }
          : null,
        contestPrize: body?.contestPrize ? String(body.contestPrize) : null,
      });
      setContestDrawModalOpen(false);
      setToastNotif("Gagnant tiré");
      window.setTimeout(() => setToastNotif(null), 3200);
      await fetchEvent({ silent: true });
      return true;
    } catch (e) {
      setActionError(e.message || "Tirage impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const liveState = eventData?.liveState ?? "—";
  const activePoll = eventData?.polls?.find(
    (p) => p.id === eventData.activePollId,
  );
  const pollsOrdered = Array.isArray(eventData?.polls) ? eventData.polls : [];
  const totalQuestions = pollsOrdered.length;
  const activeQuestionIndex = pollsOrdered.findIndex(
    (p) => p.id === eventData?.activePollId,
  );
  const eventFinished =
    String(liveState || "").toLowerCase() === "finished" ||
    (totalQuestions > 0 &&
      !eventData?.activePollId &&
      pollsOrdered.every((p) =>
        ["CLOSED", "ARCHIVED"].includes(String(p.status || "").toUpperCase()),
      ));

  /** Ne jamais déduire « open » depuis liveState : lecture seule du champ API (+ défaut fermé si absent). */
  const rawVoteState = eventData?.voteState;
  const voteStateUi =
    rawVoteState != null && String(rawVoteState).trim() !== ""
      ? String(rawVoteState).toLowerCase().trim()
      : "closed";
  const displayStateUi = eventData?.displayState
    ? String(eventData.displayState).toLowerCase()
    : deriveRegieDisplayFallback(liveState);

  const ux = useMemo(
    () =>
      getEventUxState({
        liveState: normalizeRegieLiveStateForUx(liveState),
        displayState: displayStateUi,
        voteState: voteStateUi,
      }),
    [liveState, displayStateUi, voteStateUi],
  );

  const stateLabel =
    ux.key === "lecture" &&
    String(displayStateUi || "").toLowerCase() === "question" &&
    String(voteStateUi || "").toLowerCase() === "closed"
      ? "Question affichée (vote fermé)"
      : ux.label;
  const statePanel = getEventUxPanelStyles(ux.key);
  const sceneBadge = getEventUxSceneBadgeFromKey(ux.key);
  const pilotageTag = ux.label;

  const voteLabel =
    VOTE_STATE_LABELS[voteStateUi] ?? String(voteStateUi).toUpperCase();
  const displayLabel =
    DISPLAY_STATE_LABELS[displayStateUi] ??
    String(displayStateUi).toUpperCase();
  const affichageEnAttente =
    String(displayStateUi || "").toLowerCase() === "waiting";

  const activePollIdJs = eventData?.activePollId ?? null;
  autoRotateRef.current = autoRotate;
  pollIdRef.current = activePollIdJs;
  displayStateRefRegie.current = displayStateUi;
  voteStateRefRegie.current = voteStateUi;

  useEffect(() => {
    if (
      prevPollForAutoRef.current !== undefined &&
      prevPollForAutoRef.current !== activePollIdJs
    ) {
      setAutoRotate(false);
    }
    prevPollForAutoRef.current = activePollIdJs ?? null;
  }, [activePollIdJs]);

  useEffect(() => {
    if (voteStateUi !== "open" || displayStateUi === "black") {
      setAutoRotate(false);
    }
  }, [voteStateUi, displayStateUi]);

  useEffect(() => {
    if (!eventId) return;
    const s = socketRef.current;
    if (s?.connected) {
      s.emit("screen:auto_rotate", { eventId, enabled: autoRotate });
    }
  }, [autoRotate, eventId]);

  useEffect(() => {
    if (!autoRotate || !activePollIdJs || !eventId) return undefined;
    if (voteStateUi !== "open" || displayStateUi === "black") return undefined;

    const ds = displayStateUi;
    if (ds !== "question" && ds !== "results" && ds !== "waiting") {
      return undefined;
    }

    const runSwitch = async () => {
      if (!autoRotateRef.current) return;
      const pid = pollIdRef.current;
      const cur = displayStateRefRegie.current;
      if (!pid || voteStateRefRegie.current !== "open" || cur === "black") {
        setAutoRotate(false);
        return;
      }
      try {
        if (cur === "waiting") {
          await adminFetch(`${apiBaseBrowser()}/polls/${pid}/display-question`, {
            method: "POST",
          });
        } else if (cur === "question") {
          await adminFetch(`${apiBaseBrowser()}/polls/${pid}/show-results`, {
            method: "POST",
          });
        } else if (cur === "results") {
          await adminFetch(`${apiBaseBrowser()}/polls/${pid}/display-question`, {
            method: "POST",
          });
        }
        if (!autoRotateRef.current) return;
        await fetchEvent({ silent: true });
      } catch {
        setAutoRotate(false);
      }
    };

    if (ds === "waiting") {
      const t = setTimeout(() => {
        void runSwitch();
      }, 0);
      return () => clearTimeout(t);
    }

    const needSec =
      ds === "question"
        ? clampAutoRotateSec(autoRotateQuestionSec)
        : ds === "results"
          ? clampAutoRotateSec(autoRotateResultsSec)
          : 0;
    let secs = 0;
    const id = setInterval(() => {
      if (!autoRotateRef.current) {
        clearInterval(id);
        return;
      }
      if (
        voteStateRefRegie.current !== "open" ||
        displayStateRefRegie.current === "black"
      ) {
        setAutoRotate(false);
        clearInterval(id);
        return;
      }
      secs += 1;
      if (secs < needSec) return;
      clearInterval(id);
      void runSwitch();
    }, 1000);

    return () => clearInterval(id);
  }, [
    autoRotate,
    activePollIdJs,
    displayStateUi,
    voteStateUi,
    eventId,
    fetchEvent,
    autoRotateQuestionSec,
    autoRotateResultsSec,
  ]);

  const autoRotateAllowed =
    Boolean(activePollIdJs) &&
    voteStateUi === "open" &&
    displayStateUi !== "black";

  const pollsOrdonnes = useMemo(() => {
    const list = [...(eventData?.polls || [])];
    const ap = eventData?.activePollId;
    if (!ap) {
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return list.sort((a, b) => {
      if (a.id === ap) return -1;
      if (b.id === ap) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [eventData?.polls, eventData?.activePollId]);

  const handleContestShortcut = useCallback(
    (poll) => {
      const isContest = isContestPoll(poll);
      if (!isContest) return;
      const isActive = String(eventData?.activePollId || "") === String(poll?.id || "");
      if (isActive) {
        setContestDrawModalOpen(true);
        return;
      }
      const el = document.getElementById("regie-concours-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setToastNotif("Astuce : activez d’abord cette question pour le tirage.");
      window.setTimeout(() => setToastNotif(null), 2600);
    },
    [eventData?.activePollId],
  );

  const handleLeadShortcut = useCallback(
    () => {
      if (!eventId) return;
      router.push(`/admin/event/${encodeURIComponent(eventId)}/leads`);
    },
    [eventId, router],
  );

  const regiePollsBloc = (
    <nav
      aria-label="Liste des sondages"
      style={{
        marginTop: "0.15rem",
        paddingTop: "0.95rem",
        borderTop: "1px solid #e5e7eb",
        flexShrink: 0,
      }}
    >
      <p
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        Sondages
      </p>
      <button
        type="button"
        onClick={() => setAddQuestionModalOpen(true)}
        disabled={busy}
        style={{
          width: "100%",
          marginBottom: "0.45rem",
          padding: "0.42rem 0.55rem",
          fontSize: "0.78rem",
          fontWeight: 700,
          borderRadius: "8px",
          border: "1px solid #7c3aed",
          background: busy ? "#f5f3ff" : "#faf5ff",
          color: busy ? "#9ca3af" : "#5b21b6",
          cursor: busy ? "not-allowed" : "pointer",
          boxSizing: "border-box",
        }}
      >
        + Ajouter une question
      </button>
      <div
        style={{
          maxHeight: "min(46vh, 400px)",
          overflowY: "auto",
          paddingRight: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {pollsOrdonnes.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            compact
            isActive={poll.id === eventData?.activePollId}
            busy={busy}
            liveState={liveState}
            activePollId={eventData?.activePollId}
            voteState={voteStateUi}
            desktop={desktop}
            onOpen={(id) => postAction(`/polls/${id}/open`)}
            onCloseRegie={(id) => postAction(`/polls/${id}/close`)}
            onResults={(id) => postAction(`/polls/${id}/show-results`)}
            onContestShortcut={handleContestShortcut}
            onLeadShortcut={handleLeadShortcut}
          />
        ))}
      </div>
    </nav>
  );

  const presetChronoSec =
    chronoDays * 86400 +
    chronoHours * 3600 +
    chronoMinutes * 60 +
    chronoSeconds;
  const secondesAfficheGrand =
    secondesChrono !== null
      ? secondesChrono
      : tm && typeof tm.remainingSec === "number"
        ? tm.remainingSec
        : presetChronoSec > 0
          ? presetChronoSec
          : null;
  const texteGrandChrono =
    secondesAfficheGrand !== null
      ? formatCountdownVerbose(secondesAfficheGrand)
      : "—";
  const legendeChrono = tm?.running && !tm?.isPaused
    ? "Compte à rebours sur l’écran"
    : tm?.isPaused
      ? "En pause"
      : tm
        ? "Arrêté — prêt à relancer"
        : "Durée réglée avant lancement";

  const chronoAffichageLong = texteGrandChrono.includes(" j ");

  const chronoBtnOutline = {
    padding: "0.45rem 0.85rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    borderRadius: "9px",
    border: "1px solid #c4b5fd",
    background: "#fff",
    color: "#5b21b6",
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.55 : 1,
  };

  const chronoProjectionInner = (
    <>
      <div style={{ textAlign: "center", marginBottom: "0.85rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: chronoAffichageLong
              ? desktop
                ? "1.55rem"
                : "1.35rem"
              : desktop
                ? "2.75rem"
                : "2.4rem",
            fontWeight: 800,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "-0.04em",
            color: "#3b0764",
            lineHeight: 1.05,
            fontVariantNumeric: "tabular-nums",
            wordBreak: "break-word",
          }}
        >
          {texteGrandChrono}
        </p>
        <p
          style={{
            margin: "0.4rem 0 0 0",
            fontSize: "0.74rem",
            color: "#6b21a8",
            fontWeight: 600,
            opacity: 0.95,
          }}
        >
          {legendeChrono}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "0.85rem",
        }}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const total = presetChronoSec;
            if (total < 1) {
              setActionError("Indique au moins 1 seconde.");
              return;
            }
            if (total > QUESTION_TIMER_MAX_SEC) {
              setActionError(
                `Durée max. ${Math.floor(QUESTION_TIMER_MAX_SEC / 86400)} jours (réglage API).`,
              );
              return;
            }
            void postQuestionTimer({ action: "start", totalSec: total });
          }}
          style={{
            padding: "0.48rem 1.15rem",
            fontSize: "0.84rem",
            fontWeight: 700,
            borderRadius: "10px",
            border: "1px solid #5b21b6",
            background: busy ? "#c4b5fd" : "linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)",
            color: "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            boxShadow: busy ? "none" : "0 2px 10px rgba(109, 40, 217, 0.3)",
          }}
        >
          Lancer
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void postQuestionTimer({ action: "pause" })}
          style={chronoBtnOutline}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void postQuestionTimer({ action: "reset" })}
          style={chronoBtnOutline}
        >
          Réinitialiser
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: "0.65rem 1rem",
          paddingTop: "0.65rem",
          borderTop: "1px solid rgba(196, 181, 253, 0.6)",
        }}
      >
        <label
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Jours
          <input
            type="number"
            min={0}
            max={90}
            value={chronoDays}
            disabled={busy}
            onChange={(e) =>
              setChronoDays(
                Math.min(90, Math.max(0, parseInt(e.target.value, 10) || 0)),
              )
            }
            style={{
              display: "block",
              width: "3.1rem",
              marginTop: "0.2rem",
              padding: "0.22rem 0.28rem",
              borderRadius: "6px",
              border: "1px solid #d8b4fe",
              background: "#faf5ff",
              fontSize: "0.78rem",
            }}
          />
        </label>
        <label
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Heures
          <input
            type="number"
            min={0}
            max={23}
            value={chronoHours}
            disabled={busy}
            onChange={(e) =>
              setChronoHours(
                Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)),
              )
            }
            style={{
              display: "block",
              width: "3.1rem",
              marginTop: "0.2rem",
              padding: "0.22rem 0.28rem",
              borderRadius: "6px",
              border: "1px solid #d8b4fe",
              background: "#faf5ff",
              fontSize: "0.78rem",
            }}
          />
        </label>
        <label
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Min.
          <input
            type="number"
            min={0}
            max={59}
            value={chronoMinutes}
            disabled={busy}
            onChange={(e) =>
              setChronoMinutes(
                Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)),
              )
            }
            style={{
              display: "block",
              width: "3.1rem",
              marginTop: "0.2rem",
              padding: "0.22rem 0.28rem",
              borderRadius: "6px",
              border: "1px solid #d8b4fe",
              background: "#faf5ff",
              fontSize: "0.78rem",
            }}
          />
        </label>
        <label
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Sec.
          <input
            type="number"
            min={0}
            max={59}
            value={chronoSeconds}
            disabled={busy}
            onChange={(e) =>
              setChronoSeconds(
                Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)),
              )
            }
            style={{
              display: "block",
              width: "3.1rem",
              marginTop: "0.2rem",
              padding: "0.22rem 0.28rem",
              borderRadius: "6px",
              border: "1px solid #d8b4fe",
              background: "#faf5ff",
              fontSize: "0.78rem",
            }}
          />
        </label>
        <span
          style={{
            fontSize: "0.6rem",
            color: "#94a3b8",
            fontWeight: 500,
            maxWidth: "10rem",
            lineHeight: 1.35,
            paddingBottom: "0.12rem",
          }}
        >
          Max. {Math.floor(QUESTION_TIMER_MAX_SEC / 86400)} j côté serveur.
        </span>
      </div>
    </>
  );

  if (!eventId) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Identifiant d’événement manquant.</p>
      </main>
    );
  }

  const shellFont = {
    fontFamily:
      'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    lineHeight: 1.5,
    color: "#111827",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "none",
        margin: 0,
        padding: 0,
        background: "#f1f5f9",
        ...shellFont,
      }}
    >
      {loading && !eventData ? (
        <p style={{ padding: "1rem 1rem", color: "#6b7280" }}>Chargement...</p>
      ) : null}
      {error ? (
        <p style={{ padding: "1rem 1rem", color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p style={{ padding: "0 1rem", color: "#b91c1c" }} role="alert">
          {actionError}
        </p>
      ) : null}

      {toastNotif ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "0.75rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            padding: "0.55rem 1.15rem",
            borderRadius: "10px",
            background: "#0f172a",
            color: "#f8fafc",
            fontSize: "0.88rem",
            fontWeight: 700,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
            pointerEvents: "none",
          }}
        >
          {toastNotif}
        </div>
      ) : null}

      {eventId ? (
        <AjouterQuestionLiveModal
          open={addQuestionModalOpen}
          onClose={() => setAddQuestionModalOpen(false)}
          apiBase={apiBaseBrowser()}
          eventId={eventId}
          onSuccess={handleQuestionLiveAdded}
        />
      ) : null}
      {contestDrawModalOpen && String(activePoll?.type || "").toUpperCase() === "CONTEST_ENTRY" ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10010,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setContestDrawModalOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "28rem",
              borderRadius: "14px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.25)",
              padding: "1rem 1.1rem",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Concours
            </p>
            <h3
              style={{
                margin: "0.35rem 0 0 0",
                fontSize: "1.05rem",
                fontWeight: 800,
                color: "#111827",
                letterSpacing: "-0.01em",
              }}
            >
              Tirer un gagnant maintenant ?
            </h3>
            <p style={{ margin: "0.55rem 0 0 0", fontSize: "0.88rem", color: "#4b5563" }}>
              Participant éligibles :{" "}
              <strong style={{ color: "#111827" }}>{contestEligibleCount}</strong>
            </p>
            {activePoll?.contestPrize ? (
              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.86rem", color: "#4b5563" }}>
                Lot : <strong style={{ color: "#111827" }}>{activePoll.contestPrize}</strong>
              </p>
            ) : null}
            <div
              style={{
                marginTop: "0.9rem",
                display: "flex",
                gap: "0.55rem",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => setContestDrawModalOpen(false)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "9px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 700,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || !activePoll?.id}
                onClick={() => void postContestDraw(activePoll?.id || "")}
                style={{
                  padding: "0.45rem 0.8rem",
                  borderRadius: "9px",
                  border: "1px solid #7c3aed",
                  background: busy
                    ? "#f1f5f9"
                    : "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: busy ? "#94a3b8" : "#fff",
                  fontWeight: 800,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Tirage..." : "Confirmer le tirage"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && eventData && (
        <div
          style={
            desktop
              ? {
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(220px, 270px) minmax(360px, 1fr) minmax(252px, 300px)",
                  gap: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  width: "100%",
                  alignItems: "start",
                  boxSizing: "border-box",
                }
              : {
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  padding: "1rem",
                  width: "100%",
                  boxSizing: "border-box",
                }
          }
        >
          {desktop ? (
            <SidebarRegieDesktop
              title={eventData.title}
              slug={eventData.slug}
              descriptionText={regieDescriptionText}
              descriptionStored={eventData.description ?? null}
              eventId={eventId}
              onDescriptionSaved={() => fetchEvent({ silent: true })}
              stateLabel={stateLabel}
              liveState={liveState}
              sceneBadge={sceneBadge}
              pollsBlock={regiePollsBloc}
              autoReveal={Boolean(eventData.autoReveal)}
              autoRevealDelaySec={eventData.autoRevealDelaySec ?? 5}
              onAutoRevealSaved={() => fetchEvent({ silent: true })}
              joinPreviewDesktop
              previewJoinOpen={previewJoinOpen}
              onTogglePreviewJoin={togglePreviewJoin}
              newLeadCount={newLeadCount}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              minWidth: 0,
            }}
          >
            {!desktop ? (
              <>
                <RegieSidebarDrawer
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  title={eventData.title}
                  slug={eventData.slug}
                  descriptionText={regieDescriptionText}
                  descriptionStored={eventData.description ?? null}
                  eventId={eventId}
                  onDescriptionSaved={() => fetchEvent({ silent: true })}
                  stateLabel={stateLabel}
                  liveState={liveState}
                  sceneBadge={sceneBadge}
                  pollsBlock={regiePollsBloc}
                  autoReveal={Boolean(eventData.autoReveal)}
                  autoRevealDelaySec={eventData.autoRevealDelaySec ?? 5}
                  onAutoRevealSaved={() => fetchEvent({ silent: true })}
                  onOpenJoinPreviewMobile={() => {
                    setMenuOpen(false);
                    setMobileJoinPreviewOpen(true);
                  }}
                  newLeadCount={newLeadCount}
                />
                <header
                  style={{
                    ...CARD,
                    padding: "0.65rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMenuOpen(true)}
                      style={btnGhost}
                      aria-expanded={menuOpen}
                      aria-controls="regie-menu-drawer"
                    >
                      Menu
                    </button>
                    {eventData.slug ? (
                      <button
                        type="button"
                        onClick={() => setMobileJoinPreviewOpen(true)}
                        style={{
                          ...btnGhost,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#312e81",
                          borderColor: "#c7d2fe",
                          background: "linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)",
                        }}
                      >
                        Voir ma salle
                      </button>
                    ) : null}
                  </div>
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      flex: 1,
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    Pilotage
                  </span>
                  <Link
                    href="/admin/events"
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#7c3aed",
                      textDecoration: "none",
                      flexShrink: 0,
                      maxWidth: "5.2rem",
                      lineHeight: 1.2,
                      textAlign: "right",
                    }}
                  >
                    Mes&nbsp;événements
                  </Link>
                </header>
              </>
            ) : (
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#111827",
                }}
              >
                Pilotage
              </h2>
            )}

            <div
              style={{
                display: "flex",
                flexDirection:
                  desktop && previewJoinOpen
                    ? desktopSplitWide
                      ? "row"
                      : "column"
                    : "column",
                gap: "1rem",
                alignItems: "stretch",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  flex:
                    desktop && previewJoinOpen && desktopSplitWide
                      ? "1 1 65%"
                      : "1 1 auto",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: desktop ? "1fr auto" : "1fr",
                gap: desktop ? "1rem" : "0.65rem",
                alignItems: "start",
              }}
            >
              <section
                style={{
                  ...CARD,
                  padding: "1rem 1.15rem",
                  border: statePanel.border,
                  background: statePanel.background,
                  borderLeft: `5px solid ${statePanel.accent}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
              <p
                style={{
                  margin: "0 0 0.35rem 0",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#6b7280",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                État live
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: desktop ? "1.15rem" : "1.05rem",
                    fontWeight: 800,
                    color: "#111827",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stateLabel}
                </span>
                <span
                  title={`État technique API (liveState) : ${liveState}`}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "0.18rem 0.5rem",
                    borderRadius: "9999px",
                    background: statePanel.pillBg,
                    color: statePanel.pillColor,
                  }}
                >
                  {pilotageTag}
                </span>
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.32rem",
                  fontSize: "0.82rem",
                  color: "#4b5563",
                  lineHeight: 1.4,
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "#111827" }}>Vote :</strong>{" "}
                  {voteLabel}
                </p>
                <p
                  style={{
                    margin: 0,
                    ...(affichageEnAttente
                      ? { color: "#b91c1c", fontWeight: 500 }
                      : {}),
                  }}
                >
                  <strong
                    style={{
                      color: affichageEnAttente ? "#991b1b" : "#111827",
                    }}
                  >
                    Affichage :
                  </strong>{" "}
                  {displayLabel}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.72rem",
                    color: "#94a3b8",
                  }}
                >
                  Résumé technique :{" "}
                  <code style={{ fontSize: "0.68rem" }}>{liveState}</code>
                </p>
              </div>
              <p
                style={{
                  margin: desktop ? "0.65rem 0 0 0" : "0.55rem 0 0 0",
                  fontSize: desktop ? "0.95rem" : "0.9rem",
                  color: "#374151",
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: "#111827" }}>À l’écran :</strong>{" "}
                {activePoll
                  ? activePoll.question || activePoll.title
                  : "Aucun contenu synchronisé pour l’instant."}
              </p>
            </section>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                width: desktop ? "auto" : "100%",
                minWidth: desktop ? "200px" : undefined,
              }}
            >
              {desktop ? (
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "#6b7280",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Avancer
                </span>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => postAction(`/events/${eventId}/next-poll`)}
                style={{
                  ...btnDanger(busy),
                  width: desktop ? "100%" : "100%",
                  whiteSpace: desktop ? "nowrap" : undefined,
                }}
              >
                Question suivante
              </button>
              <button
                type="button"
                disabled={busy || eventFinished}
                onClick={() => {
                  if (typeof window === "undefined") return;
                  const ok = window.confirm(
                    "Terminer le vote maintenant ? Cette action clôture l’événement.",
                  );
                  if (!ok) return;
                  void postAction(`/events/${eventId}/finish`);
                }}
                style={{
                  ...btnFinish(busy || eventFinished),
                  width: desktop ? "100%" : "100%",
                }}
              >
                Terminer le vote
              </button>
              <div
                style={{
                  marginTop: "0.25rem",
                  padding: "0.5rem 0.6rem",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.72rem",
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {totalQuestions > 0
                    ? eventFinished
                      ? "Événement terminé · toutes les questions ont été diffusées"
                      : activeQuestionIndex >= 0
                        ? `Question ${activeQuestionIndex + 1}/${totalQuestions}`
                        : `Questions prêtes : ${totalQuestions}`
                    : "Aucune question"}
                </p>
                {totalQuestions > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      maxHeight: desktop ? "130px" : "110px",
                      overflowY: "auto",
                      paddingRight: "0.1rem",
                    }}
                  >
                    {pollsOrdered.map((p, idx) => {
                      const isActive = idx === activeQuestionIndex;
                      const status = String(p.status || "").toUpperCase();
                      const done =
                        eventFinished ||
                        (!isActive &&
                          ["CLOSED", "ARCHIVED"].includes(status) &&
                          activeQuestionIndex > idx);
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            fontSize: "0.72rem",
                            color: isActive
                              ? "#1e3a8a"
                              : done
                                ? "#475569"
                                : "#64748b",
                            fontWeight: isActive ? 700 : 500,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "1.25rem",
                              height: "1.25rem",
                              borderRadius: "999px",
                              border: `1px solid ${
                                isActive
                                  ? "#93c5fd"
                                  : done
                                    ? "#cbd5e1"
                                    : "#e5e7eb"
                              }`,
                              background: isActive
                                ? "#eff6ff"
                                : done
                                  ? "#f8fafc"
                                  : "#fff",
                              color: isActive ? "#1e40af" : "#64748b",
                              fontSize: "0.66rem",
                              fontWeight: 800,
                              lineHeight: 1,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              flex: 1,
                            }}
                            title={p.question || p.title}
                          >
                            {p.question || p.title || `Question ${idx + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {String(activePoll?.type || "").toUpperCase() === "CONTEST_ENTRY" ? (
            <section
              id="regie-concours-card"
              style={{
                ...CARD,
                marginTop: "0.9rem",
                padding: "0.9rem 1rem",
                border: "1px solid #ddd6fe",
                background: "linear-gradient(160deg, #faf5ff 0%, #ffffff 100%)",
              }}
            >
              <p
                style={{
                  margin: "0 0 0.35rem 0",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#6b7280",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Concours
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: desktop ? "1rem" : "0.92rem",
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                Participants éligibles :{" "}
                {contestEligibleLoading ? "…" : contestEligibleCount}
              </p>
              <p
                style={{
                  margin: "0.35rem 0 0 0",
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                Ont répondu "Oui" et complété le formulaire.
              </p>
              {contestEligibleError ? (
                <p
                  style={{
                    margin: "0.35rem 0 0 0",
                    fontSize: "0.74rem",
                    color: "#b91c1c",
                  }}
                >
                  {contestEligibleError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={
                  busy ||
                  contestEligibleLoading ||
                  contestEligibleCount <= 0 ||
                  !!contestEligibleError
                }
                onClick={() => setContestDrawModalOpen(true)}
                style={{
                  marginTop: "0.6rem",
                  padding: "0.45rem 0.8rem",
                  borderRadius: "9px",
                  border: "1px solid #7c3aed",
                  background:
                    busy ||
                    contestEligibleLoading ||
                    contestEligibleCount <= 0 ||
                    !!contestEligibleError
                      ? "#f8fafc"
                      : "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
                  color:
                    busy ||
                    contestEligibleLoading ||
                    contestEligibleCount <= 0 ||
                    !!contestEligibleError
                      ? "#94a3b8"
                      : "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor:
                    busy ||
                    contestEligibleLoading ||
                    contestEligibleCount <= 0 ||
                    !!contestEligibleError
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Tirer un gagnant
              </button>
              {contestDrawResult &&
              String(contestDrawResult.pollId || "") ===
                String(activePoll?.id || "") ? (
                <div
                  style={{
                    marginTop: "0.65rem",
                    padding: "0.6rem 0.7rem",
                    borderRadius: "10px",
                    border: "1px solid #d8b4fe",
                    background: "#faf5ff",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#6d28d9",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Gagnant tiré
                  </p>
                  <p
                    style={{
                      margin: "0.25rem 0 0 0",
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    {contestDrawResult.winner?.firstName || "Participant"}
                  </p>
                  <p
                    style={{
                      margin: "0.2rem 0 0 0",
                      fontSize: "0.8rem",
                      color: "#4b5563",
                    }}
                  >
                    {contestDrawResult.winner?.phone || "Téléphone indisponible"}
                    {contestDrawResult.winner?.email
                      ? ` · ${contestDrawResult.winner.email}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {eventData.slug ? (
            <BlocProjectionEcran
              slug={eventData.slug}
              activePollId={eventData.activePollId ?? null}
              liveState={liveState}
              displayState={displayStateUi}
              busy={busy}
              postAction={postAction}
              sendScreenAction={sendScreenAction}
              screenCount={screenCount}
              desktop={desktop}
              chronoSection={chronoProjectionInner}
              autoRotate={autoRotate}
              onAutoRotateChange={setAutoRotate}
              autoRotateAllowed={autoRotateAllowed}
              autoRotateQuestionSec={autoRotateQuestionSec}
              autoRotateResultsSec={autoRotateResultsSec}
              onAutoRotateQuestionSecChange={setAutoRotateQuestionSec}
              onAutoRotateResultsSecChange={setAutoRotateResultsSec}
            />
          ) : null}

          {!desktop && eventData.slug ? (
            <details
              style={{
                ...CARD,
                padding: "0.75rem 1rem",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "#0f172a",
                  listStyle: "none",
                }}
              >
                Partage & accès
              </summary>
              <div style={{ marginTop: "0.85rem" }}>
                <SidebarPartageDroit
                  slug={eventData.slug}
                  liveState={liveState}
                  stateLabel={stateLabel}
                  sceneBadge={sceneBadge}
                  showHeader={false}
                  noSticky
                  qrVariant="mobile"
                  onOverlayCopied={() => {
                    setToastNotif("Lien overlay copié");
                    window.setTimeout(() => setToastNotif(null), 3200);
                  }}
                />
              </div>
            </details>
          ) : null}
              </div>
              {desktop && previewJoinOpen && eventData.slug ? (
                <RegiePublicPreviewPanel
                  key={eventData.slug}
                  slug={eventData.slug}
                  eventId={eventId}
                  newLeadCount={newLeadCount}
                  layout={desktopSplitWide ? "beside" : "below"}
                  onHide={() => persistPreviewJoinOpen(false)}
                />
              ) : null}
            </div>
          </div>
          {desktop && eventData.slug ? (
            <SidebarPartageDroit
              slug={eventData.slug}
              liveState={liveState}
              stateLabel={stateLabel}
              sceneBadge={sceneBadge}
              onOverlayCopied={() => {
                setToastNotif("Lien overlay copié");
                window.setTimeout(() => setToastNotif(null), 3200);
              }}
            />
          ) : null}
          {!desktop && eventData.slug ? (
            <RegiePreviewJoinDrawerMobile
              open={mobileJoinPreviewOpen}
              onClose={() => setMobileJoinPreviewOpen(false)}
              slug={eventData.slug}
              eventId={eventId}
            />
          ) : null}
        </div>
      )}
    </main>
  );
}
