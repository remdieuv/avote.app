"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export default function EventAnalyticsPage() {
  const params = useParams();
  const raw = params?.eventId;
  const eventId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

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

  const summary = data?.summary ?? {};
  const questions = useMemo(() => (Array.isArray(data?.questions) ? data.questions : []), [data]);

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "clamp(1rem, 3vw, 1.75rem) clamp(0.75rem, 2vw, 1rem) 2.5rem",
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

      <header style={{ marginBottom: "1.1rem" }}>
        <h1
          style={{
            margin: "0 0 0.35rem 0",
            fontSize: "clamp(1.3rem, 2.2vw, 1.55rem)",
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
        <a
          href={`${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/analytics/export.csv`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            marginBottom: "1rem",
            padding: "0.5rem 0.8rem",
            borderRadius: "10px",
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
          }}
        >
          Export CSV des résultats
        </a>
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
              gap: "0.8rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: "1rem",
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

          <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
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
                      <tr key={q.id || `${idx}`}>
                        <Td>{(q.order ?? idx) + 1}</Td>
                        <Td title={q.label}>{q.label || `Question ${idx + 1}`}</Td>
                        <Td>{q.voteCount ?? 0}</Td>
                        <Td>{Number(q.responseRatePct ?? 0).toLocaleString("fr-FR")} %</Td>
                        <Td>
                          {winner?.label ? `${winner.label} (${winner.voteCount ?? 0})` : "—"}
                        </Td>
                        <Td>
                          {Array.isArray(q.options) && q.options.length > 0
                            ? q.options
                                .map(
                                  (o) =>
                                    `${o.label || "Option"}: ${o.voteCount ?? 0} (${Number(
                                      o.votePct ?? 0,
                                    ).toLocaleString("fr-FR")} %)`,
                                )
                                .join(" | ")
                            : "—"}
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
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <article style={{ ...CARD, padding: "0.8rem 0.95rem" }}>
      <p style={{ margin: "0 0 0.2rem 0", color: "#64748b", fontSize: "0.78rem", fontWeight: 700 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: "1.3rem",
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
        padding: "0.72rem 0.85rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "#64748b",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderBottom: "1px solid #e2e8f0",
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
        padding: "0.65rem 0.85rem",
        fontSize: "0.86rem",
        color: subtle ? "#64748b" : "#0f172a",
        borderBottom: "1px solid #f1f5f9",
        maxWidth: titleAttr ? "280px" : undefined,
        overflow: titleAttr ? "hidden" : undefined,
        textOverflow: titleAttr ? "ellipsis" : undefined,
        whiteSpace: titleAttr ? "nowrap" : undefined,
        textAlign: colSpan ? "center" : undefined,
      }}
    >
      {children}
    </td>
  );
}
