"use client";

import { RegieModeSelector } from "@/components/admin/RegieModeSelector";

/**
 * Bandeau supérieur commun régie — structure Grid stable (Live + Libre-service).
 * Pas de chrono / antenne / télécommande ici : réservés au pilotage Live.
 *
 * @param {{
 *   title?: string | null;
 *   desktop?: boolean;
 *   consultationMode?: string | null;
 *   modeDisabled?: boolean;
 *   onSelectMode?: (mode: "live" | "self_service") => void;
 *   modeStatus?: { label: string; color: string; bg: string; border: string } | null;
 *   statusPills?: Array<{ label: string; color: string; bg: string; border: string }>;
 *   actions?: import("react").ReactNode;
 *   footer?: import("react").ReactNode;
 * }} props
 */
export function RegieTopBar({
  title = "",
  desktop = true,
  consultationMode = null,
  modeDisabled = false,
  onSelectMode,
  modeStatus = null,
  statusPills = [],
  actions = null,
  footer = null,
}) {
  return (
    <section
      data-testid="regie-top-bar"
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(124, 58, 237, 0.22)",
        padding: desktop ? "1.05rem 1.15rem" : "0.9rem 0.95rem",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e1b4b 42%, #312e81 100%)",
        boxShadow: "0 22px 46px rgba(30, 27, 75, 0.24)",
        minWidth: 0,
      }}
      aria-label="Régie"
    >
      <div
        style={{
          display: "grid",
          gap: "0.72rem",
        }}
      >
        <div
          data-testid="regie-top-bar-primary"
          style={{
            display: "grid",
            gridTemplateColumns: desktop
              ? "minmax(0, 1.1fr) minmax(16rem, 1.2fr) minmax(0, 1fr)"
              : "1fr",
            gap: "0.65rem 0.85rem",
            alignItems: "end",
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
              Régie
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
              title={title || undefined}
            >
              {title || "Événement"}
            </h2>
          </div>

          <RegieModeSelector
            consultationMode={consultationMode}
            disabled={modeDisabled}
            onSelect={onSelectMode}
            compact={!desktop}
          />

          <div
            data-testid="regie-top-bar-actions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: desktop ? "flex-end" : "flex-start",
              gap: "0.42rem 0.55rem",
              minWidth: 0,
            }}
          >
            {actions}
          </div>
        </div>

        <div
          data-testid="regie-top-bar-status"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.42rem 0.5rem",
            minHeight: "1.7rem",
          }}
        >
          {modeStatus ? <StatusPill item={modeStatus} emphasize /> : null}
          {(Array.isArray(statusPills) ? statusPills : []).map((item) => (
            <StatusPill key={item.label} item={item} />
          ))}
        </div>

        {footer ? <div data-testid="regie-top-bar-footer">{footer}</div> : null}
      </div>
    </section>
  );
}

function StatusPill({ item, emphasize = false }) {
  if (!item?.label) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: emphasize ? "0.26rem 0.62rem" : "0.22rem 0.58rem",
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
  );
}
