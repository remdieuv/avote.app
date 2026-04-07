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

  return (
    <div
      style={{
        maxWidth: "1180px",
        margin: "0 auto",
        padding: "clamp(1rem, 3vw, 1.75rem) clamp(0.75rem, 2vw, 1rem) 2.5rem",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
      }}
    >
      <nav style={{ marginBottom: "1rem" }}>
        <Link
          href="/admin/events"
          style={{
            fontSize: "0.86rem",
            fontWeight: 600,
            color: "#64748b",
            textDecoration: "none",
          }}
        >
          ← Mes événements
        </Link>
      </nav>

      <header
        style={{
          marginBottom: "1.35rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 0.35rem 0",
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#0f172a",
            }}
          >
            Mes leads
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", maxWidth: "52ch" }}>
            Tous les contacts captés sur vos événements. Filtrez par événement, période ou recherche.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            style={{
              padding: "0.5rem 0.85rem",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: rows.length === 0 ? "#f1f5f9" : "#fff",
              color: "#334155",
              cursor: rows.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Exporter CSV
          </button>
        </div>
      </header>

      <section style={{ ...CARD, padding: "1rem 1.15rem", marginBottom: "1rem" }}>
        <p
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748b",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Filtres
        </p>
        <div
          style={{
            display: "grid",
            gap: "0.85rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            alignItems: "end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>
              Événement
            </span>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              style={{
                padding: "0.5rem 0.6rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                background: "#fff",
              }}
            >
              <option value="">Tous mes événements</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>
              Recherche
            </span>
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Prénom, téléphone, e-mail…"
              autoComplete="off"
              style={{
                padding: "0.5rem 0.6rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>
              Du
            </span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                padding: "0.5rem 0.6rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>
              Au
            </span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{
                padding: "0.5rem 0.6rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
              }}
            />
          </label>
        </div>
        <div
          style={{
            marginTop: "0.85rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.76rem", color: "#94a3b8", marginRight: "0.25rem" }}>
            Raccourcis :
          </span>
          <button
            type="button"
            onClick={() => setPresetDays(7)}
            style={presetBtnStyle}
          >
            7 jours
          </button>
          <button
            type="button"
            onClick={() => setPresetDays(30)}
            style={presetBtnStyle}
          >
            30 jours
          </button>
          <button type="button" onClick={clearDates} style={presetGhostStyle}>
            Toutes les dates
          </button>
        </div>
      </section>

      <p style={{ margin: "0 0 0.65rem 0", fontSize: "0.84rem", color: "#64748b" }}>
        {loading ? "Chargement…" : shownHint}
      </p>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600, margin: "0 0 1rem" }}>
          {error}
        </p>
      ) : null}

      <div style={{ ...CARD, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "880px",
            }}
          >
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
                      <Link
                        href={`/admin/event/${encodeURIComponent(r.eventId)}/leads`}
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "#4f46e5",
                          textDecoration: "none",
                        }}
                      >
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
          <div
            style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.92rem",
            }}
          >
            Aucun lead à afficher. Essayez d’élargir la période ou un autre événement.
          </div>
        ) : null}
      </div>

      <p style={{ margin: "1rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
        Les dates « Du / Au » sont interprétées en UTC (jour calendaire) côté serveur.
      </p>
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
