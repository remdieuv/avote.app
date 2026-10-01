"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatCountdownVerbose } from "@/lib/chronoFormat";
import {
  SCREEN_QR_CTA_VOTE,
  countScreenVotesReceived,
  formatScreenQuestionProgressLabel,
  screenOptionLetter,
  sortScreenOptions,
} from "@/lib/diffusionUx";
import { useEventMode } from "@/lib/useEventMode";

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
 * QR secondaire (retardataires) — compact, ne rivalise pas avec question/réponses.
 * @param {{ slug: string }} props
 */
function BlocQrSecondaire({ slug }) {
  const [joinUrl, setJoinUrl] = useState("");
  const [cotePx, setCotePx] = useState(112);

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    setJoinUrl(
      `${window.location.origin}/join/${encodeURIComponent(slug)}`,
    );
  }, [slug]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const forced = Math.round(
        Math.min(window.innerWidth * 0.14, window.innerHeight * 0.18),
      );
      setCotePx(Math.max(88, Math.min(forced, 160)));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  if (!joinUrl) return null;

  return (
    <aside
      aria-label="Rejoindre pour voter"
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.55rem 0.65rem",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.97)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
      }}
    >
      <QRCodeSVG
        value={joinUrl}
        size={cotePx}
        level="M"
        marginSize={1}
        bgColor="#ffffff"
        fgColor="#0f172a"
      />
      <p
        style={{
          margin: 0,
          fontSize: "clamp(0.72rem, 1.35vw, 0.92rem)",
          fontWeight: 800,
          color: "#334155",
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        {SCREEN_QR_CTA_VOTE}
      </p>
    </aside>
  );
}

/**
 * Écran projection : VOTING (question + options + chrono + votes + QR secondaire)
 * ou CLOSED (même composition sans résultats, bandeau VOTE TERMINÉ).
 *
 * @param {{
 *   shell: Record<string, unknown>;
 *   poll: Record<string, unknown>;
 *   chronometreApi: Record<string, unknown> | null | undefined;
 *   chronoTick: number;
 *   voteOuvert: boolean;
 *   joinSlug: string | null | undefined;
 *   questionProgress?: { current: number; total: number } | null;
 *   qrScale?: number;
 *   compactQuestionText?: boolean;
 *   fullScreenQr?: boolean;
 *   compactChrono?: boolean;
 * }} props
 */
export function ScreenQuestion({
  shell,
  poll,
  chronometreApi,
  chronoTick,
  voteOuvert,
  joinSlug,
  questionProgress = null,
  qrScale = 1,
  compactQuestionText = false,
  fullScreenQr = false,
  compactChrono = false,
}) {
  const eventMode = useEventMode(poll);
  void qrScale;
  void fullScreenQr;

  const secondesChronoVote = useMemo(() => {
    void chronoTick;
    return chronoRestantSecondes(chronometreApi ?? null);
  }, [chronometreApi, chronoTick]);

  const affichageChrono = useMemo(() => {
    if (secondesChronoVote === null) {
      return { text: "—", chronoLong: false };
    }
    const text = formatCountdownVerbose(secondesChronoVote);
    return { text, chronoLong: text.includes(" j ") };
  }, [secondesChronoVote]);

  const questionAffichee =
    (typeof poll?.question === "string" && poll.question) ||
    (typeof poll?.title === "string" && poll.title) ||
    (String(poll?.type || "").toUpperCase() === "QUIZ" ? "Quiz" : "Question");

  const slugQr =
    typeof joinSlug === "string" && joinSlug.length > 0 ? joinSlug : null;

  const options = useMemo(
    () => sortScreenOptions(poll?.options),
    [poll?.options],
  );

  const votesInfo = useMemo(() => countScreenVotesReceived(poll), [poll]);

  const progressLabel = formatScreenQuestionProgressLabel(
    questionProgress,
    voteOuvert ? "voting" : "closed",
  );

  const optCount = options.length;
  const gridCols =
    optCount <= 2
      ? "repeat(2, minmax(0, 1fr))"
      : optCount === 3
        ? "repeat(3, minmax(0, 1fr))"
        : "repeat(2, minmax(0, 1fr))";

  const chronoUrgent =
    secondesChronoVote !== null && secondesChronoVote <= 10;

  return (
    <main
      style={{
        ...shell,
        height: "100dvh",
        minHeight: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "center",
        boxSizing: "border-box",
        padding:
          "clamp(0.75rem, 2.2vw, 1.5rem) clamp(0.9rem, 3vw, 1.85rem)",
        gap: "clamp(0.55rem, 1.6vw, 1rem)",
      }}
    >
      {eventMode.isTestMode ? (
        <div
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2147483647,
            pointerEvents: "none",
            background: "rgba(0,0,0,0.55)",
            color: "#f8fafc",
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: 9999,
            padding: "0.35rem 0.8rem",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: "0.78rem",
          }}
          aria-hidden
        >
          MODE TEST
        </div>
      ) : null}

      <header
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(0.35rem, 1vw, 0.65rem)",
        }}
      >
        {progressLabel ? (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.95rem, 2.4vw, 1.45rem)",
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: voteOuvert ? "#86efac" : "#cbd5e1",
            }}
          >
            {progressLabel}
          </p>
        ) : null}

        {!voteOuvert ? (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 4.2vw, 2.75rem)",
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#f8fafc",
            }}
          >
            VOTE TERMINÉ
          </p>
        ) : null}

        <h1
          style={{
            margin: 0,
            fontSize: compactQuestionText
              ? "clamp(1.35rem, 4.2vw, 2.6rem)"
              : "clamp(1.75rem, 5.5vw, 3.85rem)",
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            color: "#f8fafc",
            maxWidth: "28ch",
            textWrap: "balance",
          }}
        >
          {questionAffichee}
        </h1>
      </header>

      {voteOuvert && chronometreApi ? (
        <div
          style={{
            flexShrink: 0,
            alignSelf: "center",
            padding: compactChrono
              ? "clamp(0.35rem, 1vw, 0.55rem) clamp(0.75rem, 2vw, 1.2rem)"
              : "clamp(0.55rem, 1.4vw, 0.85rem) clamp(1.1rem, 3vw, 2rem)",
            borderRadius: "16px",
            background: chronoUrgent
              ? "rgba(127, 29, 29, 0.55)"
              : "rgba(15, 23, 42, 0.72)",
            border: chronoUrgent
              ? "2px solid rgba(251, 113, 133, 0.75)"
              : "2px solid rgba(148, 163, 184, 0.35)",
            minWidth: "min(280px, 90%)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "clamp(0.7rem, 1.3vw, 0.85rem)",
              color: chronoUrgent ? "#fecdd3" : "#94a3b8",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {chronometreApi.isPaused ? "Chrono en pause" : "Temps restant"}
          </p>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: compactChrono
                ? affichageChrono.chronoLong
                  ? "clamp(1.2rem, 4vw, 2.2rem)"
                  : "clamp(1.8rem, 6.5vw, 3.6rem)"
                : affichageChrono.chronoLong
                  ? "clamp(1.5rem, 5.5vw, 3.2rem)"
                  : "clamp(2.6rem, 10vw, 5.5rem)",
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              color: chronoUrgent ? "#fb7185" : "#f1f5f9",
            }}
          >
            {affichageChrono.text}
          </p>
        </div>
      ) : null}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          flex: "1 1 0",
          minHeight: 0,
          width: "100%",
          maxWidth: "min(1200px, 100%)",
          alignSelf: "center",
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "clamp(0.55rem, 1.5vw, 1rem)",
          alignContent: optCount <= 4 ? "center" : "start",
          overflow: "auto",
        }}
      >
        {options.map((opt, idx) => {
          const letter = screenOptionLetter(idx);
          const label =
            (typeof opt?.label === "string" && opt.label) || `Option ${letter}`;
          return (
            <li
              key={String(opt.id ?? idx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.65rem, 1.8vw, 1.15rem)",
                textAlign: "left",
                padding:
                  "clamp(0.75rem, 2vw, 1.25rem) clamp(0.85rem, 2.2vw, 1.35rem)",
                borderRadius: "16px",
                background: "rgba(30, 41, 59, 0.72)",
                border: "2px solid rgba(148, 163, 184, 0.28)",
                minHeight: "clamp(4.2rem, 10vh, 6.5rem)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: "clamp(2.4rem, 5vw, 3.4rem)",
                  height: "clamp(2.4rem, 5vw, 3.4rem)",
                  borderRadius: "12px",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  fontSize: "clamp(1.25rem, 3vw, 1.85rem)",
                  color: "#0f172a",
                  background: voteOuvert ? "#86efac" : "#cbd5e1",
                }}
              >
                {letter}
              </span>
              <span
                style={{
                  fontSize: "clamp(1.15rem, 3.2vw, 2.15rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: "#f8fafc",
                  textWrap: "balance",
                }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <footer
        style={{
          flexShrink: 0,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: slugQr && voteOuvert ? "space-between" : "center",
          gap: "clamp(0.65rem, 2vw, 1.25rem)",
          width: "100%",
          maxWidth: "min(1200px, 100%)",
          alignSelf: "center",
        }}
      >
        {voteOuvert ? (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1.1rem, 2.8vw, 1.85rem)",
              fontWeight: 800,
              color: "#e2e8f0",
              letterSpacing: "-0.01em",
            }}
          >
            {votesInfo.label}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1rem, 2.4vw, 1.45rem)",
              fontWeight: 700,
              color: "#94a3b8",
            }}
          >
            Les résultats arrivent bientôt
          </p>
        )}

        {slugQr && voteOuvert ? <BlocQrSecondaire slug={slugQr} /> : null}
      </footer>
    </main>
  );
}
