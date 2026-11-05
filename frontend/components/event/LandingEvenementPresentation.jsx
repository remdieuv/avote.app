"use client";

import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { splitLandingMessageParagraphs } from "@/lib/landingEventPresentation";

/**
 * Présentation visuelle V3 « ✨ L'événement » —
 * méta, message organisateur, programme, galerie, remerciements.
 * Fil hors périmètre.
 */

function IconCalendar({ color = "#2563eb" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="2.5"
        stroke={color}
        strokeWidth="1.75"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPin({ color = "#2563eb" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0012 4.3a6.5 6.5 0 00-6.5 6.5C5.5 15.6 12 21 12 21z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.8" r="2.2" stroke={color} strokeWidth="1.75" />
    </svg>
  );
}

function IconClock({ color = "#2563eb" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke={color} strokeWidth="1.75" />
      <path
        d="M12 8v4.5l3 1.8"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconProgram({ color = "#2563eb" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="3.5"
        width="16"
        height="17"
        rx="2.5"
        stroke={color}
        strokeWidth="1.75"
      />
      <path
        d="M8 8h8M8 12h8M8 16h5"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconGallery({ color = "#2563eb" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="2.5"
        stroke={color}
        strokeWidth="1.75"
      />
      <circle cx="9" cy="10" r="1.6" fill={color} />
      <path
        d="M3.8 16.2l4.2-3.4 3.1 2.4 3.4-4.2 5.5 5.2"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaCard({ label, value, icon, accent }) {
  if (!value) return null;
  return (
    <li className="ev-evenement-meta-card">
      <span
        className="ev-evenement-meta-icon"
        style={{
          background: `color-mix(in srgb, ${accent} 12%, #fff)`,
          color: accent,
        }}
      >
        {icon}
      </span>
      <span className="ev-evenement-meta-text">
        <span className="ev-evenement-meta-label">{label}</span>
        <span className="ev-evenement-meta-value">{value}</span>
      </span>
    </li>
  );
}

function normalizeMessagePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  const out = [];
  for (const p of photos) {
    const url =
      typeof p?.url === "string"
        ? resolveApiAssetUrlNullable(p.url.trim())
        : null;
    if (!url) continue;
    out.push({
      id: String(p.id ?? url),
      url,
      caption:
        typeof p?.caption === "string" && p.caption.trim()
          ? p.caption.trim()
          : null,
    });
  }
  return out;
}

function MessageStoryCard({
  variant,
  eyebrow,
  subtitle,
  heading,
  body,
  photos = [],
  showFinishedBadge = false,
  accent,
  onOpenPhoto,
  testId,
}) {
  const paragraphs = splitLandingMessageParagraphs(body);
  const media = normalizeMessagePhotos(photos);
  if (!paragraphs.length && !heading) return null;
  const isThanks = variant === "thanks";
  const tone = isThanks ? "#16a34a" : accent;
  const initial = isThanks ? "♥" : "A";

  return (
    <article
      className={
        isThanks
          ? "ev-evenement-story ev-evenement-story--thanks"
          : "ev-evenement-story"
      }
      data-testid={testId}
      style={{ "--ev-story-tone": tone }}
    >
      <header className="ev-evenement-story-header">
        <div className="ev-evenement-story-brand">
          <span
            className="ev-evenement-story-avatar"
            style={{ background: tone }}
            aria-hidden="true"
          >
            {initial}
          </span>
          <span>
            <span className="ev-evenement-story-eyebrow">{eyebrow}</span>
            {subtitle ? (
              <span className="ev-evenement-story-subtitle">{subtitle}</span>
            ) : null}
          </span>
        </div>
        {showFinishedBadge ? (
          <span
            className="ev-evenement-story-badge"
            style={{
              color: tone,
              background: `color-mix(in srgb, ${tone} 12%, #fff)`,
            }}
          >
            ✓ Événement terminé
          </span>
        ) : null}
      </header>
      <div
        className={
          media.length > 0
            ? "ev-evenement-story-grid"
            : "ev-evenement-story-grid ev-evenement-story-grid--text-only"
        }
      >
        <div className="ev-evenement-story-copy">
          {heading ? (
            <h3 className="ev-evenement-story-heading">{heading}</h3>
          ) : null}
          {paragraphs.map((p, i) => (
            <p key={`p-${i}`} className="ev-evenement-story-p">
              {p}
            </p>
          ))}
        </div>
        {media.length > 0 ? (
          <div
            className={`ev-evenement-story-media ev-evenement-story-media--${Math.min(media.length, 3)}`}
          >
            {media.map((p) => (
              <figure key={p.id} className="ev-evenement-story-figure">
                <button
                  type="button"
                  className="ev-evenement-story-photo-btn"
                  aria-label="Agrandir la photo"
                  onClick={() => onOpenPhoto?.(p.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption || ""} loading="lazy" />
                </button>
                {p.caption ? (
                  <figcaption className="ev-evenement-gallery-caption">
                    {p.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/**
 * @param {{
 *   accent: string;
 *   title?: string;
 *   lead: string;
 *   afterLive?: boolean;
 *   landingEventDate?: string;
 *   landingVenue?: string;
 *   landingHours?: string;
 *   introTitle?: string;
 *   introBody?: string;
 *   introPhotos?: Array<{ id?: string; url?: string; caption?: string | null }>;
 *   thanksTitle?: string;
 *   thanksBody?: string;
 *   thanksPhotos?: Array<{ id?: string; url?: string; caption?: string | null }>;
 *   programItems?: Array<{ id?: string; timeLabel?: string; title?: string }>;
 *   showcasePhotos?: Array<{ id?: string; url?: string; caption?: string | null }>;
 *   onOpenPhoto?: (photoId: string) => void;
 * }} props
 */
export function LandingEvenementPresentation({
  accent,
  title = "L'événement",
  lead,
  afterLive = false,
  landingEventDate = "",
  landingVenue = "",
  landingHours = "",
  introTitle = "",
  introBody = "",
  introPhotos = [],
  thanksTitle = "",
  thanksBody = "",
  thanksPhotos = [],
  programItems = [],
  showcasePhotos = [],
  onOpenPhoto,
}) {
  const showMeta = Boolean(
    landingEventDate || landingVenue || landingHours,
  );
  const showProgram = Array.isArray(programItems) && programItems.length > 0;
  const photoEntries = normalizeMessagePhotos(showcasePhotos);
  const showGallery = photoEntries.length > 0;
  const showIntro = Boolean(String(introBody || "").trim());
  const showThanks = afterLive && Boolean(String(thanksBody || "").trim());
  if (!showMeta && !showProgram && !showGallery && !showIntro && !showThanks) {
    return null;
  }

  const metaCount =
    Number(Boolean(landingEventDate)) +
    Number(Boolean(landingVenue)) +
    Number(Boolean(landingHours));

  return (
    <section
      className="ev-evenement-v2"
      data-testid="landing-evenement-section"
      style={{ "--ev-accent": accent }}
    >
      <header className="ev-evenement-v2-header">
        <h2 className="ev-evenement-v2-title">
          <span aria-hidden="true">✨</span> {title}
        </h2>
        {lead ? <p className="ev-evenement-v2-lead">{lead}</p> : null}
      </header>

      {showMeta ? (
        <ul
          className={`ev-evenement-meta ev-evenement-meta--${metaCount}`}
          data-testid="landing-evenement-meta"
        >
          <MetaCard
            label="Date"
            value={landingEventDate}
            accent={accent}
            icon={<IconCalendar color={accent} />}
          />
          <MetaCard
            label="Lieu"
            value={landingVenue}
            accent={accent}
            icon={<IconPin color={accent} />}
          />
          <MetaCard
            label="Horaires"
            value={landingHours}
            accent={accent}
            icon={<IconClock color={accent} />}
          />
        </ul>
      ) : null}

      {showIntro ? (
        <MessageStoryCard
          variant="intro"
          eyebrow="Message de l'organisateur"
          subtitle="Présentation de l'événement"
          heading={introTitle}
          body={introBody}
          photos={introPhotos}
          showFinishedBadge={afterLive}
          accent={accent}
          onOpenPhoto={onOpenPhoto}
          testId="landing-evenement-intro"
        />
      ) : null}

      {showProgram || showGallery ? (
        <div
          className={
            showProgram && showGallery
              ? "ev-evenement-body ev-evenement-body--split"
              : "ev-evenement-body"
          }
        >
          {showProgram ? (
            <article
              className="ev-evenement-panel"
              data-testid="landing-evenement-program"
            >
              <h3 className="ev-evenement-panel-title">
                <span
                  className="ev-evenement-panel-icon"
                  style={{ color: accent }}
                >
                  <IconProgram color={accent} />
                </span>
                Programme
              </h3>
              <ol className="ev-evenement-timeline">
                {programItems.map((step) => {
                  const time = String(step?.timeLabel || "").trim();
                  const stepTitle = String(step?.title || "").trim();
                  if (!time || !stepTitle) return null;
                  return (
                    <li
                      key={String(step.id || `${time}-${stepTitle}`)}
                      className="ev-evenement-timeline-item"
                    >
                      <span
                        className="ev-evenement-timeline-dot"
                        style={{ background: accent }}
                        aria-hidden="true"
                      />
                      <div className="ev-evenement-timeline-row">
                        <span
                          className="ev-evenement-time-pill"
                          style={{
                            background: `color-mix(in srgb, ${accent} 12%, #fff)`,
                            color: accent,
                          }}
                        >
                          {time}
                        </span>
                        <span className="ev-evenement-step-title">
                          {stepTitle}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </article>
          ) : null}

          {showGallery ? (
            <article
              className="ev-evenement-panel"
              data-testid="landing-evenement-gallery"
            >
              <h3 className="ev-evenement-panel-title">
                <span
                  className="ev-evenement-panel-icon"
                  style={{ color: accent }}
                >
                  <IconGallery color={accent} />
                </span>
                Galerie de l&apos;événement
              </h3>
              <div className="ev-evenement-gallery-grid">
                {photoEntries.map((p) => (
                  <figure key={p.id} className="ev-evenement-gallery-item">
                    <button
                      type="button"
                      className="ev-evenement-gallery-btn"
                      aria-label="Agrandir la photo"
                      onClick={() => onOpenPhoto?.(p.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption || ""}
                        loading="lazy"
                      />
                    </button>
                    {p.caption ? (
                      <figcaption className="ev-evenement-gallery-caption">
                        {p.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {showThanks ? (
        <MessageStoryCard
          variant="thanks"
          eyebrow="Merci à tous !"
          subtitle="Message de clôture et remerciements"
          heading={thanksTitle}
          body={thanksBody}
          photos={thanksPhotos}
          showFinishedBadge
          accent={accent}
          onOpenPhoto={onOpenPhoto}
          testId="landing-evenement-thanks"
        />
      ) : null}

      <style>{`
        .ev-evenement-v2 {
          margin-bottom: clamp(1.75rem, 5vw, 2.5rem);
        }
        .ev-evenement-story {
          margin: 0 0 1.1rem;
          background: #fff;
          border-radius: 18px;
          border: 1px solid rgba(15, 23, 42, 0.05);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
          padding: 1.1rem 1.15rem 1.2rem;
          box-sizing: border-box;
        }
        .ev-evenement-story-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem 1rem;
          margin-bottom: 0.95rem;
        }
        .ev-evenement-story-brand {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-width: 0;
        }
        .ev-evenement-story-avatar {
          width: 2.35rem;
          height: 2.35rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 0.95rem;
          flex: 0 0 auto;
        }
        .ev-evenement-story-eyebrow {
          display: block;
          font-size: 0.98rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .ev-evenement-story-subtitle {
          display: block;
          margin-top: 0.12rem;
          font-size: 0.78rem;
          color: #94a3b8;
          font-weight: 550;
        }
        .ev-evenement-story-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.3rem 0.65rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .ev-evenement-story-grid {
          display: grid;
          gap: 1rem;
        }
        @media (min-width: 860px) {
          .ev-evenement-story-grid:not(.ev-evenement-story-grid--text-only) {
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.95fr);
            align-items: start;
          }
        }
        .ev-evenement-story-heading {
          margin: 0 0 0.55rem;
          font-size: clamp(1.05rem, 2.4vw, 1.2rem);
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.3;
        }
        .ev-evenement-story-p {
          margin: 0 0 0.7rem;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #475569;
          white-space: pre-wrap;
        }
        .ev-evenement-story-p:last-child {
          margin-bottom: 0;
        }
        .ev-evenement-story-media {
          display: grid;
          gap: 0.65rem;
          min-width: 0;
        }
        .ev-evenement-story-media--2,
        .ev-evenement-story-media--3 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .ev-evenement-story-media--1 {
          grid-template-columns: 1fr;
        }
        .ev-evenement-story-figure {
          margin: 0;
          min-width: 0;
        }
        .ev-evenement-story-photo-btn {
          display: block;
          width: 100%;
          padding: 0;
          margin: 0;
          border: none;
          background: transparent;
          cursor: zoom-in;
          border-radius: 14px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }
        .ev-evenement-story-media--1 .ev-evenement-story-photo-btn {
          aspect-ratio: 16 / 10;
        }
        .ev-evenement-story-photo-btn img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ev-evenement-v2-header {
          margin-bottom: 1.15rem;
        }
        .ev-evenement-v2-title {
          margin: 0;
          font-size: clamp(1.45rem, 4vw, 1.85rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #0f172a;
          line-height: 1.15;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .ev-evenement-v2-lead {
          margin: 0.45rem 0 0;
          font-size: 0.95rem;
          color: #64748b;
          max-width: 36rem;
          line-height: 1.45;
        }

        .ev-evenement-meta {
          list-style: none;
          margin: 0 0 1.1rem;
          padding: 0;
          display: grid;
          gap: 0.75rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .ev-evenement-meta--2,
          .ev-evenement-meta--3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 900px) {
          .ev-evenement-meta--3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .ev-evenement-meta--2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .ev-evenement-meta-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(15, 23, 42, 0.05);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
          min-width: 0;
        }
        .ev-evenement-meta-icon {
          flex: 0 0 auto;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ev-evenement-meta-text {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
          min-width: 0;
        }
        .ev-evenement-meta-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.01em;
        }
        .ev-evenement-meta-value {
          font-size: 0.95rem;
          font-weight: 750;
          color: #0f172a;
          line-height: 1.3;
          word-break: break-word;
        }

        .ev-evenement-body {
          display: grid;
          gap: 1rem;
        }
        @media (min-width: 900px) {
          .ev-evenement-body--split {
            grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.15fr);
            align-items: start;
            gap: 1.15rem;
          }
        }
        .ev-evenement-panel {
          background: #fff;
          border-radius: 18px;
          border: 1px solid rgba(15, 23, 42, 0.05);
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.05);
          padding: 1.05rem 1.1rem 1.15rem;
          box-sizing: border-box;
          min-width: 0;
        }
        .ev-evenement-panel-title {
          margin: 0 0 0.9rem;
          font-size: 1.02rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ev-evenement-panel-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .ev-evenement-timeline {
          list-style: none;
          margin: 0;
          padding: 0 0 0 0.15rem;
          display: grid;
          gap: 0.85rem;
          position: relative;
        }
        .ev-evenement-timeline::before {
          content: "";
          position: absolute;
          left: 0.42rem;
          top: 0.35rem;
          bottom: 0.35rem;
          width: 2px;
          background: color-mix(in srgb, var(--ev-accent, #2563eb) 28%, #e2e8f0);
          border-radius: 999px;
        }
        .ev-evenement-timeline-item {
          position: relative;
          padding-left: 1.45rem;
          min-width: 0;
        }
        .ev-evenement-timeline-dot {
          position: absolute;
          left: 0.18rem;
          top: 0.72rem;
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 999px;
          box-shadow: 0 0 0 3px #fff;
        }
        .ev-evenement-timeline-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.55rem 0.7rem;
          padding: 0.55rem 0.75rem;
          border-radius: 12px;
          background: #f8fafc;
        }
        .ev-evenement-time-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.22rem 0.55rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.01em;
          flex: 0 0 auto;
        }
        .ev-evenement-step-title {
          font-size: 0.95rem;
          font-weight: 650;
          color: #0f172a;
          line-height: 1.35;
          min-width: 0;
        }

        .ev-evenement-gallery-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.7rem;
        }
        @media (max-width: 479px) {
          .ev-evenement-gallery-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (min-width: 1100px) {
          .ev-evenement-gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .ev-evenement-gallery-item {
          margin: 0;
          min-width: 0;
        }
        .ev-evenement-gallery-btn {
          display: block;
          width: 100%;
          padding: 0;
          margin: 0;
          border: none;
          background: transparent;
          cursor: zoom-in;
          border-radius: 14px;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }
        .ev-evenement-gallery-btn img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ev-evenement-gallery-btn:hover img {
            transform: scale(1.03);
          }
        }
        .ev-evenement-gallery-caption {
          margin: 0.4rem 0 0;
          font-size: 0.8rem;
          font-weight: 550;
          line-height: 1.35;
          color: #64748b;
        }
      `}</style>
    </section>
  );
}
