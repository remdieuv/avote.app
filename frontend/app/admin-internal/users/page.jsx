"use client";

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

export default function AdminInternalUsersPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/internal/users`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
      setRows(Array.isArray(body?.users) ? body.users : []);
    } catch (e) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateRole(userId, role) {
    setBusyUserId(userId);
    setError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/internal/users/${encodeURIComponent(userId)}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
      setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, role: body?.user?.role || role } : u)));
    } catch (e) {
      setError(e?.message || "Mise à jour impossible");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>Utilisateurs</h1>
      {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}
      <TableWrap>
        {loading ? (
          <EmptyState text="Chargement des utilisateurs…" />
        ) : rows.length === 0 ? (
          <EmptyState text="Aucun utilisateur trouvé." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Email", "Rôle", "Créé le", "Événements", "Action"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "0.62rem", borderBottom: "1px solid #e2e8f0", fontSize: "0.78rem", color: "#475569" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>{u.email}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "0.75rem", padding: "0.18rem 0.45rem", borderRadius: "999px", border: `1px solid ${u.role === "ADMIN" ? "#bfdbfe" : "#e2e8f0"}`, background: u.role === "ADMIN" ? "#eff6ff" : "#fff", color: u.role === "ADMIN" ? "#1e40af" : "#475569" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem", color: "#334155" }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem", color: "#334155" }}>{u.eventCount}</td>
                  <td style={{ padding: "0.62rem", borderBottom: "1px solid #f1f5f9" }}>
                    <select
                      value={u.role}
                      disabled={busyUserId === u.id}
                      onChange={(e) => void updateRole(u.id, e.target.value)}
                      style={{ padding: "0.33rem 0.4rem", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "0.8rem" }}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
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
