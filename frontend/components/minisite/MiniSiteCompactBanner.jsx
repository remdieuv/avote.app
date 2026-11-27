"use client";

import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import {
  formatFrenchDisplayText,
  resolveMiniSiteAccent,
} from "@/lib/miniSiteUi";

/**
 * Bandeau compact partagé (sous la nav) — identité événement sur toutes
 * les pages hors Accueil (Participer, Résultats, futurs Journal/Galerie/À propos).
 * Réutilise cover / logo / couleur / titre / statut public existants.
 * @param {{
 *   payload?: Record<string, unknown> | null;
 * }} props
 */
export function MiniSiteCompactBanner({ payload }) {
  if (!payload || typeof payload !== "object") return null;

  const accent = resolveMiniSiteAccent(
    typeof payload.primaryColor === "string" ? payload.primaryColor : null,
  );
  const titleRaw =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Événement";
  const title = formatFrenchDisplayText(titleRaw);
  const cover =
    typeof payload.coverUrl === "string"
      ? resolveApiAssetUrlNullable(payload.coverUrl.trim())
      : null;
  const logo =
    typeof payload.logoUrl === "string"
      ? resolveApiAssetUrlNullable(payload.logoUrl.trim())
      : null;
  const publicStatus =
    payload.publicStatus && typeof payload.publicStatus === "object"
      ? /** @type {Record<string, unknown>} */ (payload.publicStatus)
      : {};
  const statusLabel =
    typeof publicStatus.statusLabel === "string"
      ? publicStatus.statusLabel
      : "Événement";

  return (
    <section
      className="ms-compact-banner"
      aria-label="Identité de l’événement"
      style={{
        position: "relative",
        overflow: "hidden",
        background: cover
          ? "#0f172a"
          : `linear-gradient(145deg, color-mix(in srgb, ${accent} 55%, #0f172a), #0f172a)`,
      }}
    >
      <style>{`
        .ms-compact-banner {
          min-height: 90px;
        }
        @media (min-width: 720px) {
          .ms-compact-banner {
            min-height: 120px;
          }
        }
        .ms-compact-banner__media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ms-compact-banner__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(15, 23, 42, 0.78) 0%,
            rgba(15, 23, 42, 0.55) 55%,
            rgba(15, 23, 42, 0.42) 100%
          );
        }
        .ms-compact-banner__inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          width: 100%;
          max-width: ${marketingContentMaxWidth()};
          margin: 0 auto;
          padding: 0.85rem clamp(1.15rem, 4vw, 2rem);
          box-sizing: border-box;
          color: #fff;
          min-height: inherit;
        }
        .ms-compact-banner__logo {
          flex: 0 0 auto;
          height: 2.35rem;
          width: auto;
          max-width: 6.5rem;
          object-fit: contain;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.92);
          padding: 0.2rem 0.35rem;
        }
        @media (min-width: 720px) {
          .ms-compact-banner__logo {
            height: 2.65rem;
            max-width: 7.5rem;
          }
        }
        .ms-compact-banner__text {
          min-width: 0;
          flex: 1 1 auto;
        }
        .ms-compact-banner__status {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.9;
        }
        .ms-compact-banner__title {
          margin: 0.2rem 0 0;
          font-size: clamp(1.05rem, 3.2vw, 1.35rem);
          line-height: 1.25;
          letter-spacing: -0.02em;
          font-weight: 780;
          overflow-wrap: anywhere;
          word-break: break-word;
          text-shadow: 0 1px 2px rgba(15, 23, 42, 0.35);
        }
      `}</style>

      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="ms-compact-banner__media"
        />
      ) : null}
      <div className="ms-compact-banner__veil" aria-hidden />

      <div className="ms-compact-banner__inner">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="ms-compact-banner__logo"
          />
        ) : null}
        <div className="ms-compact-banner__text">
          <p className="ms-compact-banner__status">{statusLabel}</p>
          <h1 className="ms-compact-banner__title">{title}</h1>
        </div>
      </div>
    </section>
  );
}
