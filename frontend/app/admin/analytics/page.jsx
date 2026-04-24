"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
};

export default function AdminAccountAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shareHours, setShareHours] = useState("168");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [shareLinks, setShareLinks] = useState([]);
  const [revokeBusyId, setRevokeBusyId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", `${fromDate}T00:00:00.000Z`);
    if (toDate) params.set("to", `${toDate}T23:59:59.999Z`);
    const qs = params.toString();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/analytics/account${qs ? `?${qs}` : ""}`);
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
  }, [fromDate, toDate]);

  const loadShareLinks = async () => {
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/analytics/account/share-links`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
      setShareLinks(Array.isArray(body.links) ? body.links : []);
    } catch {
      setShareLinks([]);
    }
  };

  useEffect(() => {
    void loadShareLinks();
  }, []);

  const summary = data?.summary ?? {};
  const events = useMemo(() => (Array.isArray(data?.events) ? data.events : []), [data]);
  const monthly = useMemo(() => (Array.isArray(data?.monthlyEvolution) ? data.monthlyEvolution : []), [data]);
  const benchmarks = useMemo(() => (Array.isArray(data?.benchmarks) ? data.benchmarks : []), [data]);
  const best = data?.bestPerformer ?? null;

  const exportHref = `${apiBaseBrowser()}/analytics/account/export.csv?${new URLSearchParams({
    ...(fromDate ? { from: `${fromDate}T00:00:00.000Z` } : {}),
    ...(toDate ? { to: `${toDate}T23:59:59.999Z` } : {}),
  }).toString()}`;

  const generateShareLink = async () => {
    setShareLoading(true);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/analytics/account/share-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresInHours: Number(shareHours || 168),
          ...(fromDate ? { from: `${fromDate}T00:00:00.000Z` } : {}),
          ...(toDate ? { to: `${toDate}T23:59:59.999Z` } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
      const url = `${window.location.origin}${body.readonlyUrl}`;
      setShareUrl(url);
      setShareExpiresAt(body.expiresAt || "");
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      await loadShareLinks();
    } catch (e) {
      setShareUrl("");
      setShareExpiresAt("");
      setError(e.message || "Impossible de générer le lien.");
    } finally {
      setShareLoading(false);
    }
  };

  const revokeShareLink = async (shareId) => {
    setRevokeBusyId(shareId);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/analytics/account/share-links/${encodeURIComponent(shareId)}/revoke`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
      await loadShareLinks();
    } catch (e) {
      setError(e.message || "Révocation impossible.");
    } finally {
      setRevokeBusyId(null);
    }
  };

  return (
    <main style={{ maxWidth: "1220px", margin: "0 auto", padding: "1rem 1rem 2.2rem", fontFamily: 'system-ui, "Segoe UI", sans-serif' }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
        <Link href="/admin/events" style={{ color: "#64748b", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem" }}>
          ← Mes événements
        </Link>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", fontWeight: 800 }}>
          Dashboard compte
        </h1>
      </div>

      <section style={{ ...CARD, padding: "0.9rem", marginBottom: "0.95rem" }}>
        <div style={{ display: "grid", gap: "0.55rem", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <FilterField label="Période (de)">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          </FilterField>
          <FilterField label="Période (à)">
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          </FilterField>
          <div style={{ display: "flex", alignItems: "end", gap: "0.45rem", flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setFromDate(""); setToDate(""); }} style={ghostBtnStyle}>
              Réinitialiser
            </button>
            <a href={exportHref} style={ghostBtnStyle}>
              Export CSV multi-events
            </a>
          </div>
        </div>
        <div style={{ marginTop: "0.7rem", display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#64748b", fontSize: "0.75rem", fontWeight: 700 }}>
            Durée lien readonly
            <select value={shareHours} onChange={(e) => setShareHours(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: "120px" }}>
              <option value="24">24h</option>
              <option value="168">7 jours</option>
              <option value="720">30 jours</option>
            </select>
          </label>
          <button type="button" onClick={generateShareLink} style={ghostBtnStyle} disabled={shareLoading}>
            {shareLoading ? "Génération..." : "Générer lien readonly"}
          </button>
          {shareUrl ? (
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={ghostBtnStyle}>
              Ouvrir rapport client
            </a>
          ) : null}
        </div>
        {shareUrl ? (
          <p style={{ margin: "0.55rem 0 0 0", color: "#334155", fontSize: "0.78rem", fontWeight: 600 }}>
            Lien copié. Expire le{" "}
            {shareExpiresAt ? new Date(shareExpiresAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}.
          </p>
        ) : null}
      </section>

      <section style={{ ...CARD, padding: "0.9rem", marginBottom: "0.95rem" }}>
        <h3 style={{ ...h3, marginBottom: "0.45rem" }}>Liens readonly actifs/récents</h3>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          {shareLinks.map((x) => {
            const expired = new Date(x.expiresAt).getTime() < Date.now();
            const revoked = Boolean(x.revokedAt);
            const state = revoked ? "Révoqué" : expired ? "Expiré" : "Actif";
            return (
              <article
                key={x.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "0.5rem 0.6rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    padding: "0.18rem 0.46rem",
                    borderRadius: "999px",
                    color: revoked ? "#9f1239" : expired ? "#92400e" : "#166534",
                    background: revoked ? "#fff1f2" : expired ? "#fffbeb" : "#ecfdf5",
                    border: revoked ? "1px solid #fecdd3" : expired ? "1px solid #fde68a" : "1px solid #86efac",
                  }}
                >
                  {state}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#334155", fontWeight: 700 }}>
                  Créé: {new Date(x.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>
                  Expire: {new Date(x.expiresAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </span>
                {!revoked ? (
                  <button
                    type="button"
                    onClick={() => revokeShareLink(x.id)}
                    disabled={Boolean(revokeBusyId)}
                    style={{
                      marginLeft: "auto",
                      ...ghostBtnStyle,
                      borderColor: "#fecaca",
                      color: "#b91c1c",
                    }}
                  >
                    {revokeBusyId === x.id ? "Révocation..." : "Révoquer"}
                  </button>
                ) : null}
              </article>
            );
          })}
          {shareLinks.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Aucun lien de partage pour le moment.</p>
          ) : null}
        </div>
      </section>

      {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}
      {error ? <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <section style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: "0.95rem" }}>
            <Kpi label="Événements" value={summary.totalEvents ?? 0} />
            <Kpi label="Votes" value={summary.totalVotes ?? 0} />
            <Kpi label="Participants" value={summary.totalParticipants ?? 0} />
            <Kpi label="Leads" value={summary.totalLeads ?? 0} />
            <Kpi label="Moy. participation" value={`${Number(summary.avgParticipationRatePct ?? 0).toLocaleString("fr-FR")} / participant`} />
            <Kpi label="Moy. conversion lead" value={`${Number(summary.avgLeadConversionPct ?? 0).toLocaleString("fr-FR")} %`} />
          </section>

          <section style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1.3fr 1fr", marginBottom: "0.95rem" }}>
            <article style={{ ...CARD, padding: "0.85rem" }}>
              <h3 style={h3}>Évolution mensuelle</h3>
              <MonthlyBars rows={monthly} />
            </article>
            <article style={{ ...CARD, padding: "0.85rem" }}>
              <h3 style={h3}>Benchmarks (types de questions)</h3>
              <BenchmarkList rows={benchmarks} />
            </article>
          </section>

          <section style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr", marginBottom: "0.95rem" }}>
            <article style={{ ...CARD, padding: "0.85rem" }}>
              <h3 style={h3}>Best performer</h3>
              {best ? (
                <div>
                  <p style={{ margin: "0 0 0.2rem 0", fontWeight: 800, color: "#0f172a" }}>{best.title}</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.83rem" }}>
                    {best.voteCount} votes · {best.participants} participants · {Number(best.participationRatePct).toLocaleString("fr-FR")} / participant
                  </p>
                </div>
              ) : <p style={{ margin: 0, color: "#64748b" }}>Aucun événement.</p>}
            </article>
            <article style={{ ...CARD, padding: "0.85rem" }}>
              <h3 style={h3}>Comparaison événements</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem" }}>
                Classement par participation moyenne. Utilisable pour prioriser les formats les plus performants.
              </p>
            </article>
          </section>

          <section style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
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
                  {[...events].sort((a, b) => (b.participationRatePct || 0) - (a.participationRatePct || 0)).map((e) => (
                    <tr key={e.id}>
                      <Td>{e.title}</Td>
                      <Td>{new Date(e.createdAt).toLocaleDateString("fr-FR")}</Td>
                      <Td>{e.pollCount}</Td>
                      <Td>{e.participants}</Td>
                      <Td>{e.voteCount}</Td>
                      <Td>{e.leadsCount}</Td>
                      <Td>{Number(e.participationRatePct || 0).toLocaleString("fr-FR")}</Td>
                      <Td>{Number(e.leadConversionPct || 0).toLocaleString("fr-FR")} %</Td>
                    </tr>
                  ))}
                  {events.length === 0 ? (
                    <tr><Td colSpan={8}>Aucun événement dans cette période.</Td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

const inputStyle = { width: "100%", border: "1px solid #dbe3ee", borderRadius: "9px", padding: "0.45rem 0.55rem", fontSize: "0.82rem" };
const ghostBtnStyle = { display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "9px", padding: "0.44rem 0.66rem", fontSize: "0.79rem", color: "#334155", background: "#fff", textDecoration: "none", fontWeight: 700, cursor: "pointer" };
const h3 = { margin: "0 0 0.55rem 0", color: "#0f172a", fontSize: "0.9rem", fontWeight: 800 };

function FilterField({ label, children }) {
  return <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.73rem", color: "#64748b", fontWeight: 700 }}>{label}{children}</label>;
}
function Kpi({ label, value }) {
  return <article style={{ ...CARD, padding: "0.7rem 0.82rem" }}><p style={{ margin: "0 0 0.2rem 0", color: "#64748b", fontSize: "0.74rem", fontWeight: 700 }}>{label}</p><p style={{ margin: 0, color: "#0f172a", fontSize: "1.15rem", fontWeight: 800 }}>{value}</p></article>;
}
function Th({ children }) {
  return <th style={{ textAlign: "left", padding: "0.65rem 0.7rem", fontSize: "0.71rem", fontWeight: 800, color: "#64748b", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase" }}>{children}</th>;
}
function Td({ children, colSpan }) {
  return <td colSpan={colSpan} style={{ padding: "0.62rem 0.7rem", fontSize: "0.84rem", color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>{children}</td>;
}
function MonthlyBars({ rows }) {
  if (!rows.length) return <p style={{ margin: 0, color: "#64748b" }}>Aucune activité.</p>;
  const max = Math.max(1, ...rows.map((r) => Number(r.votes || 0)));
  return <div style={{ display: "grid", gap: "0.4rem" }}>{rows.map((r) => <div key={r.month} style={{ display: "grid", gridTemplateColumns: "72px 1fr 48px", gap: "0.45rem", alignItems: "center" }}><span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{r.month}</span><div style={{ height: "8px", background: "#eef2ff", borderRadius: "999px", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(4, Math.round((Number(r.votes || 0) / max) * 100))}%`, background: "#2563eb" }} /></div><strong style={{ textAlign: "right", fontSize: "0.75rem" }}>{r.votes}</strong></div>)}</div>;
}
function BenchmarkList({ rows }) {
  if (!rows.length) return <p style={{ margin: 0, color: "#64748b" }}>Aucune donnée.</p>;
  return <div style={{ display: "grid", gap: "0.42rem" }}>{rows.map((r) => <div key={r.type} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.45rem", alignItems: "center", padding: "0.4rem 0.45rem", border: "1px solid #e2e8f0", borderRadius: "9px" }}><strong style={{ fontSize: "0.8rem", textTransform: "capitalize" }}>{r.type}</strong><span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{r.participants} p.</span><span style={{ fontSize: "0.74rem", color: "#0f766e", fontWeight: 800 }}>{Number(r.avgVotesPerParticipant || 0).toLocaleString("fr-FR")}</span></div>)}</div>;
}
