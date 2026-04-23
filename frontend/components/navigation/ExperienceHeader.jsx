"use client";

import Link from "next/link";

/**
 * Header partagé des vues expérience participant (/join, /p, /poll, demo).
 * @param {{
 *   backHref: string;
 *   backLabel: string;
 *   title: string;
 *   subtitle?: string | null;
 *   logoUrl?: string | null;
 *   palette: { headerBorder: string; headerBg: string; link: string; fg: string; muted: string };
 *   isDark: boolean;
 *   badgeText?: string | null;
 *   badgeColor?: string | null;
 *   sticky?: boolean;
 *   children?: import("react").ReactNode;
 * }} props
 */
export function ExperienceHeader({
  backHref,
  backLabel,
  title,
  subtitle = null,
  logoUrl = null,
  palette,
  isDark,
  badgeText = null,
  badgeColor = null,
  sticky = true,
  children = null,
}) {
  return (
    <header
      style={{
        flexShrink: 0,
        padding: "clamp(0.85rem, 3vw, 1.15rem) clamp(1rem, 4vw, 1.75rem)",
        borderBottom: `1px solid ${palette.headerBorder}`,
        background: palette.headerBg,
        backdropFilter: "blur(8px)",
        position: sticky ? "sticky" : "static",
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 20 : undefined,
      }}
    >
      <p style={{ margin: 0, fontSize: "0.875rem" }}>
        <Link
          href={backHref}
          style={{ color: palette.link, fontWeight: 600, textDecoration: "none" }}
        >
          {backLabel}
        </Link>
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            style={{
              width: "2.5rem",
              height: "2.5rem",
              objectFit: "contain",
              borderRadius: "10px",
              flexShrink: 0,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          />
        ) : null}
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.05rem, 3.2vw, 1.35rem)",
            fontWeight: 800,
            color: palette.fg,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            flex: "1 1 12rem",
            minWidth: 0,
          }}
        >
          {title}
        </h1>
      </div>
      {subtitle ? (
        <p
          style={{
            margin: "0.45rem 0 0 0",
            fontSize: "0.82rem",
            color: palette.muted,
            lineHeight: 1.45,
            maxWidth: "40rem",
          }}
        >
          {subtitle}
        </p>
      ) : null}
      {badgeText ? (
        <p
          style={{
            margin: "0.45rem 0 0 0",
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: badgeColor || palette.link,
          }}
        >
          {badgeText}
        </p>
      ) : null}
      {children}
    </header>
  );
}
