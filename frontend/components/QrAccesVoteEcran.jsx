"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * QR + lien vers l’accueil public participant (/join/[slug]) depuis la projection salle.
 * @param {{ slug: string; compact?: boolean }} props
 */
export function QrAccesVoteEcran({ slug, compact = false }) {
  const [joinUrl, setJoinUrl] = useState("");
  const [qrSize, setQrSize] = useState(128);

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    setJoinUrl(
      `${window.location.origin}/join/${encodeURIComponent(slug)}`,
    );
    const factor = compact ? 0.84 : 1;
    const minS = compact ? 96 : 112;
    const maxS = compact ? 142 : 160;
    setQrSize(
      Math.min(
        maxS,
        Math.max(minS, Math.round(window.innerWidth * 0.14 * factor)),
      ),
    );
  }, [slug, compact]);

  if (!joinUrl) return null;

  return (
    <aside
      aria-label="Rejoindre l’événement sur mobile"
      style={{
        position: "fixed",
        right: "clamp(1rem, 3vw, 2rem)",
        bottom: "clamp(1rem, 3vw, 2rem)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: compact ? "0.38rem" : "0.5rem",
        maxWidth: compact ? "min(92vw, 240px)" : "min(92vw, 280px)",
        padding: compact
          ? "clamp(0.5rem, 1.2vw, 0.68rem)"
          : "clamp(0.65rem, 1.5vw, 0.85rem)",
        borderRadius: compact ? "12px" : "14px",
        background: "rgba(255, 255, 255, 0.97)",
        boxShadow: compact
          ? "0 6px 22px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.08)"
          : "0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.08)",
      }}
    >
      <QRCodeSVG
        value={joinUrl}
        size={qrSize}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#0f172a"
      />
      <p
        style={{
          margin: 0,
          fontSize: "clamp(0.65rem, 1.35vw, 0.8rem)",
          fontWeight: 600,
          color: "#475569",
          textAlign: "center",
          lineHeight: 1.35,
          wordBreak: "break-all",
          fontFamily:
            'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        }}
      >
        {joinUrl}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: compact
            ? "clamp(0.55rem, 1vw, 0.65rem)"
            : "clamp(0.6rem, 1.1vw, 0.72rem)",
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily:
            'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        }}
      >
        Scanner pour rejoindre
      </p>
    </aside>
  );
}
