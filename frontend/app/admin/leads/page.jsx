"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export default function MesLeadsPage() {
  const [eventId, setEventId] = useState("");
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(500);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "500");
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/me/leads?${params.toString()}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      setRows(Array.isArray(body.leads) ? body.leads : []);
      setEvents(Array.isArray(body.events) ? body.events : []);
      setTotal(typeof body.total === "number" ? body.total : 0);
      setLimit(typeof body.limit === "number" ? body.limit : 500);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [eventId, debouncedQ, from, to]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(qInput.trim());
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [qInput]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  function setPresetDays(days) {
    const end = new Date();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }

  function clearDates() {
    setFrom("");
    setTo("");
  }

  function exportCsv() {
    const sep = ";";
    const escape = (v) => {
      const s = String(v ?? "");
      if (s.includes(sep) || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const header = [
      "Date",
      "Événement",
      "Question",
      "Prénom",
      "Téléphone",
      "E-mail",
    ];
    const lines = [
      header.join(sep),
      ...rows.map((r) =>
        [
          escape(new Date(r.createdAt).toLocaleString("fr-FR")),
          escape(r.eventTitle),
          escape(r.pollQuestion || ""),
          escape(r.firstName),
          escape(r.phone),
          escape(r.email || ""),
        ].join(sep),
      ),
    ];
    const blob = new Blob(["\ufeff", lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `avote-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const shownHint = useMemo(() => {
    if (total > rows.length) {
      return `Affichage des ${rows.length} plus récents sur ${total} résultat(s) (limite ${limit}).`;
    }
    if (total === 0 && !loading) return "Aucun lead sur la période ou les filtres choisis.";
    return `${rows.length} lead(s) affiché(s).`;
  }, [total, rows.length, limit, loading]);

  const totalWithEmail = rows.reduce((acc, r) => (r.email ? acc + 1 : acc), 0);
  const eventsTouched = useMemo(
    () => new Set(rows.map((r) => r.eventId).filter(Boolean)).size,
    [rows],
  );

  return (
    <div className="leads-page-wrap">
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/admin/events" className="leads-back-link">
          ← Mes événements
        </Link>
      </nav>

      <header className="leads-head">
        <div>
          <h1 className="leads-title">Mes leads</h1>
          <p className="leads-subtitle">
            Tous les contacts captés sur vos événements. Filtrez par événement,
            période ou recherche.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="leads-csv-btn"
        >
          Exporter CSV
        </button>
      </header>

      <section className="leads-kpi-grid">
        <article className="leads-kpi-card">
          <p>Total leads</p>
          <strong>{loading ? "…" : total}</strong>
        </article>
        <article className="leads-kpi-card">
          <p>Avec e-mail</p>
          <strong>{loading ? "…" : totalWithEmail}</strong>
        </article>
        <article className="leads-kpi-card">
          <p>Événements touchés</p>
          <strong>{loading ? "…" : eventsTouched}</strong>
        </article>
      </section>

      <section className="leads-filters-card">
        <p className="leads-section-eyebrow">Filtres</p>
        <div className="leads-filters-grid">
          <label className="field-col">
            <span>Événement</span>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="field-input">
              <option value="">Tous mes événements</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field-col">
            <span>Recherche</span>
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Prénom, téléphone, e-mail…"
              autoComplete="off"
              className="field-input"
            />
          </label>
          <label className="field-col">
            <span>Du</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field-input" />
          </label>
          <label className="field-col">
            <span>Au</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field-input" />
          </label>
        </div>

        <div className="leads-presets-row">
          <span>Raccourcis :</span>
          <button type="button" onClick={() => setPresetDays(7)} style={presetBtnStyle}>
            7 jours
          </button>
          <button type="button" onClick={() => setPresetDays(30)} style={presetBtnStyle}>
            30 jours
          </button>
          <button type="button" onClick={clearDates} style={presetGhostStyle}>
            Toutes les dates
          </button>
        </div>
      </section>

      <p className="leads-hint">{loading ? "Chargement…" : shownHint}</p>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600, margin: "0 0 1rem" }}>
          {error}
        </p>
      ) : null}

      <div className="leads-table-wrap">
        <div className="leads-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "920px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <Th>Date</Th>
                <Th>Événement</Th>
                <Th>Question</Th>
                <Th>Prénom</Th>
                <Th>Téléphone</Th>
                <Th>E-mail</Th>
                <Th>Détail</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    {new Date(r.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 600 }}>{r.eventTitle}</span>
                  </Td>
                  <Td subtle title={r.pollQuestion}>
                    {r.pollQuestion || `Question ${Number(r.pollOrder ?? 0) + 1}`}
                  </Td>
                  <Td>{r.firstName}</Td>
                  <Td>{r.phone}</Td>
                  <Td subtle>{r.email || "—"}</Td>
                  <Td style={{ whiteSpace: "nowrap" }}>
                    {r.eventId ? (
                      <Link href={`/admin/event/${encodeURIComponent(r.eventId)}/leads`} className="leads-detail-link">
                        Détail
                      </Link>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 ? (
          <div className="leads-empty-state">
            Aucun lead à afficher. Essayez d’élargir la période ou un autre événement.
          </div>
        ) : null}
      </div>

      {!loading && rows.length > 0 ? (
        <div className="leads-mobile-list">
          {rows.map((r) => (
            <article key={`m-${r.id}`} className="leads-mobile-card">
              <p className="mobile-card-date">
                {new Date(r.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              <p className="mobile-card-event">{r.eventTitle}</p>
              <p className="mobile-card-question">
                {r.pollQuestion || `Question ${Number(r.pollOrder ?? 0) + 1}`}
              </p>
              <div className="mobile-card-grid">
                <span>Prénom: {r.firstName}</span>
                <span>Téléphone: {r.phone}</span>
                <span>E-mail: {r.email || "—"}</span>
              </div>
              {r.eventId ? (
                <Link href={`/admin/event/${encodeURIComponent(r.eventId)}/leads`} className="leads-detail-link">
                  Voir le détail
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <p style={{ margin: "1rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
        Les dates « Du / Au » sont interprétées en UTC (jour calendaire) côté serveur.
      </p>

      <style>{`
        .leads-page-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          font-family: system-ui, "Segoe UI", sans-serif;
        }
        .leads-back-link {
          font-size: 0.88rem;
          font-weight: 600;
          color: #64748b;
          text-decoration: none;
        }
        .leads-head {
          margin-bottom: 1rem;
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 0.8rem;
        }
        .leads-title {
          margin: 0 0 0.35rem 0;
          font-size: clamp(1.4rem, 2.8vw, 1.85rem);
          font-weight: 820;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .leads-subtitle {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
          max-width: 60ch;
        }
        .leads-csv-btn {
          padding: 0.56rem 0.95rem;
          font-size: 0.84rem;
          font-weight: 700;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          cursor: pointer;
        }
        .leads-csv-btn:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }
        .leads-kpi-grid {
          display: grid;
          gap: 0.65rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-bottom: 1rem;
        }
        .leads-kpi-card {
          background: linear-gradient(180deg, #fff 0%, #faf5ff 100%);
          border: 1px solid #e9d5ff;
          border-radius: 12px;
          padding: 0.75rem 0.85rem;
        }
        .leads-kpi-card p {
          margin: 0;
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 600;
        }
        .leads-kpi-card strong {
          display: block;
          margin-top: 0.15rem;
          font-size: 1.15rem;
          color: #4c1d95;
          letter-spacing: -0.02em;
        }
        .leads-filters-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          padding: 1rem 1.15rem;
          margin-bottom: 1rem;
        }
        .leads-section-eyebrow {
          margin: 0 0 0.75rem 0;
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .leads-filters-grid {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: end;
        }
        .field-col { display: flex; flex-direction: column; gap: 0.35rem; }
        .field-col span { font-size: 0.78rem; font-weight: 600; color: #475569; }
        .field-input {
          padding: 0.54rem 0.62rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.88rem;
          background: #fff;
          width: 100%;
          box-sizing: border-box;
        }
        .leads-presets-row {
          margin-top: 0.85rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          align-items: center;
        }
        .leads-presets-row > span { font-size: 0.76rem; color: #94a3b8; margin-right: 0.25rem; }
        .leads-hint {
          margin: 0 0 0.65rem 0;
          font-size: 0.84rem;
          color: #64748b;
          font-weight: 500;
        }
        .leads-table-wrap {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }
        .leads-table-scroll { overflow-x: auto; }
        .leads-detail-link {
          font-size: 0.78rem;
          font-weight: 600;
          color: #4f46e5;
          text-decoration: none;
        }
        .leads-empty-state {
          padding: 2.5rem 1.5rem;
          text-align: center;
          color: #64748b;
          font-size: 0.92rem;
        }
        .leads-mobile-list { display: none; }
        @media (max-width: 920px) {
          .leads-kpi-grid { grid-template-columns: 1fr; }
          .leads-filters-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .leads-head { align-items: flex-start; }
          .leads-csv-btn { width: 100%; }
          .leads-filters-grid { grid-template-columns: 1fr; }
          .leads-table-wrap { display: none; }
          .leads-mobile-list {
            display: grid;
            gap: 0.7rem;
          }
          .leads-mobile-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            padding: 0.8rem 0.85rem;
          }
          .mobile-card-date {
            margin: 0;
            font-size: 0.72rem;
            font-weight: 700;
            color: #7c3aed;
            letter-spacing: 0.02em;
          }
          .mobile-card-event {
            margin: 0.28rem 0 0;
            font-size: 0.9rem;
            font-weight: 700;
            color: #0f172a;
          }
          .mobile-card-question {
            margin: 0.32rem 0 0.45rem;
            font-size: 0.8rem;
            color: #64748b;
            line-height: 1.45;
          }
          .mobile-card-grid {
            display: grid;
            gap: 0.25rem;
            margin-bottom: 0.55rem;
            font-size: 0.8rem;
            color: #334155;
          }
        }
      `}</style>
    </div>
  );
}

const presetBtnStyle = {
  padding: "0.32rem 0.65rem",
  fontSize: "0.78rem",
  fontWeight: 600,
  borderRadius: "9999px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  cursor: "pointer",
};

const presetGhostStyle = {
  ...presetBtnStyle,
  background: "#fff",
  border: "1px dashed #cbd5e1",
};

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

function Td({ children, subtle, title: titleAttr, style: styleExtra }) {
  return (
    <td
      title={titleAttr}
      style={{
        padding: "0.65rem 0.85rem",
        fontSize: "0.86rem",
        color: subtle ? "#64748b" : "#0f172a",
        borderBottom: "1px solid #f1f5f9",
        maxWidth: titleAttr ? "220px" : undefined,
        overflow: titleAttr ? "hidden" : undefined,
        textOverflow: titleAttr ? "ellipsis" : undefined,
        whiteSpace: titleAttr ? "nowrap" : undefined,
        ...styleExtra,
      }}
    >
      {children}
    </td>
  );
}
