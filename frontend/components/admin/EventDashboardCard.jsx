"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getEventUxState } from "@/lib/eventUxState";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * @param {{
 *   event: {
 *     id: string;
 *     title: string;
 *     slug: string;
 *     createdAt?: string;
 *     liveState?: string;
 *     displayState?: string;
 *     voteState?: string;
 *     pollCount?: number;
 *     voteCount?: number;
 *     participantCount?: number;
 *     participantsUsed?: number | null;
 *     participantsLimit?: number | null;
 *     _localOnly?: boolean;
 *   };
 *   featured?: boolean;
 *   newLeadCount?: number;
 *   formatDate: (iso: string | undefined, fallback?: string | null) => string;
 *   actionBusy?: boolean;
 *   onDuplicate?: (eventId: string) => void;
 *   onDelete?: (eventId: string) => void;
 * }} props
 */
export function EventDashboardCard({
  event,
  featured,
  newLeadCount = 0,
  formatDate,
  actionBusy = false,
  onDuplicate,
  onDelete,
}) {
  const ev = event;
  const ux = getEventUxState(ev);
  const badge = { label: ux.label, ...ux.color };
  const reducedMotion = usePrefersReducedMotion();
  const prevUxKeyRef = useRef(
    /** @type {string | undefined} */ (undefined),
  );
  const [badgeStatusEnter, setBadgeStatusEnter] = useState(false);
  const [cardStatusFlash, setCardStatusFlash] = useState(false);

  const isLiveUx = ux.key === "voting";

  useEffect(() => {
    const prev = prevUxKeyRef.current;
    const changed = prev !== undefined && prev !== ux.key;
    prevUxKeyRef.current = ux.key;
    if (!changed) return undefined;
    if (reducedMotion) return undefined;
    setBadgeStatusEnter(true);
    const tBadge = window.setTimeout(() => setBadgeStatusEnter(false), 420);
    let tFlash;
    if (featured) {
      setCardStatusFlash(true);
      tFlash = window.setTimeout(() => setCardStatusFlash(false), 680);
    }
    return () => {
      clearTimeout(tBadge);
      if (tFlash) clearTimeout(tFlash);
    };
  }, [ux.key, featured, reducedMotion]);

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
  const participantsUsed =
    typeof ev.participantsUsed === "number" && !Number.isNaN(ev.participantsUsed)
      ? Math.max(0, ev.participantsUsed)
      : null;
  const participantsLimit =
    typeof ev.participantsLimit === "number" && !Number.isNaN(ev.participantsLimit)
      ? Math.max(1, ev.participantsLimit)
      : null;
  const hasParticipantsLimit = participantsLimit !== null;
  const safeParticipantsUsed = participantsUsed ?? 0;
  const participantsProgressRatio = hasParticipantsLimit
    ? safeParticipantsUsed / participantsLimit
    : null;
  const participantsProgressPercent = participantsProgressRatio !== null
    ? Math.max(0, Math.min(100, Math.round(participantsProgressRatio * 100)))
    : 0;
  const participantsTone =
    participantsProgressRatio === null || participantsProgressRatio < 0.8
      ? "neutral"
      : participantsProgressRatio < 1
        ? "soft"
        : "strong";
  const participantsLine =
    participantsLimit === null
      ? "Participants non disponibles"
      : `${safeParticipantsUsed} / ${participantsLimit} participants`;
  const participantsHint =
    participantsProgressRatio === null || participantsProgressRatio < 0.8
      ? ""
      : participantsProgressRatio < 1
        ? `⚠️ Plus que ${Math.max(0, participantsLimit - safeParticipantsUsed)} places restantes`
        : "🚫 Limite atteinte — nouveaux participants bloqués";
  const participantsTrackColor =
    participantsTone === "strong"
      ? "#fecaca"
      : participantsTone === "soft"
        ? "#fde68a"
        : "#dbeafe";
  const participantsFillColor =
    participantsTone === "strong"
      ? "#dc2626"
      : participantsTone === "soft"
        ? "#d97706"
        : "#2563eb";

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

  const cardClass = [
    "avote-event-card",
    featured && (isLiveUx ? "avote-event-card--featured-live" : "avote-event-card--featured"),
    cardStatusFlash && "avote-event-card--flash",
    reducedMotion && "avote-event-card--reduced-motion",
  ]
    .filter(Boolean)
    .join(" ");

  const badgeClass = [
    "avote-event-badge",
    badgeStatusEnter && !reducedMotion && "avote-event-badge--enter",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClass}>
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
          className={badgeClass}
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
          {isLiveUx ? (
            <span
              className={
                reducedMotion
                  ? "avote-event-badge-live-dot avote-event-badge-live-dot--static"
                  : "avote-event-badge-live-dot"
              }
              aria-hidden
            />
          ) : null}
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
      <p
        style={{
          margin: metaLine ? "0 0 0.8rem" : "0.1rem 0 0.8rem",
          fontSize: "0.8rem",
          color: "#334155",
          fontWeight: 700,
        }}
      >
        {participantsLine}
      </p>
      {hasParticipantsLimit ? (
        <div style={{ margin: "-0.45rem 0 0.75rem" }}>
          <div
            style={{
              width: "100%",
              height: "7px",
              borderRadius: "999px",
              background: participantsTrackColor,
              overflow: "hidden",
            }}
            aria-hidden
          >
            <div
              style={{
                width: `${participantsProgressPercent}%`,
                height: "100%",
                borderRadius: "999px",
                background: participantsFillColor,
                transition: "width 220ms ease",
              }}
            />
          </div>
          {participantsHint ? (
            <p
              style={{
                margin: "0.38rem 0 0",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: participantsTone === "strong" ? "#b91c1c" : "#92400e",
                lineHeight: 1.3,
              }}
            >
              {participantsHint}
            </p>
          ) : null}
        </div>
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
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0.45rem",
              }}
            >
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
                Personnaliser
              </Link>
              <Link
                href={`/admin/event/${ev.id}/leads`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.55rem 0.95rem",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  borderRadius: "10px",
                  textDecoration: "none",
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  textAlign: "center",
                }}
              >
                Leads
                {newLeadCount > 0 ? (
                  <span
                    style={{
                      marginLeft: "0.35rem",
                      display: "inline-flex",
                      minWidth: "1.1rem",
                      height: "1.1rem",
                      borderRadius: "999px",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 0.3rem",
                      background: "#dcfce7",
                      border: "1px solid #86efac",
                      color: "#166534",
                      fontSize: "0.66rem",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                    aria-label={`${newLeadCount} nouveaux leads`}
                    title={`${newLeadCount} nouveaux leads`}
                  >
                    {newLeadCount > 99 ? "99+" : newLeadCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href={`/admin/event/${ev.id}/analytics`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.55rem 0.95rem",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  borderRadius: "10px",
                  textDecoration: "none",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  textAlign: "center",
                }}
              >
                Statistiques
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.45rem",
              }}
            >
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => onDuplicate?.(ev.id)}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  borderRadius: "9px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: actionBusy ? "#94a3b8" : "#334155",
                  cursor: actionBusy ? "not-allowed" : "pointer",
                }}
              >
                {actionBusy ? "..." : "Dupliquer"}
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => onDelete?.(ev.id)}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  borderRadius: "9px",
                  border: "1px solid #fecaca",
                  background: "#fff5f5",
                  color: actionBusy ? "#fda4af" : "#b91c1c",
                  cursor: actionBusy ? "not-allowed" : "pointer",
                }}
              >
                {actionBusy ? "..." : "Supprimer"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .avote-event-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 1.25rem 1.35rem;
          border-radius: 14px;
          border: 1px solid #e8ecf1;
          background: #fff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
          box-sizing: border-box;
          min-height: 0;
          width: 100%;
          max-width: 100%;
          transition:
            transform 0.2s ease-out,
            box-shadow 0.2s ease-out,
            border-color 0.22s ease-out,
            background 0.22s ease-out;
        }
        .avote-event-card--featured {
          border: 1px solid color-mix(in srgb, #2563eb 38%, #e2e8f0);
          background: linear-gradient(165deg, rgba(239, 246, 255, 0.72) 0%, #ffffff 38%);
          box-shadow:
            0 14px 44px rgba(37, 99, 235, 0.1),
            0 4px 14px rgba(15, 23, 42, 0.06);
        }
        .avote-event-card--featured-live {
          border: 1px solid color-mix(in srgb, #16a34a 40%, #e2e8f0);
          background: linear-gradient(165deg, rgba(240, 253, 244, 0.78) 0%, #ffffff 42%);
          box-shadow:
            0 14px 40px rgba(22, 163, 74, 0.14),
            0 4px 16px rgba(15, 23, 42, 0.07);
          transform: scale(1.005);
        }
        .avote-event-card--flash.avote-event-card--featured,
        .avote-event-card--flash.avote-event-card--featured-live {
          border-color: color-mix(in srgb, #22c55e 55%, #e2e8f0);
          box-shadow:
            0 16px 48px rgba(22, 163, 74, 0.16),
            0 6px 18px rgba(15, 23, 42, 0.08);
        }
        .avote-event-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition:
            background-color 0.22s ease-out,
            border-color 0.22s ease-out,
            color 0.22s ease-out,
            transform 0.22s ease-out,
            opacity 0.22s ease-out;
        }
        .avote-event-badge--enter {
          animation: avoteBadgeStatusIn 0.42s ease-out 1;
        }
        @keyframes avoteBadgeStatusIn {
          from {
            opacity: 0.92;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .avote-event-badge-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16a34a;
          flex-shrink: 0;
          animation: avoteLiveDotPulse 2.6s ease-in-out infinite;
        }
        .avote-event-badge-live-dot--static {
          animation: none;
          opacity: 0.9;
        }
        @keyframes avoteLiveDotPulse {
          0%,
          100% {
            opacity: 0.78;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        @media (min-width: 768px) and (hover: hover) {
          .avote-event-card:hover {
            transform: translateY(-2px);
            box-shadow:
              0 10px 32px rgba(15, 23, 42, 0.1),
              0 4px 12px rgba(15, 23, 42, 0.06);
          }
          .avote-event-card--featured:hover {
            transform: translateY(-2px);
            box-shadow:
              0 18px 52px rgba(37, 99, 235, 0.14),
              0 8px 22px rgba(15, 23, 42, 0.08);
          }
          .avote-event-card--featured-live:hover {
            transform: translateY(-2px) scale(1.005);
            box-shadow:
              0 20px 52px rgba(22, 163, 74, 0.16),
              0 8px 22px rgba(15, 23, 42, 0.08);
          }
        }
        @media (max-width: 520px) {
          .avote-event-card-secondary-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .avote-event-card,
          .avote-event-badge {
            transition-duration: 0.05s;
          }
          .avote-event-badge--enter {
            animation: none;
          }
          .avote-event-badge-live-dot {
            animation: none;
          }
          .avote-event-card--featured-live {
            transform: none;
          }
          @media (min-width: 768px) and (hover: hover) {
            .avote-event-card--featured-live:hover {
              transform: translateY(-2px);
            }
          }
        }
        .avote-event-card--reduced-motion.avote-event-card--featured-live {
          transform: none;
        }
        .avote-event-card--reduced-motion .avote-event-badge--enter {
          animation: none;
        }
        .avote-event-card--reduced-motion .avote-event-badge-live-dot {
          animation: none;
        }
        @media (min-width: 768px) and (hover: hover) {
          .avote-event-card--reduced-motion.avote-event-card--featured-live:hover {
            transform: translateY(-2px);
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
