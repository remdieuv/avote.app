"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  minisiteResultTypeLabel,
  resolveMiniSiteAccent,
} from "@/lib/miniSiteUi";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import { MiniSiteShare } from "@/components/minisite/MiniSiteShare";
import {
  ProportionsHistoryChart,
  ResultBarsChart,
  VolumeHistoryChart,
} from "@/components/minisite/MiniSiteResultsCharts";

/**
 * Page de restitution détaillée d’une question (Lot 2).
 * @param {{
 *   slug: string;
 *   pollId: string;
 *   landingPayload?: Record<string, unknown> | null;
 * }} props
 */
export function MiniSiteResultDetail({ slug, pollId, landingPayload }) {
  const accent = resolveMiniSiteAccent(
    typeof landingPayload?.primaryColor === "string"
      ? landingPayload.primaryColor
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [result, setResult] = useState(/** @type {any} */ (null));
  const [history, setHistory] = useState(/** @type {any} */ (null));
  const [isTestMode, setIsTestMode] = useState(false);
  const [volumeMode, setVolumeMode] = useState(
    /** @type {"cumulative" | "period"} */ ("cumulative"),
  );

  const loadDetail = useCallback(
    async (opts = { withHistory: true }) => {
      try {
        const qs = opts.withHistory ? "?history=1" : "";
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing/results/${encodeURIComponent(pollId)}${qs}`,
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
          setResult(null);
          return;
        }
        if (!res.ok) {
          setError(
            typeof body?.error === "string"
              ? body.error
              : `Erreur ${res.status}`,
          );
          setResult(null);
          return;
        }
        setResult(body.result || null);
        setIsTestMode(Boolean(body.isTestMode));
        if (opts.withHistory && body.history) {
          setHistory(body.history);
        }
        setError(null);
      } catch {
        setError("Impossible de charger ce résultat.");
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [slug, pollId],
  );

  useEffect(() => {
    void loadDetail({ withHistory: true });
  }, [loadDetail]);

  // Soft refresh : agrégats seulement (pas l’historique complet).
  useEffect(() => {
    const id = window.setInterval(() => {
      void loadDetail({ withHistory: false });
    }, 45_000);
    return () => window.clearInterval(id);
  }, [loadDetail]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/e/${encodeURIComponent(slug)}/resultats/${encodeURIComponent(pollId)}`
      : result?.sharePath
        ? result.sharePath
        : "";

  const showHistory =
    history &&
    history.hasHistory === true &&
    Array.isArray(history.volume) &&
    history.volume.length >= 2;

  return (
    <div
      className="ms-result-detail"
      style={{
        maxWidth: marketingContentMaxWidth(),
        margin: "0 auto",
        padding: "1.5rem 1.15rem 2.5rem",
        boxSizing: "border-box",
      }}
    >
      <DetailStyles accent={accent} />

      <p className="ms-rd-back">
        <Link href={`/e/${encodeURIComponent(slug)}/resultats`}>
          ← Tous les résultats
        </Link>
      </p>

      {loading ? <p className="ms-r-muted">Chargement…</p> : null}
      {error ? <p className="ms-r-error">{error}</p> : null}

      {result ? (
        <>
          <header className="ms-rd-header">
            <p className="ms-r-type">{minisiteResultTypeLabel(result.type)}</p>
            <h1>{result.question}</h1>
            {isTestMode ? (
              <p className="ms-r-test-badge" role="status">
                Mode test — ces résultats ne sont pas définitifs
              </p>
            ) : null}
            <div className="ms-rd-actions">
              <MiniSiteShare
                url={
                  shareUrl.startsWith("http")
                    ? shareUrl
                    : typeof window !== "undefined"
                      ? `${window.location.origin}${result.sharePath || ""}`
                      : result.sharePath || ""
                }
                title={result.question}
                accent={accent}
              />
            </div>
          </header>

          <div className="ms-r-kpis">
            <div>
              <strong>{Number(result.respondents) || 0}</strong>
              <span>Répondants</span>
            </div>
            <div>
              <strong>{Number(result.answers) || 0}</strong>
              <span>Réponses</span>
            </div>
          </div>

          <section className="ms-rd-section">
            <h2>Résultats cumulés</h2>
            <ResultBarsChart
              options={result.options || []}
              accent={accent}
              percentMayExceed100={Boolean(result.percentMayExceed100)}
            />
          </section>

          <section className="ms-rd-section">
            <h2>Tableau</h2>
            <div className="ms-rd-table-wrap">
              <table className="ms-rd-table">
                <thead>
                  <tr>
                    <th>Choix</th>
                    <th>Réponses</th>
                    <th>
                      %
                      {result.percentBase === "respondents"
                        ? " des répondants"
                        : " des réponses"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(result.options || []).map((opt) => (
                    <tr key={opt.id}>
                      <td>
                        {opt.label}
                        {opt.isCorrect ? " ✓" : ""}
                      </td>
                      <td>{Number(opt.answers) || 0}</td>
                      <td>
                        {(Number(opt.percent) || 0).toLocaleString("fr-FR", {
                          maximumFractionDigits: 1,
                        })}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.percentMayExceed100 ? (
              <p className="ms-r-note">
                Choix multiple : le total des pourcentages peut dépasser
                100&nbsp;% (base = répondants).
              </p>
            ) : null}
          </section>

          {showHistory ? (
            <>
              <section className="ms-rd-section">
                <div className="ms-rd-section-head">
                  <h2>Évolution dans le temps</h2>
                  <div className="ms-rd-toggle" role="group" aria-label="Type de données">
                    <button
                      type="button"
                      className={
                        volumeMode === "cumulative" ? "is-active" : undefined
                      }
                      onClick={() => setVolumeMode("cumulative")}
                    >
                      Cumulé
                    </button>
                    <button
                      type="button"
                      className={
                        volumeMode === "period" ? "is-active" : undefined
                      }
                      onClick={() => setVolumeMode("period")}
                    >
                      Par période
                    </button>
                  </div>
                </div>
                <p className="ms-r-note">
                  Granularité :{" "}
                  {history.granularity === "day" ? "quotidienne" : "horaire"}
                  . Les courbes « cumulé » et « par période » sont distinctes.
                </p>
                <VolumeHistoryChart
                  volume={history.volume}
                  accent={accent}
                  mode={volumeMode}
                />
              </section>

              <section className="ms-rd-section">
                <ProportionsHistoryChart
                  series={history.options || []}
                  options={(result.options || []).map((o) => ({
                    id: o.id,
                    label: o.label,
                  }))}
                  accent={accent}
                  disclaimer={
                    typeof history.disclaimer === "string"
                      ? history.disclaimer
                      : undefined
                  }
                  percentMayExceed100={Boolean(history.percentMayExceed100)}
                />
              </section>
            </>
          ) : (
            <section className="ms-rd-section">
              <h2>Évolution dans le temps</h2>
              <p className="ms-r-muted">
                Pas encore assez de données pour afficher une évolution
                fiable.
              </p>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function DetailStyles({ accent }) {
  return (
    <style>{`
      .ms-rd-back { margin: 0 0 1rem; }
      .ms-rd-back a {
        color: #64748b; font-weight: 650; font-size: 0.9rem; text-decoration: none;
      }
      .ms-rd-back a:hover { color: ${accent}; }
      .ms-rd-header h1 {
        margin: 0 0 0.5rem;
        font-size: clamp(1.45rem, 3vw, 1.9rem);
        font-weight: 780; letter-spacing: -0.03em; color: #0f172a; line-height: 1.25;
      }
      .ms-rd-actions { margin-top: 0.85rem; }
      .ms-r-type {
        margin: 0 0 0.25rem;
        font-size: 0.72rem; font-weight: 800;
        letter-spacing: 0.06em; text-transform: uppercase; color: #94a3b8;
      }
      .ms-r-test-badge {
        display: inline-block; margin: 0.65rem 0 0;
        padding: 0.35rem 0.7rem; border-radius: 8px;
        background: #fef3c7; color: #92400e;
        font-size: 0.82rem; font-weight: 700;
      }
      .ms-r-kpis {
        display: flex; gap: 1.75rem; margin: 1.35rem 0 0.5rem;
      }
      .ms-r-kpis strong {
        display: block; font-size: 1.45rem; font-weight: 780;
        font-variant-numeric: tabular-nums; color: #0f172a;
      }
      .ms-r-kpis span { font-size: 0.8rem; color: #64748b; }
      .ms-rd-section { margin-top: 2rem; }
      .ms-rd-section h2 {
        margin: 0 0 0.75rem; font-size: 1.05rem; font-weight: 750; color: #0f172a;
      }
      .ms-rd-section-head {
        display: flex; flex-wrap: wrap; gap: 0.75rem;
        justify-content: space-between; align-items: center;
        margin-bottom: 0.5rem;
      }
      .ms-rd-section-head h2 { margin: 0; }
      .ms-rd-toggle {
        display: inline-flex; border: 1px solid #e2e8f0; border-radius: 999px;
        overflow: hidden; background: #fff;
      }
      .ms-rd-toggle button {
        border: 0; background: transparent; padding: 0.4rem 0.85rem;
        font-size: 0.8rem; font-weight: 650; color: #64748b; cursor: pointer;
      }
      .ms-rd-toggle button.is-active {
        background: ${accent}; color: #fff;
      }
      .ms-rd-table-wrap { overflow-x: auto; }
      .ms-rd-table {
        width: 100%; border-collapse: collapse; font-size: 0.92rem;
      }
      .ms-rd-table th, .ms-rd-table td {
        text-align: left; padding: 0.65rem 0.5rem;
        border-bottom: 1px solid #e2e8f0;
      }
      .ms-rd-table th {
        font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;
        color: #94a3b8; font-weight: 750;
      }
      .ms-rd-table td:nth-child(2),
      .ms-rd-table td:nth-child(3),
      .ms-rd-table th:nth-child(2),
      .ms-rd-table th:nth-child(3) {
        text-align: right; font-variant-numeric: tabular-nums;
      }
      .ms-r-muted { color: #64748b; margin: 0.75rem 0 0; }
      .ms-r-error { color: #b91c1c; margin: 0.75rem 0 0; }
      .ms-r-note { margin: 0.55rem 0 0.85rem; font-size: 0.8rem; color: #64748b; line-height: 1.4; }
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
      .ms-r-bar-fill { height: 100%; border-radius: 6px; transition: width 0.35s ease; }
      .ms-r-chart { margin-top: 0.5rem; }
      .ms-r-chart-title {
        margin: 0 0 0.5rem; font-size: 0.92rem; font-weight: 700; color: #334155;
      }
      .ms-r-svg { width: 100%; height: auto; display: block; background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; }
      .ms-r-legend {
        list-style: none; margin: 0.65rem 0 0; padding: 0;
        display: flex; flex-wrap: wrap; gap: 0.65rem 1rem;
        font-size: 0.8rem; color: #64748b;
      }
      .ms-r-legend li { display: inline-flex; align-items: center; gap: 0.35rem; }
      .ms-r-legend span {
        width: 10px; height: 10px; border-radius: 2px; display: inline-block;
      }
    `}</style>
  );
}
