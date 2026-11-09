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
 * @param {{
 *   event: Record<string, any>;
 *   isFavorite?: boolean;
 *   favoriteBusy?: boolean;
 *   onToggleFavorite?: (event: Record<string, any>) => void;
 * }} props
 */
export function DiscoverEventCard({
  event,
  isFavorite = false,
  favoriteBusy = false,
  onToggleFavorite,
}) {
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
  const favorited = Boolean(isFavorite || event?.isFavorite || event?.favorited);

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
        {typeof onToggleFavorite === "function" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!favoriteBusy) onToggleFavorite(event);
            }}
            disabled={favoriteBusy}
            aria-pressed={favorited}
            aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
            style={{
              position: "absolute",
              top: "0.55rem",
              right: "0.55rem",
              width: 40,
              height: 40,
              borderRadius: 999,
              border: favorited ? "1px solid #fecaca" : "1px solid rgba(255,255,255,0.85)",
              background: favorited ? "#fff1f2" : "rgba(15, 23, 42, 0.42)",
              color: favorited ? "#e11d48" : "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: favoriteBusy ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.18)",
            }}
          >
            <HeartIcon filled={favorited} />
          </button>
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

/** @param {{ filled?: boolean }} props */
function HeartIcon({ filled = false }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        d="M12 21s-6.7-4.35-9.33-7.7C.7 10.9 1.1 7.4 3.7 5.7c2.1-1.4 4.7-.9 6.1 1.1L12 9.2l2.2-2.4c1.4-2 4-2.5 6.1-1.1 2.6 1.7 3 5.2 1.03 7.6C18.7 16.65 12 21 12 21z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
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
