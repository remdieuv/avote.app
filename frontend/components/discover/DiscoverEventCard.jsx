"use client";

import Link from "next/link";
import {
  discoverCategoryLabel,
  formatDiscoverStartsAt,
  normalizeDiscoverCategory,
  resolveDiscoverPrimaryCta,
  resolveDiscoverSecondaryCta,
} from "@/lib/discoverUi";

/**
 * @param {{ event: Record<string, any> }} props
 */
export function DiscoverEventCard({ event }) {
  const cat = normalizeDiscoverCategory(event?.discoverCategory);
  const statusLabel = discoverCategoryLabel(cat);
  const when = formatDiscoverStartsAt(event?.startsAt);
  const themeLabel = event?.primaryTheme?.label || null;
  const city =
    typeof event?.city === "string" && event.city.trim() ? event.city.trim() : null;
  const organizer =
    event?.organizer && event.organizer.displayName ? event.organizer : null;
  const cover =
    typeof event?.landingCoverUrl === "string" && event.landingCoverUrl.trim()
      ? event.landingCoverUrl.trim()
      : null;
  const primary = resolveDiscoverPrimaryCta(event);
  const secondary = resolveDiscoverSecondaryCta(event, primary);
  const profileHref =
    organizer && typeof organizer.profilePath === "string"
      ? organizer.profilePath
      : organizer?.slug
        ? `/organizers/${organizer.slug}`
        : null;

  const badgeBg =
    cat === "live" ? "#dc2626" : cat === "upcoming" ? "#1d4ed8" : "#475569";

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        background: "#fff",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#e2e8f0" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(135deg, #e2e8f0 0%, #f8fafc 55%, #dbeafe 100%)",
            }}
          />
        )}
        {statusLabel ? (
          <span
            style={{
              position: "absolute",
              top: "0.65rem",
              left: "0.65rem",
              padding: "0.28rem 0.55rem",
              borderRadius: 999,
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.02em",
              background: badgeBg,
              color: "#fff",
            }}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>

      <div
        style={{
          padding: "0.85rem 0.9rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
          flex: 1,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 850,
            color: "#0f172a",
            lineHeight: 1.3,
          }}
        >
          {event?.title || "Événement"}
        </h2>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem 0.75rem",
            color: "#64748b",
            fontSize: "0.82rem",
            fontWeight: 600,
          }}
        >
          {when ? <li>{when}</li> : null}
          {city ? <li>{city}</li> : null}
          {themeLabel ? <li>{themeLabel}</li> : null}
        </ul>
        {organizer ? (
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#334155", fontWeight: 650 }}>
            {profileHref ? (
              <Link
                href={profileHref}
                style={{ color: "#1d4ed8", fontWeight: 750, textDecoration: "none" }}
              >
                {organizer.displayName}
              </Link>
            ) : (
              <span>{organizer.displayName}</span>
            )}
          </p>
        ) : null}

        <div
          style={{
            marginTop: "auto",
            paddingTop: "0.55rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          {primary ? (
            <Link href={primary.href} style={btnPrimary}>
              {primary.label}
            </Link>
          ) : (
            <span style={btnDisabled}>
              {cat === "finished" ? "Souvenirs indisponibles" : "Bientôt disponible"}
            </span>
          )}
          {secondary ? (
            <Link href={secondary.href} style={btnGhost}>
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.45rem 0.75rem",
  borderRadius: 9,
  fontSize: "0.82rem",
  fontWeight: 800,
  textDecoration: "none",
  background: "#1d4ed8",
  color: "#fff",
  border: "1px solid #1d4ed8",
};

const btnGhost = {
  ...btnPrimary,
  background: "#fff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};

const btnDisabled = {
  ...btnPrimary,
  background: "#f1f5f9",
  color: "#94a3b8",
  border: "1px solid #e2e8f0",
  cursor: "default",
};
