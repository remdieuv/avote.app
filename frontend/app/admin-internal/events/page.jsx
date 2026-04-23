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

export default function AdminInternalEventsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/internal/events`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
        if (!cancelled) setRows(Array.isArray(body?.events) ? body.events : []);
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
      <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>Événements (globaux)</h1>
      {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}
      <TableWrap>
        {loading ? (
          <EmptyState text="Chargement des événements…" />
        ) : rows.length === 0 ? (
          <EmptyState text="Aucun événement trouvé." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Titre", "Propriétaire", "Statut", "Live", "Créé le", "Sondages", "Leads", "Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.62rem", borderBottom: "1px solid #e2e8f0", fontSize: "0.78rem", color: "#475569" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>{e.title}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{e.ownerEmail}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{e.status}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{e.liveState}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{fmtDate(e.createdAt)}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{e.pollCount}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{e.leadCount}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.82rem" }}>
                    <Link href={`/admin-internal/events/${encodeURIComponent(e.id)}`} style={{ color: "#1d4ed8", textDecoration: "none" }}>
                      Ouvrir
                    </Link>
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
