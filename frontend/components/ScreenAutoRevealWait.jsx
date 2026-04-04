"use client";

import { useMemo } from "react";
import { LIVE_UX_STATE, getLiveStateLabel } from "@/lib/liveStateUx";

/**
 * Attente auto-reveal : vote terminé, résultats annoncés avec compte à rebours.
 * @param {{
 *   shell: Record<string, unknown>;
 *   untilIso: string;
 *   chronoTick: number;
 * }} props
 */
export function ScreenAutoRevealWait({ shell, untilIso, chronoTick }) {
  const secondesRestantes = useMemo(() => {
    void chronoTick;
    const t = new Date(untilIso).getTime();
    if (Number.isNaN(t)) return 0;
    /* eslint-disable-next-line react-hooks/purity -- décompte temps réel (chronoTick chaque seconde) */
    return Math.max(0, Math.ceil((t - Date.now()) / 1000));
  }, [untilIso, chronoTick]);

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
      <p
        style={{
          margin: "0 0 clamp(0.75rem, 2vw, 1.25rem) 0",
          fontSize: "clamp(0.7rem, 1.35vw, 0.9rem)",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#5eead4",
        }}
      >
        {getLiveStateLabel(LIVE_UX_STATE.CLOSED)}
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
      <p
        style={{
          margin: "clamp(1rem, 3vw, 1.75rem) 0 0 0",
          fontSize: "clamp(0.92rem, 2vw, 1.15rem)",
          color: "#94a3b8",
          fontWeight: 500,
          maxWidth: "36ch",
        }}
      >
        Les résultats arrivent dans quelques secondes.
      </p>
    </main>
  );
}
