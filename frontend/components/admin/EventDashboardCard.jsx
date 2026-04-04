import Link from "next/link";
import { liveStateBadgeProps } from "@/lib/adminEventsDashboard";

/**
 * @param {{
 *   event: {
 *     id: string;
 *     title: string;
 *     slug: string;
 *     createdAt?: string;
 *     liveState?: string;
 *     pollCount?: number;
 *     voteCount?: number;
 *     participantCount?: number;
 *     _localOnly?: boolean;
 *   };
 *   featured?: boolean;
 *   formatDate: (iso: string | undefined, fallback?: string | null) => string;
 * }} props
 */
export function EventDashboardCard({ event, featured, formatDate }) {
  const ev = event;
  const badge = liveStateBadgeProps(
    ev._localOnly ? "waiting" : ev.liveState,
  );
  if (ev._localOnly) {
    badge.label = "Brouillon local";
  }

  const pc =
    typeof ev.pollCount === "number" && !Number.isNaN(ev.pollCount)
      ? ev.pollCount
      : null;
  const vc =
    typeof ev.voteCount === "number" && !Number.isNaN(ev.voteCount)
      ? ev.voteCount
      : null;
  const part =
    typeof ev.participantCount === "number" &&
    !Number.isNaN(ev.participantCount)
      ? ev.participantCount
      : null;

  const metaParts = [];
  if (pc !== null) {
    metaParts.push(`${pc} question${pc !== 1 ? "s" : ""}`);
  }
  if (vc !== null) {
    metaParts.push(`${vc} vote${vc !== 1 ? "s" : ""}`);
  }
  if (part !== null) {
    metaParts.push(`${part} participant${part !== 1 ? "s" : ""}`);
  }
  const metaLine = metaParts.join(" · ");

  return (
    <article
      className="avote-event-card"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 1.35rem",
        borderRadius: "14px",
        border: featured
          ? "1px solid color-mix(in srgb, #2563eb 38%, #e2e8f0)"
          : "1px solid #e8ecf1",
        background: featured
          ? "linear-gradient(165deg, rgba(239, 246, 255, 0.72) 0%, #ffffff 38%)"
          : "#fff",
        boxShadow: featured
          ? "0 14px 44px rgba(37, 99, 235, 0.1), 0 4px 14px rgba(15, 23, 42, 0.06)"
          : "0 2px 10px rgba(15, 23, 42, 0.05)",
        boxSizing: "border-box",
        minHeight: 0,
        transition:
          "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.65rem",
          marginBottom: "0.65rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.08rem",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            flex: "1 1 12rem",
            minWidth: 0,
          }}
        >
          {ev.title}
        </h2>
        <span
          style={{
            flexShrink: 0,
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "0.32rem 0.65rem",
            borderRadius: "999px",
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.label}
        </span>
      </div>

      <p
        style={{
          margin: "0 0 0.35rem",
          fontSize: "0.84rem",
          color: "#64748b",
          fontWeight: 500,
        }}
      >
        {formatDate(
          ev.createdAt,
          ev._localOnly ? "Date locale" : null,
        )}
      </p>

      {metaLine ? (
        <p
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.8rem",
            color: "#475569",
            fontWeight: 600,
          }}
        >
          {metaLine}
        </p>
      ) : null}

      {!ev._localOnly && ev.slug ? (
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.72rem",
            color: "#94a3b8",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            letterSpacing: "-0.02em",
          }}
        >
          {ev.slug}
        </p>
      ) : ev._localOnly ? (
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.78rem",
            color: "#94a3b8",
            fontWeight: 500,
          }}
        >
          Enregistré sur cet appareil — créez l’événement sur le serveur pour la
          régie complète.
        </p>
      ) : (
        <div style={{ marginBottom: "1rem" }} />
      )}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
        }}
        className="avote-event-card-actions"
      >
        <Link
          href={`/admin/event/${ev.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.62rem 1rem",
            fontSize: "0.88rem",
            fontWeight: 700,
            borderRadius: "10px",
            textDecoration: "none",
            border: "1px solid #1e40af",
            background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
            color: "#fff",
            boxShadow: "0 2px 10px rgba(37, 99, 235, 0.32)",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          Ouvrir la régie
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.45rem",
          }}
          className="avote-event-card-secondary-grid"
        >
          {!ev._localOnly && ev.slug ? (
            <>
              <Link
                href={`/join/${encodeURIComponent(ev.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={secondaryLinkStyle}
              >
                Ouvrir la salle
              </Link>
              <Link
                href={`/screen/${encodeURIComponent(ev.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={secondaryLinkStyle}
              >
                Voir l’écran
              </Link>
            </>
          ) : (
            <>
              <span style={{ ...secondaryLinkStyle, opacity: 0.45, cursor: "default", pointerEvents: "none" }}>
                Ouvrir la salle
              </span>
              <span style={{ ...secondaryLinkStyle, opacity: 0.45, cursor: "default", pointerEvents: "none" }}>
                Voir l’écran
              </span>
            </>
          )}
        </div>

        {ev._localOnly ? (
          <span
            title="Créez l’événement sur le serveur pour personnaliser la salle."
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.55rem 0.95rem",
              fontSize: "0.84rem",
              fontWeight: 600,
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#94a3b8",
              cursor: "not-allowed",
              textAlign: "center",
            }}
          >
            Personnaliser ma salle
          </span>
        ) : (
          <Link
            href={`/admin/events/${ev.id}/customization`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.55rem 0.95rem",
              fontSize: "0.84rem",
              fontWeight: 600,
              borderRadius: "10px",
              textDecoration: "none",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              textAlign: "center",
            }}
          >
            Personnaliser ma salle
          </Link>
        )}
      </div>

      <style>{`
        .avote-event-card:hover {
          transform: translateY(-2px);
          box-shadow: ${featured
            ? "0 18px 52px rgba(37, 99, 235, 0.14), 0 8px 22px rgba(15, 23, 42, 0.08)"
            : "0 8px 28px rgba(15, 23, 42, 0.09)"};
        }
        @media (max-width: 520px) {
          .avote-event-card-secondary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </article>
  );
}

const secondaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.48rem 0.65rem",
  fontSize: "0.78rem",
  fontWeight: 600,
  borderRadius: "9px",
  textDecoration: "none",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#64748b",
  boxSizing: "border-box",
  textAlign: "center",
};
