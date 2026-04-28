"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const LEADS_LAST_SEEN_LS_PREFIX = "avote_leads_seen_at_";

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export default function EventLeadsPage() {
  const params = useParams();
  const raw = params?.eventId;
  const eventId =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [questionFilter, setQuestionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!eventId) return;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          LEADS_LAST_SEEN_LS_PREFIX + eventId,
          String(Date.now()),
        );
      } catch {
        /* ignore */
      }
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${eventId}/leads`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
        setRows(Array.isArray(body) ? body : []);
      } catch (e) {
        setRows([]);
        setError(e.message || "Chargement impossible.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 860px)");
    const sync = () => setIsMobile(Boolean(media.matches));
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(""), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const uniqueQuestions = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.pollId || row.pollOrder || row.pollQuestion || row.id;
      const label = row.pollQuestion || `Question ${Number(row.pollOrder ?? 0) + 1}`;
      if (!map.has(String(key))) map.set(String(key), label);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return rows.filter((row) => {
      const createdAt = row.createdAt ? new Date(row.createdAt) : null;
      const fromOk = !fromDate || (createdAt && createdAt >= new Date(`${fromDate}T00:00:00`));
      const toOk = !toDate || (createdAt && createdAt <= new Date(`${toDate}T23:59:59`));
      const questionKey = String(
        row.pollId || row.pollOrder || row.pollQuestion || row.id,
      );
      const questionOk = questionFilter === "all" || questionKey === questionFilter;
      const source = getLeadSource(row.pollType);
      const sourceOk = sourceFilter === "all" || source === sourceFilter;
      if (!text) return fromOk && toOk && questionOk && sourceOk;
      const haystack = [
        row.firstName || "",
        row.phone || "",
        row.email || "",
        row.pollQuestion || "",
      ]
        .join(" ")
        .toLowerCase();
      return fromOk && toOk && questionOk && sourceOk && haystack.includes(text);
    });
  }, [rows, query, questionFilter, sourceFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const total = filteredRows.length;
    const last24h = filteredRows.filter((r) => {
      const ts = new Date(r.createdAt || 0).getTime();
      return Number.isFinite(ts) && ts >= dayAgo;
    }).length;
    const withEmail = filteredRows.filter((r) => String(r.email || "").trim()).length;
    const emailRate = total ? Math.round((withEmail / total) * 100) : 0;
    return { total, last24h, emailRate };
  }, [filteredRows]);

  function resetFilters() {
    setQuery("");
    setQuestionFilter("all");
    setSourceFilter("all");
    setFromDate("");
    setToDate("");
  }

  async function copyValue(value, label) {
    const safe = String(value || "").trim();
    if (!safe || typeof window === "undefined" || !window.navigator?.clipboard) return;
    try {
      await window.navigator.clipboard.writeText(safe);
      setCopied(label);
    } catch {
      setCopied("");
    }
  }

  function exportCsv() {
    const header = ["Date", "Question", "Prenom", "Telephone", "Email"];
    const lines = filteredRows.map((r) => [
      formatDateTime(r.createdAt),
      r.pollQuestion || `Question ${Number(r.pollOrder ?? 0) + 1}`,
      r.firstName || "",
      r.phone || "",
      r.email || "",
    ]);
    const csv = [header, ...lines]
      .map((line) =>
        line
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-event-${eventId || "unknown"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      style={{
        maxWidth: "960px",
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
          style={{
            fontSize: "0.86rem",
            fontWeight: 600,
            color: "#64748b",
            textDecoration: "none",
          }}
        >
          ← Régie
        </Link>
        <span style={{ color: "#e2e8f0" }}>|</span>
        <Link
          href="/admin/leads"
          style={{
            fontSize: "0.86rem",
            fontWeight: 600,
            color: "#4f46e5",
            textDecoration: "none",
          }}
        >
          Tous mes leads
        </Link>
      </div>

      <header style={{ marginBottom: "1.25rem" }}>
        <h1
          style={{
            margin: "0 0 0.35rem 0",
            fontSize: "clamp(1.3rem, 2.2vw, 1.55rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#0f172a",
          }}
        >
          Leads de l’événement
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Contacts issus des questions de collecte pour cet événement uniquement.
        </p>
      </header>

      {!loading && !error ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: "0.75rem",
              marginBottom: "0.95rem",
            }}
          >
            <MiniStat label="Leads affichés" value={String(stats.total)} />
            <MiniStat label="Nouveaux (24h)" value={String(stats.last24h)} />
            <MiniStat label="Taux e-mail" value={`${stats.emailRate}%`} />
          </div>

          <div
            style={{
              ...CARD,
              padding: "0.9rem",
              marginBottom: "0.9rem",
              display: "grid",
              gap: "0.65rem",
              gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr 1fr 1fr auto",
              alignItems: "end",
            }}
          >
            <InputField
              label="Recherche"
              placeholder="Prénom, téléphone, e-mail…"
              value={query}
              onChange={setQuery}
            />
            <SelectField
              label="Question"
              value={questionFilter}
              onChange={setQuestionFilter}
              options={[
                { value: "all", label: "Toutes" },
                ...uniqueQuestions.map((q) => ({ value: q.value, label: q.label })),
              ]}
            />
            <SelectField
              label="Source"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={[
                { value: "all", label: "Toutes" },
                { value: "lead", label: "Lead" },
                { value: "contest", label: "Concours" },
              ]}
            />
            <InputField label="Du" type="date" value={fromDate} onChange={setFromDate} />
            <InputField label="Au" type="date" value={toDate} onChange={setToDate} />
            <button
              onClick={resetFilters}
              style={ghostButtonStyle}
              type="button"
              title="Réinitialiser les filtres"
            >
              Réinitialiser
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: "0.95rem",
            }}
          >
            <button type="button" style={primaryButtonStyle} onClick={exportCsv}>
              Export CSV événement
            </button>
            {copied ? (
              <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 700 }}>
                {copied} copié
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {loading ? (
        <p style={{ color: "#64748b" }}>Chargement…</p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          {!isMobile ? (
            <div style={{ ...CARD, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "720px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <Th>Date</Th>
                      <Th>Source</Th>
                      <Th>Question</Th>
                      <Th>Prénom</Th>
                      <Th>Téléphone</Th>
                      <Th>E-mail</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr key={r.id}>
                        <Td>{formatDateTime(r.createdAt)}</Td>
                        <Td>
                          <LeadSourceBadge type={r.pollType} />
                        </Td>
                        <Td title={r.pollQuestion}>
                          {r.pollQuestion || `Question ${Number(r.pollOrder ?? 0) + 1}`}
                        </Td>
                        <Td>{r.firstName}</Td>
                        <Td>{r.phone || "—"}</Td>
                        <Td subtle>{r.email || "—"}</Td>
                        <Td>
                          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                            <button
                              style={miniActionBtn}
                              type="button"
                              onClick={() => copyValue(r.phone, "Téléphone")}
                              disabled={!String(r.phone || "").trim()}
                            >
                              Copier tel
                            </button>
                            <button
                              style={miniActionBtn}
                              type="button"
                              onClick={() => copyValue(r.email, "E-mail")}
                              disabled={!String(r.email || "").trim()}
                            >
                              Copier e-mail
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 ? (
                      <tr>
                        <Td colSpan={7} subtle>
                          Aucun résultat avec ces filtres. Ajustez les critères ou attendez de
                          nouvelles réponses.
                        </Td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.7rem" }}>
              {filteredRows.map((r) => (
                <div key={r.id} style={{ ...CARD, padding: "0.8rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.7rem",
                      marginBottom: "0.45rem",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                      <strong style={{ color: "#0f172a", fontSize: "0.92rem" }}>
                        {r.firstName || "Sans prénom"}
                      </strong>
                      <LeadSourceBadge type={r.pollType} />
                    </div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", textAlign: "right" }}>
                      {formatDateTime(r.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 0.5rem 0", color: "#334155", fontSize: "0.86rem" }}>
                    {r.pollQuestion || `Question ${Number(r.pollOrder ?? 0) + 1}`}
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: "0.35rem",
                      fontSize: "0.83rem",
                      color: "#334155",
                    }}
                  >
                    <span>Téléphone: {r.phone || "—"}</span>
                    <span>E-mail: {r.email || "—"}</span>
                  </div>
                  <div style={{ marginTop: "0.55rem", display: "flex", gap: "0.45rem" }}>
                    <button
                      style={miniActionBtn}
                      type="button"
                      onClick={() => copyValue(r.phone, "Téléphone")}
                      disabled={!String(r.phone || "").trim()}
                    >
                      Copier tel
                    </button>
                    <button
                      style={miniActionBtn}
                      type="button"
                      onClick={() => copyValue(r.email, "E-mail")}
                      disabled={!String(r.email || "").trim()}
                    >
                      Copier e-mail
                    </button>
                  </div>
                </div>
              ))}
              {filteredRows.length === 0 ? (
                <div style={{ ...CARD, padding: "1rem", textAlign: "center" }}>
                  <p style={{ margin: 0, color: "#475569", fontWeight: 600 }}>
                    Aucun lead ne correspond à vos filtres.
                  </p>
                  <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.88rem" }}>
                    Essayez une autre période ou retirez un filtre pour retrouver les contacts.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function MiniStat({ label, value }) {
  return (
    <div style={{ ...CARD, padding: "0.75rem 0.8rem" }}>
      <p
        style={{
          margin: "0 0 0.25rem 0",
          color: "#64748b",
          fontSize: "0.78rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </p>
      <p style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "1.18rem" }}>
        {value}
      </p>
    </div>
  );
}

function getLeadSource(type) {
  return type === "CONTEST_ENTRY" ? "contest" : "lead";
}

function LeadSourceBadge({ type }) {
  const source = getLeadSource(type);
  const isContest = source === "contest";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "0.2rem 0.52rem",
        fontSize: "0.7rem",
        fontWeight: 800,
        letterSpacing: "0.02em",
        border: `1px solid ${isContest ? "#fdba74" : "#86efac"}`,
        background: isContest ? "#fff7ed" : "#f0fdf4",
        color: isContest ? "#9a3412" : "#166534",
      }}
    >
      {isContest ? "Concours" : "Lead"}
    </span>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          padding: "0.52rem 0.6rem",
          fontSize: "0.86rem",
          color: "#0f172a",
          outline: "none",
        }}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          padding: "0.52rem 0.6rem",
          fontSize: "0.86rem",
          color: "#0f172a",
          outline: "none",
          background: "#fff",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const primaryButtonStyle = {
  border: "none",
  background: "linear-gradient(135deg, #4338ca, #6366f1)",
  color: "#fff",
  fontSize: "0.83rem",
  fontWeight: 700,
  borderRadius: "10px",
  padding: "0.52rem 0.72rem",
  cursor: "pointer",
};

const ghostButtonStyle = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: "0.82rem",
  fontWeight: 700,
  borderRadius: "10px",
  padding: "0.5rem 0.66rem",
  cursor: "pointer",
};

const miniActionBtn = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontSize: "0.74rem",
  fontWeight: 700,
  borderRadius: "8px",
  padding: "0.32rem 0.46rem",
  cursor: "pointer",
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
