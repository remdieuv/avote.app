"use client";

import { useMemo } from "react";
import {
  formatScreenQuestionProgressLabel,
  getScreenDiffusionLabel,
} from "@/lib/diffusionUx";

/**
 * Attente auto-reveal : vote terminé, résultats annoncés avec compte à rebours.
 * @param {{
 *   shell: Record<string, unknown>;
 *   untilIso: string;
 *   chronoTick: number;
 *   questionProgress?: { current: number; total: number } | null;
 * }} props
 */
export function ScreenAutoRevealWait({
  shell,
  untilIso,
  chronoTick,
  questionProgress = null,
}) {
  const secondesRestantes = useMemo(() => {
    void chronoTick;
    const t = new Date(untilIso).getTime();
    if (Number.isNaN(t)) return 0;
    /* eslint-disable-next-line react-hooks/purity -- décompte temps réel (chronoTick chaque seconde) */
    return Math.max(0, Math.ceil((t - Date.now()) / 1000));
  }, [untilIso, chronoTick]);

  const progressLabel = formatScreenQuestionProgressLabel(
    questionProgress,
    "closed",
  );

  return (
    <main
      style={{
        ...shell,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {progressLabel ? (
        <p
          style={{
            margin: "0 0 clamp(0.55rem, 1.5vw, 0.9rem) 0",
            fontSize: "clamp(0.9rem, 2.2vw, 1.25rem)",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          {progressLabel}
        </p>
      ) : null}
      <p
        style={{
          margin: "0 0 clamp(0.75rem, 2vw, 1.25rem) 0",
          fontSize: "clamp(1.35rem, 4vw, 2.5rem)",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#f8fafc",
        }}
      >
        {getScreenDiffusionLabel("CLOSED")}
      </p>
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(1.75rem, 6vw, 4rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#f0fdfa",
          lineHeight: 1.15,
          maxWidth: "22ch",
        }}
      >
        Résultats dans{" "}
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            color: "#2dd4bf",
          }}
        >
          {secondesRestantes}
        </span>{" "}
        seconde{secondesRestantes !== 1 ? "s" : ""}
      </h1>
    </main>
  );
}
