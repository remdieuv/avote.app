"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import {
  absoluteMiniSiteUrl,
  excerptFrenchText,
  formatFrenchDisplayText,
  resolveMiniSiteAccent,
} from "@/lib/miniSiteUi";
import { ResultBarsChart } from "@/components/minisite/MiniSiteResultsCharts";
import { MiniSiteShare } from "@/components/minisite/MiniSiteShare";

/**
 * Fil Journal public (Lot 3) — actualités manuelles + auto fiables.
 * @param {{
 *   slug: string;
 *   landingPayload?: Record<string, unknown> | null;
 * }} props
 */
export function MiniSiteJournal({ slug, landingPayload }) {
  const accent = resolveMiniSiteAccent(
    typeof landingPayload?.primaryColor === "string"
      ? landingPayload.primaryColor
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [data, setData] = useState(
    /** @type {null | { isTestMode?: boolean; items?: any[]; totalCount?: number }} */ (
      null
    ),
  );

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing/journal`,
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
        setData(null);
        return;
      }
      if (!res.ok) {
        setError(
          typeof body?.error === "string" ? body.error : `Erreur ${res.status}`,
        );
        setData(null);
        return;
      }
      setData(body);
      setError(null);
    } catch {
      setError("Impossible de charger le journal.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  const items = Array.isArray(data?.items) ? data.items : [];
  const isTestMode = Boolean(data?.isTestMode);

  return (
    <div
      style={{
        maxWidth: marketingContentMaxWidth(),
        margin: "0 auto",
        padding: "1.25rem clamp(1.15rem, 4vw, 2rem) 2.5rem",
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: "1.15rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.55rem",
            fontWeight: 780,
            letterSpacing: "-0.03em",
            color: "#0f172a",
          }}
        >
          Journal
        </h1>
        <p
          style={{
            margin: "0.4rem 0 0",
            fontSize: "0.92rem",
            color: "#64748b",
            lineHeight: 1.45,
          }}
        >
          Actualités de l’événement et moments clés, du plus récent au plus
          ancien.
        </p>
        {isTestMode ? (
          <p
            style={{
              margin: "0.65rem 0 0",
              fontSize: "0.78rem",
              fontWeight: 650,
              color: "#b45309",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "10px",
              padding: "0.45rem 0.65rem",
            }}
          >
            Mode test — ces publications ne sont pas définitives.
          </p>
        ) : null}
      </header>

      {loading ? (
        <p style={{ color: "#64748b" }}>Chargement…</p>
      ) : error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      ) : items.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
          Aucune publication pour le moment.
        </p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.95rem",
          }}
        >
          {items.map((item) => (
            <li key={String(item.id)}>
              <JournalItemCard
                item={item}
                accent={accent}
                slug={slug}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Aperçu Accueil (3 dernières) quand l’onglet Journal est activé.
 * @param {{
 *   slug: string;
 *   items: any[];
 *   accent: string;
 * }} props
 */
export function MiniSiteJournalPreview({ slug, items, accent }) {
  const list = Array.isArray(items) ? items.slice(0, 3) : [];
  const journalHref = `/e/${encodeURIComponent(slug)}/journal`;
  return (
    <section
      aria-label="Aperçu du journal"
      style={{ marginBottom: "1.5rem" }}
      data-testid="minisite-journal-preview"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.15rem",
            fontWeight: 750,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          Journal
        </h2>
        <Link
          href={journalHref}
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: accent,
            textDecoration: "none",
          }}
        >
          Voir le journal
        </Link>
      </div>
      {list.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.92rem" }}>
          Aucune publication pour le moment.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {list.map((item) => (
            <JournalItemCard
              key={String(item.id)}
              item={item}
              accent={accent}
              slug={slug}
              compact
            />
          ))}
        </div>
      )}
    </section>
  );
}

function JournalItemCard({ item, accent, slug, compact = false }) {
  const type = String(item?.type || "");
  const at =
    typeof item?.occurredAt === "string"
      ? formatJournalDate(item.occurredAt)
      : "";

  if (type === "news" && item.news) {
    const title =
      typeof item.news.title === "string" && item.news.title.trim()
        ? item.news.title.trim()
        : "Actualité";
    const body = typeof item.news.body === "string" ? item.news.body : "";
    const image =
      typeof item.news.imageUrl === "string"
        ? resolveApiAssetUrlNullable(item.news.imageUrl.trim())
        : null;
    const sharePath =
      typeof item.news.sharePath === "string" && item.news.sharePath.startsWith("/")
        ? item.news.sharePath
        : item.news.id
          ? `/e/${encodeURIComponent(slug)}/journal/${encodeURIComponent(
              String(item.news.id),
            )}`
          : null;
    const shareUrl = sharePath ? absoluteMiniSiteUrl(sharePath) : "";
    const excerpt = compact ? excerptFrenchText(body, 160) : body;
    const dateLabel =
      typeof item.news.createdAt === "string"
        ? formatJournalDate(item.news.createdAt)
        : at;

    return (
      <article
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(15,23,42,0.06)",
          background: "#fff",
          boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
          overflow: "hidden",
        }}
      >
        {image && !compact ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            style={{
              display: "block",
              width: "100%",
              maxHeight: "min(48vw, 280px)",
              objectFit: "cover",
              background: "#e2e8f0",
            }}
          />
        ) : null}
        <div
          style={{
            padding: compact ? "0.85rem 1rem" : "0.95rem 1.1rem 1.1rem",
            display: compact && image ? "grid" : "block",
            gridTemplateColumns: compact && image ? "72px minmax(0, 1fr)" : undefined,
            gap: compact && image ? "0.75rem" : undefined,
            alignItems: "start",
          }}
        >
          {image && compact ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              style={{
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: 10,
                background: "#e2e8f0",
                display: "block",
              }}
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Actualité{dateLabel ? ` · ${dateLabel}` : ""}
            </p>
            <h3
              style={{
                margin: "0.35rem 0 0",
                fontSize: compact ? "1rem" : "1.08rem",
                fontWeight: 750,
                letterSpacing: "-0.02em",
                color: "#0f172a",
                lineHeight: 1.3,
              }}
            >
              {formatFrenchDisplayText(title)}
            </h3>
            {excerpt ? (
              <p
                style={{
                  margin: "0.45rem 0 0",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                  color: "#334155",
                  whiteSpace: compact ? "normal" : "pre-wrap",
                }}
              >
                {formatFrenchDisplayText(excerpt)}
              </p>
            ) : null}
            <div
              style={{
                marginTop: "0.7rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.55rem",
                alignItems: "center",
              }}
            >
              {sharePath ? (
                <Link
                  href={sharePath}
                  style={{
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    color: accent,
                    textDecoration: "none",
                  }}
                >
                  {compact ? "Lire la suite" : "Voir l’actualité"}
                </Link>
              ) : null}
              {shareUrl ? (
                <MiniSiteShare
                  url={shareUrl}
                  title={title}
                  accent={accent}
                  size="compact"
                  label="Partager"
                />
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (type === "auto_question" && item.auto) {
    const question =
      typeof item.auto.question === "string" ? item.auto.question : "Question";
    return (
      <article
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(15,23,42,0.06)",
          background: "#fff",
          boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
          padding: compact ? "0.85rem 1rem" : "0.95rem 1.1rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {item.auto.label || "Nouvelle question"}
          {at ? ` · ${at}` : ""}
        </p>
        <p
          style={{
            margin: "0.4rem 0 0",
            fontSize: "1.02rem",
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.35,
          }}
        >
          {formatFrenchDisplayText(question)}
        </p>
      </article>
    );
  }

  if (type === "auto_result" && item.auto) {
    const question =
      typeof item.auto.question === "string" ? item.auto.question : "Question";
    const result = item.result && typeof item.result === "object" ? item.result : null;
    const options = Array.isArray(result?.options) ? result.options : [];
    const href =
      result?.pollId || item.auto.pollId
        ? `/e/${encodeURIComponent(slug)}/resultats/${encodeURIComponent(
            String(result?.pollId || item.auto.pollId),
          )}`
        : null;
    return (
      <article
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(15,23,42,0.06)",
          background: "#fff",
          boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
          padding: compact ? "0.85rem 1rem" : "0.95rem 1.1rem 1.1rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {item.auto.label || "Résultat publié"}
          {at ? ` · ${at}` : ""}
        </p>
        <h3
          style={{
            margin: "0.4rem 0 0",
            fontSize: compact ? "1rem" : "1.05rem",
            fontWeight: 750,
            color: "#0f172a",
            lineHeight: 1.3,
          }}
        >
          {formatFrenchDisplayText(question)}
        </h3>
        {!compact && options.length > 0 ? (
          <div style={{ marginTop: "0.75rem" }}>
            <ResultBarsChart
              options={options.map((o) => ({
                id: String(o.id || o.label),
                label: String(o.label || ""),
                answers: Number(o.answers ?? o.votes) || 0,
                percent: Number(o.percent) || 0,
                isCorrect: Boolean(o.isCorrect),
              }))}
              accent={accent}
              percentMayExceed100={Boolean(result?.percentMayExceed100)}
            />
          </div>
        ) : null}
        {href ? (
          <p style={{ margin: "0.65rem 0 0" }}>
            <Link
              href={href}
              style={{
                fontSize: "0.86rem",
                fontWeight: 700,
                color: accent,
                textDecoration: "none",
              }}
            >
              Voir le détail
            </Link>
          </p>
        ) : null}
      </article>
    );
  }

  return null;
}

function formatJournalDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
