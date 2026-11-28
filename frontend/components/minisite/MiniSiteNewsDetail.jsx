"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import {
  absoluteMiniSiteUrl,
  formatFrenchDisplayText,
  resolveMiniSiteAccent,
} from "@/lib/miniSiteUi";
import { MiniSiteShare } from "@/components/minisite/MiniSiteShare";

/**
 * Page individuelle d’une actualité Journal (Lot 3 finition).
 * @param {{
 *   slug: string;
 *   messageId: string;
 *   landingPayload?: Record<string, unknown> | null;
 * }} props
 */
export function MiniSiteNewsDetail({ slug, messageId, landingPayload }) {
  const accent = resolveMiniSiteAccent(
    typeof landingPayload?.primaryColor === "string"
      ? landingPayload.primaryColor
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [news, setNews] = useState(/** @type {null | Record<string, unknown>} */ (null));

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing/journal/${encodeURIComponent(messageId)}`,
        { cache: "no-store" },
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 && body?.code === "INVITE_REQUIRED") {
        window.location.replace(
          body.invitePath || `/invite/${encodeURIComponent(slug)}`,
        );
        return;
      }
      if (res.status === 404 && body?.code === "MINISITE_JOURNAL_DISABLED") {
        setError("L’onglet Journal n’est pas disponible pour cet événement.");
        setNews(null);
        return;
      }
      if (!res.ok) {
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Actualité introuvable.",
        );
        setNews(null);
        return;
      }
      setNews(body?.news && typeof body.news === "object" ? body.news : null);
      setError(null);
    } catch {
      setError("Impossible de charger l’actualité.");
      setNews(null);
    } finally {
      setLoading(false);
    }
  }, [slug, messageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title =
    news && typeof news.title === "string" && news.title.trim()
      ? news.title.trim()
      : "Actualité";
  const bodyText =
    news && typeof news.body === "string" ? news.body : "";
  const image =
    news && typeof news.imageUrl === "string"
      ? resolveApiAssetUrlNullable(news.imageUrl.trim())
      : null;
  const sharePath =
    news && typeof news.sharePath === "string" && news.sharePath.startsWith("/")
      ? news.sharePath
      : `/e/${encodeURIComponent(slug)}/journal/${encodeURIComponent(messageId)}`;
  const shareUrl = absoluteMiniSiteUrl(sharePath);
  const createdAt =
    news && typeof news.createdAt === "string" ? news.createdAt : null;
  const dateLabel = createdAt ? formatNewsDate(createdAt) : "";

  return (
    <div
      style={{
        maxWidth: marketingContentMaxWidth(),
        margin: "0 auto",
        padding: "1.25rem clamp(1.15rem, 4vw, 2rem) 2.5rem",
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: "0 0 1rem" }}>
        <Link
          href={`/e/${encodeURIComponent(slug)}/journal`}
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: accent,
            textDecoration: "none",
          }}
        >
          ← Retour au journal
        </Link>
      </p>

      {loading ? (
        <p style={{ color: "#64748b" }}>Chargement…</p>
      ) : error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      ) : !news ? (
        <p style={{ color: "#64748b" }}>Actualité introuvable.</p>
      ) : (
        <article>
          {dateLabel ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              {dateLabel}
            </p>
          ) : null}
          <h1
            style={{
              margin: "0.45rem 0 0",
              fontSize: "1.65rem",
              fontWeight: 780,
              letterSpacing: "-0.03em",
              color: "#0f172a",
              lineHeight: 1.25,
            }}
          >
            {formatFrenchDisplayText(title)}
          </h1>
          <div
            style={{
              marginTop: "0.85rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.55rem",
              alignItems: "center",
            }}
          >
            <MiniSiteShare
              url={shareUrl}
              title={title}
              accent={accent}
              label="Partager"
            />
          </div>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              style={{
                display: "block",
                width: "100%",
                marginTop: "1.15rem",
                maxHeight: "min(62vw, 420px)",
                objectFit: "cover",
                borderRadius: 16,
                background: "#e2e8f0",
              }}
            />
          ) : null}
          {bodyText ? (
            <p
              style={{
                margin: "1.15rem 0 0",
                fontSize: "1.05rem",
                lineHeight: 1.65,
                color: "#334155",
                whiteSpace: "pre-wrap",
              }}
            >
              {formatFrenchDisplayText(bodyText)}
            </p>
          ) : null}
        </article>
      )}
    </div>
  );
}

function formatNewsDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
