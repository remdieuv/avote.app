"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

      {loading ? (
        <p style={{ color: "#64748b" }}>Chargement…</p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
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
                  <Th>Question</Th>
                  <Th>Prénom</Th>
                  <Th>Téléphone</Th>
                  <Th>E-mail</Th>
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
                    <Td title={r.pollQuestion}>
                      {r.pollQuestion ||
                        `Question ${Number(r.pollOrder ?? 0) + 1}`}
                    </Td>
                    <Td>{r.firstName}</Td>
                    <Td>{r.phone}</Td>
                    <Td subtle>{r.email || "—"}</Td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <Td colSpan={5} subtle>
                      Aucun lead pour cet événement.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
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
