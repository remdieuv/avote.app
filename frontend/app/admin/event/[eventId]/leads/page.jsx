"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const LEADS_LAST_SEEN_LS_PREFIX = "avote_leads_seen_at_";

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
        const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}/leads`);
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
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.2rem 1rem 2rem", fontFamily: 'system-ui, "Segoe UI", sans-serif' }}>
      <p style={{ margin: "0 0 0.85rem" }}>
        <Link href={`/admin/event/${encodeURIComponent(eventId || "")}`} style={{ color: "#64748b", fontWeight: 600 }}>
          ← Retour régie
        </Link>
      </p>
      <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.3rem", color: "#0f172a" }}>
        Leads
      </h1>
      <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.9rem" }}>
        Contacts collectés sur les questions de type lead.
      </p>
      {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </p>
      ) : null}
      {!loading && !error ? (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
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
                  <Td>{new Date(r.createdAt).toLocaleString("fr-FR")}</Td>
                  <Td>{r.pollQuestion || `Question ${Number(r.pollOrder ?? 0) + 1}`}</Td>
                  <Td>{r.firstName}</Td>
                  <Td>{r.phone}</Td>
                  <Td>{r.email || "—"}</Td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={5}>Aucun lead pour cet événement.</Td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "0.65rem 0.75rem",
        fontSize: "0.78rem",
        color: "#475569",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: "0.62rem 0.75rem",
        fontSize: "0.86rem",
        color: "#0f172a",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      {children}
    </td>
  );
}
