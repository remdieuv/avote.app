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
import { LiveMicroLabel } from "@/components/admin/LiveMicroIcon";
import { computeActivationBalance } from "@/lib/activationBalance";
import { adminFetch, apiBaseBrowser, SOCKET_URL as SOCKET } from "@/lib/config";
import {
  LANDING_PHOTO_TOO_HEAVY_MESSAGE,
  prepareLandingPhotoForUpload,
} from "@/lib/compressLandingPhoto";
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

function mapApiError(body, status) {
  const code = String(body?.error || "").trim();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (code === "EVENT_ALREADY_ACTIVE") {
    return "Vous avez déjà un événement actif. Terminez-le avant d’en créer un nouveau.";
  }
  if (code === "NO_EVENT_CREDIT") {
    return "Vous n’avez plus d’activation disponible. Choisissez une formule pour lancer le live réel.";
  }
  if (code === "NO_ACTIVATION_AVAILABLE") {
    return "Aucune activation disponible pour cette formule.";
  }
  if (code === "EVENT_ALREADY_CONSUMED") {
    return "Le mode réel est déjà activé pour cet événement.";
  }
  if (code === "EVENT_LOCKED") {
    return "Cet événement est terminé et verrouillé.";
  }
  return message || code || `Erreur ${status}`;
}

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

const QR_EXPORT_SOURCE_SIZE = 1024;

function downloadBlobFile(blob, filename) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function parseSvgMarkup(svgMarkup) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  return doc.documentElement;
}

function buildPrintableQrSvg({ qrSvgMarkup, mirror = false }) {
  const qrRoot = parseSvgMarkup(qrSvgMarkup);
  const sourceViewBox =
    qrRoot.getAttribute("viewBox") || `0 0 ${QR_EXPORT_SOURCE_SIZE} ${QR_EXPORT_SOURCE_SIZE}`;
  const pageW = 1600;
  const pageH = 2000;
  const qrSize = 1240;
  const qrX = Math.round((pageW - qrSize) / 2);
  const qrY = 180;
  const qrInnerMarkup = qrRoot.innerHTML || "";
  const qrGroupTransform = `translate(${qrX} ${qrY})`;
  const quietZone = 92;

  const quietRect = `<rect x="${qrX - quietZone}" y="${qrY - quietZone}" width="${qrSize + quietZone * 2}" height="${qrSize + quietZone * 2}" fill="#ffffff" />`;
  const qrGroup = [
    `<g transform="${qrGroupTransform}">`,
    `<svg width="${qrSize}" height="${qrSize}" viewBox="${sourceViewBox}" preserveAspectRatio="xMidYMid meet">`,
    qrInnerMarkup,
    `</svg>`,
    `</g>`,
  ].join("");
  const labelText = `<text x="${pageW / 2}" y="${qrY + qrSize + 160}" text-anchor="middle" fill="#0f172a" font-size="84" font-family="Arial, Helvetica, sans-serif" font-weight="700">Scannez pour participer</text>`;
  const printableBody = `${quietRect}${qrGroup}${labelText}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}">`,
    `<rect x="0" y="0" width="${pageW}" height="${pageH}" fill="#ffffff" />`,
    mirror
      ? `<g transform="translate(${pageW} 0) scale(-1 1)">${printableBody}</g>`
      : printableBody,
    `</svg>`,
  ].join("");
}

async function svgToPngBlob(svgMarkup, size = 2400) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = async () => {
        try {
          if (typeof el.decode === "function") await el.decode();
        } catch {
          // decode optional
        }
        resolve(el);
      };
      el.onerror = reject;
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.round((img.height / img.width) * size);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png", 1),
    );
    if (!blob) throw new Error("PNG indisponible.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
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

const PREMIUM_BORDER = "1px solid rgba(148, 163, 184, 0.18)";
const PREMIUM_BORDER_STRONG = "1px solid rgba(148, 163, 184, 0.26)";
const PREMIUM_SHADOW = "0 18px 40px rgba(15, 23, 42, 0.08)";
const PREMIUM_SHADOW_SOFT = "0 10px 28px rgba(15, 23, 42, 0.06)";

/** Carte type dashboard */
const CARD = {
  borderRadius: "18px",
  boxShadow: PREMIUM_SHADOW_SOFT,
  border: PREMIUM_BORDER,
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

function isQuizPoll(poll) {
  return String(poll?.type || "").toUpperCase() === "QUIZ";
}

function isLeadPoll(poll) {
  return Boolean(poll?.leadEnabled) && !isContestPoll(poll);
}

function isStandardPoll(poll) {
  return !isContestPoll(poll) && !isLeadPoll(poll) && !isQuizPoll(poll);
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
  if (isQuizPoll(poll)) {
    return {
      label: "Quiz",
      bg: "#ecfdf5",
      border: "#86efac",
      color: "#166534",
      cardBg: "#f7fff9",
    };
  }
  if (isStandardPoll(poll)) {
    return {
      label: "Question",
      bg: "#f8fafc",
      border: "#cbd5e1",
      color: "#475569",
      cardBg: "#ffffff",
    };
  }
  return {
    label: "Question",
    bg: "#f8fafc",
    border: "#cbd5e1",
    color: "#475569",
    cardBg: "#ffffff",
  };
}

function normalizeContestWinnerCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function formatContestDrawSummary(summary, poll) {
  const winners = Number(summary?.totalWinners || 0);
  const quota = normalizeContestWinnerCount(poll?.contestWinnerCount);
  return `Gagnants tirés : ${Math.max(0, winners)} / ${quota}`;
}

function formatWinnerName(winner) {
  const first = String(winner?.firstName || "").trim();
  if (!first) return "Participant";
  const initial = first.charAt(0).toUpperCase();
  return `${first} ${initial}.`;
}

function maskPhone(phoneRaw) {
  const phone = String(phoneRaw || "").trim();
  if (!phone) return "Téléphone indisponible";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const start = phone.slice(0, 2);
  const end = digits.slice(-2);
  return `${start} XX XX XX ${end}`;
}

function maskEmail(emailRaw) {
  const email = String(emailRaw || "").trim();
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  const localMask = local.length <= 2 ? `${local}***` : `${local.slice(0, 2)}***`;
  return `${localMask}@${domain || ""}`;
}

function PollCard({
  poll,
  isActive,
  busy,
  liveState,
  activePollId,
  /** État vote événement (open | closed) — la question peut être ACTIVE sans vote ouvert */
  voteState,
  onOpen,
  onCloseRegie,
  onResults,
  onReveal,
  onContestShortcut,
  onLeadShortcut,
  onEdit,
  contestDrawSummary,
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
  const disableRevealQuiz =
    busy ||
    !isQuizPoll(poll) ||
    String(voteState || "").toLowerCase().trim() !== "closed" ||
    Boolean(poll?.quizRevealed);

  const boutons = (
    <>
      <button
        type="button"
        disabled={disableLancer}
        onClick={() => onOpen(poll.id)}
        style={btnLancerVote(disableLancer)}
        title={
          voteOuvertSurCeSondage
            ? "Le vote est déjà lancé sur cette question."
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
            ? "Cette question n’est pas ouverte au vote."
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
      <button
        type="button"
        disabled={disableRevealQuiz}
        onClick={() => onReveal?.(poll.id)}
        style={btnAfficherResultats(disableRevealQuiz)}
        title="Révèle la bonne réponse du quiz (uniquement vote fermé)."
      >
        Révéler la réponse
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
  const editAction = (
    <button
      type="button"
      disabled={busy}
      onClick={() => onEdit?.(poll)}
      style={btnSecondaryAction(busy)}
      title="Modifier cette question"
    >
      Modifier
    </button>
  );

  const metaRow = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: desktop ? "0.45rem" : "0.5rem",
        marginBottom: desktop ? "0.45rem" : "0.55rem",
      }}
    >
      {isActive ? (
        <span
          title="Question actuellement reliée à l’événement (affiches & commandes). Peut être ouverte ou fermée au vote."
          style={{
            fontSize: "0.6rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            padding: "0.16rem 0.45rem",
            borderRadius: "999px",
            background: "#dbeafe",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
          }}
        >
          Antenne
        </span>
      ) : null}
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "0.2rem 0.5rem",
          borderRadius: "999px",
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
          fontSize: "0.64rem",
          fontWeight: 800,
          padding: "0.18rem 0.46rem",
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
    <>
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
      {isContestPoll(poll) ? (
        <>
          {poll?.contestPrize ? (
            <p
              style={{
                margin: compact ? "0.18rem 0 0 0" : "0.22rem 0 0 0",
                fontSize: compact ? "0.66rem" : "0.74rem",
                color: "#4b5563",
                lineHeight: 1.35,
              }}
            >
              Lot : {poll.contestPrize}
            </p>
          ) : null}
          <p
            style={{
              margin: compact ? "0.2rem 0 0 0" : "0.24rem 0 0 0",
              fontSize: compact ? "0.68rem" : "0.76rem",
              color: "#6b7280",
              lineHeight: 1.35,
            }}
          >
            {formatContestDrawSummary(contestDrawSummary, poll)}
          </p>
        </>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <div
        id={`regie-poll-${poll.id}`}
        style={{
          border: isActive ? "1px solid rgba(59, 130, 246, 0.35)" : PREMIUM_BORDER,
          borderRadius: "16px",
          padding: "0.68rem 0.72rem",
          marginBottom: "0.5rem",
          background: isActive
            ? "linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, #ffffff 100%)"
            : "#ffffff",
          boxShadow: isActive
            ? "0 16px 30px rgba(37, 99, 235, 0.10)"
            : "0 8px 20px rgba(15, 23, 42, 0.04)",
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
              title="Question reliée à l’événement (voir carte étendue)."
              style={{
                fontSize: "0.56rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                padding: "0.13rem 0.4rem",
                borderRadius: "999px",
                background: "#dbeafe",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
              }}
            >
              Antenne
            </span>
          ) : null}
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              padding: "0.15rem 0.42rem",
              borderRadius: "999px",
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
              padding: "0.13rem 0.36rem",
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
          <button
            type="button"
            disabled={disableRevealQuiz}
            onClick={() => onReveal?.(poll.id)}
            title="Révèle la bonne réponse du quiz (uniquement vote fermé)."
            style={{
              ...btnAfficherResultats(disableRevealQuiz),
              width: "100%",
              padding: "0.38rem 0.5rem",
              fontSize: "0.72rem",
            }}
          >
            Révéler la réponse
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
          {editAction ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onEdit?.(poll)}
              style={{
                ...btnSecondaryAction(busy),
                width: "100%",
                padding: "0.38rem 0.5rem",
                fontSize: "0.72rem",
              }}
            >
              Modifier
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: isActive ? "1px solid rgba(59, 130, 246, 0.35)" : PREMIUM_BORDER,
        borderRadius: "18px",
        padding: desktop ? "0.95rem 1.15rem" : "0.85rem 0.98rem",
        marginBottom: desktop ? "0.6rem" : "0.7rem",
        background: isActive
          ? "linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, #ffffff 100%)"
          : "#ffffff",
        boxShadow: isActive
          ? "0 16px 32px rgba(37, 99, 235, 0.10)"
          : "0 10px 24px rgba(15, 23, 42, 0.05)",
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
            {editAction}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {isActive ? (
              <span
                title="Question actuellement reliée à l’événement (affiches & commandes). Peut être ouverte ou fermée au vote."
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
              title="Statut Prisma de la question (ACTIVE = vote possible si session ouverte, CLOSED = vote arrêté sur cette question)."
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
            {editAction}
          </div>
        </>
      )}
    </div>
  );
}

function btnPrimary(disabled) {
  return {
    padding: "0.58rem 1.05rem",
    fontSize: "0.875rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: `1px solid ${disabled ? "#bfdbfe" : "#1d4ed8"}`,
    background: disabled ? "#dbeafe" : "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
    boxShadow: disabled ? "none" : "0 10px 20px rgba(37, 99, 235, 0.18)",
  };
}

function btnSecondary(disabled) {
  return {
    padding: "0.56rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    borderRadius: "12px",
    border: PREMIUM_BORDER_STRONG,
    background: disabled ? "#f8fafc" : "#fff",
    color: "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
    boxShadow: disabled ? "none" : "0 6px 18px rgba(15, 23, 42, 0.04)",
  };
}

function btnLancerVote(disabled) {
  return {
    padding: "0.56rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: `1px solid ${disabled ? "#bbf7d0" : "#15803d"}`,
    background: disabled ? "#f0fdf4" : "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
    color: disabled ? "#94a3b8" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? "none" : "0 10px 20px rgba(22, 163, 74, 0.16)",
  };
}

function btnStopVote(disabled) {
  return {
    padding: "0.56rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: `1px solid ${disabled ? "#e5e7eb" : "#f87171"}`,
    background: disabled ? "#f9fafb" : "#fff5f5",
    color: disabled ? "#9ca3af" : "#b91c1c",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.75 : 1,
    boxShadow: disabled ? "none" : "0 8px 18px rgba(239, 68, 68, 0.08)",
  };
}

function btnAfficherResultats(disabled) {
  return {
    padding: "0.56rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: `1px solid ${disabled ? "#bfdbfe" : "#4f46e5"}`,
    background: disabled ? "#f8fafc" : "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
    color: disabled ? "#9ca3af" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? "none" : "0 10px 20px rgba(79, 70, 229, 0.16)",
  };
}

function btnSecondaryAction(disabled) {
  return {
    padding: "0.5rem 0.88rem",
    fontSize: "0.8rem",
    fontWeight: 700,
    borderRadius: "12px",
    border: "1px solid rgba(167, 139, 250, 0.35)",
    background: disabled ? "#f5f3ff" : "rgba(139, 92, 246, 0.08)",
    color: disabled ? "#a1a1aa" : "#5b21b6",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? "none" : "0 8px 18px rgba(139, 92, 246, 0.08)",
  };
}

function btnDanger(disabled) {
  return {
    padding: "0.62rem 1.15rem",
    fontSize: "0.95rem",
    borderRadius: "12px",
    border: "1px solid #7c3aed",
    background: disabled ? "#ede9fe" : "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.65 : 1,
    boxShadow: disabled ? "none" : "0 12px 22px rgba(124, 58, 237, 0.18)",
  };
}

function btnFinish(disabled) {
  return {
    padding: "0.52rem 1rem",
    fontSize: "0.82rem",
    borderRadius: "12px",
    border: `1px solid ${disabled ? "#e5e7eb" : "#fda4af"}`,
    background: disabled ? "#f9fafb" : "#fffafb",
    color: disabled ? "#9ca3af" : "#be123c",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? "none" : "0 8px 20px rgba(190, 24, 93, 0.08)",
  };
}

function lienDiffusionAbsolu(path) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${path}`;
}

/**
 * Rotation automatique question / résultats (présentation uniquement).
 * @param {{ embedded?: boolean; auxiliaryHint?: string | null; busy: boolean; autoRotate: boolean; onAutoRotateChange: (v: boolean) => void; autoRotateAllowed: boolean; autoRotateQuestionSec: number; autoRotateResultsSec: number; onAutoRotateQuestionSecChange: (n: number) => void; onAutoRotateResultsSecChange: (n: number) => void; }} props
 */
function RegieAutoRotatePanel({
  embedded = false,
  auxiliaryHint = null,
  busy,
  autoRotate,
  onAutoRotateChange,
  autoRotateAllowed,
  autoRotateQuestionSec,
  autoRotateResultsSec,
  onAutoRotateQuestionSecChange,
  onAutoRotateResultsSecChange,
}) {
  return (
    <div
      style={{
        marginTop: embedded ? "0.55rem" : "0",
        padding: embedded ? "0.72rem 0 0 0" : "0.95rem 1.05rem",
        paddingTop: embedded ? "0.72rem" : undefined,
        borderTop: embedded ? "1px solid rgba(148, 163, 184, 0.18)" : undefined,
        borderRadius: embedded ? 0 : "16px",
        background: embedded ? "transparent" : "rgba(255,255,255,0.72)",
        border: embedded ? "none" : "1px solid rgba(91, 33, 182, 0.16)",
        boxShadow: embedded ? "none" : "0 12px 24px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.5rem 0.75rem",
          justifyContent: "space-between",
        }}
      >
        <p
          style={
            embedded
              ? {
                  margin: 0,
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }
              : {
                  margin: 0,
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "#4c1d95",
                }
          }
        >
          Rotation automatique
        </p>
        <button
          type="button"
          disabled={busy || (!autoRotateAllowed && !autoRotate)}
          aria-pressed={autoRotate}
          onClick={() => onAutoRotateChange(!autoRotate)}
          style={{
            flexShrink: 0,
            padding: embedded ? "0.34rem 0.82rem" : "0.42rem 1rem",
            minWidth: embedded ? "6.75rem" : "7.5rem",
            borderRadius: "9999px",
            border: autoRotate ? "1px solid #15803d" : "1px solid #cbd5e1",
            background: autoRotate
              ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
              : "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
            color: autoRotate ? "#fff" : "#475569",
            fontSize: embedded ? "0.74rem" : "0.8rem",
            fontWeight: 800,
            letterSpacing: "0.04em",
            cursor:
              busy || (!autoRotateAllowed && !autoRotate) ? "not-allowed" : "pointer",
            opacity: busy || (!autoRotateAllowed && !autoRotate) ? 0.55 : 1,
            boxShadow: autoRotate
              ? "0 2px 8px rgba(22, 163, 74, 0.35)"
              : "0 1px 3px rgba(15, 23, 42, 0.08)",
          }}
        >
          {autoRotate ? "Activée" : "Désactivée"}
        </button>
      </div>
      {auxiliaryHint ? (
        <p
          style={{
            margin: "0.42rem 0 0 0",
            fontSize: "0.72rem",
            color: "#64748b",
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {auxiliaryHint}
        </p>
      ) : null}
      <div
        style={{
          marginTop: "0.55rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "0.65rem 0.95rem",
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
              onAutoRotateQuestionSecChange(clampAutoRotateSec(e.target.value))
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
              onAutoRotateResultsSecChange(clampAutoRotateSec(e.target.value))
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
            maxWidth: embedded ? "100%" : "14rem",
            lineHeight: 1.35,
          }}
        >
          {AUTO_ROTATE_SEC_MIN}–{AUTO_ROTATE_SEC_MAX} s chacun.
        </span>
      </div>
      {!auxiliaryHint ? (
        <p
          style={{
            margin: "0.45rem 0 0 0",
            fontSize: "0.68rem",
            color: "#64748b",
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          Alterne la question puis les résultats live selon ces durées. Désactivée si écran noir,
          vote fermé ou changement de question ; toute action manuelle l’arrête.
        </p>
      ) : (
        <p
          style={{
            margin: "0.4rem 0 0 0",
            fontSize: "0.66rem",
            color: "#94a3b8",
            lineHeight: 1.35,
            fontWeight: 500,
          }}
        >
          Désactivée si écran noir, vote fermé ou action manuelle.
        </p>
      )}
    </div>
  );
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
 *   sendScreenAction: (type: "RESULTS" | "QUESTION" | "WAITING" | "BLACK", screenId?: string | null) => void;
 *   screenCount: number;
 *   screenBConnected: boolean;
 *   screenBDisplayState?: string | null;
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
  screenBConnected,
  screenBDisplayState = null,
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
  const [projectionMode, setProjectionMode] = useState("standard");
  const [copiedScreenId, setCopiedScreenId] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") setClientPret(true);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    const raw = window.localStorage.getItem(`avote_projection_mode_${slug}`);
    const val = String(raw || "").trim().toLowerCase();
    if (
      val === "xlarge_qr" ||
      val === "qr_fullscreen" ||
      val === "results_focus" ||
      val === "standard"
    ) {
      setProjectionMode(val);
    }
  }, [slug]);

  const enc = encodeURIComponent(slug);
  const pathScreen = `/screen/${enc}?pm=${encodeURIComponent(projectionMode)}`;
  const pathScreenById = (id) =>
    `/screen/${enc}?pm=${encodeURIComponent(projectionMode)}&sid=${encodeURIComponent(id)}`;
  const projectionModeLabel =
    projectionMode === "qr_fullscreen"
      ? "QR plein écran"
      : projectionMode === "xlarge_qr"
      ? "Grande salle (QR XXL)"
      : projectionMode === "results_focus"
        ? "Résultats focus"
        : "Standard";
  function changeProjectionMode(nextMode) {
    const v = String(nextMode || "").trim().toLowerCase();
    const safe =
      v === "xlarge_qr" ||
      v === "qr_fullscreen" ||
      v === "results_focus" ||
      v === "standard"
        ? v
        : "standard";
    setProjectionMode(safe);
    if (typeof window !== "undefined" && slug) {
      try {
        window.localStorage.setItem(`avote_projection_mode_${slug}`, safe);
      } catch {
        // ignore
      }
    }
  }

  function ouvrirEcran() {
    const url = lienDiffusionAbsolu(pathScreen);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }
  async function copierLienEcranStandard() {
    const url = lienDiffusionAbsolu(pathScreen);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedScreenId("standard");
      window.setTimeout(() => setCopiedScreenId(null), 1800);
    } catch {
      // ignore
    }
  }
  async function copierLienEcranCible(id) {
    const url = lienDiffusionAbsolu(pathScreenById(id));
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedScreenId(id);
      window.setTimeout(() => setCopiedScreenId(null), 1800);
    } catch {
      // ignore
    }
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
  const statutEcranB = screenBConnected
    ? "🟢 Écran B connecté"
    : "🔴 Écran B non connecté";
  const affichageStandardLabel =
    DISPLAY_STATE_LABELS[d] ?? String(d || "waiting").toUpperCase();
  const ecranBDisplayLower = String(screenBDisplayState || "").toLowerCase();
  const affichageBLabel = screenBConnected
    ? (DISPLAY_STATE_LABELS[ecranBDisplayLower] ??
      String(ecranBDisplayLower || "waiting").toUpperCase())
    : "Non connecté";
  const styleBadgeAffichage = (state) => {
    const s = String(state || "").toLowerCase();
    if (s === "question") {
      return {
        color: "#166534",
        background: "#dcfce7",
        border: "1px solid #86efac",
      };
    }
    if (s === "results") {
      return {
        color: "#1e3a8a",
        background: "#dbeafe",
        border: "1px solid #93c5fd",
      };
    }
    if (s === "black") {
      return {
        color: "#fafaf9",
        background: "#0c0a09",
        border: "1px solid #292524",
      };
    }
    return {
      color: "#334155",
      background: "#f1f5f9",
      border: "1px solid #cbd5e1",
    };
  };

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
  const projConsoleBtn = {
    padding: "0.52rem 0.55rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    borderRadius: "10px",
    width: "100%",
    boxSizing: "border-box",
  };


  return (
    <section
      style={{
        ...CARD,
        padding: desktop ? "1.45rem 1.55rem" : "1.25rem 1rem",
        background:
          "linear-gradient(145deg, #faf5ff 0%, #eef2ff 48%, #ffffff 100%)",
        border: "1px solid rgba(167, 139, 250, 0.26)",
        boxShadow: "0 24px 44px rgba(91, 33, 182, 0.12)",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            fontSize: desktop ? "1.4rem" : "1.16rem",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.03em",
            color: "#3b0764",
          }}
        >
          Projection écran
        </h2>
        <p
          style={{
            margin: "0.45rem 0 0 0",
            fontSize: desktop ? "1.14rem" : "1.02rem",
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
          marginBottom: "0.85rem",
        }}
      >
        <p style={{ margin: "0 0 0.72rem 0", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed" }}>
          Zone écrans
        </p>
        <div className="proj-ecran-console-grid">
          <div className="proj-ecran-console-col" data-screen-state={d}>
            <div className="proj-ecran-console-col-head">
              <div className="proj-ecran-console-col-head-main">
                <div className="proj-ecran-console-col-head-row">
                  <p className="proj-ecran-console-col-title">Écran principal</p>
                  <p className="proj-ecran-console-col-meta">{ecranConnecte ? "🟢 Connecté" : "🔴 Hors ligne"}</p>
                </div>
              </div>
            </div>
            <div className="proj-ecran-console-state">
              <span className="proj-ecran-console-state-label">État actuel</span>
              <span
                className="proj-ecran-console-state-badge"
                style={styleBadgeAffichage(d)}
              >
                {affichageStandardLabel}
              </span>
            </div>
            <div className="proj-ecran-console-inset">
              <p className="proj-ecran-console-inset-title">Modes projection</p>
              <p className="proj-ecran-console-inset-hint">
                S’applique à l’écran principal et au lien généré pour l’écran B.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                {[
                  { id: "standard", label: "Standard" },
                  { id: "xlarge_qr", label: "Grande salle (QR XXL)" },
                  { id: "qr_fullscreen", label: "QR plein écran" },
                  { id: "results_focus", label: "Résultats focus" },
                ].map((m) => {
                  const on = projectionMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => changeProjectionMode(m.id)}
                      style={{
                        padding: "0.46rem 0.76rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        borderRadius: "12px",
                        border: on ? "1px solid #7c3aed" : PREMIUM_BORDER,
                        background: on
                          ? "linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%)"
                          : "rgba(255,255,255,0.9)",
                        color: on ? "#5b21b6" : "#475569",
                        cursor: "pointer",
                        boxShadow: on ? "0 12px 24px rgba(124, 58, 237, 0.12)" : "none",
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <p className="proj-ecran-console-inset-active">
                Mode actif : <strong>{projectionModeLabel}</strong>
              </p>
            </div>
            <RegieAutoRotatePanel
              embedded
              auxiliaryHint="Enchaîne automatiquement question → résultats sur l’écran principal."
              busy={busy}
              autoRotate={autoRotate}
              onAutoRotateChange={onAutoRotateChange}
              autoRotateAllowed={autoRotateAllowed}
              autoRotateQuestionSec={autoRotateQuestionSec}
              autoRotateResultsSec={autoRotateResultsSec}
              onAutoRotateQuestionSecChange={onAutoRotateQuestionSecChange}
              onAutoRotateResultsSecChange={onAutoRotateResultsSecChange}
            />
            <button type="button" onClick={ouvrirEcran} style={{ ...btnOuvrir, marginLeft: 0, marginRight: 0, maxWidth: "none", width: "100%" }}>
              Ouvrir
            </button>
            <div className="proj-ecran-console-actions">
              <button
                type="button"
                disabled={busy || !activePollId || d !== "results"}
                onClick={async () => {
                  const ok = await postAction(`/polls/${activePollId}/display-question`);
                  if (ok) sendScreenAction("QUESTION", null);
                }}
                style={{ ...btnOutlineSecondaire, ...projConsoleBtn, ...secDisabled(busy || !activePollId || d !== "results") }}
              >
                Question
              </button>
              <button
                type="button"
                disabled={busy || !activePollId}
                onClick={async () => {
                  const ok = await postAction(`/polls/${activePollId}/show-results`);
                  if (ok) sendScreenAction("RESULTS", null);
                }}
                style={{ ...btnOutlineSecondaire, ...projConsoleBtn, ...secDisabled(busy || !activePollId) }}
              >
                Résultats
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (affichageNoir) sendScreenAction("WAITING", null);
                  else sendScreenAction("BLACK", null);
                }}
                style={{ ...btnDangerNoir, ...projConsoleBtn, ...secDisabled(busy) }}
              >
                {affichageNoir ? "Retour direct" : "Noir"}
              </button>
              <button
                type="button"
                disabled={busy || affichageNoir}
                onClick={() => sendScreenAction("WAITING", null)}
                style={{ ...btnRevenirDirect, ...projConsoleBtn, ...secDisabled(busy || affichageNoir) }}
              >
                Attente
              </button>
            </div>
            <button
              type="button"
              onClick={() => void copierLienEcranStandard()}
              style={{ ...btnOutlineSecondaire, width: "100%", padding: "0.58rem 0.75rem", fontWeight: 700 }}
            >
              {copiedScreenId === "standard" ? "Lien copié" : "Copier le lien"}
            </button>
          </div>

          <div className="proj-ecran-console-col" data-screen-state={screenBConnected ? ecranBDisplayLower : "waiting"}>
            <div className="proj-ecran-console-col-head">
              <div className="proj-ecran-console-col-head-main">
                <div className="proj-ecran-console-col-head-row">
                  <p className="proj-ecran-console-col-title">Écran B</p>
                  <p className="proj-ecran-console-col-meta">{statutEcranB}</p>
                </div>
                <p className="proj-ecran-console-col-desc">Affichage secondaire indépendant.</p>
              </div>
            </div>
            <div className="proj-ecran-console-state">
              <span className="proj-ecran-console-state-label">État actuel</span>
              <span
                className="proj-ecran-console-state-badge"
                style={styleBadgeAffichage(screenBConnected ? ecranBDisplayLower : "waiting")}
              >
                {affichageBLabel}
              </span>
            </div>
          {["B"].map((sid) => (
            <div key={sid} style={{ display: "grid", gap: "0.55rem" }}>
              <button
                type="button"
                onClick={() => {
                  const url = lienDiffusionAbsolu(pathScreenById(sid));
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
                style={{ ...btnOuvrir, marginLeft: 0, marginRight: 0, maxWidth: "none", width: "100%" }}
              >
                Ouvrir
              </button>
              <div className="proj-ecran-console-actions">
                <button
                  type="button"
                  disabled={busy || !activePollId}
                  onClick={() => sendScreenAction("QUESTION", sid)}
                  style={{ ...btnOutlineSecondaire, ...projConsoleBtn, ...(busy || !activePollId ? secDisabled(true) : {}) }}
                >
                  Question
                </button>
                <button
                  type="button"
                  disabled={busy || !activePollId}
                  onClick={() => sendScreenAction("RESULTS", sid)}
                  style={{ ...btnOutlineSecondaire, ...projConsoleBtn, ...(busy || !activePollId ? secDisabled(true) : {}) }}
                >
                  Résultats
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => sendScreenAction("BLACK", sid)}
                  style={{ ...btnDangerNoir, ...projConsoleBtn, ...(busy ? secDisabled(true) : {}) }}
                >
                  Noir
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => sendScreenAction("WAITING", sid)}
                  style={{ ...btnRevenirDirect, ...projConsoleBtn, ...(busy ? secDisabled(true) : {}) }}
                >
                  Attente
                </button>
              </div>
              <button
                type="button"
                onClick={() => void copierLienEcranCible(sid)}
                style={{ ...btnOutlineSecondaire, width: "100%", padding: "0.58rem 0.75rem", fontWeight: 700 }}
              >
                {copiedScreenId === sid ? "Lien copié" : "Copier le lien"}
              </button>
            </div>
          ))}
          </div>
        </div>
      </div>

      {chronoSection ? (
        <div
          id="regie-chrono-panel"
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
        .proj-ecran-console-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          align-items: stretch;
        }
        .proj-ecran-console-col {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          padding: 1rem 1.02rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(91, 33, 182, 0.2);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
          min-width: 0;
        }
        .proj-ecran-console-col[data-screen-state="question"] {
          border-color: rgba(34, 197, 94, 0.35);
          box-shadow: 0 14px 32px rgba(34, 197, 94, 0.1);
        }
        .proj-ecran-console-col[data-screen-state="results"] {
          border-color: rgba(59, 130, 246, 0.35);
          box-shadow: 0 14px 32px rgba(59, 130, 246, 0.1);
        }
        .proj-ecran-console-col[data-screen-state="black"] {
          border-color: rgba(15, 23, 42, 0.45);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.98) 100%);
        }
        .proj-ecran-console-col[data-screen-state="black"] .proj-ecran-console-col-title,
        .proj-ecran-console-col[data-screen-state="black"] .proj-ecran-console-col-meta,
        .proj-ecran-console-col[data-screen-state="black"] .proj-ecran-console-col-desc,
        .proj-ecran-console-col[data-screen-state="black"] .proj-ecran-console-state-label {
          color: #e2e8f0;
        }
        .proj-ecran-console-col-head {
          display: flex;
          align-items: flex-start;
          gap: 0.35rem 0.5rem;
        }
        .proj-ecran-console-col-head-main {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: 0.28rem;
        }
        .proj-ecran-console-col-head-row {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.35rem 0.5rem;
        }
        .proj-ecran-console-col-title {
          margin: 0;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #6d28d9;
        }
        .proj-ecran-console-col-meta {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
        }
        .proj-ecran-console-state {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.45rem 0.55rem;
        }
        .proj-ecran-console-state-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .proj-ecran-console-state-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.14rem 0.5rem;
          border-radius: 999px;
          font-weight: 800;
          font-size: 0.72rem;
          letter-spacing: 0.02em;
        }
        .proj-ecran-console-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.4rem;
        }
        .proj-ecran-console-inset {
          padding-top: 0.55rem;
          margin-top: 0.15rem;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          display: grid;
          gap: 0.45rem;
        }
        .proj-ecran-console-inset-title {
          margin: 0;
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .proj-ecran-console-inset-hint,
        .proj-ecran-console-col-desc {
          margin: 0;
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.4;
          font-weight: 500;
        }
        .proj-ecran-console-inset-active {
          margin: 0;
          font-size: 0.72rem;
          color: #475569;
          line-height: 1.35;
        }
        .proj-ecran-console-inset-active strong {
          color: #111827;
        }
        .proj-ecran-console-actions > button {
          width: 100%;
        }
        .proj-ecran-separated-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.55rem;
          margin-bottom: 0.15rem;
        }
        .proj-ecran-separated-card {
          border: 1px solid #ddd6fe;
          border-radius: 10px;
          background: #fff;
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          gap: 0.38rem;
        }
        .proj-ecran-separated-title {
          margin: 0;
          font-size: 0.76rem;
          font-weight: 800;
          color: #4c1d95;
        }
        .proj-ecran-separated-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.38rem;
        }
        .proj-ecran-separated-actions > button {
          width: 100%;
        }
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
        @media (min-width: 768px) {
          .proj-ecran-console-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 640px) {
          .proj-ecran-separated-grid {
            grid-template-columns: minmax(0, 1fr);
          }
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
 * Toggle Ma salle ↔ Vote direct.
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
  const [exportOrientation, setExportOrientation] = useState(
    /** @type {"normal" | "mirror"} */ ("normal"),
  );
  const [exportBusy, setExportBusy] = useState(
    /** @type {null | "png" | "pdf" | "svg"} */ (null),
  );
  const [targetUrl, setTargetUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const exportQrHostRef = useRef(null);
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

  function getExportSourceSvgMarkup() {
    const host = exportQrHostRef.current;
    const svg = host?.querySelector("svg");
    return typeof svg?.outerHTML === "string" ? svg.outerHTML : "";
  }

  async function exportSvgFile() {
    const raw = getExportSourceSvgMarkup();
    if (!raw || !slug) return;
    const printable = buildPrintableQrSvg({
      qrSvgMarkup: raw,
      mirror: exportOrientation === "mirror",
    });
    downloadBlobFile(
      new Blob([printable], { type: "image/svg+xml;charset=utf-8" }),
      `avote-qr-${slug}-${exportOrientation}.svg`,
    );
  }

  async function exportPngFile() {
    const raw = getExportSourceSvgMarkup();
    if (!raw || !slug) return;
    const printable = buildPrintableQrSvg({
      qrSvgMarkup: raw,
      mirror: exportOrientation === "mirror",
    });
    const pngBlob = await svgToPngBlob(printable, 2600);
    downloadBlobFile(pngBlob, `avote-qr-${slug}-${exportOrientation}.png`);
  }

  async function exportPdfFile() {
    const raw = getExportSourceSvgMarkup();
    if (!raw || !slug) return;
    const printable = buildPrintableQrSvg({
      qrSvgMarkup: raw,
      mirror: exportOrientation === "mirror",
    });
    const pngBlob = await svgToPngBlob(printable, 2600);
    const pngUrl = URL.createObjectURL(pngBlob);
    try {
      const imgData = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          if (!ctx) return reject(new Error("Canvas indisponible."));
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png", 1));
        };
        img.onerror = reject;
        img.src = pngUrl;
      });
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const qrW = 170;
      const qrH = 212;
      const x = (pageW - qrW) / 2;
      const y = (pageH - qrH) / 2 - 8;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(imgData, "PNG", x, y, qrW, qrH, undefined, "FAST");
      pdf.save(`avote-qr-${slug}-${exportOrientation}.pdf`);
    } finally {
      URL.revokeObjectURL(pngUrl);
    }
  }

  async function runExport(type) {
    try {
      setExportBusy(type);
      if (type === "svg") await exportSvgFile();
      if (type === "png") await exportPngFile();
      if (type === "pdf") await exportPdfFile();
    } catch {
      // ignore: keeps regie flow intact
    } finally {
      setExportBusy(null);
    }
  }

  const qrSize = rail ? 224 : 196;
  const badge =
    sceneBadge ??
    getEventUxSceneBadge({ liveState: normalizeRegieLiveStateForUx(liveState) });
  const hasDuplicateStateLabel =
    String(stateLabel || "").trim().toLowerCase() ===
    String(badge?.label || "").trim().toLowerCase();

  const wrap = {
    ...CARD,
    padding: rail ? "1rem" : "0.95rem",
    ...(rail && !embedded
      ? {
          position: "sticky",
          top: "1.25rem",
          alignSelf: "start",
          maxWidth: "292px",
          width: "100%",
        }
      : {}),
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.07)",
  };

  const toggleWrap = {
    display: "flex",
    gap: "3px",
    padding: "3px",
    borderRadius: "12px",
    background: "rgba(15, 23, 42, 0.05)",
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
    <aside style={wrap} aria-label="Accès audience rapide">
      {embedded ? null : (
        <>
          <h3
            style={{
              margin: "0 0 0.2rem 0",
              fontSize: "0.92rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Accès audience
          </h3>
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontSize: "0.72rem",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            QR et lien de participation
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
            padding: "0.18rem 0.46rem",
            borderRadius: "999px",
            background: "rgba(139, 92, 246, 0.08)",
            color: "#6d28d9",
            border: "1px solid rgba(167, 139, 250, 0.2)",
          }}
        >
          Participation
        </span>
        {!hasDuplicateStateLabel ? (
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
        ) : null}
      </div>

      <div style={toggleWrap} role="group" aria-label="Type de lien pour le QR">
        <button
          type="button"
          aria-pressed={mode === "join"}
          onClick={() => setMode("join")}
          style={styleSeg("join")}
        >
          Ma salle
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
          padding: rail ? "1rem 0.75rem" : "0.9rem 0.7rem",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: "20px",
          border: PREMIUM_BORDER,
          marginBottom: "0.65rem",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 12px 24px rgba(15, 23, 42, 0.04)",
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
      <div
        ref={exportQrHostRef}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <QRCodeSVG
          value={lienDiffusionAbsolu(pathJoin) || pathJoin}
          size={QR_EXPORT_SOURCE_SIZE}
          level="H"
          marginSize={4}
          bgColor="#ffffff"
          fgColor="#000000"
        />
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
          margin: "0.25rem 0 0.8rem",
          border: PREMIUM_BORDER,
          borderRadius: "16px",
          background: "rgba(255,255,255,0.72)",
          padding: "0.72rem",
        }}
      >
        <p
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.78rem",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Export QR code
        </p>
        <div style={{ display: "grid", gap: "0.28rem", marginBottom: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.75rem", color: "#334155", fontWeight: 600 }}>
            <input
              type="radio"
              name={`qr-export-orientation-${variant}`}
              checked={exportOrientation === "normal"}
              onChange={() => setExportOrientation("normal")}
            />
            QR normal
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.75rem", color: "#334155", fontWeight: 600 }}>
            <input
              type="radio"
              name={`qr-export-orientation-${variant}`}
              checked={exportOrientation === "mirror"}
              onChange={() => setExportOrientation("mirror")}
            />
            QR miroir textile (Transfert)
          </label>
          {exportOrientation === "mirror" ? (
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>
              Copie prête impression textile
            </p>
          ) : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.4rem" }}>
          <button
            type="button"
            onClick={() => void runExport("png")}
            disabled={exportBusy !== null}
            style={qrExportBtnStyle}
          >
            {exportBusy === "png" ? "..." : "Télécharger PNG (HD)"}
          </button>
          <button
            type="button"
            onClick={() => void runExport("pdf")}
            disabled={exportBusy !== null}
            style={qrExportBtnStyle}
          >
            {exportBusy === "pdf" ? "..." : "Télécharger PDF (A4)"}
          </button>
          <button
            type="button"
            onClick={() => void runExport("svg")}
            disabled={exportBusy !== null}
            style={qrExportBtnStyle}
          >
            {exportBusy === "svg" ? "..." : "Télécharger SVG (vectoriel)"}
          </button>
        </div>
      </div>

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
            padding: "0.46rem 0.95rem",
            fontSize: "0.76rem",
            fontWeight: 700,
            borderRadius: "12px",
            border: "1px solid rgba(167, 139, 250, 0.28)",
            background: "rgba(139, 92, 246, 0.08)",
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
            padding: "0.46rem 0.85rem",
            fontSize: "0.76rem",
            fontWeight: 600,
            borderRadius: "12px",
            border: PREMIUM_BORDER,
            background: "rgba(255,255,255,0.7)",
            color: "#475569",
            cursor: "pointer",
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

const qrExportBtnStyle = {
  minHeight: "36px",
  border: PREMIUM_BORDER,
  borderRadius: "12px",
  background: "rgba(255,255,255,0.8)",
  color: "#334155",
  fontSize: "0.72rem",
  fontWeight: 700,
  padding: "0.45rem 0.35rem",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};

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
        padding: "0.7rem 0 0.25rem",
        margin: "0.1rem 0",
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
          border: PREMIUM_BORDER,
          background: "rgba(255,255,255,0.78)",
          padding: "0.45rem 0.72rem",
          margin: 0,
          fontSize: "0.78rem",
          fontWeight: 700,
          color: copied ? "#15803d" : "#7c3aed",
          borderRadius: "12px",
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

  const principal = presets[0];
  const secondaires = presets.slice(1);

  return (
    <div
      style={{
        padding: "0.15rem 0 0.35rem",
        margin: 0,
      }}
      id="overlay-stream-top"
    >
      <p
        style={{
          margin: "0 0 0.2rem 0",
          fontSize: "0.66rem",
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
          margin: "0 0 0.5rem 0",
          fontSize: "0.7rem",
          color: "#64748b",
          lineHeight: 1.35,
        }}
      >
        Utilisable dans OBS, streaming ou affichage discret.
      </p>
      {principal ? (
        <div
          style={{
            padding: "0.68rem 0.72rem",
            borderRadius: "16px",
            border: PREMIUM_BORDER,
            background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.9) 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>
              {principal.label}
            </p>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.68rem", color: "#64748b" }}>
              {principal.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copier(principal)}
            style={{
              alignSelf: "flex-start",
              padding: "0.38rem 0.7rem",
              fontSize: "0.76rem",
              fontWeight: 700,
              borderRadius: "12px",
              border: "1px solid rgba(167, 139, 250, 0.28)",
              background: copiedId === principal.id ? "#ecfdf5" : "rgba(139, 92, 246, 0.08)",
              color: copiedId === principal.id ? "#166534" : "#5b21b6",
              cursor: "pointer",
            }}
          >
            {copiedId === principal.id ? "Copié" : "Copier stream compact"}
          </button>
        </div>
      ) : null}
      <details style={{ marginTop: "0.5rem" }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#334155",
            userSelect: "none",
          }}
        >
          Autres presets overlay
        </summary>
        <div
          style={{
            marginTop: "0.45rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
          }}
        >
          {secondaires.map((p) => (
            <div
              key={p.id}
              style={{
                padding: "0.56rem 0.64rem",
                borderRadius: "14px",
                border: PREMIUM_BORDER,
                background: "rgba(255,255,255,0.74)",
                display: "flex",
                flexDirection: "column",
                gap: "0.32rem",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "0.76rem", fontWeight: 700, color: "#0f172a" }}>
                  {p.label}
                </p>
                <p
                  style={{
                    margin: "0.18rem 0 0 0",
                    fontSize: "0.67rem",
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
                  padding: "0.32rem 0.62rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  border: PREMIUM_BORDER,
                  background: copiedId === p.id ? "#ecfdf5" : "rgba(255,255,255,0.9)",
                  color: copiedId === p.id ? "#15803d" : "#475569",
                  cursor: "pointer",
                }}
              >
                {copiedId === p.id ? "Copié" : "Copier le lien"}
              </button>
            </div>
          ))}
        </div>
      </details>
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
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(139, 92, 246, 0.08)",
    border: "1px solid rgba(167, 139, 250, 0.22)",
    padding: "0.28rem 0.55rem",
    borderRadius: "999px",
    cursor: "pointer",
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

  /** @param {{ titre: string; path: string; k: "join" | "vote"; hint: string; openLabel?: string; copyLabel?: string }} p */
  function cell(p) {
    const abs = clientPret ? lienDiffusionAbsolu(p.path) : "";
    const openLabel = p.openLabel ?? "Ouvrir";
    const copyLabel = p.copyLabel ?? "Copier";
    return (
      <div
        style={{
          padding: "0.62rem 0.68rem",
          borderRadius: "14px",
          border: PREMIUM_BORDER,
          background: "rgba(255,255,255,0.78)",
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
            {openLabel}
          </button>
          <button type="button" onClick={() => copier(p.path, p.k)} style={linkAct}>
            {copyLabel}
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
 * Section dédiée landing — Partage & accès (régie).
 * @param {{ slug: string; landingEnabled: boolean; eventId: string | null }} props
 */
function SectionPartageLandingEvenement({ slug, landingEnabled, eventId }) {
  const [clientPret, setClientPret] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setClientPret(true);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const enc = encodeURIComponent(slug);
  const pathLanding = `/e/${enc}`;

  const linkAct = {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#7c3aed",
    background: "rgba(139, 92, 246, 0.08)",
    border: "1px solid rgba(167, 139, 250, 0.22)",
    padding: "0.28rem 0.55rem",
    borderRadius: "999px",
    cursor: "pointer",
  };

  async function copier() {
    const url = lienDiffusionAbsolu(pathLanding);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // ignore
    }
  }

  function ouvrir() {
    const url = lienDiffusionAbsolu(pathLanding);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const eyebrow = {
    margin: "0 0 0.45rem 0",
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  const landingAdminHref =
    eventId != null
      ? `/admin/events/${encodeURIComponent(eventId)}/landing`
      : "/admin/events";

  if (landingEnabled) {
    const abs = clientPret ? lienDiffusionAbsolu(pathLanding) : "";
    return (
      <div style={{ paddingTop: "0.55rem" }}>
        <p style={eyebrow}>Landing événement</p>
        <div
          style={{
            padding: "0.62rem 0.68rem",
            borderRadius: "14px",
            border: PREMIUM_BORDER,
            background: "rgba(255,255,255,0.78)",
            minWidth: 0,
          }}
        >
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
            {pathLanding}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
            <button type="button" onClick={() => ouvrir()} style={linkAct}>
              👁 Voir la landing
            </button>
            <Link
              href={landingAdminHref}
              style={{
                ...linkAct,
                textDecoration: "none",
              }}
            >
              ✨ Landing événement
            </Link>
            <button type="button" onClick={() => void copier()} style={linkAct}>
              Copier le lien
            </button>
            {copied ? (
              <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#15803d" }}>OK</span>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "0.55rem" }}>
      <div
        style={{
          padding: "0.62rem 0.68rem",
          borderRadius: "14px",
          border: PREMIUM_BORDER,
          background: "rgba(248,250,252,0.82)",
          minWidth: 0,
          opacity: 0.92,
        }}
      >
        <p
          style={{
            margin: "0 0 0.25rem 0",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#64748b",
            lineHeight: 1.25,
          }}
        >
          Landing événement
        </p>
        <p style={{ margin: "0 0 0.55rem 0", fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>
          Landing désactivée pour cet événement.
        </p>
        <Link
          href={landingAdminHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "2rem",
            padding: "0.4rem 0.65rem",
            borderRadius: "12px",
            border: PREMIUM_BORDER,
            background: "#fff",
            color: "#475569",
            fontSize: "0.76rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ✨ Landing événement
        </Link>
      </div>
    </div>
  );
}

/**
 * Colonne droite desktop : QR + liens diffusion.
 * @param {{ slug: string; liveState: string; stateLabel: string; showHeader?: boolean; noSticky?: boolean; qrVariant?: "rail" | "mobile"; sceneBadge?: { label: string; bg: string; color: string; border: string } | null; onQuickLandingPhoto?: () => void; landingPhotoUploading?: boolean; landingPhotoUploadLabel?: string; landingPhotosCount?: number; landingEnabled?: boolean; eventId?: string | null }} props
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
  onQuickLandingPhoto,
  landingPhotoUploading = false,
  landingPhotoUploadLabel = "📸 Publier une photo",
  landingPhotosCount = 0,
  landingEnabled = false,
  eventId = null,
}) {
  return (
    <aside
      style={{
        position: noSticky ? "static" : "sticky",
        top: noSticky ? undefined : "1.5rem",
        alignSelf: "start",
        width: "100%",
        maxWidth: noSticky ? "none" : "264px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0.58rem",
      }}
    >
      {showHeader ? (
        <div>
          <h2
            style={{
              margin: "0 0 0.2rem 0",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Partage & accès
          </h2>
          <p style={{ margin: 0, fontSize: "0.66rem", color: "#64748b", lineHeight: 1.35 }}>
            QR et liens pour votre audience
          </p>
        </div>
      ) : null}
      <BlocOverlayStreamPresets slug={slug} onCopied={onOverlayCopied} />
      <PanneauQrParticipant
        slug={slug}
        liveState={liveState}
        stateLabel={stateLabel}
        variant={qrVariant}
        embedded
        sceneBadge={sceneBadge}
      />
      <section
        style={{
          border: PREMIUM_BORDER,
          borderRadius: "16px",
          background: "rgba(255,255,255,0.78)",
          padding: "0.78rem 0.82rem",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.01em",
          }}
        >
          Galerie live
        </p>
        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.74rem", color: "#64748b", lineHeight: 1.35 }}>
          Ajoutez des photos en direct pendant l’événement.
        </p>
        <button
          type="button"
          disabled={landingPhotoUploading}
          onClick={() => onQuickLandingPhoto?.()}
          style={{
            marginTop: "0.62rem",
            width: "100%",
            minHeight: "2.2rem",
            padding: "0.45rem 0.68rem",
            borderRadius: "12px",
            border: "1px solid rgba(251, 146, 60, 0.22)",
            background: "linear-gradient(180deg, rgba(255,247,237,0.98) 0%, rgba(255,237,213,0.9) 100%)",
            color: "#9a3412",
            fontSize: "0.8rem",
            fontWeight: 800,
            cursor: landingPhotoUploading ? "not-allowed" : "pointer",
          }}
        >
          {landingPhotoUploadLabel}
        </button>
        <p style={{ margin: "0.42rem 0 0 0", fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
          {landingPhotosCount} photo{landingPhotosCount > 1 ? "s" : ""} publiée
          {landingPhotosCount > 1 ? "s" : ""}
        </p>
      </section>
      <CopierLienEcranLeger slug={slug} />
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
      <SectionPartageLandingEvenement
        slug={slug}
        landingEnabled={Boolean(landingEnabled)}
        eventId={eventId}
      />
    </aside>
  );
}

const REGIE_SIDEBAR_DEFAULT_DESC =
  "Pilotez la diffusion, le vote et l’écran en direct.";

const btnGhost = {
  padding: "0.4rem 0.72rem",
  fontSize: "0.8125rem",
  fontWeight: 600,
  borderRadius: "12px",
  border: PREMIUM_BORDER_STRONG,
  background: "rgba(255,255,255,0.92)",
  color: "#374151",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};

const REGIE_PREVIEW_JOIN_LS_PREFIX = "avote_regie_preview_join_";
/** Colonne gauche réduite (desktop) — persistant par événement */
const REGIE_LEFT_COLLAPSED_LS_PREFIX = "avote_regie_left_collapsed_";
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
  fused = false,
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
            flex: fused ? "0 0 40%" : "0 0 34%",
            minWidth: "min(100%, 300px)",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: fused
              ? "min(calc(100vh - 7rem), 860px)"
              : "min(calc(100vh - 6rem), 920px)",
            maxHeight: fused
              ? "min(calc(100vh - 7rem), 860px)"
              : "min(calc(100vh - 6rem), 920px)",
          }
        : {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: fused ? "min(560px, 66vh)" : "min(520px, 58vh)",
            maxHeight: fused ? "min(760px, 76vh)" : "min(700px, 70vh)",
          };

  return (
    <section
      style={{
        ...shell,
        borderRadius: 0,
        border: "none",
        background: "transparent",
        boxShadow: "none",
        overflow: "visible",
        boxSizing: "border-box",
      }}
      aria-label="Aperçu public salle"
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          borderRadius: fused ? "32px" : "30px",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.26) 0%, rgba(15,23,42,0) 36%), radial-gradient(circle at 15% 20%, rgba(59,130,246,0.14) 0%, rgba(15,23,42,0) 28%), linear-gradient(180deg, #020617 0%, #0f172a 56%, #111827 100%)",
          boxShadow: fused
            ? "0 26px 60px rgba(2, 6, 23, 0.28)"
            : "0 24px 54px rgba(15, 23, 42, 0.20)",
          isolation: "isolate",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0) 34%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 22%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: fused ? "32px" : "30px",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "0.95rem",
            left: "1rem",
            right: "1rem",
            zIndex: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.7rem 1rem",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p
              style={{
                margin: 0,
                fontSize: desktop ? "0.94rem" : "0.84rem",
                fontWeight: 800,
                color: "#f8fafc",
                letterSpacing: "-0.02em",
              }}
            >
              Ce que voit votre audience
            </p>
            <p
              style={{
                margin: "0.16rem 0 0 0",
                fontSize: "0.7rem",
                color: "rgba(226,232,240,0.72)",
                lineHeight: 1.35,
              }}
            >
              Vue participant en direct
            </p>
            {eventId ? (
              <div
                style={{
                  marginTop: "0.42rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem 0.75rem",
                  alignItems: "center",
                }}
              >
                <Link
                  href={`/admin/event/${encodeURIComponent(eventId)}/leads`}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "rgba(220,252,231,0.82)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Leads{newLeadCount > 0 ? ` (${newLeadCount > 99 ? "99+" : newLeadCount})` : ""}
                </Link>
                <Link
                  href={`/admin/event/${encodeURIComponent(eventId)}/analytics`}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "rgba(219,234,254,0.78)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Statistiques
                </Link>
                <Link
                  href={`/admin/events/${encodeURIComponent(eventId)}/live`}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "rgba(219,234,254,0.78)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Salle live
                </Link>
                <Link
                  href={`/admin/events/${encodeURIComponent(eventId)}/landing`}
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "rgba(237,233,254,0.82)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Landing
                </Link>
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: "0.45rem",
              alignItems: "center",
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
                padding: "0.38rem 0.72rem",
                background: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "#f8fafc",
                boxShadow: "none",
                backdropFilter: "blur(8px)",
              }}
            >
              Agrandir
            </button>
            {onHide ? (
              <button
                type="button"
                onClick={onHide}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(226,232,240,0.78)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.22rem 0.12rem",
                  cursor: "pointer",
                }}
              >
                Masquer
              </button>
            ) : null}
          </div>
        </div>
        {iframeError ? (
          <div
            style={{
              position: "absolute",
              inset: desktop ? "5.4rem 1rem 1rem" : "6rem 0.8rem 0.8rem",
              padding: "1.4rem",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "0.85rem",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(15,23,42,0.55)",
              boxSizing: "border-box",
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
                background: "rgba(255,255,255,0.08)",
                color: "#e2e8f0",
                borderColor: "rgba(255,255,255,0.12)",
                boxShadow: "none",
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
              inset: desktop ? "5.4rem 1rem 1rem" : "6rem 0.8rem 0.8rem",
              width: "auto",
              height: "auto",
              border: "none",
              display: "block",
              borderRadius: "24px",
              background: "#0f172a",
              boxShadow: "0 22px 48px rgba(2, 6, 23, 0.34)",
            }}
          />
        )}
      </div>
    </section>
  );
}

/**
 * Option auto-reveal : délai après fermeture du vote avant passage écran résultats.
 * @param {{ embedded?: boolean; embeddedDividerAbove?: boolean }} props
 */
function RegieAutoRevealCard({
  eventId,
  autoReveal,
  autoRevealDelaySec,
  onSaved,
  embedded = false,
  embeddedDividerAbove = true,
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

  const inner = (
    <>
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
    </>
  );

  if (embedded) {
    const divider = embeddedDividerAbove;
    return (
      <div
        style={{
          marginTop: divider ? "0.55rem" : 0,
          paddingTop: divider ? "0.55rem" : 0,
          borderTop: divider ? "1px solid rgba(199, 210, 254, 0.65)" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {inner}
      </div>
    );
  }

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
      {inner}
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
  descriptionText: _descriptionText,
  descriptionStored: _descriptionStored = null,
  eventId = null,
  onDescriptionSaved: _onDescriptionSaved,
  stateLabel: _stateLabel,
  liveState: _liveState,
  sceneBadge: _sceneBadge = null,
  onCloseDrawer,
  autoReveal = false,
  autoRevealDelaySec = 5,
  onAutoRevealSaved,
  joinPreviewDesktop = false,
  previewJoinOpen = false,
  onTogglePreviewJoin,
  onOpenJoinPreviewMobile,
  newLeadCount: _newLeadCount = 0,
}) {
  return (
    <>
      {onCloseDrawer ? (
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
              justifyContent: "flex-end",
            }}
          >
            <button type="button" onClick={onCloseDrawer} style={btnGhost}>
              Fermer
            </button>
          </div>
        </header>
      ) : null}

      <div
        style={{
          marginBottom: "0.65rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          {title || "Événement"}
        </p>
      </div>

      {((slug &&
        (joinPreviewDesktop ? onTogglePreviewJoin : onOpenJoinPreviewMobile)) ||
        eventId) ? (
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
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#4338ca",
              textTransform: "uppercase",
            }}
          >
            Ma salle
          </p>
          {slug &&
          (joinPreviewDesktop ? onTogglePreviewJoin : onOpenJoinPreviewMobile) ? (
            <>
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
                  background:
                    "linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)",
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
              {eventId ? (
                <>
                  <div
                    style={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.45rem",
                    }}
                  >
                    <Link
                      href={`/admin/events/${encodeURIComponent(eventId)}/live`}
                      className="regie-universe-tile regie-universe-tile--live"
                      style={{
                        boxSizing: "border-box",
                        textAlign: "center",
                        padding: "0.43rem 0.6rem",
                        fontSize: "0.77rem",
                        fontWeight: 700,
                        borderRadius: "9px",
                        border: "1px solid rgba(59, 130, 246, 0.24)",
                        background: "rgba(59, 130, 246, 0.12)",
                        color: "#1e3a8a",
                        textDecoration: "none",
                      }}
                    >
                      <LiveMicroLabel iconSize={13} gap="0.3rem" />
                    </Link>
                    <Link
                      href={`/admin/events/${encodeURIComponent(eventId)}/landing`}
                      className="regie-universe-tile regie-universe-tile--landing"
                      style={{
                        boxSizing: "border-box",
                        textAlign: "center",
                        padding: "0.43rem 0.6rem",
                        fontSize: "0.77rem",
                        fontWeight: 700,
                        borderRadius: "9px",
                        border: "1px solid rgba(168, 85, 247, 0.24)",
                        background: "rgba(168, 85, 247, 0.12)",
                        color: "#6d28d9",
                        textDecoration: "none",
                      }}
                    >
                      ✨ Landing
                    </Link>
                  </div>
                  <style>{`
                    .regie-universe-tile {
                      transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        color 0.18s ease;
                    }
                    @media (hover: hover) {
                      .regie-universe-tile--live:hover {
                        background: rgba(59, 130, 246, 0.18) !important;
                        border-color: rgba(59, 130, 246, 0.32) !important;
                      }
                      .regie-universe-tile--landing:hover {
                        background: rgba(168, 85, 247, 0.18) !important;
                        border-color: rgba(168, 85, 247, 0.32) !important;
                      }
                    }
                  `}</style>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
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
 *   onRequestCollapse?: () => void;
 * }} props
 */
function SidebarRegieDesktop(props) {
  const { pollsBlock, onRequestCollapse, ...inner } = props;
  return (
    <aside
      style={{
        position: "sticky",
        top: "0.7rem",
        alignSelf: "stretch",
        width: "min(272px, 100%)",
        maxWidth: "272px",
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        boxSizing: "border-box",
        padding: "1rem 0.9rem",
        background: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(248,250,252,0.9) 100%)",
        border: PREMIUM_BORDER,
        borderRadius: "22px",
        boxShadow: PREMIUM_SHADOW,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {typeof onRequestCollapse === "function" ? (
        <button
          type="button"
          onClick={onRequestCollapse}
          title="Masquer la colonne gauche pour plus d’espace au centre"
          aria-label="Réduire la colonne gauche"
          style={{
            flexShrink: 0,
            width: "100%",
            padding: "0.48rem 0.6rem",
            borderRadius: "12px",
            border: PREMIUM_BORDER,
            background: "rgba(255,255,255,0.76)",
            color: "#475569",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ⟨ Réduire le panneau
        </button>
      ) : null}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <RegieSidebarInner {...inner} />
        </div>
        {pollsBlock}
      </div>
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
  const [eventCredits, setEventCredits] = useState(/** @type {number | null} */ (null));
  const [activationsAvailable, setActivationsAvailable] = useState(
    /** @type {{ FUN: number; EVENT: number } | null} */ (null),
  );
  const [startRealPlanModalOpen, setStartRealPlanModalOpen] = useState(false);
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
  const [liveAnswersOpen, setLiveAnswersOpen] = useState(false);
  const [landingPhotoUploadPhase, setLandingPhotoUploadPhase] = useState(
    /** @type {null | "optimizing" | "uploading"} */ (null),
  );
  const landingPhotoUploading = landingPhotoUploadPhase != null;
  const landingPhotoUploadLabel =
    landingPhotoUploadPhase === "optimizing"
      ? "Optimisation de la photo…"
      : landingPhotoUploadPhase === "uploading"
        ? "Envoi photo…"
        : "📸 Publier une photo";
  /** Desktop : colonne gauche (questions + liens) repliée */
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  /** Nombre de clients /screen connectés (socket room dédiée) */
  const [screenCount, setScreenCount] = useState(0);
  const [screenBConnected, setScreenBConnected] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketReconnecting, setSocketReconnecting] = useState(false);
  const [screenBDisplayState, setScreenBDisplayState] = useState(
    /** @type {"question" | "results" | "waiting" | "black"} */ ("waiting"),
  );
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
  const [pollDrawSummary, setPollDrawSummary] = useState(
    /** @type {Record<string, { totalDraws: number; totalWinners: number; contestWinnerCount: number }>} */ ({}),
  );
  const [contestWinners, setContestWinners] = useState(
    /** @type {{ id: string; drawId: string; position: number; firstName: string; phone: string; email: string | null; createdAt: string }[]} */ ([]),
  );
  const [contestWinnersLoading, setContestWinnersLoading] = useState(false);
  const [contestWinnersError, setContestWinnersError] = useState(
    /** @type {string | null} */ (null),
  );
  const [editPollModalOpen, setEditPollModalOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState(/** @type {any | null} */ (null));
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editContestPrize, setEditContestPrize] = useState("");
  const [editContestWinnerCount, setEditContestWinnerCount] = useState(1);

  const loadPollAbortRef = useRef(null);
  const socketRef = useRef(null);
  const autoRotateRef = useRef(false);
  const pollIdRef = useRef(/** @type {string | null} */ (null));
  const displayStateRefRegie = useRef("waiting");
  const voteStateRefRegie = useRef("closed");
  const prevPollForAutoRef = useRef(
    /** @type {string | null | undefined} */ (undefined),
  );
  /** Ids des questions de l’événement (pour ignorer poll_updated d’un autre event) */
  const eventPollIdsRef = useRef(new Set());
  const quickLandingPhotoInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

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

  const fetchMeCredits = useCallback(async () => {
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const raw =
        typeof body?.eventCredits === "number"
          ? body.eventCredits
          : typeof body?.user?.eventCredits === "number"
            ? body.user.eventCredits
            : null;
      setEventCredits(raw == null ? null : Math.max(0, Number(raw)));
      const avail =
        body?.activationsAvailable ?? body?.user?.activationsAvailable ?? null;
      if (avail && typeof avail === "object") {
        const funRaw = Number(avail.FUN);
        const eventRaw = Number(avail.EVENT);
        setActivationsAvailable({
          FUN: Number.isFinite(funRaw) ? Math.max(0, funRaw) : 0,
          EVENT: Number.isFinite(eventRaw) ? Math.max(0, eventRaw) : 0,
        });
      } else {
        setActivationsAvailable({ FUN: 0, EVENT: 0 });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const uploadQuickLandingPhoto = useCallback(
    async (file) => {
      if (!eventId || !file) return;
      setLandingPhotoUploadPhase("optimizing");
      setActionError(null);
      try {
        const prepared = await prepareLandingPhotoForUpload(file, {
          onOptimizing: () => setLandingPhotoUploadPhase("optimizing"),
        });
        setLandingPhotoUploadPhase("uploading");
        const fd = new FormData();
        fd.append("file", prepared);
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${eventId}/landing/photos`,
          { method: "POST", body: fd },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(mapApiError(body, res.status));
        setToastNotif("✅ Photo publiée sur la landing");
        window.setTimeout(() => setToastNotif(null), 2600);
      } catch (e) {
        const msg = e?.message || "Upload photo impossible.";
        setActionError(
          msg === LANDING_PHOTO_TOO_HEAVY_MESSAGE
            ? msg
            : msg.includes("trop volumineux")
              ? LANDING_PHOTO_TOO_HEAVY_MESSAGE
              : msg,
        );
      } finally {
        setLandingPhotoUploadPhase(null);
      }
    },
    [eventId],
  );

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

  const fetchPollDrawSummary = useCallback(async (pollId) => {
    const id = String(pollId || "").trim();
    if (!id) return null;
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/polls/${encodeURIComponent(id)}/draws/summary`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const body = await res.json().catch(() => ({}));
      return {
        totalDraws: Number(body?.totalDraws || 0),
        totalWinners: Number(body?.totalWinners || 0),
        contestWinnerCount: normalizeContestWinnerCount(body?.contestWinnerCount),
      };
    } catch {
      return null;
    }
  }, []);

  const fetchContestWinners = useCallback(async (pollId) => {
    const id = String(pollId || "").trim();
    if (!id) return null;
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/polls/${encodeURIComponent(id)}/draws/winners`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const body = await res.json().catch(() => ({}));
      const winners = Array.isArray(body?.winners) ? body.winners : [];
      return winners.map((w) => ({
        id: String(w?.id || ""),
        drawId: String(w?.drawId || ""),
        position: Number(w?.position || 1),
        firstName: String(w?.firstName || ""),
        phone: String(w?.phone || ""),
        email: w?.email ? String(w.email) : null,
        createdAt: String(w?.createdAt || ""),
      }));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void fetchEvent();
    void fetchMeCredits();
    return () => {
      loadPollAbortRef.current?.abort();
    };
  }, [fetchEvent, fetchMeCredits]);

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
    if (!eventId || typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(
        REGIE_LEFT_COLLAPSED_LS_PREFIX + eventId,
      );
      setLeftSidebarCollapsed(v === "1");
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
          setContestEligibleError(mapApiError(body, res.status));
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
    const polls = Array.isArray(eventData?.polls) ? eventData.polls : [];
    const contestPollIds = polls
      .filter((p) => isContestPoll(p))
      .map((p) => String(p.id))
      .filter(Boolean);
    if (contestPollIds.length === 0) {
      setPollDrawSummary({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      const next = Object.fromEntries(
        contestPollIds.map((id) => [
          id,
          {
            totalDraws: 0,
            totalWinners: 0,
            contestWinnerCount: normalizeContestWinnerCount(
              polls.find((p) => String(p?.id) === id)?.contestWinnerCount,
            ),
          },
        ]),
      );
      await Promise.all(
        contestPollIds.map(async (pollId) => {
          const summary = await fetchPollDrawSummary(pollId);
          if (summary) {
            next[pollId] = {
              totalDraws: summary.totalDraws,
              totalWinners: summary.totalWinners,
              contestWinnerCount: normalizeContestWinnerCount(
                summary.contestWinnerCount,
              ),
            };
          }
          // fail silent: on garde le fallback (0)
        }),
      );
      if (!cancelled) {
        setPollDrawSummary(next);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [eventData?.polls, fetchPollDrawSummary]);

  useEffect(() => {
    const activePollId = String(eventData?.activePollId || "").trim();
    const activePollType = String(
      eventData?.polls?.find((p) => String(p?.id) === activePollId)?.type || "",
    ).toUpperCase();
    if (!activePollId || activePollType !== "CONTEST_ENTRY") {
      setContestWinners([]);
      setContestWinnersLoading(false);
      setContestWinnersError(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setContestWinnersLoading(true);
      setContestWinnersError(null);
      const winners = await fetchContestWinners(activePollId);
      if (cancelled) return;
      if (winners === null) {
        setContestWinnersError("Chargement indisponible.");
      } else {
        setContestWinners(winners);
      }
      setContestWinnersLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [eventData?.activePollId, eventData?.polls, fetchContestWinners]);

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

  const collapseLeftSidebar = useCallback(() => {
    setLeftSidebarCollapsed(true);
    if (!eventId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(REGIE_LEFT_COLLAPSED_LS_PREFIX + eventId, "1");
    } catch {
      /* ignore */
    }
  }, [eventId]);

  const expandLeftSidebar = useCallback(() => {
    setLeftSidebarCollapsed(false);
    if (!eventId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(REGIE_LEFT_COLLAPSED_LS_PREFIX + eventId, "0");
    } catch {
      /* ignore */
    }
  }, [eventId]);

  const scrollToChronoPanel = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("regie-chrono-panel");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  }, []);

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

    function onScreenPresence(payload) {
      if (!payload || String(payload.eventId) !== String(eventId)) return;
      const sid = String(payload.screenId || "").trim().toLowerCase();
      if (sid !== "b") return;
      const connectedFromCount =
        typeof payload.count === "number" && Number.isFinite(payload.count)
          ? payload.count > 0
          : null;
      const connected =
        typeof payload.connected === "boolean"
          ? payload.connected
          : connectedFromCount != null
            ? connectedFromCount
            : false;
      setScreenBConnected(connected);
      if (!connected) {
        setScreenBDisplayState("waiting");
      }
    }

    function onScreenUpdate(payload) {
      if (!payload || String(payload.eventId) !== String(eventId)) return;
      const sid = String(payload.screenId || "").trim().toLowerCase();
      const dsRaw = String(payload.displayState || "").trim().toLowerCase();
      if (!["question", "results", "waiting", "black"].includes(dsRaw)) return;
      if (sid === "b") {
        setScreenBDisplayState(
          /** @type {"question" | "results" | "waiting" | "black"} */ (dsRaw),
        );
        return;
      }
      // Projection principale (screenId null) : synchro immédiate de l'état écran
      // sans attendre un refetch complet de l'événement.
      setEventData((prev) =>
        prev
          ? {
              ...prev,
              screenDisplayState: dsRaw,
            }
          : prev,
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

    function onSocketConnect() {
      setSocketConnected(true);
      setSocketReconnecting(false);
      joinSalles();
    }
    function onSocketDisconnect() {
      setSocketConnected(false);
    }
    function onSocketConnectError() {
      setSocketConnected(false);
      setSocketReconnecting(true);
    }

    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("connect_error", onSocketConnectError);
    if (socket.connected) {
      setSocketConnected(true);
      setSocketReconnecting(false);
      joinSalles();
    }
    socket.on("event_live_updated", onLive);
    socket.on("poll_updated", onPollUpdated);
    socket.on("screen:count", onScreenCount);
    socket.on("screen:presence", onScreenPresence);
    socket.on("screen:update", onScreenUpdate);

    return () => {
      socketRef.current = null;
      socket.emit("leave_event", eventId);
      if (activePollId) {
        socket.emit("leave_poll", activePollId);
      }
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
      socket.off("connect_error", onSocketConnectError);
      socket.off("event_live_updated", onLive);
      socket.off("poll_updated", onPollUpdated);
      socket.off("screen:count", onScreenCount);
      socket.off("screen:presence", onScreenPresence);
      socket.off("screen:update", onScreenUpdate);
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
    /**
     * @param {"RESULTS" | "QUESTION" | "WAITING" | "BLACK"} type
     * @param {string | null | undefined} screenId
     */
    (type, screenId = null) => {
      setAutoRotate(false);
      if (!eventId) return;
      if (String(screenId || "").trim().toLowerCase() === "b") {
        const next = String(type || "").toLowerCase();
        if (["question", "results", "waiting", "black"].includes(next)) {
          setScreenBDisplayState(
            /** @type {"question" | "results" | "waiting" | "black"} */ (next),
          );
        }
      } else {
        // Fallback UX: mise à jour immédiate au clic pour la projection principale.
        const next = String(type || "").toLowerCase();
        if (["question", "results", "waiting", "black"].includes(next)) {
          setEventData((prev) =>
            prev
              ? {
                  ...prev,
                  screenDisplayState: next,
                }
              : prev,
          );
        }
      }
      socketRef.current?.emit("screen:action", { eventId, type, screenId: screenId || null });
    },
    [eventId],
  );

  const openEditPollModal = useCallback((poll) => {
    if (!poll) return;
    setEditingPoll(poll);
    setEditQuestionText(String(poll?.question || poll?.title || ""));
    setEditContestPrize(String(poll?.contestPrize || ""));
    setEditContestWinnerCount(normalizeContestWinnerCount(poll?.contestWinnerCount));
    setEditPollModalOpen(true);
  }, []);

  /** @returns {Promise<boolean>} */
  async function postAction(path, successMessage = null) {
    setAutoRotate(false);
    setBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}${path}`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      await fetchEvent({ silent: true });
      if (successMessage) {
        setToastNotif(successMessage);
        window.setTimeout(() => setToastNotif(null), 2200);
      }
      return true;
    } catch (e) {
      setActionError(e.message || "Action échouée.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** @returns {("FUN" | "EVENT")[]} */
  function getStartRealPlanOptions() {
    const balance = computeActivationBalance(eventCredits, activationsAvailable);
    const fun = balance.fun ?? 0;
    const event = balance.event ?? 0;
    const legacy = balance.legacyCredits ?? 0;
    /** @type {("FUN" | "EVENT")[]} */
    const options = [];
    if (fun > 0) options.push("FUN");
    if (event > 0) options.push("EVENT");
    if (legacy > 0) {
      if (!options.includes("FUN")) options.push("FUN");
      if (!options.includes("EVENT")) options.push("EVENT");
    }
    return options;
  }

  function handleStartRealClick() {
    if (!canStartReal || busy) return;
    const options = getStartRealPlanOptions();
    if (options.length === 0) return;
    if (options.length === 1) {
      void startRealLive(options[0]);
      return;
    }
    setStartRealPlanModalOpen(true);
  }

  /** @param {"FUN" | "EVENT"} planType */
  async function startRealLive(planType) {
    if (!eventId || !canStartReal) return;
    const planLabel = planType === "FUN" ? "FUN (100 participants max)" : "EVENT (500 participants max)";
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Passer en live réel avec la formule ${planType} ?\n\n1 activation sera consommée (${planLabel}). Vous obtiendrez des résultats exacts, le chrono libre et les exports.`,
      );
      if (!ok) return;
    }
    setStartRealPlanModalOpen(false);
    setAutoRotate(false);
    setBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/start-real`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      if (typeof body?.eventCredits === "number") {
        setEventCredits(Math.max(0, Number(body.eventCredits)));
      }
      if (body?.activationsAvailable && typeof body.activationsAvailable === "object") {
        const funRaw = Number(body.activationsAvailable.FUN);
        const eventRaw = Number(body.activationsAvailable.EVENT);
        setActivationsAvailable({
          FUN: Number.isFinite(funRaw) ? Math.max(0, funRaw) : 0,
          EVENT: Number.isFinite(eventRaw) ? Math.max(0, eventRaw) : 0,
        });
      } else {
        await fetchMeCredits();
      }
      await fetchEvent({ silent: true });
      setToastNotif(`Mode réel activé (${planType})`);
      window.setTimeout(() => setToastNotif(null), 2800);
    } catch (e) {
      setActionError(e.message || "Activation du mode réel impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPollEdit() {
    const pollId = String(editingPoll?.id || "");
    if (!pollId) return;
    const question = String(editQuestionText || "").trim();
    if (!question) {
      setActionError("Texte de question requis.");
      return;
    }
    const isContest = String(editingPoll?.type || "").toUpperCase() === "CONTEST_ENTRY";
    const payload = {
      question,
      ...(isContest
        ? {
            contestPrize: String(editContestPrize || "").trim() || null,
            contestWinnerCount: normalizeContestWinnerCount(editContestWinnerCount),
          }
        : {}),
    };
    setBusy(true);
    setActionError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/polls/${encodeURIComponent(pollId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      setEditPollModalOpen(false);
      setEditingPoll(null);
      setToastNotif("Question modifiée");
      window.setTimeout(() => setToastNotif(null), 2800);
      await fetchEvent({ silent: true });
    } catch (e) {
      setActionError(e?.message || "Modification impossible.");
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
        throw new Error(mapApiError(out, res.status));
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
        throw new Error(mapApiError(body, res.status));
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
      if (typeof body?.eligibleRemainingCount === "number") {
        setContestEligibleCount(Math.max(0, body.eligibleRemainingCount));
      }
      const updatedSummary = await fetchPollDrawSummary(pollId);
      if (updatedSummary) {
        setPollDrawSummary((prev) => ({
          ...prev,
          [String(pollId)]: updatedSummary,
        }));
      }
      const updatedWinners = await fetchContestWinners(pollId);
      if (updatedWinners) {
        setContestWinners(updatedWinners);
        setContestWinnersError(null);
      }
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
  const liveResponsesOptions = useMemo(() => {
    const opts = Array.isArray(activePoll?.options) ? activePoll.options : [];
    const totalVotesSafe = Math.max(
      0,
      Number(activePoll?.voteCount || opts.reduce((acc, o) => acc + Number(o?.voteCount || 0), 0)),
    );
    return opts
      .map((o, i) => {
        const voteCount = Math.max(0, Number(o?.voteCount || 0));
        const pctRaw = Number(o?.votePct);
        const pct =
          Number.isFinite(pctRaw) && pctRaw >= 0
            ? pctRaw
            : totalVotesSafe > 0
              ? (voteCount / totalVotesSafe) * 100
              : 0;
        return {
          id: String(o?.id || i),
          label: String(o?.label || `Option ${i + 1}`),
          voteCount,
          pct: Math.max(0, Math.min(100, pct)),
        };
      })
      .sort((a, b) => b.voteCount - a.voteCount);
  }, [activePoll]);
  const activeContestSummary = pollDrawSummary[String(activePoll?.id || "")] ?? {
    totalDraws: 0,
    totalWinners: 0,
    contestWinnerCount: normalizeContestWinnerCount(activePoll?.contestWinnerCount),
  };
  const activeContestWinnerQuota = normalizeContestWinnerCount(
    activePoll?.contestWinnerCount ?? activeContestSummary?.contestWinnerCount,
  );
  const activeContestTotalWinners = Math.max(
    0,
    Number(activeContestSummary?.totalWinners || 0),
  );
  const contestQuotaReached = activeContestTotalWinners >= activeContestWinnerQuota;
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
  const eventLocked = Boolean(eventData?.isLocked);
  const inTestMode = eventData?.isLiveConsumed === false;
  const canStartReal = inTestMode && !eventLocked;
  const activationBalance = computeActivationBalance(eventCredits, activationsAvailable);
  const funAvailable = activationBalance.fun;
  const eventAvailable = activationBalance.event;
  const activationsLoaded = activationBalance.typedLoaded;
  const totalAvailable = activationBalance.totalAvailable;
  const canStartRealWithActivation =
    activationsLoaded && totalAvailable !== null && totalAvailable > 0;
  const startRealDisabled = busy || !canStartRealWithActivation;
  const startRealPlanOptions = getStartRealPlanOptions();
  const eventPlanType = eventData?.eventPlanType
    ? String(eventData.eventPlanType).toUpperCase()
    : null;
  const canGoNext = !busy && !eventFinished && totalQuestions > 0 && !eventLocked;

  /** Ne jamais déduire « open » depuis liveState : lecture seule du champ API (+ défaut fermé si absent). */
  const rawVoteState = eventData?.voteState;
  const voteStateUi =
    rawVoteState != null && String(rawVoteState).trim() !== ""
      ? String(rawVoteState).toLowerCase().trim()
      : "closed";
  const displayStateUi = eventData?.displayState
    ? String(eventData.displayState).toLowerCase()
    : deriveRegieDisplayFallback(liveState);
  const projectionDisplayStateUi = eventData?.screenDisplayState
    ? String(eventData.screenDisplayState).toLowerCase()
    : displayStateUi;

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
  const modeBadge = inTestMode
    ? {
        label: "MODE TEST",
        bg: "#fee2e2",
        color: "#991b1b",
        border: "#fecaca",
      }
    : {
        label: eventLocked ? "MODE RÉEL • VERROUILLÉ" : "MODE RÉEL",
        bg: "#dcfce7",
        color: "#166534",
        border: "#bbf7d0",
      };

  const voteLabel =
    VOTE_STATE_LABELS[voteStateUi] ?? String(voteStateUi).toUpperCase();
  const displayLabelGlobal =
    DISPLAY_STATE_LABELS[displayStateUi] ??
    String(displayStateUi).toUpperCase();
  const displayStateBUi = String(screenBDisplayState || "waiting").toLowerCase();
  const displayLabelScreenB =
    DISPLAY_STATE_LABELS[displayStateBUi] ?? String(displayStateBUi).toUpperCase();
  const hasDisplayGap =
    Boolean(screenBConnected) &&
    ["question", "results", "waiting", "black"].includes(displayStateBUi) &&
    displayStateBUi !== String(projectionDisplayStateUi || "").toLowerCase();
  const affichageEnAttente =
    String(projectionDisplayStateUi || "").toLowerCase() === "waiting";
  const compactTopPanel = !desktop;
  const socketStatusLabel = socketConnected
    ? "Sync live connectee"
    : socketReconnecting
      ? "Reconnexion..."
      : "Hors ligne";
  const socketStatusBg = socketConnected
    ? "#dcfce7"
    : socketReconnecting
      ? "#fef3c7"
      : "#fee2e2";
  const socketStatusColor = socketConnected
    ? "#166534"
    : socketReconnecting
      ? "#92400e"
      : "#991b1b";
  const activePollIdJs = eventData?.activePollId ?? null;
  const canManageActivePoll = Boolean(activePollIdJs) && !busy;
  const canToggleVote = Boolean(activePollIdJs) && !busy && !eventFinished && !eventLocked;
  const voteIsOpen = voteStateUi === "open";
  const canShowQuestionQuick =
    canManageActivePoll && String(projectionDisplayStateUi || "").toLowerCase() !== "question";
  const canShowResultsQuick =
    canManageActivePoll && String(projectionDisplayStateUi || "").toLowerCase() !== "results";
  const isScreenBlack = String(projectionDisplayStateUi || "").toLowerCase() === "black";
  const participantsUsedValue =
    typeof eventData?.participantsUsed === "number" && !Number.isNaN(eventData.participantsUsed)
      ? Math.max(0, eventData.participantsUsed)
      : null;
  const participantsLimitValue =
    typeof eventData?.participantsLimit === "number" && !Number.isNaN(eventData.participantsLimit)
      ? Math.max(1, eventData.participantsLimit)
      : null;
  const hasParticipantsLimit = participantsLimitValue !== null;
  const effectiveParticipantsUsed = participantsUsedValue ?? 0;
  const participantsRatio = hasParticipantsLimit
    ? effectiveParticipantsUsed / participantsLimitValue
    : null;
  const participantsProgressPercent = participantsRatio !== null
    ? Math.max(0, Math.min(100, Math.round(participantsRatio * 100)))
    : 0;
  const participantsStatus =
    participantsRatio === null || participantsRatio < 0.8
      ? { tone: "neutral", message: "" }
      : participantsRatio < 1
        ? {
            tone: "soft",
            message: `⚠️ Plus que ${Math.max(0, participantsLimitValue - effectiveParticipantsUsed)} places restantes`,
          }
        : { tone: "strong", message: "🚫 Limite atteinte — nouveaux participants bloqués" };
  const participantsCounterLabel =
    participantsLimitValue == null
      ? "Participants non disponibles"
      : `Participants : ${effectiveParticipantsUsed} / ${participantsLimitValue}`;
  const landingPhotosCount = Array.isArray(eventData?.landingPhotos)
    ? eventData.landingPhotos.length
    : 0;
  const participantsCounterStyle =
    participantsStatus.tone === "strong"
      ? {
          border: "1px solid #fecaca",
          background: "#fff1f2",
          valueColor: "#9f1239",
          hintColor: "#b91c1c",
        }
      : participantsStatus.tone === "soft"
        ? {
            border: "1px solid #fde68a",
            background: "#fffbeb",
            valueColor: "#92400e",
            hintColor: "#b45309",
          }
        : {
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            valueColor: "#1e3a8a",
            hintColor: "#475569",
          };
  const participantsTrackColor =
    participantsStatus.tone === "strong"
      ? "#fecaca"
      : participantsStatus.tone === "soft"
        ? "#fde68a"
        : "#dbeafe";
  const participantsFillColor =
    participantsStatus.tone === "strong"
      ? "#dc2626"
      : participantsStatus.tone === "soft"
        ? "#d97706"
        : "#2563eb";
  const ecranLabel = activePoll
    ? activePoll.question || activePoll.title
    : eventLocked
      ? "Cet événement est terminé. Créez un nouvel événement pour une nouvelle session."
      : eventFinished
        ? "Événement terminé — aucune question active."
      : affichageEnAttente
        ? "Projection en attente — choisissez « Afficher la question » ou « Afficher les résultats »."
        : "Aucun contenu synchronisé pour l’instant.";
  const questionProgressSummary =
    totalQuestions > 0
      ? eventFinished
        ? "Événement terminé"
        : activeQuestionIndex >= 0
          ? `Question ${activeQuestionIndex + 1} / ${totalQuestions}`
          : `Questions prêtes : ${totalQuestions}`
      : "Aucune question";
  const activeQuestionTitle =
    activePoll?.question ||
    activePoll?.title ||
    (totalQuestions > 0 ? "Aucune question active pour le moment." : "Ajoutez une question pour commencer.");
  const topInfoCardStyle = {
    border: PREMIUM_BORDER,
    borderRadius: "16px",
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    padding: compactTopPanel ? "0.76rem 0.82rem" : "0.85rem 0.95rem",
    minWidth: 0,
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 10px 24px rgba(15, 23, 42, 0.04)",
  };
  const controlGroupCardStyle = {
    border: PREMIUM_BORDER,
    borderRadius: "18px",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    padding: compactTopPanel ? "0.88rem 0.92rem" : "0.98rem 1rem",
    minWidth: 0,
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 16px 34px rgba(15, 23, 42, 0.05)",
  };
  const liveFunctionCardStyle = {
    ...controlGroupCardStyle,
    display: "flex",
    flexDirection: "column",
    gap: "0.72rem",
    padding: desktop ? "1rem 1rem 1.05rem" : "0.92rem",
    minHeight: desktop ? "100%" : undefined,
    height: desktop ? "100%" : "auto",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.05)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.94) 100%)",
  };
  const liveFunctionCardTitleStyle = {
    margin: 0,
    fontSize: "0.64rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748b",
  };
  const liveExperienceShellStyle = {
    ...CARD,
    padding: compactTopPanel ? "1rem" : "1.12rem 1.16rem 1.2rem",
    border: "1px solid rgba(129, 140, 248, 0.18)",
    borderRadius: desktop ? "30px" : "24px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(238,242,255,0.98) 100%)",
    boxShadow: "0 28px 60px rgba(15, 23, 42, 0.10)",
    overflow: "hidden",
  };
  const liveBandDivider = "1px solid rgba(148, 163, 184, 0.18)";
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
      activePollIdJs,
    displayStateUi,
    voteStateUi,
    eventId,
    fetchEvent,
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
      aria-label="Liste des questions"
      style={{
        marginTop: "0.2rem",
        paddingTop: "1rem",
        borderTop: PREMIUM_BORDER,
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        Questions
      </p>
      <button
        type="button"
        onClick={() => setAddQuestionModalOpen(true)}
        disabled={busy}
        style={{
          width: "100%",
          marginBottom: "0.55rem",
          padding: "0.56rem 0.68rem",
          fontSize: "0.78rem",
          fontWeight: 700,
          borderRadius: "12px",
          border: "1px solid rgba(167, 139, 250, 0.35)",
          background: busy ? "#f5f3ff" : "rgba(139, 92, 246, 0.08)",
          color: busy ? "#9ca3af" : "#5b21b6",
          cursor: busy ? "not-allowed" : "pointer",
          boxSizing: "border-box",
          boxShadow: busy ? "none" : "0 10px 22px rgba(139, 92, 246, 0.08)",
        }}
      >
        + Ajouter une question
      </button>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
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
            onReveal={(id) => postAction(`/polls/${id}/reveal`)}
            onContestShortcut={handleContestShortcut}
            onLeadShortcut={handleLeadShortcut}
            onEdit={openEditPollModal}
            contestDrawSummary={pollDrawSummary[String(poll.id)]}
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
  const legendeChrono = inTestMode
    ? "Mode TEST : chrono forcé à 30s"
    : tm?.running && !tm?.isPaused
      ? "Compte à rebours sur l’écran"
      : tm?.isPaused
        ? "En pause"
        : tm
          ? "Arrêté — prêt à relancer"
          : "Durée réglée avant lancement";
  const chronoEtatLiveTexte = useMemo(() => {
    if (secondesAfficheGrand == null) return "00:00";
    const total = Math.max(0, Math.floor(secondesAfficheGrand));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}j ${String(h).padStart(2, "0")}h`;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondesAfficheGrand]);

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
          disabled={busy || inTestMode}
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
          disabled={busy || inTestMode}
          onClick={() => void postQuestionTimer({ action: "pause" })}
          style={chronoBtnOutline}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={busy || inTestMode}
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
        background:
          "radial-gradient(circle at top left, rgba(167, 139, 250, 0.18) 0%, rgba(241, 245, 249, 0) 28%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.14) 0%, rgba(241, 245, 249, 0) 24%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 34%, #eef2ff 100%)",
        ...shellFont,
      }}
    >
      <input
        ref={quickLandingPhotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadQuickLandingPhoto(f);
        }}
      />
      {loading && !eventData ? (
        <p style={{ padding: "1rem 1rem", color: "#6b7280" }}>Chargement...</p>
      ) : null}
      {error ? (
        <p style={{ padding: "1rem 1rem", color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <div
          style={{
            margin: "0 1rem 0.35rem",
            padding: "0.55rem 0.7rem",
            borderRadius: "10px",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#b91c1c",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.55rem",
          }}
          role="alert"
        >
          <span style={{ fontSize: "0.86rem", fontWeight: 700 }}>{actionError}</span>
          {String(actionError).includes("Aucune activation disponible pour cette formule") ||
          String(actionError).includes("Vous n’avez plus d’activation disponible") ? (
            <Link
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.34rem 0.65rem",
                borderRadius: "8px",
                border: "1px solid #fca5a5",
                background: "#fff",
                color: "#b91c1c",
                fontSize: "0.78rem",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Choisir une formule
            </Link>
          ) : null}
        </div>
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
      {editPollModalOpen && editingPoll ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10012,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setEditPollModalOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "30rem",
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
              Modifier la question
            </p>
            <p style={{ margin: "0.28rem 0 0 0", fontSize: "0.86rem", color: "#64748b" }}>
              Type : <strong style={{ color: "#111827" }}>{editingPoll.type}</strong>
            </p>
            <label
              style={{
                display: "block",
                marginTop: "0.7rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#475569",
              }}
            >
              Texte de la question
            </label>
            <textarea
              value={editQuestionText}
              onChange={(e) => setEditQuestionText(e.target.value)}
              disabled={busy}
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: "0.32rem",
                padding: "0.52rem 0.62rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
            {String(editingPoll?.type || "").toUpperCase() === "CONTEST_ENTRY" ? (
              <>
                <label
                  style={{
                    display: "block",
                    marginTop: "0.62rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Lot à gagner
                </label>
                <input
                  type="text"
                  value={editContestPrize}
                  onChange={(e) => setEditContestPrize(e.target.value)}
                  disabled={busy}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: "0.32rem",
                    padding: "0.5rem 0.6rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                  }}
                />
                <label
                  style={{
                    display: "block",
                    marginTop: "0.62rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  Nombre de gagnants
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={normalizeContestWinnerCount(editContestWinnerCount)}
                  onChange={(e) => setEditContestWinnerCount(e.target.value)}
                  onBlur={(e) =>
                    setEditContestWinnerCount(
                      normalizeContestWinnerCount(e.target.value),
                    )
                  }
                  disabled={busy}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: "0.32rem",
                    padding: "0.5rem 0.6rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                  }}
                />
              </>
            ) : null}
            <div
              style={{
                marginTop: "0.95rem",
                display: "flex",
                gap: "0.55rem",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditPollModalOpen(false)}
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
                disabled={busy}
                onClick={() => void submitPollEdit()}
                style={{
                  padding: "0.45rem 0.82rem",
                  borderRadius: "9px",
                  border: "1px solid #1d4ed8",
                  background: busy ? "#f1f5f9" : "#2563eb",
                  color: busy ? "#94a3b8" : "#fff",
                  fontWeight: 800,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {startRealPlanModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-real-plan-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10009,
            background: "rgba(15, 23, 42, 0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setStartRealPlanModalOpen(false);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "26rem",
              borderRadius: "16px",
              background: "#fff",
              border: "1px solid #ddd6fe",
              boxShadow: "0 24px 60px rgba(76, 29, 149, 0.22)",
              padding: "1.15rem 1.2rem",
            }}
          >
            <h3
              id="start-real-plan-title"
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 850,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              Choisissez une formule pour cet événement
            </h3>
            <p
              style={{
                margin: "0.5rem 0 1rem",
                fontSize: "0.86rem",
                color: "#64748b",
                lineHeight: 1.45,
              }}
            >
              Une activation sera consommée pour passer en mode réel.
            </p>
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {startRealPlanOptions.includes("FUN") ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startRealLive("FUN")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.2rem",
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "12px",
                    border: "1px solid #fcd34d",
                    background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
                    color: "#78350f",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    cursor: busy ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>FUN</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, opacity: 0.9 }}>
                    Jusqu’à 100 participants
                  </span>
                </button>
              ) : null}
              {startRealPlanOptions.includes("EVENT") ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startRealLive("EVENT")}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.2rem",
                    width: "100%",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "12px",
                    border: "1px solid #c4b5fd",
                    background: "linear-gradient(180deg, #faf5ff 0%, #ede9fe 100%)",
                    color: "#5b21b6",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    cursor: busy ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>EVENT</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, opacity: 0.9 }}>
                    Jusqu’à 500 participants
                  </span>
                </button>
              ) : null}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStartRealPlanModalOpen(false)}
              style={{
                marginTop: "0.85rem",
                padding: "0.45rem 0.65rem",
                border: "none",
                background: "transparent",
                color: "#64748b",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
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
            <p
              style={{
                margin: "0.55rem 0 0 0",
                fontSize: "0.9rem",
                color: "#4b5563",
              }}
            >
              Lot à gagner :{" "}
              <strong
                style={{
                  color: "#5b21b6",
                  fontWeight: 800,
                  overflowWrap: "anywhere",
                }}
              >
                {String(activePoll?.contestPrize || "").trim() || "Lot à gagner non précisé"}
              </strong>
            </p>
            <p style={{ margin: "0.55rem 0 0 0", fontSize: "0.88rem", color: "#4b5563" }}>
              Participants éligibles :{" "}
              <strong style={{ color: "#111827" }}>{contestEligibleCount}</strong>
            </p>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.88rem", color: "#4b5563" }}>
              Gagnants tirés :{" "}
              <strong style={{ color: "#111827" }}>
                {activeContestTotalWinners} / {activeContestWinnerQuota}
              </strong>
            </p>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Confirmez le tirage pour sélectionner le prochain gagnant.
            </p>
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
                disabled={busy || !activePoll?.id || contestQuotaReached}
                onClick={() => void postContestDraw(activePoll?.id || "")}
                style={{
                  padding: "0.45rem 0.8rem",
                  borderRadius: "9px",
                  border: "1px solid #7c3aed",
                  background: busy || contestQuotaReached
                    ? "#f1f5f9"
                    : "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: busy || contestQuotaReached ? "#94a3b8" : "#fff",
                  fontWeight: 800,
                  cursor: busy || contestQuotaReached ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Tirage..." : "Confirmer le tirage"}
              </button>
            </div>
            {contestQuotaReached ? (
              <p
                style={{
                  margin: "0.65rem 0 0 0",
                  fontSize: "0.78rem",
                  color: "#6b7280",
                }}
              >
                Tous les gagnants ont déjà été tirés.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && eventData && (
        <div
          style={
            desktop
              ? {
                  display: "grid",
                  gridTemplateColumns: leftSidebarCollapsed
                    ? "2.75rem minmax(360px, 1fr) minmax(220px, 264px)"
                    : "minmax(220px, 270px) minmax(360px, 1fr) minmax(220px, 264px)",
                  gap: "1.4rem",
                  padding: "1.35rem 1.6rem 1.7rem",
                  width: "100%",
                  alignItems: "stretch",
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
          {desktop && leftSidebarCollapsed ? (
            <div
              style={{
                position: "sticky",
                top: "0.7rem",
                alignSelf: "stretch",
                width: "2.75rem",
                minWidth: "2.75rem",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: "0.7rem 0.25rem",
                background: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(248,250,252,0.9) 100%)",
                border: PREMIUM_BORDER,
                borderRadius: "18px",
                boxShadow: PREMIUM_SHADOW_SOFT,
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={expandLeftSidebar}
                title="Afficher la colonne gauche (questions, liens)"
                aria-expanded={false}
                aria-label="Déplier la colonne gauche"
                style={{
                  padding: "0.55rem 0.3rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(167, 139, 250, 0.28)",
                  background: "linear-gradient(180deg, rgba(250,245,255,0.98) 0%, rgba(237,233,254,0.98) 100%)",
                  color: "#5b21b6",
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  letterSpacing: "0.08em",
                  lineHeight: 1.25,
                  minHeight: "6.5rem",
                }}
              >
                Déplier
              </button>
            </div>
          ) : desktop ? (
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
              onRequestCollapse={collapseLeftSidebar}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.75rem",
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
            ) : null}

            <section
              style={{
                ...CARD,
                padding: desktop ? "1.05rem 1.15rem" : "0.9rem 0.95rem",
                borderColor: "rgba(124, 58, 237, 0.22)",
                background:
                  "linear-gradient(135deg, #0f172a 0%, #1e1b4b 42%, #312e81 100%)",
                boxShadow: "0 22px 46px rgba(30, 27, 75, 0.24)",
                minWidth: 0,
              }}
              aria-label="État live"
            >
              <div style={{ display: "grid", gap: "0.78rem" }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: "0.55rem 0.85rem",
                  }}
                >
                  <div style={{ display: "grid", gap: "0.18rem", minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(224, 231, 255, 0.72)",
                      }}
                    >
                      Console live
                    </p>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: desktop ? "1.34rem" : "1.06rem",
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: "#ffffff",
                        lineHeight: 1.15,
                      }}
                      title={eventData.title}
                    >
                      {eventData.title}
                    </h2>
                  </div>
                  {inTestMode && !eventLocked ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "0.42rem 0.55rem",
                        flexShrink: 0,
                      }}
                    >
                      {!activationsLoaded ? (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "rgba(224, 231, 255, 0.65)",
                          }}
                        >
                          Chargement des activations…
                        </span>
                      ) : !canStartRealWithActivation ? (
                        <>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              color: "rgba(224, 231, 255, 0.72)",
                            }}
                          >
                            Aucune activation disponible
                          </span>
                          <Link
                            href="/pricing"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0.48rem 0.88rem",
                              borderRadius: "999px",
                              border: "1px solid rgba(251, 191, 36, 0.55)",
                              background:
                                "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)",
                              color: "#422006",
                              fontSize: "0.76rem",
                              fontWeight: 800,
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                              boxShadow: "0 10px 22px rgba(245, 158, 11, 0.28)",
                            }}
                          >
                            Choisir une formule
                          </Link>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={startRealDisabled}
                          onClick={handleStartRealClick}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.5rem 0.95rem",
                            borderRadius: "999px",
                            border: "1px solid #86efac",
                            background:
                              "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
                            color: "#ffffff",
                            fontSize: "0.76rem",
                            fontWeight: 800,
                            letterSpacing: "0.01em",
                            cursor: startRealDisabled ? "not-allowed" : "pointer",
                            opacity: startRealDisabled ? 0.55 : 1,
                            whiteSpace: "nowrap",
                            boxShadow: "0 12px 26px rgba(34, 197, 94, 0.32)",
                          }}
                        >
                          Passer en live réel
                        </button>
                      )}
                      {activationsLoaded ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: "0.12rem",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "rgba(224, 231, 255, 0.65)",
                          }}
                        >
                          <span>
                            FUN disponible : {funAvailable ?? 0}
                          </span>
                          <span>
                            EVENT disponible : {eventAvailable ?? 0}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.42rem 0.5rem",
                  }}
                >
                  {[
                    { label: pilotageTag, color: statePanel.pillColor, bg: "rgba(255,255,255,0.74)", border: `${statePanel.accent}22` },
                    { label: voteLabel, color: voteIsOpen ? "#166534" : "#334155", bg: voteIsOpen ? "#dcfce7" : "rgba(255,255,255,0.74)", border: voteIsOpen ? "#86efac" : "#cbd5e1" },
                    { label: participantsCounterLabel, color: participantsCounterStyle.valueColor, bg: participantsCounterStyle.background, border: participantsCounterStyle.borderColor || "#cbd5e1" },
                    { label: socketStatusLabel, color: socketStatusColor, bg: socketStatusBg, border: "#cbd5e1" },
                    { label: modeBadge.label, color: modeBadge.color, bg: modeBadge.bg, border: modeBadge.border },
                    ...(!inTestMode && eventPlanType
                      ? [
                          {
                            label: `Formule ${eventPlanType}`,
                            color: eventPlanType === "FUN" ? "#92400e" : "#5b21b6",
                            bg: eventPlanType === "FUN" ? "#fef3c7" : "#ede9fe",
                            border: eventPlanType === "FUN" ? "#fcd34d" : "#c4b5fd",
                          },
                          {
                            label: `Limite ${Number(eventData?.participantsLimit || 500)} participants`,
                            color: "#334155",
                            bg: "rgba(255,255,255,0.74)",
                            border: "#cbd5e1",
                          },
                        ]
                      : []),
                  ].map((item) => (
                    <span
                      key={item.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "999px",
                        padding: "0.22rem 0.58rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        background: item.bg,
                        color: item.color,
                        border: `1px solid ${item.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                  ))}
                  {hasDisplayGap ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "999px",
                        padding: "0.22rem 0.58rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        border: "1px solid rgba(251, 191, 36, 0.24)",
                        background: "rgba(255, 247, 237, 0.9)",
                        color: "#9a3412",
                      }}
                    >
                      Écart global / écran B
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.85rem 1rem",
                  }}
                >
                  <div
                    style={{
                      flex: "1 1 420px",
                      minWidth: 0,
                      display: "grid",
                      gap: "0.22rem",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        color: "rgba(224, 231, 255, 0.78)",
                      }}
                    >
                      {stateLabel} · {questionProgressSummary}
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: desktop ? "1.42rem" : "1.08rem",
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: "#ffffff",
                        lineHeight: 1.18,
                      }}
                    >
                      {activeQuestionTitle}
                    </h3>
                    <p
                      style={{
                        margin: "0.1rem 0 0 0",
                        fontSize: compactTopPanel ? "0.82rem" : "0.88rem",
                        color: "rgba(226, 232, 240, 0.86)",
                        lineHeight: 1.45,
                      }}
                    >
                      À l’écran : <strong style={{ color: "#ffffff" }}>{displayLabelGlobal}</strong>
                      {" · "}
                      {screenBConnected ? `Écran B : ${displayLabelScreenB}` : "Écran B non connecté"}
                    </p>
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      minWidth: desktop ? "124px" : "100%",
                      display: "grid",
                      gap: "0.16rem",
                      justifyItems: desktop ? "end" : "start",
                      textAlign: desktop ? "right" : "left",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(224, 231, 255, 0.62)",
                      }}
                    >
                      Chrono scène
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: desktop ? "1.85rem" : "1.28rem",
                        fontWeight: 800,
                        lineHeight: 1.02,
                        color: "#f5f3ff",
                        fontFamily: "ui-monospace, monospace",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {chronoEtatLiveTexte}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(224, 231, 255, 0.72)" }}>
                      {tm?.running && !tm?.isPaused
                        ? "en cours"
                        : tm?.isPaused
                          ? "en pause"
                          : "prêt"}
                    </p>
                    <button
                      type="button"
                      onClick={scrollToChronoPanel}
                      style={{
                        ...btnGhost,
                        marginTop: "0.12rem",
                        width: "fit-content",
                        padding: "0.24rem 0.56rem",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        borderColor: "rgba(196, 181, 253, 0.35)",
                        background: "rgba(255,255,255,0.08)",
                        color: "#ede9fe",
                      }}
                    >
                      Chrono
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div
              style={{
                display: "flex",
                flexDirection:
                  desktop && previewJoinOpen
                    ? desktopSplitWide
                      ? "row"
                      : "column"
                    : "column",
                gap: "1.15rem",
                alignItems: "stretch",
                minWidth: 0,
                ...liveExperienceShellStyle,
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
                  gap: "1rem",
                }}
              >
            <div
              style={{
                display: "grid",
                gap: compactTopPanel ? "0.9rem" : "1rem",
                minWidth: 0,
              }}
            >
              <section
                style={{
                  padding: compactTopPanel ? "0.1rem 0 0 0" : "0.18rem 0 0 0",
                  border: "none",
                  borderRadius: 0,
                  background: "transparent",
                  minWidth: 0,
                  boxShadow: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "0.45rem 0.85rem",
                  }}
                >
                  <div style={{ display: "grid", gap: "0.18rem" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      Actions principales
                    </p>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: desktop ? "1.08rem" : "0.98rem",
                        fontWeight: 800,
                        color: "#111827",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Contrôle de la salle
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                    Les commandes essentielles pendant le live.
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "0.95rem",
                    display: "grid",
                    gridTemplateColumns: desktop ? "repeat(3, minmax(0, 1fr))" : "1fr",
                    gap: desktop ? "0.85rem" : "0.75rem",
                    alignItems: "stretch",
                    minWidth: 0,
                  }}
                >
                  <div style={liveFunctionCardStyle}>
                    <div style={{ display: "grid", gap: "0.28rem" }}>
                      <p style={liveFunctionCardTitleStyle}>Vote</p>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", lineHeight: 1.35 }}>
                        Participation live
                      </p>
                    </div>
                    <div style={{ display: "grid", gap: "0.55rem", flex: 1 }}>
                            <button
                              type="button"
                              disabled={!activePollIdJs || !canToggleVote || voteIsOpen}
                              onClick={async () => {
                                if (!activePollIdJs) return;
                                await postAction(`/polls/${activePollIdJs}/open`, "Vote ouvert");
                              }}
                              style={{
                                ...btnGhost,
                                minHeight: "3rem",
                                width: "100%",
                                padding: "0.72rem 0.9rem",
                                borderColor: "#22c55e",
                                background: voteIsOpen ? "#f8fafc" : "linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)",
                                color: voteIsOpen ? "#94a3b8" : "#166534",
                                fontWeight: 800,
                                fontSize: "0.86rem",
                                boxShadow: voteIsOpen ? "none" : "0 14px 24px rgba(34, 197, 94, 0.12)",
                              }}
                            >
                              Ouvrir le vote
                            </button>
                            <button
                              type="button"
                              disabled={!activePollIdJs || !canToggleVote || !voteIsOpen}
                              onClick={async () => {
                                if (!activePollIdJs) return;
                                await postAction(`/polls/${activePollIdJs}/close`, "Vote ferme");
                              }}
                              style={{
                                ...btnGhost,
                                minHeight: "3rem",
                                width: "100%",
                                padding: "0.72rem 0.9rem",
                                borderColor: "#fca5a5",
                                background: voteIsOpen ? "#fff5f5" : "#f8fafc",
                                color: voteIsOpen ? "#b91c1c" : "#94a3b8",
                                fontWeight: 800,
                                fontSize: "0.86rem",
                                boxShadow: voteIsOpen ? "0 12px 22px rgba(239, 68, 68, 0.08)" : "none",
                              }}
                            >
                              Fermer le vote
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b", lineHeight: 1.35 }}>
                            État actuel : <strong style={{ color: "#111827" }}>{voteLabel}</strong>
                          </p>
                    <RegieAutoRevealCard
                      embedded
                      embeddedDividerAbove={false}
                      eventId={eventId}
                      autoReveal={Boolean(eventData?.autoReveal)}
                      autoRevealDelaySec={eventData?.autoRevealDelaySec ?? 5}
                      onSaved={() => fetchEvent({ silent: true })}
                    />
                  </div>

                  <div style={liveFunctionCardStyle}>
                    <div style={{ display: "grid", gap: "0.28rem" }}>
                      <p style={liveFunctionCardTitleStyle}>Progression</p>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", lineHeight: 1.35 }}>
                        Avancement du live
                      </p>
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem", flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: "#111827" }}>
                        {questionProgressSummary}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.76rem",
                          color: "#475569",
                          lineHeight: 1.35,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {activeQuestionTitle}
                      </p>
                    </div>
                    <div style={{ display: "grid", gap: "0.5rem", marginTop: "auto" }}>
                      <button
                        type="button"
                        disabled={!canGoNext}
                        onClick={() =>
                          void postAction(`/events/${eventId}/next-poll`, "Question suivante diffusee")
                        }
                        style={{
                          ...btnDanger(!canGoNext),
                          width: "100%",
                          minHeight: "2.95rem",
                          padding: "0.65rem 0.85rem",
                          fontSize: "0.84rem",
                          border: "1px solid #8b5cf6",
                          background: canGoNext
                            ? "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)"
                            : "#ede9fe",
                          color: canGoNext ? "#fff" : "#6d28d9",
                          fontWeight: 800,
                          boxShadow: canGoNext ? "0 14px 24px rgba(124, 58, 237, 0.16)" : "none",
                        }}
                      >
                        Question suivante
                      </button>
                      <button
                        type="button"
                        disabled={busy || eventFinished}
                        onClick={async () => {
                          if (typeof window === "undefined") return;
                          const ok = window.confirm(
                            "Terminer l’événement maintenant ? Cette action clôture l’événement.",
                          );
                          if (!ok) return;
                          const confirmWord = window.prompt(
                            "Confirmation de sécurité : tapez TERMINER pour confirmer.",
                            "",
                          );
                          if (String(confirmWord || "").trim().toUpperCase() !== "TERMINER") return;
                          await postAction(`/events/${eventId}/finish`, "Evenement termine");
                        }}
                        style={{
                          ...btnFinish(busy || eventFinished),
                          width: "100%",
                          minHeight: "2.35rem",
                          padding: "0.45rem 0.75rem",
                          fontSize: "0.76rem",
                          border: "1px solid #fda4af",
                          background: busy || eventFinished ? "#fff1f2" : "#fffafb",
                          color: busy || eventFinished ? "#9f1239" : "#be123c",
                        }}
                      >
                        Terminer
                      </button>
                    </div>
                  </div>

                  <div
                    id="regie-chrono-panel"
                    style={{
                      ...liveFunctionCardStyle,
                      background:
                        "linear-gradient(180deg, rgba(250,245,255,0.72) 0%, rgba(255,255,255,0.97) 100%)",
                      borderColor: "rgba(196, 181, 253, 0.22)",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.28rem" }}>
                      <p style={liveFunctionCardTitleStyle}>Chrono</p>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", lineHeight: 1.35 }}>
                        Rythme du live
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>{chronoProjectionInner}</div>
                  </div>
                </div>

              </section>

              {desktop && liveAnswersOpen ? (
                <section
                  style={{
                    ...CARD,
                    border: "1px solid #dbeafe",
                    background: "#f8fbff",
                    padding: "0.7rem 0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      marginBottom: "0.55rem",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
                      Réponses en direct
                    </p>
                    <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>
                      Mise à jour live
                    </span>
                  </div>
                  {liveResponsesOptions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                      Aucune réponse à afficher pour le moment.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: "0.4rem" }}>
                      {liveResponsesOptions.map((opt) => (
                        <div key={opt.id} style={{ display: "grid", gap: "0.2rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span style={{ flex: 1, fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>
                              {opt.label}
                            </span>
                            <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#334155" }}>
                              {opt.voteCount} · {Number(opt.pct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
                            </span>
                          </div>
                          <div style={{ height: "7px", borderRadius: "999px", background: "#dbeafe", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.max(0, Math.min(100, opt.pct))}%`,
                                height: "100%",
                                borderRadius: "999px",
                                background: "#2563eb",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {isScreenBlack ? (
                <div
                  style={{
                    border: "1px solid #334155",
                    background: "#111827",
                    borderRadius: "12px",
                    padding: "0.6rem 0.7rem",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.55rem",
                  }}
                >
                  <span style={{ color: "#e2e8f0", fontSize: "0.8rem", fontWeight: 800 }}>
                    Écran noir actif
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      sendScreenAction("WAITING", null);
                      setToastNotif("Sortie de l’écran noir");
                      window.setTimeout(() => setToastNotif(null), 2200);
                    }}
                    style={{
                      ...btnGhost,
                      minHeight: "2.1rem",
                      padding: "0.38rem 0.7rem",
                      borderColor: "#93c5fd",
                      background: "#eff6ff",
                      color: "#1e3a8a",
                      fontWeight: 800,
                      fontSize: "0.76rem",
                    }}
                  >
                    Quitter l’écran noir
                  </button>
                </div>
              ) : null}

              {desktop && previewJoinOpen && eventData.slug ? (
                <div
                  style={{
                    marginTop: "0.35rem",
                    paddingTop: "1rem",
                    borderTop: liveBandDivider,
                  }}
                >
                  <RegiePublicPreviewPanel
                    key={eventData.slug}
                    slug={eventData.slug}
                    eventId={eventId}
                    newLeadCount={newLeadCount}
                    layout="below"
                    fused
                    onHide={() => persistPreviewJoinOpen(false)}
                  />
                </div>
              ) : null}
            </div>

            {!desktop && liveAnswersOpen ? (
              <>
                <div
                  onClick={() => setLiveAnswersOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,23,42,0.35)",
                    zIndex: 1400,
                  }}
                />
                <aside
                  style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    maxHeight: "56vh",
                    overflowY: "auto",
                    background: "#fff",
                    borderTopLeftRadius: "14px",
                    borderTopRightRadius: "14px",
                    border: "1px solid #dbeafe",
                    boxShadow: "0 -8px 28px rgba(15,23,42,0.2)",
                    padding: "0.85rem 0.85rem 1rem",
                    zIndex: 1450,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.55rem" }}>
                    <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 800, color: "#0f172a" }}>
                      Réponses en direct
                    </p>
                    <button
                      type="button"
                      onClick={() => setLiveAnswersOpen(false)}
                      style={{
                        ...btnGhost,
                        minHeight: "34px",
                        padding: "0.28rem 0.58rem",
                        fontSize: "0.74rem",
                      }}
                    >
                      Fermer
                    </button>
                  </div>
                  {liveResponsesOptions.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                      Aucune réponse à afficher pour le moment.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: "0.45rem" }}>
                      {liveResponsesOptions.map((opt) => (
                        <div key={`mobile-${opt.id}`} style={{ display: "grid", gap: "0.22rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ flex: 1, fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>
                              {opt.label}
                            </span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#334155" }}>
                              {opt.voteCount} · {Number(opt.pct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
                            </span>
                          </div>
                          <div style={{ height: "7px", borderRadius: "999px", background: "#dbeafe", overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, opt.pct))}%`, height: "100%", borderRadius: "999px", background: "#2563eb" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </aside>
              </>
            ) : null}

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
                Lot à gagner :{" "}
                <span
                  style={{
                    color: "#5b21b6",
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                  }}
                >
                  {String(activePoll?.contestPrize || "").trim() || "Lot à gagner non précisé"}
                </span>
              </p>
              <p
                style={{
                  margin: "0.35rem 0 0 0",
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
                  fontSize: "0.86rem",
                  color: "#374151",
                  fontWeight: 700,
                }}
              >
                Gagnants tirés : {activeContestTotalWinners} / {activeContestWinnerQuota}
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
                  !!contestEligibleError ||
                  contestQuotaReached
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
                    !!contestEligibleError ||
                    contestQuotaReached
                      ? "#f8fafc"
                      : "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
                  color:
                    busy ||
                    contestEligibleLoading ||
                    contestEligibleCount <= 0 ||
                    !!contestEligibleError ||
                    contestQuotaReached
                      ? "#94a3b8"
                      : "#fff",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor:
                    busy ||
                    contestEligibleLoading ||
                    contestEligibleCount <= 0 ||
                    !!contestEligibleError ||
                    contestQuotaReached
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Tirer un gagnant
              </button>
              {contestQuotaReached ? (
                <p
                  style={{
                    margin: "0.45rem 0 0 0",
                    fontSize: "0.78rem",
                    color: "#6b7280",
                  }}
                >
                  Tous les gagnants ont déjà été tirés.
                </p>
              ) : null}
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
              <div
                style={{
                  marginTop: "0.7rem",
                  paddingTop: "0.65rem",
                  borderTop: "1px dashed #ddd6fe",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#374151",
                  }}
                >
                  Gagnants déjà tirés
                </p>
                {contestWinnersLoading ? (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                    Chargement...
                  </p>
                ) : contestWinners.length < 1 ? (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                    Aucun gagnant tiré pour le moment.
                  </p>
                ) : (
                  <ol
                    style={{
                      margin: "0.45rem 0 0 0",
                      paddingLeft: "1.1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    {contestWinners.map((winner, idx) => (
                      <li
                        key={`${winner.id || winner.drawId}-${idx}`}
                        style={{
                          fontSize: "0.8rem",
                          color: "#374151",
                          lineHeight: 1.35,
                        }}
                      >
                        {formatWinnerName(winner)} — {maskPhone(winner.phone)}
                        {maskEmail(winner.email) ? ` · ${maskEmail(winner.email)}` : ""}
                      </li>
                    ))}
                  </ol>
                )}
                {contestWinnersError ? (
                  <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.74rem", color: "#6b7280" }}>
                    Liste des gagnants temporairement indisponible.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {eventData.slug ? (
            <BlocProjectionEcran
              slug={eventData.slug}
              activePollId={eventData.activePollId ?? null}
              liveState={liveState}
              displayState={projectionDisplayStateUi}
              busy={busy}
              postAction={postAction}
              sendScreenAction={sendScreenAction}
              screenCount={screenCount}
              screenBConnected={screenBConnected}
              screenBDisplayState={screenBDisplayState}
              desktop={desktop}
              chronoSection={null}
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
                  onQuickLandingPhoto={() => quickLandingPhotoInputRef.current?.click()}
                  landingPhotoUploading={landingPhotoUploading}
                  landingPhotoUploadLabel={landingPhotoUploadLabel}
                  landingPhotosCount={landingPhotosCount}
                  landingEnabled={Boolean(eventData?.landingEnabled)}
                  eventId={eventId}
                  onOverlayCopied={() => {
                    setToastNotif("Lien overlay copié");
                    window.setTimeout(() => setToastNotif(null), 3200);
                  }}
                />
              </div>
            </details>
          ) : null}
              </div>
            </div>
          </div>
          {desktop && eventData.slug ? (
            <div id="regie-overlay-panel">
              <SidebarPartageDroit
                slug={eventData.slug}
                liveState={liveState}
                stateLabel={stateLabel}
                sceneBadge={sceneBadge}
                onQuickLandingPhoto={() => quickLandingPhotoInputRef.current?.click()}
                landingPhotoUploading={landingPhotoUploading}
                landingPhotoUploadLabel={landingPhotoUploadLabel}
                landingPhotosCount={landingPhotosCount}
                landingEnabled={Boolean(eventData?.landingEnabled)}
                eventId={eventId}
                onOverlayCopied={() => {
                  setToastNotif("Lien overlay copié");
                  window.setTimeout(() => setToastNotif(null), 3200);
                }}
              />
            </div>
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
