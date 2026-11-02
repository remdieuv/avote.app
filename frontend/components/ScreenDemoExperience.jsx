"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScreenQuestion } from "@/components/ScreenQuestion";
import { ScreenResults } from "@/components/ScreenResults";

/** Même question / options que la démo participant (`JoinDemoExperience`). */
const DEMO_QUESTION = "Quelle fonctionnalité préférez-vous ?";

const DEMO_POLL = {
  id: "demo-screen-poll",
  type: "SINGLE_CHOICE",
  status: "ACTIVE",
  question: DEMO_QUESTION,
  votersCount: 100,
  eventIsLiveConsumed: true,
  options: [
    { id: "qr", label: "QR code simple", order: 0, voteCount: 45 },
    { id: "live", label: "Résultats en direct", order: 1, voteCount: 30 },
    { id: "proj", label: "Projection écran", order: 2, voteCount: 25 },
  ],
};

const DEMO_SHELL = {
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  fontFamily:
    'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  background: "#0c1222",
  color: "#e2e8f0",
};

/**
 * Démo publique sans API : projection Screen / OBS (question + résultats).
 * Route : `/screen/demo` — distincte de la salle participant `/join/demo`.
 */
export function ScreenDemoExperience() {
  const [scene, setScene] = useState(/** @type {"question" | "results"} */ ("question"));
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [chronoTick, setChronoTick] = useState(0);

  const poll = useMemo(() => DEMO_POLL, []);
  const questionProgress = useMemo(() => ({ current: 1, total: 1 }), []);

  useEffect(() => {
    const id = window.setInterval(() => setChronoTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (scene !== "results") {
      setBarsAnimated(false);
      return;
    }
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarsAnimated(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {scene === "question" ? (
        <ScreenQuestion
          shell={DEMO_SHELL}
          poll={poll}
          chronometreApi={null}
          chronoTick={chronoTick}
          voteOuvert
          joinSlug="demo"
          questionProgress={questionProgress}
        />
      ) : (
        <ScreenResults
          shell={DEMO_SHELL}
          poll={poll}
          chronometreApi={null}
          chronoTick={chronoTick}
          voteOuvertResultats={false}
          barsAnimated={barsAnimated}
          questionProgress={questionProgress}
        />
      )}

      <div
        role="region"
        aria-label="Contrôles démo écran"
        style={{
          position: "fixed",
          zIndex: 50,
          left: "50%",
          bottom: "clamp(0.65rem, 2.5vw, 1.15rem)",
          transform: "translateX(-50%)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.45rem",
          padding: "0.4rem 0.55rem",
          borderRadius: "999px",
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
          maxWidth: "min(96vw, 34rem)",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(226, 232, 240, 0.72)",
            padding: "0 0.35rem",
          }}
        >
          Démo écran
        </span>
        <SceneButton
          active={scene === "question"}
          onClick={() => setScene("question")}
          label="Question"
        />
        <SceneButton
          active={scene === "results"}
          onClick={() => setScene("results")}
          label="Résultats"
        />
        <Link
          href="/join/demo"
          style={{
            marginLeft: "0.15rem",
            padding: "0.38rem 0.7rem",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#c7d2fe",
            textDecoration: "none",
            border: "1px solid rgba(129, 140, 248, 0.45)",
          }}
        >
          Tester le vote
        </Link>
        <Link
          href="/e/demo"
          style={{
            padding: "0.38rem 0.65rem",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "rgba(226, 232, 240, 0.85)",
            textDecoration: "none",
          }}
        >
          ← Démo
        </Link>
      </div>
    </div>
  );
}

/**
 * @param {{ active: boolean; onClick: () => void; label: string }} props
 */
function SceneButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "0.4rem 0.85rem",
        borderRadius: "999px",
        border: active
          ? "1px solid rgba(96, 165, 250, 0.75)"
          : "1px solid transparent",
        background: active ? "rgba(59, 130, 246, 0.28)" : "transparent",
        color: active ? "#eff6ff" : "rgba(226, 232, 240, 0.78)",
        fontSize: "0.8rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
