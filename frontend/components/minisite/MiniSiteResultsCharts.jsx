"use client";

/**
 * Graphiques SVG légers pour la restitution résultats (Lot 2).
 * Pas de dépendance chart — performance et contrôle des libellés.
 */

/**
 * Barres horizontales des scores cumulés.
 * @param {{
 *   options: { id: string; label: string; answers: number; percent: number; isCorrect?: boolean }[];
 *   accent: string;
 *   percentMayExceed100?: boolean;
 * }} props
 */
export function ResultBarsChart({ options, accent, percentMayExceed100 }) {
  const rows = Array.isArray(options) ? options : [];
  const maxPct = Math.max(
    100,
    ...rows.map((o) => Number(o?.percent) || 0),
    1,
  );
  return (
    <div className="ms-r-bars" aria-label="Graphique des résultats">
      {rows.map((opt) => {
        const pct = Number(opt.percent) || 0;
        const width = Math.min(100, (pct / maxPct) * 100);
        return (
          <div key={opt.id} className="ms-r-bar-row">
            <div className="ms-r-bar-label">
              <span>
                {opt.label}
                {opt.isCorrect ? " ✓" : ""}
              </span>
              <span className="ms-r-bar-meta">
                {Number(opt.answers) || 0}
                {" · "}
                {pct.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })}
                %
              </span>
            </div>
            <div className="ms-r-bar-track">
              <div
                className="ms-r-bar-fill"
                style={{
                  width: `${width}%`,
                  background: accent,
                }}
              />
            </div>
          </div>
        );
      })}
      {percentMayExceed100 ? (
        <p className="ms-r-note">
          Choix multiple : le total des pourcentages peut dépasser 100&nbsp;%
          (base = répondants).
        </p>
      ) : null}
    </div>
  );
}

/**
 * Courbe d’évolution volume (répondants / réponses).
 * @param {{
 *   volume: { bucketStart: string; cumulativeRespondents: number; cumulativeAnswers: number; periodRespondents?: number; periodAnswers?: number }[];
 *   accent: string;
 *   mode?: "cumulative" | "period";
 * }} props
 */
export function VolumeHistoryChart({ volume, accent, mode = "cumulative" }) {
  const points = Array.isArray(volume) ? volume : [];
  if (points.length < 2) return null;

  const w = 640;
  const h = 200;
  const pad = { t: 16, r: 16, b: 28, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const ys = points.map((p) =>
    mode === "period"
      ? Math.max(
          Number(p.periodRespondents) || 0,
          Number(p.periodAnswers) || 0,
        )
      : Math.max(
          Number(p.cumulativeRespondents) || 0,
          Number(p.cumulativeAnswers) || 0,
        ),
  );
  const yMax = Math.max(1, ...ys);

  const xAt = (i) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v) => pad.t + innerH - (v / yMax) * innerH;

  const pathFor = (key) =>
    points
      .map((p, i) => {
        const v =
          mode === "period"
            ? Number(p[key === "resp" ? "periodRespondents" : "periodAnswers"]) ||
              0
            : Number(
                p[key === "resp" ? "cumulativeRespondents" : "cumulativeAnswers"],
              ) || 0;
        return `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`;
      })
      .join(" ");

  const title =
    mode === "period"
      ? "Nouveaux répondants et réponses par période"
      : "Évolution cumulée des répondants et réponses";

  return (
    <div className="ms-r-chart" aria-label={title}>
      <p className="ms-r-chart-title">{title}</p>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" className="ms-r-svg">
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={pad.l + innerW}
          y2={pad.t + innerH}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <path
          d={pathFor("resp")}
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d={pathFor("ans")}
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        <text x={pad.l} y={h - 6} fontSize="11" fill="#94a3b8">
          {formatBucketShort(points[0]?.bucketStart)}
        </text>
        <text
          x={pad.l + innerW}
          y={h - 6}
          fontSize="11"
          fill="#94a3b8"
          textAnchor="end"
        >
          {formatBucketShort(points[points.length - 1]?.bucketStart)}
        </text>
      </svg>
      <ul className="ms-r-legend">
        <li>
          <span style={{ background: accent }} /> Répondants
          {mode === "period" ? " (période)" : " (cumulé)"}
        </li>
        <li>
          <span
            style={{
              background: "#64748b",
              backgroundImage:
                "repeating-linear-gradient(90deg,#64748b 0 4px,transparent 4px 8px)",
            }}
          />{" "}
          Réponses
          {mode === "period" ? " (période)" : " (cumulé)"}
        </li>
      </ul>
    </div>
  );
}

/**
 * Évolution des proportions cumulées par choix.
 * @param {{
 *   series: { bucketStart: string; options: { optionId: string; cumulativePercent: number }[] }[];
 *   options: { id: string; label: string }[];
 *   accent: string;
 *   disclaimer?: string;
 *   percentMayExceed100?: boolean;
 * }} props
 */
export function ProportionsHistoryChart({
  series,
  options,
  accent,
  disclaimer,
  percentMayExceed100,
}) {
  const points = Array.isArray(series) ? series : [];
  const opts = Array.isArray(options) ? options : [];
  if (points.length < 2 || opts.length === 0) return null;

  const palette = buildPalette(accent, opts.length);
  const w = 640;
  const h = 220;
  const pad = { t: 16, r: 16, b: 28, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const yMax = percentMayExceed100
    ? Math.max(
        100,
        ...points.flatMap((p) =>
          (p.options || []).map((o) => Number(o.cumulativePercent) || 0),
        ),
      )
    : 100;

  const xAt = (i) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v) => pad.t + innerH - (Math.min(v, yMax) / yMax) * innerH;

  return (
    <div
      className="ms-r-chart"
      aria-label="Évolution des proportions cumulées par choix"
    >
      <p className="ms-r-chart-title">
        Évolution des proportions cumulées par choix
      </p>
      {disclaimer ? <p className="ms-r-note">{disclaimer}</p> : null}
      <svg viewBox={`0 0 ${w} ${h}`} role="img" className="ms-r-svg">
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={pad.l + innerW}
          y2={pad.t + innerH}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {opts.map((opt, oi) => {
          const d = points
            .map((p, i) => {
              const row = (p.options || []).find(
                (o) => String(o.optionId) === String(opt.id),
              );
              const pct = Number(row?.cumulativePercent) || 0;
              return `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(pct).toFixed(1)}`;
            })
            .join(" ");
          return (
            <path
              key={opt.id}
              d={d}
              fill="none"
              stroke={palette[oi]}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <ul className="ms-r-legend">
        {opts.map((opt, oi) => (
          <li key={opt.id}>
            <span style={{ background: palette[oi] }} /> {opt.label}
          </li>
        ))}
      </ul>
      {percentMayExceed100 ? (
        <p className="ms-r-note">
          Choix multiple : les pourcentages sont relatifs aux répondants et
          peuvent dépasser 100&nbsp;% au total.
        </p>
      ) : null}
    </div>
  );
}

/** @param {string | null | undefined} iso */
function formatBucketShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** @param {string} accent @param {number} n */
function buildPalette(accent, n) {
  const base = [
    accent,
    "#0ea5e9",
    "#f59e0b",
    "#64748b",
    "#14b8a6",
    "#e11d48",
    "#8b5cf6",
    "#84cc16",
  ];
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(base[i % base.length]);
  return out;
}
