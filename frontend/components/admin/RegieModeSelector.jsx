"use client";

import { normalizeConsultationModeUi } from "@/lib/consultationMode";

/**
 * Sélecteur principal Live animé | Libre-service (bandeau régie).
 * @param {{
 *   consultationMode?: string | null;
 *   disabled?: boolean;
 *   onSelect?: (mode: "live" | "self_service") => void;
 *   compact?: boolean;
 * }} props
 */
export function RegieModeSelector({
  consultationMode,
  disabled = false,
  onSelect,
  compact = false,
}) {
  const mode = normalizeConsultationModeUi(consultationMode);
  const isSs = mode === "self_service";

  return (
    <div
      role="group"
      aria-label="Mode de l’événement"
      data-testid="regie-mode-selector"
      style={{
        display: "grid",
        gap: compact ? "0.35rem" : "0.45rem",
        minWidth: compact ? "12rem" : "16rem",
        flex: "1 1 16rem",
        maxWidth: "28rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "rgba(224, 231, 255, 0.72)",
        }}
      >
        Mode de l’événement
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.4rem",
        }}
      >
        <ModeButton
          active={!isSs}
          disabled={disabled || !isSs}
          label="Live animé"
          icon="📡"
          onClick={() => onSelect?.("live")}
        />
        <ModeButton
          active={isSs}
          disabled={disabled || isSs}
          label="Libre-service"
          icon="▦"
          onClick={() => onSelect?.("self_service")}
        />
      </div>
      <p
        data-testid="regie-mode-explanation"
        style={{
          margin: 0,
          fontSize: "0.74rem",
          fontWeight: 600,
          color: "rgba(226, 232, 240, 0.82)",
          lineHeight: 1.4,
        }}
      >
        {isSs
          ? "Les participants choisissent et votent librement — sans régisseur connecté."
          : "Vous pilotez une question à la fois, en direct."}
      </p>
    </div>
  );
}

function ModeButton({ active, disabled, label, icon, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled && !active}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.35rem",
        minHeight: "2.55rem",
        padding: "0.45rem 0.55rem",
        borderRadius: "12px",
        border: active
          ? "2px solid #34d399"
          : "1px solid rgba(148, 163, 184, 0.35)",
        background: active
          ? "linear-gradient(180deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.34) 100%)"
          : "rgba(15, 23, 42, 0.35)",
        color: active ? "#ecfdf5" : "rgba(226, 232, 240, 0.88)",
        fontWeight: 800,
        fontSize: "0.8rem",
        cursor: active ? "default" : disabled ? "not-allowed" : "pointer",
        opacity: disabled && !active ? 0.55 : 1,
        boxShadow: active ? "0 10px 22px rgba(16, 185, 129, 0.18)" : "none",
      }}
    >
      <span aria-hidden style={{ fontSize: "0.95rem", lineHeight: 1 }}>
        {icon}
      </span>
      {label}
      {active ? (
        <span
          aria-hidden
          style={{
            marginLeft: "0.15rem",
            width: "1rem",
            height: "1rem",
            borderRadius: "999px",
            background: "#10b981",
            color: "#fff",
            fontSize: "0.65rem",
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}
