"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatFrenchDisplayText } from "@/lib/miniSiteUi";

/**
 * Graphiques SVG Lot 2 — axes, grille, points, infobulles (desktop + mobile).
 */

/**
 * Barres horizontales des scores cumulés.
 * Styles inclus ici pour réutilisation (Journal, Accueil, etc.).
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
        const pctLabel = formatFrenchDisplayText(
          `${pct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`,
        );
        return (
          <div key={opt.id} className="ms-r-bar-row">
            <div className="ms-r-bar-label">
              <span>
                {formatFrenchDisplayText(String(opt.label || ""))}
                {opt.isCorrect ? " ✓" : ""}
              </span>
              <span className="ms-r-bar-meta">
                {Number(opt.answers) || 0}
                {" · "}
                {pctLabel}
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
      <style>{`
        .ms-r-bars { display: flex; flex-direction: column; gap: 0.55rem; }
        .ms-r-bar-label {
          display: flex; justify-content: space-between; align-items: baseline;
          gap: 0.75rem; font-size: 0.88rem; margin-bottom: 0.2rem;
        }
        .ms-r-bar-label > span:first-child {
          font-weight: 600; color: #0f172a; min-width: 0; flex: 1 1 auto;
        }
        .ms-r-bar-meta {
          color: #64748b; font-variant-numeric: tabular-nums;
          white-space: nowrap; flex: 0 0 auto;
        }
        .ms-r-bar-track {
          height: 10px; border-radius: 6px; background: #e2e8f0; overflow: hidden;
        }
        .ms-r-bar-fill {
          height: 100%; border-radius: 6px; min-width: 0; transition: width 0.35s ease;
        }
        .ms-r-note { margin: 0.65rem 0 0; font-size: 0.8rem; color: #64748b; line-height: 1.4; }
      `}</style>
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

  const series = useMemo(() => {
    const respKey =
      mode === "period" ? "periodRespondents" : "cumulativeRespondents";
    const ansKey = mode === "period" ? "periodAnswers" : "cumulativeAnswers";
    return [
      {
        id: "respondents",
        label: mode === "period" ? "Répondants (période)" : "Répondants (cumulé)",
        color: accent,
        dash: null,
        values: points.map((p) => Number(p[respKey]) || 0),
      },
      {
        id: "answers",
        label: mode === "period" ? "Réponses (période)" : "Réponses (cumulé)",
        color: "#475569",
        dash: "5 4",
        values: points.map((p) => Number(p[ansKey]) || 0),
      },
    ];
  }, [points, mode, accent]);

  if (points.length === 0) return null;

  const yMax = niceCeil(
    Math.max(1, ...series.flatMap((s) => s.values)),
  );
  const overlapIdentical =
    series[0].values.length > 0 &&
    series[0].values.every((v, i) => v === series[1].values[i]);

  const title =
    mode === "period"
      ? "Nouveaux répondants et réponses par période"
      : "Évolution cumulée des répondants et réponses";

  return (
    <HistoryLineChart
      title={title}
      buckets={points.map((p) => p.bucketStart)}
      series={series}
      yMax={yMax}
      yTickFormat={(v) => String(v)}
      unitLabel=""
      overlapNote={
        overlapIdentical
          ? "Les courbes se superposent : répondants et réponses sont identiques à chaque date."
          : null
      }
      offsetIdenticalSeries
    />
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
  if (points.length === 0 || opts.length === 0) return null;

  const palette = buildPalette(accent, opts.length);
  const lineSeries = opts.map((opt, oi) => ({
    id: String(opt.id),
    label: String(opt.label || "Choix"),
    color: palette[oi],
    dash: null,
    values: points.map((p) => {
      const row = (p.options || []).find(
        (o) => String(o.optionId) === String(opt.id),
      );
      return Number(row?.cumulativePercent) || 0;
    }),
  }));

  const rawMax = Math.max(0, ...lineSeries.flatMap((s) => s.values));
  // Axe 0–100 % ; étendu uniquement si des valeurs dépassent (choix multiple).
  const yMax = rawMax > 100 ? niceCeil(rawMax) : 100;

  return (
    <HistoryLineChart
      title="Évolution des proportions cumulées par choix"
      buckets={points.map((p) => p.bucketStart)}
      series={lineSeries}
      yMax={yMax}
      yTickFormat={(v) => `${v}\u00A0%`}
      unitLabel="%"
      leadNote={disclaimer || null}
      footNote={
        percentMayExceed100
          ? "Choix multiple : les pourcentages sont relatifs aux répondants et peuvent dépasser 100\u00A0% au total."
          : null
      }
    />
  );
}

/**
 * @param {{
 *   title: string;
 *   buckets: string[];
 *   series: { id: string; label: string; color: string; dash?: string | null; values: number[] }[];
 *   yMax: number;
 *   yTickFormat: (v: number) => string;
 *   unitLabel?: string;
 *   leadNote?: string | null;
 *   footNote?: string | null;
 *   overlapNote?: string | null;
 *   offsetIdenticalSeries?: boolean;
 * }} props
 */
function HistoryLineChart({
  title,
  buckets,
  series,
  yMax,
  yTickFormat,
  unitLabel = "",
  leadNote = null,
  footNote = null,
  overlapNote = null,
  offsetIdenticalSeries = false,
}) {
  const uid = useId();
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [active, setActive] = useState(
    /** @type {number | null} */ (null),
  );
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setNarrow(Boolean(mq.matches));
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  const n = buckets.length;
  /** ViewBox large : width 100% + height auto → pleine largeur du conteneur. */
  const w = 720;
  const h = narrow ? 380 : 300;
  const pad = narrow
    ? { t: 18, r: 14, b: 58, l: 52 }
    : { t: 16, r: 12, b: 52, l: 48 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const yTicks = buildYTicks(yMax);
  const xTickIdx = pickXTickIndexes(n);

  const xAt = useCallback(
    (i) =>
      pad.l +
      (n <= 1 ? innerW / 2 : (i / Math.max(1, n - 1)) * innerW),
    [n, innerW, pad.l],
  );
  const yAt = useCallback(
    (v) => pad.t + innerH - (Math.max(0, Math.min(v, yMax)) / yMax) * innerH,
    [pad.t, innerH, yMax],
  );

  /** Décalage vertical léger si deux séries sont égales (évite superposition totale). */
  const seriesOffset = (si, i) => {
    if (!offsetIdenticalSeries || series.length < 2) return 0;
    const a = series[0].values[i];
    const b = series[1].values[i];
    if (a !== b) return 0;
    if (si === 0) return -3;
    if (si === 1) return 3;
    return 0;
  };

  const pickIndexFromClientX = useCallback(
    (clientX) => {
      const el = wrapRef.current;
      if (!el || n === 0) return null;
      const rect = el.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / Math.max(1, rect.width)) * w;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < n; i += 1) {
        const d = Math.abs(xAt(i) - svgX);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
    [n, w, xAt],
  );

  const onPointer = (e) => {
    const idx = pickIndexFromClientX(e.clientX);
    if (idx != null) setActive(idx);
  };

  const activeX = active != null ? xAt(active) : null;
  const activePct =
    activeX != null ? (activeX / w) * 100 : 50;
  /** Alignement auto : évite la troncature à gauche/droite (surtout mobile). */
  const tooltipAlign =
    activePct <= 32 ? "start" : activePct >= 68 ? "end" : "center";

  return (
    <div className="ms-r-chart" aria-label={title}>
      <p className="ms-r-chart-title">{title}</p>
      {leadNote ? <p className="ms-r-note">{leadNote}</p> : null}
      {overlapNote ? <p className="ms-r-note">{overlapNote}</p> : null}

      <div
        ref={wrapRef}
        className="ms-r-chart-frame"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setActive(null)}
        role="img"
        aria-describedby={`${uid}-desc`}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="ms-r-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grille + axe Y */}
          {yTicks.map((tick) => {
            const y = yAt(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={pad.l}
                  y1={y}
                  x2={pad.l + innerW}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={pad.l - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="ms-r-tick"
                >
                  {yTickFormat(tick)}
                </text>
              </g>
            );
          })}

          {/* Axe X */}
          <line
            x1={pad.l}
            y1={pad.t + innerH}
            x2={pad.l + innerW}
            y2={pad.t + innerH}
            stroke="#cbd5e1"
            strokeWidth="1.25"
          />
          <line
            x1={pad.l}
            y1={pad.t}
            x2={pad.l}
            y2={pad.t + innerH}
            stroke="#cbd5e1"
            strokeWidth="1.25"
          />

          {xTickIdx.map((i) => {
            const x = xAt(i);
            const label = formatBucketAxis(buckets[i]);
            const anchor =
              i === 0 ? "start" : i === n - 1 ? "end" : "middle";
            return (
              <g key={`x-${i}`}>
                <line
                  x1={x}
                  y1={pad.t + innerH}
                  x2={x}
                  y2={pad.t + innerH + 5}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={h - 12}
                  textAnchor={anchor}
                  className="ms-r-tick ms-r-tick-x"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Guide actif */}
          {activeX != null ? (
            <line
              x1={activeX}
              y1={pad.t}
              x2={activeX}
              y2={pad.t + innerH}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ) : null}

          {/* Courbes + points */}
          {series.map((s, si) => {
            const d = s.values
              .map((v, i) => {
                const x = xAt(i);
                const y = yAt(v) + seriesOffset(si, i);
                return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <g key={s.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dash || undefined}
                />
                {s.values.map((v, i) => {
                  const x = xAt(i);
                  const y = yAt(v) + seriesOffset(si, i);
                  const isActive = active === i;
                  return (
                    <circle
                      key={`${s.id}-${i}`}
                      cx={x}
                      cy={y}
                      r={isActive ? 5 : n === 1 ? 5 : 3.2}
                      fill={si === 1 && offsetIdenticalSeries ? "#fff" : s.color}
                      stroke={s.color}
                      strokeWidth={si === 1 && offsetIdenticalSeries ? 2 : 0}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {active != null && buckets[active] ? (
          <div
            className={`ms-r-tooltip ms-r-tooltip--${tooltipAlign}`}
            style={
              tooltipAlign === "center"
                ? { left: `${activePct}%` }
                : undefined
            }
          >
            <p className="ms-r-tooltip-date">
              {formatBucketTooltip(buckets[active])}
            </p>
            <ul>
              {series.map((s) => (
                <li key={s.id}>
                  <span
                    className="ms-r-tooltip-swatch"
                    style={{ background: s.color }}
                  />
                  <span className="ms-r-tooltip-label">{s.label}</span>
                  <strong>
                    {formatValue(s.values[active], unitLabel)}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p id={`${uid}-desc`} className="ms-r-sr-only">
        Touchez ou survolez le graphique pour afficher la date et les valeurs.
      </p>

      <ul className="ms-r-legend">
        {series.map((s) => (
          <li key={s.id}>
            <span
              style={{
                background: s.color,
                backgroundImage: s.dash
                  ? `repeating-linear-gradient(90deg,${s.color} 0 4px,transparent 4px 8px)`
                  : undefined,
              }}
            />{" "}
            {s.label}
          </li>
        ))}
      </ul>
      {footNote ? <p className="ms-r-note">{footNote}</p> : null}

      <style>{`
        .ms-r-chart {
          width: 100%;
        }
        .ms-r-chart-frame {
          position: relative;
          touch-action: pan-y;
          cursor: crosshair;
          margin-top: 0.35rem;
          width: 100%;
          overflow: visible;
        }
        .ms-r-svg {
          width: 100%;
          height: auto;
          display: block;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        .ms-r-tick {
          font-size: 13px;
          fill: #64748b;
          font-family: "Segoe UI", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif;
        }
        .ms-r-tick-x { font-size: 12.5px; }
        @media (max-width: 640px) {
          .ms-r-tick { font-size: 16px; }
          .ms-r-tick-x { font-size: 15px; }
          .ms-r-tooltip { font-size: 0.88rem; }
        }
        .ms-r-tooltip {
          position: absolute;
          top: 8px;
          z-index: 2;
          box-sizing: border-box;
          width: max-content;
          max-width: calc(100% - 16px);
          padding: 0.6rem 0.75rem;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.95);
          color: #f8fafc;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.22);
          pointer-events: none;
          font-size: 0.82rem;
          line-height: 1.4;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .ms-r-tooltip--center {
          transform: translateX(-50%);
        }
        .ms-r-tooltip--start {
          left: 8px !important;
          right: auto;
          transform: none;
        }
        .ms-r-tooltip--end {
          right: 8px;
          left: auto !important;
          transform: none;
        }
        .ms-r-tooltip-date {
          margin: 0 0 0.4rem;
          font-weight: 700;
          color: #e2e8f0;
          white-space: normal;
        }
        .ms-r-tooltip ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .ms-r-tooltip li {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          gap: 0.45rem;
          align-items: start;
        }
        .ms-r-tooltip-swatch {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          margin-top: 0.3rem;
        }
        .ms-r-tooltip-label {
          color: #cbd5e1;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .ms-r-tooltip strong {
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          white-space: nowrap;
        }
        .ms-r-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          border: 0;
        }
      `}</style>
    </div>
  );
}

/** @param {number} max */
function niceCeil(max) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  if (max <= 5) return 5;
  if (max <= 10) return 10;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = Math.ceil(max / pow);
  if (n <= 2) return 2 * pow;
  if (n <= 5) return 5 * pow;
  return 10 * pow;
}

/** @param {number} yMax */
function buildYTicks(yMax) {
  const steps = 4;
  /** @type {number[]} */
  const ticks = [];
  for (let i = 0; i <= steps; i += 1) {
    ticks.push(Math.round((yMax * i) / steps));
  }
  return [...new Set(ticks)];
}

/** @param {number} n */
function pickXTickIndexes(n) {
  if (n <= 0) return [];
  if (n === 1) return [0];
  if (n === 2) return [0, 1];
  if (n <= 5) return Array.from({ length: n }, (_, i) => i);
  const mid = Math.floor((n - 1) / 2);
  const q1 = Math.floor((n - 1) / 4);
  const q3 = Math.floor((3 * (n - 1)) / 4);
  return [...new Set([0, q1, mid, q3, n - 1])].sort((a, b) => a - b);
}

/** @param {string | null | undefined} iso */
function formatBucketAxis(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}\n${time}`.replace("\n", " · ");
}

/** @param {string | null | undefined} iso */
function formatBucketTooltip(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** @param {number} v @param {string} unit */
function formatValue(v, unit) {
  const n = Number(v) || 0;
  const s = n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return unit ? `${s}\u00A0${unit}` : s;
}

/** @param {string} accent @param {number} n */
function buildPalette(accent, n) {
  const base = [
    accent,
    "#0284c7",
    "#d97706",
    "#be123c",
    "#0f766e",
    "#7c3aed",
    "#4d7c0f",
    "#0e7490",
  ];
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(base[i % base.length]);
  return out;
}
