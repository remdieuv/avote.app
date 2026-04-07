"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { EmptyState, TableWrap } from "@/components/internal-admin/InternalAdminUi";

function fmtDate(x) {
  try {
    return new Date(x).toLocaleString("fr-FR");
  } catch {
    return "-";
  }
}

export default function AdminInternalLeadsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/internal/leads?take=500`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
        if (!cancelled) setRows(Array.isArray(body?.leads) ? body.leads : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>Leads (globaux)</h1>
      {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}
      <TableWrap>
        {loading ? (
          <EmptyState text="Chargement des leads…" />
        ) : rows.length === 0 ? (
          <EmptyState text="Aucun lead capté pour le moment." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1120px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Prénom", "Téléphone", "E-mail", "Événement", "Question", "Propriétaire", "Date", "Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.62rem", borderBottom: "1px solid #e2e8f0", fontSize: "0.78rem", color: "#475569" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>{l.firstName}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{l.phone}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{l.email || "-"}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{l.eventTitle}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem", maxWidth: "280px" }}>
                    <span style={{ display: "inline-block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }} title={l.pollQuestion}>
                      {l.pollQuestion}
                    </span>
                  </td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{l.ownerEmail}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{fmtDate(l.createdAt)}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.82rem" }}>
                    {l.eventId ? (
                      <Link href={`/admin/event/${encodeURIComponent(l.eventId)}/leads`} style={{ color: "#1d4ed8", textDecoration: "none" }}>
                        Voir dans l’event
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableWrap>
    </div>
  );
}
