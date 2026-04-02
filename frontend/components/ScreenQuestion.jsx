"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatCountdownVerbose } from "@/lib/chronoFormat";

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

const PILL_VOTE = {
  label: "Vote en cours",
  bg: "rgba(34, 197, 94, 0.22)",
  color: "#86efac",
  border: "1px solid rgba(34, 197, 94, 0.5)",
};

/**
 * Bloc QR responsive : occupe l’espace restant sans faire défiler la page.
 * @param {{ slug: string }} props
 */
function BlocQrVote({ slug }) {
  const zoneRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [cotePx, setCotePx] = useState(200);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    setJoinUrl(
      `${window.location.origin}/join/${encodeURIComponent(slug)}`,
    );
  }, [slug]);

  useLayoutEffect(() => {
    const el = zoneRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const maj = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      /* place pour la légende + interstice (le mesureur voit toute la zone flex) */
      const reserveLegende = 128;
      const padCarte =
        2 * Math.max(10, Math.min(22, Math.round(Math.min(w, h) * 0.035)));
      const brut = Math.min(
        w * 0.985 - padCarte,
        Math.max(0, h - reserveLegende - padCarte),
      );
      const avecMarge = Math.floor(Math.max(0, brut) * 0.99);
      setCotePx(Math.max(160, Math.min(avecMarge, 1024)));
    };
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!joinUrl) return null;

  return (
    <div
      ref={zoneRef}
      style={{
        flex: "1 1 0",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(0.7rem, 2.2vw, 1.35rem)",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          padding: "clamp(0.4rem, 1.15vw, 0.75rem)",
          borderRadius: "clamp(16px, 3vw, 24px)",
          background: "#ffffff",
          boxShadow:
            "0 20px 56px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(15, 23, 42, 0.06)",
          lineHeight: 0,
        }}
      >
        <QRCodeSVG
          value={joinUrl}
          size={cotePx}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "clamp(1.55rem, 5.2vw, 3.35rem)",
          fontWeight: 800,
          color: "#f1f5f9",
          letterSpacing: "0.03em",
          textAlign: "center",
          flexShrink: 0,
          textWrap: "balance",
        }}
      >
        Scannez pour voter
      </p>
    </div>
  );
}

/**
 * Écran projection : phase vote (question + chrono + QR, sans liste des réponses).
 * @param {{
 *   shell: Record<string, unknown>;
 *   poll: Record<string, unknown>;
 *   chronometreApi: Record<string, unknown> | null | undefined;
 *   chronoTick: number;
 *   voteOuvert: boolean;
 *   joinSlug: string | null | undefined;
 * }} props
 */
export function ScreenQuestion({
  shell,
  poll,
  chronometreApi,
  chronoTick,
  voteOuvert,
  joinSlug,
}) {
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
    "Sondage";

  const slugQr =
    typeof joinSlug === "string" && joinSlug.length > 0 ? joinSlug : null;

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
        alignItems: "center",
        textAlign: "center",
        boxSizing: "border-box",
        padding:
          "clamp(0.65rem, 2.2vw, 1.35rem) clamp(0.85rem, 3vw, 1.75rem)",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          maxWidth: "min(1100px, 100%)",
          marginLeft: "auto",
          marginRight: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "clamp(0.7rem, 1.4vw, 0.82rem)",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "0.4rem 0.9rem",
            borderRadius: "9999px",
            marginBottom: "clamp(0.55rem, 1.8vw, 1rem)",
            background: PILL_VOTE.bg,
            color: PILL_VOTE.color,
            border: PILL_VOTE.border,
          }}
        >
          {PILL_VOTE.label}
        </span>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.65rem, 6vw, 4.25rem)",
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: "-0.035em",
            color: "#f8fafc",
            maxWidth: "20ch",
          }}
        >
          {questionAffichee}
        </h1>
      </div>

      {voteOuvert ? (
        chronometreApi ? (
          <div
            style={{
              marginTop: "clamp(0.85rem, 2.5vw, 1.65rem)",
              marginBottom: "clamp(0.55rem, 1.8vw, 1rem)",
              padding:
                "clamp(1rem, 2.6vw, 1.65rem) clamp(1.5rem, 4.5vw, 3rem)",
              borderRadius: "28px",
              background:
                "linear-gradient(165deg, rgba(49, 46, 129, 0.9) 0%, rgba(15, 23, 42, 0.94) 100%)",
              border: "4px solid rgba(129, 140, 248, 0.7)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.07) inset, 0 16px 48px rgba(79, 70, 229, 0.42)",
              minWidth: "min(580px, 100%)",
              maxWidth: "min(100%, 780px)",
              marginLeft: "auto",
              marginRight: "auto",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "clamp(0.85rem, 1.8vw, 1.05rem)",
                color: "#c7d2fe",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {chronometreApi.isPaused ? "Chrono en pause" : "Temps restant"}
            </p>
            <p
              style={{
                margin: "clamp(0.45rem, 1.2vw, 0.85rem) 0 0 0",
                fontSize: affichageChrono.chronoLong
                  ? "clamp(1.75rem, 7vw, 4rem)"
                  : "clamp(3.5rem, 15vw, 8.25rem)",
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                color:
                  secondesChronoVote !== null && secondesChronoVote <= 10
                    ? "#fb7185"
                    : "#eef2ff",
                textShadow: "0 4px 32px rgba(99, 102, 241, 0.5)",
                wordBreak: "break-word",
                maxWidth: "min(95vw, 52rem)",
              }}
            >
              {affichageChrono.text}
            </p>
          </div>
        ) : (
          <p
            style={{
              marginTop: "clamp(0.75rem, 2vw, 1.25rem)",
              marginBottom: "clamp(0.35rem, 1vw, 0.65rem)",
              fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
              color: "#64748b",
              fontStyle: "italic",
              flexShrink: 0,
            }}
          >
            En attente du chrono (régie)
          </p>
        )
      ) : (
        <p
          style={{
            marginTop: "clamp(0.75rem, 2.2vw, 1.35rem)",
            marginBottom: "clamp(0.35rem, 1vw, 0.65rem)",
            fontSize: "clamp(0.95rem, 2.2vw, 1.25rem)",
            color: "#94a3b8",
            fontWeight: 600,
            flexShrink: 0,
            maxWidth: "36ch",
          }}
        >
          Le vote va bientôt s’ouvrir — scannez le QR pour être prêt.
        </p>
      )}

      {slugQr ? <BlocQrVote slug={slugQr} /> : null}
    </main>
  );
}
