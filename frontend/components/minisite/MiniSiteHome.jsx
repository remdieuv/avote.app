"use client";

import Link from "next/link";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import { resolveMiniSiteAccent } from "@/lib/miniSiteUi";
import { MiniSiteShare } from "@/components/minisite/MiniSiteShare";

/**
 * Accueil mini-site (Lot 1).
 * @param {{
 *   slug: string;
 *   payload: Record<string, unknown>;
 * }} props
 */
export function MiniSiteHome({ slug, payload }) {
  const accent = resolveMiniSiteAccent(
    typeof payload.primaryColor === "string" ? payload.primaryColor : null,
  );
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Événement";
  const description =
    typeof payload.description === "string" && payload.description.trim()
      ? payload.description.trim()
      : null;
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
  const statusHint =
    typeof publicStatus.statusHint === "string"
      ? publicStatus.statusHint
      : null;
  const ctaLabel =
    typeof publicStatus.ctaLabel === "string"
      ? publicStatus.ctaLabel
      : "Participer";
  const participateHref = `/e/${encodeURIComponent(slug)}/participer`;
  const joinHref =
    typeof payload.joinPath === "string" && payload.joinPath.startsWith("/")
      ? payload.joinPath
      : `/join/${encodeURIComponent(slug)}`;
  const ctaHref =
    publicStatus.ctaHrefKind === "home" ? `/e/${encodeURIComponent(slug)}` : joinHref;

  const showStats = payload.miniSiteShowKeyStats !== false;
  const stats =
    showStats && payload.publicStats && typeof payload.publicStats === "object"
      ? /** @type {Record<string, number>} */ (payload.publicStats)
      : null;
  const hasStats =
    stats &&
    (Number(stats.participantsUnique) > 0 ||
      Number(stats.questionsPublic) > 0 ||
      Number(stats.answersPublic) > 0);

  const latestNews =
    payload.latestNews && typeof payload.latestNews === "object"
      ? /** @type {Record<string, unknown>} */ (payload.latestNews)
      : null;
  const newsBody =
    latestNews && typeof latestNews.body === "string"
      ? latestNews.body.trim()
      : "";

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/e/${encodeURIComponent(slug)}`
      : `/e/${encodeURIComponent(slug)}`;

  return (
    <div>
      <section
        className="ms-home-hero"
        style={{
          position: "relative",
          minHeight: "min(42vh, 28rem)",
          maxHeight: "32rem",
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
          background: cover
            ? `#0f172a`
            : `linear-gradient(145deg, color-mix(in srgb, ${accent} 55%, #0f172a), #0f172a)`,
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.72) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: marketingContentMaxWidth(),
            margin: "0 auto",
            padding: "1.75rem clamp(1.15rem, 4vw, 2rem) 1.85rem",
            boxSizing: "border-box",
            color: "#fff",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              style={{
                height: "2.75rem",
                width: "auto",
                maxWidth: "9rem",
                objectFit: "contain",
                marginBottom: "0.85rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.92)",
                padding: "0.25rem 0.4rem",
              }}
            />
          ) : null}
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.88,
            }}
          >
            {statusLabel}
          </p>
          <h1
            style={{
              margin: "0.45rem 0 0",
              fontSize: "clamp(1.65rem, 5vw, 2.45rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              fontWeight: 780,
              maxWidth: "18ch",
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              style={{
                margin: "0.7rem 0 0",
                fontSize: "1.02rem",
                lineHeight: 1.5,
                opacity: 0.92,
                maxWidth: "36rem",
              }}
            >
              {description}
            </p>
          ) : null}
          {statusHint ? (
            <p
              style={{
                margin: "0.65rem 0 0",
                fontSize: "0.88rem",
                opacity: 0.85,
                maxWidth: "34rem",
              }}
            >
              {statusHint}
            </p>
          ) : null}
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.65rem",
              alignItems: "center",
            }}
          >
            <Link
              href={ctaHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.85rem 1.35rem",
                borderRadius: "999px",
                background: accent,
                color: "#fff",
                fontWeight: 750,
                textDecoration: "none",
                boxShadow: `0 10px 28px color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
            >
              {ctaLabel}
            </Link>
            <Link
              href={participateHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.8rem 1.15rem",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                fontWeight: 650,
                textDecoration: "none",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              Comment participer
            </Link>
            <MiniSiteShare url={shareUrl} title={title} accent="#fff" />
          </div>
        </div>
      </section>

      <div
        style={{
          maxWidth: marketingContentMaxWidth(),
          margin: "0 auto",
          padding: "1.5rem clamp(1.15rem, 4vw, 2rem) 0",
          boxSizing: "border-box",
        }}
      >
        {hasStats && stats ? (
          <section
            aria-label="Chiffres clés"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(9.5rem, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                label: "Participants",
                value: Number(stats.participantsUnique) || 0,
              },
              {
                label: "Questions",
                value: Number(stats.questionsPublic) || 0,
              },
              {
                label: "Réponses",
                value: Number(stats.answersPublic) || 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "1rem 1.05rem",
                  borderRadius: "16px",
                  background: "#fff",
                  border: "1px solid rgba(15,23,42,0.06)",
                  boxShadow: "0 10px 28px rgba(15,23,42,0.04)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "1.55rem",
                    fontWeight: 780,
                    letterSpacing: "-0.03em",
                    color: accent,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.value}
                </p>
                <p
                  style={{
                    margin: "0.2rem 0 0",
                    fontSize: "0.82rem",
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {newsBody ? (
          <section
            style={{
              marginBottom: "1.5rem",
              padding: "1.15rem 1.2rem",
              borderRadius: "18px",
              background: "#fff",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 12px 32px rgba(15,23,42,0.04)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Dernière actualité
            </p>
            <p
              style={{
                margin: "0.55rem 0 0",
                fontSize: "1.02rem",
                lineHeight: 1.55,
                color: "#334155",
                whiteSpace: "pre-wrap",
              }}
            >
              {newsBody}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
