"use client";

import { useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { StatsCard } from "@/components/internal-admin/InternalAdminUi";

export default function AdminInternalDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/internal/stats`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
        if (!cancelled) setStats(body);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Erreur de chargement");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>Dashboard plateforme</h1>
      {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}
      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <StatsCard label="Utilisateurs" value={stats?.users ?? "-"} />
        <StatsCard label="Événements" value={stats?.events ?? "-"} />
        <StatsCard label="Sondages" value={stats?.polls ?? "-"} />
        <StatsCard label="Votes" value={stats?.votes ?? "-"} />
        <StatsCard label="Leads" value={stats?.leads ?? "-"} />
      </div>
    </div>
  );
}
