"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  formatFrenchDisplayText,
  minisiteResultTypeLabel,
  resolveMiniSiteAccent,
} from "@/lib/miniSiteUi";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import { ResultBarsChart } from "@/components/minisite/MiniSiteResultsCharts";

/**
 * Liste professionnelle des résultats (Lot 2) — pas une duplication du fil Accueil.
 * @param {{
 *   slug: string;
 *   landingPayload?: Record<string, unknown> | null;
 * }} props
 */
export function MiniSiteResultsList({ slug, landingPayload }) {
  const accent = resolveMiniSiteAccent(
    typeof landingPayload?.primaryColor === "string"
      ? landingPayload.primaryColor
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [data, setData] = useState(
    /** @type {null | { isTestMode?: boolean; results?: any[] }} */ (null),
  );

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing/results`,
        { cache: "no-store" },
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 && body?.code === "INVITE_REQUIRED") {
        window.location.replace(
          body.invitePath || `/invite/${encodeURIComponent(slug)}`,
        );
        return;
      }
      if (res.status === 404 && body?.code === "MINISITE_RESULTS_DISABLED") {
        setError("L’onglet Résultats n’est pas disponible pour cet événement.");
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
      setError("Impossible de charger les résultats.");
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

  const results = Array.isArray(data?.results) ? data.results : [];
  const isTestMode = Boolean(data?.isTestMode);

  return (
    <div
      className="ms-results"
      style={{
        maxWidth: marketingContentMaxWidth(),
        margin: "0 auto",
        padding: "1.5rem 1.15rem 2.5rem",
        boxSizing: "border-box",
      }}
    >
      <ResultsStyles accent={accent} />

      <header className="ms-r-header">
        <h1>Résultats</h1>
        <p>
          Restitution des questions publiées — chiffres cumulés, tableaux et
          graphiques.
        </p>
        {isTestMode ? (
          <p className="ms-r-test-badge" role="status">
            Mode test — ces résultats ne sont pas définitifs
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className="ms-r-muted">Chargement des résultats…</p>
      ) : null}
      {error ? <p className="ms-r-error">{error}</p> : null}

      {!loading && !error && results.length === 0 ? (
        <p className="ms-r-muted">
          Aucun résultat publié pour le moment.
        </p>
      ) : null}

      <div className="ms-r-list">
        {results.map((r) => (
          <article key={r.pollId} className="ms-r-item">
            <div className="ms-r-item-head">
              <div>
                <p className="ms-r-type">{minisiteResultTypeLabel(r.type)}</p>
                <h2>{formatFrenchDisplayText(r.question)}</h2>
              </div>
              <Link
                href={`/e/${encodeURIComponent(slug)}/resultats/${encodeURIComponent(r.pollId)}`}
                className="ms-r-link"
              >
                Voir le détail
              </Link>
            </div>
            <div className="ms-r-kpis">
              <div>
                <strong>{Number(r.respondents) || 0}</strong>
                <span>Répondants</span>
              </div>
              <div>
                <strong>{Number(r.answers) || 0}</strong>
                <span>Réponses</span>
              </div>
            </div>
            <ResultBarsChart
              options={r.options || []}
              accent={accent}
              percentMayExceed100={Boolean(r.percentMayExceed100)}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function ResultsStyles({ accent }) {
  return (
    <style>{`
      .ms-r-header h1 {
        margin: 0 0 0.35rem;
        font-size: clamp(1.55rem, 3vw, 2rem);
        font-weight: 780;
        letter-spacing: -0.03em;
        color: #0f172a;
      }
      .ms-r-header p { margin: 0; color: #64748b; font-size: 0.98rem; line-height: 1.45; }
      .ms-r-test-badge {
        display: inline-block;
        margin-top: 0.85rem !important;
        padding: 0.35rem 0.7rem;
        border-radius: 8px;
        background: #fef3c7;
        color: #92400e !important;
        font-size: 0.82rem !important;
        font-weight: 700;
      }
      .ms-r-muted { color: #64748b; margin: 1.25rem 0 0; }
      .ms-r-error { color: #b91c1c; margin: 1.25rem 0 0; }
      .ms-r-list { display: flex; flex-direction: column; gap: 1.75rem; margin-top: 1.75rem; }
      .ms-r-item {
        padding: 1.15rem 0 0;
        border-top: 1px solid rgba(15,23,42,0.08);
      }
      .ms-r-item-head {
        display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem;
        justify-content: space-between; align-items: flex-start;
        margin-bottom: 0.85rem;
      }
      .ms-r-type {
        margin: 0 0 0.2rem;
        font-size: 0.72rem; font-weight: 800;
        letter-spacing: 0.06em; text-transform: uppercase; color: #94a3b8;
      }
      .ms-r-item h2 {
        margin: 0; font-size: 1.15rem; font-weight: 750;
        letter-spacing: -0.02em; color: #0f172a; line-height: 1.3;
        max-width: 40rem;
        overflow-wrap: anywhere; word-break: break-word;
      }
      .ms-results { overflow-x: clip; }
      .ms-r-link {
        flex: 0 0 auto;
        color: ${accent};
        font-weight: 700; font-size: 0.9rem;
        text-decoration: none;
      }
      .ms-r-link:hover { text-decoration: underline; }
      .ms-r-kpis {
        display: flex; gap: 1.5rem; margin: 0 0 1rem;
      }
      .ms-r-kpis strong {
        display: block; font-size: 1.35rem; font-weight: 780;
        font-variant-numeric: tabular-nums; color: #0f172a;
      }
      .ms-r-kpis span { font-size: 0.8rem; color: #64748b; }
      .ms-r-bars { display: flex; flex-direction: column; gap: 0.55rem; }
      .ms-r-bar-label {
        display: flex; justify-content: space-between; gap: 0.75rem;
        font-size: 0.88rem; margin-bottom: 0.2rem;
      }
      .ms-r-bar-label > span:first-child { font-weight: 600; color: #0f172a; }
      .ms-r-bar-meta { color: #64748b; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .ms-r-bar-track {
        height: 10px; border-radius: 6px; background: #e2e8f0; overflow: hidden;
      }
      .ms-r-bar-fill { height: 100%; border-radius: 6px; min-width: 0; transition: width 0.35s ease; }
      .ms-r-note { margin: 0.65rem 0 0; font-size: 0.8rem; color: #64748b; line-height: 1.4; }
    `}</style>
  );
}
