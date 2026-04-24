"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiBaseBrowser } from "@/lib/config";

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
};

export default function SharedAccountReportPage() {
  const params = useParams();
  const raw = params?.token;
  const token = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseBrowser()}/analytics/account/shared/${encodeURIComponent(token)}`,
          { credentials: "omit" },
        );
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
  }, [token]);

  const summary = data?.summary ?? {};
  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const monthly = useMemo(() => (Array.isArray(data?.monthlyEvolution) ? data.monthlyEvolution : []), [data]);
  const best = data?.bestPerformer ?? null;

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem 1rem 2rem", fontFamily: 'system-ui, "Segoe UI", sans-serif', color: "#0f172a" }}>
      <style>{`@media print {.report-actions{display:none!important;} main{padding:0!important;}}`}</style>
      <div className="report-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>
          Rapport readonly {data?.expiresAt ? `· expire le ${new Date(data.expiresAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` : ""}
        </p>
        <button type="button" onClick={() => window.print()} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: "9px", padding: "0.45rem 0.7rem", fontWeight: 700, cursor: "pointer" }}>
          Télécharger PDF
        </button>
      </div>

      <header style={{ ...CARD, padding: "0.85rem", marginBottom: "0.85rem" }}>
        <h1 style={{ margin: "0 0 0.3rem 0", fontSize: "1.35rem", fontWeight: 800 }}>Rapport d’activité AVOTE</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>
          Synthèse multi-événements : engagement, leads et évolution.
        </p>
      </header>

      {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}
      {error ? <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <section style={{ display: "grid", gap: "0.7rem", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginBottom: "0.85rem" }}>
            <Kpi label="Événements" value={summary.totalEvents ?? 0} />
            <Kpi label="Votes" value={summary.totalVotes ?? 0} />
            <Kpi label="Participants" value={summary.totalParticipants ?? 0} />
            <Kpi label="Leads" value={summary.totalLeads ?? 0} />
            <Kpi label="Participation moy." value={`${Number(summary.avgParticipationRatePct ?? 0).toLocaleString("fr-FR")} / participant`} />
            <Kpi label="Conversion lead moy." value={`${Number(summary.avgLeadConversionPct ?? 0).toLocaleString("fr-FR")} %`} />
          </section>

          <section style={{ display: "grid", gap: "0.7rem", gridTemplateColumns: "1.2fr 1fr", marginBottom: "0.85rem" }}>
            <article style={{ ...CARD, padding: "0.8rem" }}>
              <h2 style={{ margin: "0 0 0.45rem 0", fontSize: "0.95rem" }}>Évolution mensuelle</h2>
              <MonthlyBars rows={monthly} />
            </article>
            <article style={{ ...CARD, padding: "0.8rem" }}>
              <h2 style={{ margin: "0 0 0.45rem 0", fontSize: "0.95rem" }}>Best performer</h2>
              {best ? (
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#334155", lineHeight: 1.45 }}>
                  <strong>{best.title}</strong><br />
                  {best.voteCount} votes · {best.participants} participants · {Number(best.participationRatePct).toLocaleString("fr-FR")} / participant
                </p>
              ) : (
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.83rem" }}>Aucun événement.</p>
              )}
            </article>
          </section>

          <section style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <Th>Événement</Th>
                    <Th>Date</Th>
                    <Th>Questions</Th>
                    <Th>Participants</Th>
                    <Th>Votes</Th>
                    <Th>Leads</Th>
                    <Th>Participation</Th>
                    <Th>Conv. lead</Th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <Td>{e.title}</Td>
                      <Td>{new Date(e.createdAt).toLocaleDateString("fr-FR")}</Td>
                      <Td>{e.pollCount}</Td>
                      <Td>{e.participants}</Td>
                      <Td>{e.voteCount}</Td>
                      <Td>{e.leadsCount}</Td>
                      <Td>{Number(e.participationRatePct).toLocaleString("fr-FR")}</Td>
                      <Td>{Number(e.leadConversionPct).toLocaleString("fr-FR")} %</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function Kpi({ label, value }) {
  return (
    <article style={{ ...CARD, padding: "0.65rem 0.75rem" }}>
      <p style={{ margin: "0 0 0.2rem 0", color: "#64748b", fontSize: "0.73rem", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800 }}>{value}</p>
    </article>
  );
}
function Th({ children }) {
  return <th style={{ textAlign: "left", padding: "0.62rem 0.68rem", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.71rem", fontWeight: 800, textTransform: "uppercase" }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: "0.6rem 0.68rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.83rem" }}>{children}</td>;
}
function MonthlyBars({ rows }) {
  if (!rows.length) return <p style={{ margin: 0, color: "#64748b", fontSize: "0.83rem" }}>Aucune activité.</p>;
  const max = Math.max(1, ...rows.map((r) => Number(r.votes || 0)));
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      {rows.map((r) => (
        <div key={r.month} style={{ display: "grid", gridTemplateColumns: "72px 1fr 42px", gap: "0.45rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{r.month}</span>
          <div style={{ height: "8px", borderRadius: "999px", background: "#eef2ff", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(4, Math.round((Number(r.votes || 0) / max) * 100))}%`, background: "#2563eb" }} />
          </div>
          <strong style={{ textAlign: "right", fontSize: "0.75rem" }}>{r.votes}</strong>
        </div>
      ))}
    </div>
  );
}
