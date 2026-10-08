"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  SCREEN_QR_CTA_JOIN,
  getScreenDiffusionLabel,
  getScreenWaitingDiffusionLabel,
} from "@/lib/diffusionUx";

/**
 * Scène WAITING — entrée dans la Salle : titre + CTA + GROS QR.
 * @param {{
 *   shell: Record<string, unknown>;
 *   joinSlug: string | null | undefined;
 *   pollsProgress?: { current?: number; total?: number } | null;
 *   pastPollsCount?: number | null;
 * }} props
 */
export function ScreenWaiting({
  shell,
  joinSlug,
  pollsProgress = null,
  pastPollsCount = null,
}) {
  const [joinUrl, setJoinUrl] = useState("");
  const [cotePx, setCotePx] = useState(320);

  useEffect(() => {
    if (!joinSlug || typeof window === "undefined") return;
    setJoinUrl(
      `${window.location.origin}/join/${encodeURIComponent(joinSlug)}`,
    );
  }, [joinSlug]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const forced = Math.round(
        Math.min(window.innerWidth * 0.42, window.innerHeight * 0.48),
      );
      setCotePx(Math.max(240, Math.min(forced, 720)));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

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
        justifyContent: "center",
        textAlign: "center",
        gap: "clamp(1rem, 3vh, 1.85rem)",
        padding: "clamp(1rem, 3vw, 2rem)",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(1.85rem, 6.5vw, 4.25rem)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "#f8fafc",
          maxWidth: "18ch",
          textWrap: "balance",
        }}
      >
        {getScreenWaitingDiffusionLabel({ pollsProgress, pastPollsCount })}
      </h1>

      <p
        style={{
          margin: 0,
          fontSize: "clamp(1.25rem, 3.8vw, 2.35rem)",
          fontWeight: 900,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#e2e8f0",
        }}
      >
        {SCREEN_QR_CTA_JOIN}
      </p>

      {joinUrl ? (
        <div
          style={{
            padding: "clamp(0.65rem, 1.6vw, 1.1rem)",
            borderRadius: "clamp(18px, 3vw, 28px)",
            background: "#ffffff",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
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
      ) : null}
    </main>
  );
}

/**
 * Scène FINISHED — clôture simple, sans ancienne question / résultats.
 * @param {{ shell: Record<string, unknown> }} props
 */
export function ScreenFinished({ shell }) {
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
        justifyContent: "center",
        textAlign: "center",
        padding: "clamp(1rem, 3vw, 2rem)",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(2rem, 7vw, 4.75rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: "#f8fafc",
          maxWidth: "16ch",
          textWrap: "balance",
        }}
      >
        {getScreenDiffusionLabel("FINISHED")}
      </h1>
    </main>
  );
}
