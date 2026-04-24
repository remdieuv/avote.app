"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const TYPE_OPTIONS = [
  { value: "ALL", label: "Tous types" },
  { value: "SINGLE", label: "Single" },
  { value: "MULTIPLE", label: "Multiple" },
  { value: "LEAD", label: "Lead" },
  { value: "CONTEST", label: "Contest" },
  { value: "QUIZ", label: "Quiz" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tous états" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "SCHEDULED", label: "Planifié" },
  { value: "ACTIVE", label: "Actif" },
  { value: "CLOSED", label: "Clôturé" },
  { value: "ARCHIVED", label: "Archivé" },
];

const LIVE_OPTIONS = [
  { value: "ALL", label: "Tous live" },
  { value: "WAITING", label: "Attente" },
  { value: "VOTING", label: "Vote" },
  { value: "RESULTS", label: "Résultats" },
  { value: "PAUSED", label: "Pause" },
  { value: "FINISHED", label: "Terminé" },
];

const inputStyle = {
  width: "100%",
  border: "1px solid #dbe3ee",
  background: "#fff",
  borderRadius: "10px",
  padding: "0.48rem 0.56rem",
  color: "#0f172a",
  fontSize: "0.82rem",
  fontWeight: 600,
};

const sectionTitleStyle = {
  margin: "0 0 0.65rem 0",
  color: "#0f172a",
  fontSize: "0.9rem",
  fontWeight: 800,
};

export default function EventAnalyticsPage() {
  const params = useParams();
  const raw = params?.eventId;
  const eventId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [v2Loading, setV2Loading] = useState(false);
  const [v2Error, setV2Error] = useState(null);
  const [v2Data, setV2Data] = useState(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterPollId, setFilterPollId] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterLiveState, setFilterLiveState] = useState("ALL");

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}/analytics`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
        setData(body);
      } catch (e) {
        setData(null);
        setError(e.message || "Chargement impossible.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(max-width: 920px)");
    const apply = () => setIsMobile(m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const params = new URLSearchParams();
    if (filterFrom) params.set("from", `${filterFrom}T00:00:00.000Z`);
    if (filterTo) params.set("to", `${filterTo}T23:59:59.999Z`);
    if (filterPollId && filterPollId !== "ALL") params.set("pollId", filterPollId);
    if (filterType && filterType !== "ALL") params.set("type", filterType);
    if (filterStatus && filterStatus !== "ALL") params.set("status", filterStatus);
    if (filterLiveState && filterLiveState !== "ALL") params.set("liveState", filterLiveState);
    const qs = params.toString();
    (async () => {
      setV2Loading(true);
      setV2Error(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${eventId}/analytics/v2${qs ? `?${qs}` : ""}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
        setV2Data(body);
      } catch (e) {
        setV2Data(null);
        setV2Error(e.message || "Chargement V2 impossible.");
      } finally {
        setV2Loading(false);
      }
    })();
  }, [eventId, filterFrom, filterLiveState, filterPollId, filterStatus, filterTo, filterType]);

  const summary = data?.summary ?? {};
  const questions = useMemo(() => (Array.isArray(data?.questions) ? data.questions : []), [data]);
  const v2Questions = Array.isArray(v2Data?.availableFilters?.questions)
    ? v2Data.availableFilters.questions
    : [];

  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "clamp(1rem, 3vw, 2rem) clamp(0.8rem, 2.2vw, 1.2rem) 3rem",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          marginBottom: "1.15rem",
          alignItems: "center",
        }}
      >
        <Link
          href={`/admin/event/${encodeURIComponent(eventId || "")}`}
          style={{ fontSize: "0.86rem", fontWeight: 600, color: "#64748b", textDecoration: "none" }}
        >
          ← Régie
        </Link>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <Link
          href={`/admin/event/${encodeURIComponent(eventId || "")}/leads`}
          style={{ fontSize: "0.86rem", fontWeight: 600, color: "#16a34a", textDecoration: "none" }}
        >
          Leads
        </Link>
      </div>

      <header
        style={{
          ...CARD,
          padding: "clamp(0.9rem, 2.2vw, 1.2rem)",
          marginBottom: "1rem",
          background: "linear-gradient(180deg, #ffffff, #f8fbff)",
        }}
      >
        <p
          style={{
            margin: "0 0 0.25rem 0",
            color: "#64748b",
            fontSize: "0.79rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {data?.event?.title || "Événement"}
        </p>
        <h1
          style={{
            margin: "0 0 0.4rem 0",
            fontSize: "clamp(1.35rem, 2.4vw, 1.9rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#0f172a",
          }}
        >
          Statistiques de l’événement
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Vue globale des participations et performances par question.
        </p>
      </header>

      {eventId ? (
        <div style={{ marginBottom: "1rem" }}>
          <a
            href={`${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/analytics/export.csv`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.58rem 0.92rem",
              borderRadius: "10px",
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 800,
              fontSize: "0.86rem",
              textDecoration: "none",
            }}
          >
            Export CSV des résultats
          </a>
        </div>
      ) : null}

      {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <section
            style={{
              display: "grid",
              gap: "0.9rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginBottom: "1.05rem",
            }}
          >
            <Kpi label="Participants uniques" value={summary.participantsUnique ?? 0} />
            <Kpi label="Votes totaux" value={summary.totalVotes ?? 0} />
            <Kpi label="Questions" value={summary.questionsCount ?? 0} />
            <Kpi
              label="Taux moyen de participation"
              value={`${Number(summary.avgResponseRatePct ?? 0).toLocaleString("fr-FR")} %`}
            />
          </section>

          <section style={{ ...CARD, padding: "0.95rem", marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 0.75rem 0", fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
              V2 - Analyse avancée
            </p>
            <div
              style={{
                display: "grid",
                gap: "0.55rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
              }}
            >
              <FilterField label="Période (de)">
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={inputStyle} />
              </FilterField>
              <FilterField label="Période (à)">
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={inputStyle} />
              </FilterField>
              <FilterField label="Question">
                <select value={filterPollId} onChange={(e) => setFilterPollId(e.target.value)} style={inputStyle}>
                  <option value="ALL">Toutes</option>
                  {v2Questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      #{Number(q.order ?? 0) + 1} - {q.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Type">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inputStyle}>
                  {TYPE_OPTIONS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="État question">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
                  {STATUS_OPTIONS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="État live">
                <select value={filterLiveState} onChange={(e) => setFilterLiveState(e.target.value)} style={inputStyle}>
                  {LIVE_OPTIONS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </FilterField>
            </div>
            {v2Error ? (
              <p style={{ margin: "0.65rem 0 0 0", color: "#b91c1c", fontWeight: 700 }}>{v2Error}</p>
            ) : null}
          </section>

          {v2Loading ? <p style={{ color: "#64748b", margin: "0 0 1rem 0" }}>Chargement analyse avancée…</p> : null}
          {!v2Loading && v2Data ? (
            <>
              <section style={{ ...CARD, padding: "0.9rem", marginBottom: "0.95rem" }}>
                <h3 style={sectionTitleStyle}>Courbe temporelle ({v2Data?.timeline?.bucketMinutes || 1} min)</h3>
                <TimelineBars points={Array.isArray(v2Data?.timeline?.series) ? v2Data.timeline.series : []} />
              </section>

              <section
                style={{
                  display: "grid",
                  gap: "0.9rem",
                  gridTemplateColumns: isMobile ? "1fr" : "1.25fr 1fr",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ ...CARD, padding: "0.9rem" }}>
                  <h3 style={sectionTitleStyle}>Funnel de participation</h3>
                  <FunnelList rows={Array.isArray(v2Data?.funnel) ? v2Data.funnel : []} />
                </div>
                <div style={{ ...CARD, padding: "0.9rem" }}>
                  <h3 style={sectionTitleStyle}>Segmentation par type</h3>
                  <SegmentsList rows={Array.isArray(v2Data?.segments) ? v2Data.segments : []} />
                </div>
              </section>

              <section
                style={{
                  display: "grid",
                  gap: "0.9rem",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ ...CARD, padding: "0.9rem" }}>
                  <h3 style={sectionTitleStyle}>Questions sous-performantes</h3>
                  <InsightsList rows={Array.isArray(v2Data?.insights?.underperforming) ? v2Data.insights.underperforming : []} />
                </div>
                <div style={{ ...CARD, padding: "0.9rem" }}>
                  <h3 style={sectionTitleStyle}>Top engagement</h3>
                  <InsightsList rows={Array.isArray(v2Data?.insights?.topEngagement) ? v2Data.insights.topEngagement : []} />
                </div>
              </section>
            </>
          ) : null}

          {!isMobile ? (
            <div style={{ ...CARD, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: "1020px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <Th>#</Th>
                    <Th>Question</Th>
                    <Th>Votes</Th>
                    <Th>Taux participation</Th>
                    <Th>Option gagnante</Th>
                    <Th>Détail options</Th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, idx) => {
                    const winner = Array.isArray(q.options)
                      ? [...q.options].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))[0]
                      : null;
                    return (
                      <tr key={q.id || `${idx}`} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fcfdff" }}>
                        <Td>{(q.order ?? idx) + 1}</Td>
                        <Td title={q.label}>
                          <strong style={{ color: "#0f172a", fontWeight: 700 }}>
                            {q.label || `Question ${idx + 1}`}
                          </strong>
                        </Td>
                        <Td>
                          <strong>{q.voteCount ?? 0}</strong>
                        </Td>
                        <Td>
                          <StatPill tone={(q.responseRatePct ?? 0) >= 60 ? "good" : (q.responseRatePct ?? 0) >= 30 ? "mid" : "low"}>
                            {Number(q.responseRatePct ?? 0).toLocaleString("fr-FR")} %
                          </StatPill>
                        </Td>
                        <Td>
                          {winner?.label ? (
                            <span style={{ color: "#0f172a", fontWeight: 700 }}>
                              {winner.label} ({winner.voteCount ?? 0})
                            </span>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>
                          <OptionsCell options={q.options} compact />
                        </Td>
                      </tr>
                    );
                  })}
                  {questions.length === 0 ? (
                    <tr>
                      <Td colSpan={6} subtle>
                        Aucune donnée de vote disponible pour cet événement.
                      </Td>
                    </tr>
                  ) : null}
                </tbody>
                </table>
              </div>
            </div>
          ) : (
            <MobileQuestions questions={questions} />
          )}
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <article
      style={{
        ...CARD,
        padding: "0.95rem 1.05rem",
        background: "linear-gradient(180deg, #ffffff, #f8fafc)",
      }}
    >
      <p style={{ margin: "0 0 0.32rem 0", color: "#64748b", fontSize: "0.8rem", fontWeight: 800 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: "1.48rem",
          lineHeight: 1.2,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </p>
    </article>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "0.75rem 0.9rem",
        fontSize: "0.71rem",
        fontWeight: 800,
        color: "#475569",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: "#f8fafc",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan, subtle, title: titleAttr }) {
  return (
    <td
      colSpan={colSpan}
      title={titleAttr}
      style={{
        padding: "0.75rem 0.9rem",
        fontSize: "0.87rem",
        color: subtle ? "#64748b" : "#0f172a",
        borderBottom: "1px solid #f1f5f9",
        maxWidth: titleAttr ? "360px" : undefined,
        overflow: titleAttr ? "hidden" : undefined,
        textOverflow: titleAttr ? "ellipsis" : undefined,
        whiteSpace: titleAttr ? "nowrap" : undefined,
        textAlign: colSpan ? "center" : undefined,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function StatPill({ children, tone = "mid" }) {
  const ui =
    tone === "good"
      ? { bg: "#dcfce7", border: "#86efac", color: "#166534" }
      : tone === "low"
        ? { bg: "#fff1f2", border: "#fecdd3", color: "#be123c" }
        : { bg: "#fef9c3", border: "#fde68a", color: "#854d0e" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "4rem",
        padding: "0.24rem 0.48rem",
        borderRadius: "999px",
        border: `1px solid ${ui.border}`,
        background: ui.bg,
        color: ui.color,
        fontWeight: 800,
        fontSize: "0.77rem",
      }}
    >
      {children}
    </span>
  );
}

function OptionsCell({ options, compact = false }) {
  if (!Array.isArray(options) || options.length === 0) return "—";
  const sorted = [...options].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
  const top = sorted[0]?.id;
  const shown = compact ? sorted.slice(0, 3) : sorted;
  const hiddenCount = compact ? Math.max(0, sorted.length - shown.length) : 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.32rem" }}>
      {shown.map((o, i) => (
        <span
          key={o?.id || i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.23rem 0.4rem",
            borderRadius: "7px",
            border: `1px solid ${o?.id === top ? "#bfdbfe" : "#e2e8f0"}`,
            background: o?.id === top ? "#eff6ff" : "#f8fafc",
            color: "#334155",
            fontSize: "0.74rem",
            lineHeight: 1.2,
            fontWeight: o?.id === top ? 700 : 600,
          }}
          title={`${o?.label || "Option"}: ${o?.voteCount ?? 0} vote(s)`}
        >
          <span style={{ maxWidth: compact ? "120px" : "190px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {o?.label || "Option"}
          </span>
          <span style={{ color: "#64748b", fontWeight: 700 }}>
            {o?.voteCount ?? 0} ({Number(o?.votePct ?? 0).toLocaleString("fr-FR")} %)
          </span>
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.23rem 0.4rem",
            borderRadius: "7px",
            border: "1px dashed #cbd5e1",
            background: "#fff",
            color: "#64748b",
            fontSize: "0.72rem",
            fontWeight: 700,
          }}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function MobileQuestions({ questions }) {
  const [openId, setOpenId] = useState(null);
  return (
    <section style={{ display: "grid", gap: "0.65rem" }}>
      {questions.map((q, idx) => {
        const id = q.id || String(idx);
        const winner = Array.isArray(q.options)
          ? [...q.options].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))[0]
          : null;
        const isOpen = openId === id;
        return (
          <article key={id} style={{ ...CARD, padding: "0.72rem 0.78rem" }}>
            <button
              type="button"
              onClick={() => setOpenId((prev) => (prev === id ? null : id))}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "grid",
                gap: "0.45rem",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ fontSize: "0.73rem", color: "#64748b", fontWeight: 700 }}>
                  #{(q.order ?? idx) + 1}
                </span>
                <strong
                  style={{
                    color: "#0f172a",
                    fontSize: "0.87rem",
                    lineHeight: 1.25,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {q.label || `Question ${idx + 1}`}
                </strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <MiniPill>{q.voteCount ?? 0} votes</MiniPill>
                <StatPill tone={(q.responseRatePct ?? 0) >= 60 ? "good" : (q.responseRatePct ?? 0) >= 30 ? "mid" : "low"}>
                  {Number(q.responseRatePct ?? 0).toLocaleString("fr-FR")} %
                </StatPill>
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.28rem",
                    fontSize: "0.74rem",
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {isOpen ? "Masquer détail" : "Voir détail"}
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      fontSize: "0.82rem",
                      lineHeight: 1,
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 180ms ease",
                    }}
                  >
                    ▸
                  </span>
                </span>
              </div>
            </button>
            <div
              style={{
                display: "grid",
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                opacity: isOpen ? 1 : 0,
                transition: "grid-template-rows 220ms ease, opacity 180ms ease",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div style={{ marginTop: "0.55rem", display: "grid", gap: "0.45rem" }}>
                <p style={{ margin: 0, fontSize: "0.79rem", color: "#334155", fontWeight: 700 }}>
                  Gagnante: {winner?.label ? `${winner.label} (${winner.voteCount ?? 0})` : "—"}
                </p>
                <OptionsCell options={q.options} />
                </div>
              </div>
            </div>
          </article>
        );
      })}
      {questions.length === 0 ? (
        <article style={{ ...CARD, padding: "0.85rem", color: "#64748b", textAlign: "center" }}>
          Aucune donnée de vote disponible pour cet événement.
        </article>
      ) : null}
    </section>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={{ display: "grid", gap: "0.3rem" }}>
      <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.73rem" }}>{label}</span>
      {children}
    </label>
  );
}

function TimelineBars({ points }) {
  const max = Math.max(1, ...points.map((p) => Number(p?.voteCount || 0)));
  if (!Array.isArray(points) || points.length === 0) {
    return <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Aucune donnée sur la période.</p>;
  }
  return (
    <div style={{ display: "grid", gap: "0.45rem" }}>
      {points.slice(-24).map((p, i) => {
        const val = Number(p?.voteCount || 0);
        const pct = Math.max(3, Math.round((val / max) * 100));
        return (
          <div key={`${p?.bucketStart || i}`} style={{ display: "grid", gridTemplateColumns: "88px 1fr 42px", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>
              {p?.bucketStart ? new Date(p.bucketStart).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
            </span>
            <div style={{ height: "9px", borderRadius: "999px", background: "#eef2ff", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #1d4ed8)" }} />
            </div>
            <strong style={{ fontSize: "0.76rem", color: "#1e293b", textAlign: "right" }}>{val}</strong>
          </div>
        );
      })}
    </div>
  );
}

function FunnelList({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Aucune question à analyser.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => Number(r?.participants || 0)));
  return (
    <div style={{ display: "grid", gap: "0.45rem" }}>
      {rows.map((r, idx) => (
        <div key={r?.questionId || idx} style={{ display: "grid", gap: "0.3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>#{Number(r?.order ?? idx) + 1}</span>
            <strong style={{ fontSize: "0.8rem", color: "#0f172a", flex: 1 }}>{r?.label || `Question ${idx + 1}`}</strong>
            <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>{r?.participants || 0}</span>
          </div>
          <div style={{ height: "8px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(3, Math.round(((r?.participants || 0) / max) * 100))}%`, background: "#0ea5e9" }} />
          </div>
          {idx > 0 ? (
            <span style={{ fontSize: "0.72rem", color: "#be123c", fontWeight: 700 }}>
              Drop-off: {Number(r?.dropOffPct || 0).toLocaleString("fr-FR")} %
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SegmentsList({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Aucune segmentation disponible.</p>;
  }
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {rows.map((r, idx) => (
        <div key={`${r?.type || idx}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: "0.45rem", padding: "0.45rem 0.5rem", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fcfdff" }}>
          <strong style={{ color: "#0f172a", fontSize: "0.8rem", textTransform: "capitalize" }}>{r?.type || "type"}</strong>
          <span style={{ color: "#334155", fontSize: "0.75rem", fontWeight: 700 }}>{r?.questions || 0} q.</span>
          <span style={{ color: "#0f766e", fontSize: "0.75rem", fontWeight: 800 }}>
            {Number(r?.avgResponseRatePct || 0).toLocaleString("fr-FR")} %
          </span>
        </div>
      ))}
    </div>
  );
}

function InsightsList({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Aucun insight pour ce filtre.</p>;
  }
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {rows.map((r, idx) => (
        <div key={r?.id || idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.48rem 0.55rem", background: "#fff" }}>
          <p style={{ margin: "0 0 0.25rem 0", color: "#0f172a", fontWeight: 700, fontSize: "0.8rem" }}>
            #{Number(r?.order ?? idx) + 1} - {r?.label || "Question"}
          </p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.74rem", fontWeight: 700 }}>
            {r?.voteCount || 0} votes · {r?.participants || 0} participants ·{" "}
            {Number(r?.responseRatePct || 0).toLocaleString("fr-FR")} %
          </p>
        </div>
      ))}
    </div>
  );
}

function MiniPill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.21rem 0.43rem",
        borderRadius: "999px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        color: "#334155",
        fontSize: "0.73rem",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}
