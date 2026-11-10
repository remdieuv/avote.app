"use client";

import {
  REGIE_CLOSE_VS_FINISH_HINT,
  getRegieToolGlossary,
} from "@/lib/regieLiveFlowSteps";

/**
 * Repère discret du déroulement live (présentation seule).
 *
 * @param {{
 *   steps: ReadonlyArray<{ id: string; label: string; shortLabel: string }>;
 *   currentIndex: number;
 *   completed?: boolean;
 *   nextHint?: string | null;
 *   modeLine?: string | null;
 *   showGlossary?: boolean;
 *   compact?: boolean;
 * }} props
 */
export function RegieLiveFlowStepper({
  steps = [],
  currentIndex = 0,
  completed = false,
  nextHint = null,
  modeLine = null,
  showGlossary = true,
  compact = false,
}) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const glossary = getRegieToolGlossary();
  const safeIndex = Math.max(0, Math.min(steps.length - 1, Number(currentIndex) || 0));

  return (
    <div
      data-testid="regie-live-flow-stepper"
      aria-label="Déroulement du live"
      style={{
        display: "grid",
        gap: compact ? "0.45rem" : "0.55rem",
        minWidth: 0,
      }}
    >
      {modeLine ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 650,
            color: "#64748b",
            lineHeight: 1.4,
          }}
        >
          {modeLine}
        </p>
      ) : null}

      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.35rem 0.4rem",
          alignItems: "center",
        }}
      >
        {steps.map((step, index) => {
          const done = completed || index < safeIndex;
          const current = !completed && index === safeIndex;
          return (
            <li
              key={step.id}
              aria-current={current ? "step" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              {index > 0 ? (
                <span
                  aria-hidden
                  style={{
                    width: "0.55rem",
                    height: "1px",
                    background: done || current ? "#94a3b8" : "#e2e8f0",
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.28rem",
                  padding: compact ? "0.18rem 0.45rem" : "0.22rem 0.55rem",
                  borderRadius: "999px",
                  border: current
                    ? "1px solid #0d9488"
                    : done
                      ? "1px solid #bbf7d0"
                      : "1px solid #e2e8f0",
                  background: current
                    ? "rgba(13, 148, 136, 0.1)"
                    : done
                      ? "rgba(240, 253, 244, 0.95)"
                      : "#fff",
                  color: current ? "#0f766e" : done ? "#166534" : "#94a3b8",
                  fontSize: compact ? "0.66rem" : "0.7rem",
                  fontWeight: current ? 800 : 700,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
                title={step.label}
              >
                <span aria-hidden style={{ fontVariantNumeric: "tabular-nums" }}>
                  {index + 1}
                </span>
                <span>{compact ? step.shortLabel : step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {nextHint ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.4,
          }}
          data-testid="regie-live-flow-next-hint"
        >
          {nextHint}
        </p>
      ) : null}

      <p
        style={{
          margin: 0,
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "#64748b",
          lineHeight: 1.4,
        }}
        data-testid="regie-close-vs-finish-hint"
      >
        {REGIE_CLOSE_VS_FINISH_HINT}
      </p>

      {showGlossary ? (
        <details
          style={{
            margin: 0,
            borderTop: "1px solid rgba(15, 23, 42, 0.06)",
            paddingTop: "0.45rem",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 750,
              fontSize: "0.74rem",
              color: "#475569",
              listStyle: "none",
            }}
          >
            Écran, télécommande, QR et chronomètre — à quoi servent-ils ?
          </summary>
          <ul
            style={{
              margin: "0.45rem 0 0",
              padding: "0 0 0 1rem",
              display: "grid",
              gap: "0.35rem",
              fontSize: "0.72rem",
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            {Object.values(glossary).map((item) => (
              <li key={item.title}>
                <strong style={{ color: "#334155", fontWeight: 750 }}>
                  {item.title}
                </strong>
                {" — "}
                {item.body}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
