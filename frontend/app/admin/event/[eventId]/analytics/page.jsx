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

export default function EventAnalyticsPage() {
  const params = useParams();
  const raw = params?.eventId;
  const eventId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

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

  const summary = data?.summary ?? {};
  const questions = useMemo(() => (Array.isArray(data?.questions) ? data.questions : []), [data]);

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
