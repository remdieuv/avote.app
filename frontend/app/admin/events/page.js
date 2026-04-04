"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EventDashboardCard } from "@/components/admin/EventDashboardCard";
import { API_URL } from "@/lib/config";
import { loadStoredMyEvents } from "@/lib/myEventsStorage";
import { sortEventsForDashboard } from "@/lib/adminEventsDashboard";

function formatEventDate(iso, fallbackLabel) {
  if (!iso) return fallbackLabel ?? "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return fallbackLabel ?? "—";
  }
}

/** @param {Record<string, unknown>} e */
function normalizeEventRow(e) {
  return {
    id: String(e.id ?? ""),
    title: typeof e.title === "string" ? e.title : "—",
    slug: typeof e.slug === "string" ? e.slug : "",
    createdAt: typeof e.createdAt === "string" ? e.createdAt : undefined,
    liveState:
      typeof e.liveState === "string" && e.liveState.trim()
        ? String(e.liveState).toLowerCase()
        : "waiting",
    pollCount: typeof e.pollCount === "number" ? e.pollCount : 0,
    voteCount: typeof e.voteCount === "number" ? e.voteCount : 0,
    participantCount:
      typeof e.participantCount === "number" ? e.participantCount : 0,
    _localOnly: Boolean(e._localOnly),
  };
}

export default function AdminEventsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [fromLocalFallback, setFromLocalFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_URL}/events`);
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) {
        setRows(list.map(normalizeEventRow));
        setFromLocalFallback(false);
      } else {
        const stored = loadStoredMyEvents();
        setRows(
          stored.map((x) =>
            normalizeEventRow({
              id: x.id,
              title: x.title,
              slug: x.slug,
              createdAt: x.savedAt,
              _localOnly: true,
            }),
          ),
        );
        setFromLocalFallback(true);
      }
    } catch (e) {
      setFetchError(e.message || "Impossible de charger les événements.");
      const stored = loadStoredMyEvents();
      setRows(
        stored.map((x) =>
          normalizeEventRow({
            id: x.id,
            title: x.title,
            slug: x.slug,
            createdAt: x.savedAt,
            _localOnly: true,
          }),
        ),
      );
      setFromLocalFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => sortEventsForDashboard(rows), [rows]);
  const featuredId = sorted[0]?.id ?? null;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1rem, 3vw, 1.75rem) clamp(1rem, 4vw, 2rem) 3rem",
        maxWidth: "min(1180px, 100%)",
        margin: "0 auto",
        fontFamily:
          'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        lineHeight: 1.5,
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 32%, #fff 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem 1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem 1.25rem", alignItems: "center" }}>
          <Link
            href="/admin"
            style={{ fontSize: "0.88rem", color: "#64748b", textDecoration: "none", fontWeight: 600 }}
          >
            ← Tableau de bord
          </Link>
          <Link href="/" style={{ fontSize: "0.88rem", color: "#64748b", textDecoration: "none", fontWeight: 500 }}>
            Accueil
          </Link>
        </div>
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", letterSpacing: "-0.03em" }}>
          Avote
        </span>
      </div>

      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          marginBottom: "2rem",
        }}
        className="admin-events-page-header"
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "clamp(1.45rem, 3.2vw, 1.85rem)",
              margin: "0 0 0.4rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
            }}
          >
            Mes événements
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.95rem", maxWidth: "42rem" }}>
            Pilotez le live : régie, salle participants et projection sur un même tableau.
          </p>
        </div>
        <Link
          href="/admin"
          className="admin-events-create-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "flex-start",
            padding: "0.65rem 1.2rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            borderRadius: "10px",
            textDecoration: "none",
            border: "1px solid #1e40af",
            background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(37, 99, 235, 0.28)",
            boxSizing: "border-box",
            whiteSpace: "nowrap",
          }}
        >
          + Créer un événement
        </Link>
      </header>

      {fetchError ? (
        <p
          style={{
            margin: "0 0 1.15rem",
            padding: "0.7rem 0.95rem",
            borderRadius: "10px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: "0.88rem",
            fontWeight: 500,
          }}
          role="alert"
        >
          {fetchError} — affichage des événements enregistrés sur cet appareil le cas
          échéant.
        </p>
      ) : null}

      {fromLocalFallback && sorted.length > 0 ? (
        <p
          style={{
            margin: "0 0 1.15rem",
            fontSize: "0.82rem",
            color: "#7c3aed",
            fontWeight: 600,
          }}
        >
          Source : appareil (serveur vide ou API indisponible).
        </p>
      ) : null}

      {loading ? (
        <p style={{ color: "#64748b", fontWeight: 500 }}>Chargement…</p>
      ) : null}

      {!loading && sorted.length === 0 ? (
        <div
          style={{
            padding: "clamp(2rem, 5vw, 3rem) 1.5rem",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            background: "#fff",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <p style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
            Aucun événement pour le moment
          </p>
          <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.92rem" }}>
            Créez un événement pour accéder à la régie, à la salle et à l’écran.
          </p>
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.65rem 1.35rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              borderRadius: "10px",
              textDecoration: "none",
              border: "1px solid #1e40af",
              background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.28)",
            }}
          >
            Créer mon premier événement
          </Link>
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <div
          className="admin-events-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1.15rem",
          }}
        >
          {sorted.map((ev) => (
            <EventDashboardCard
              key={ev.id}
              event={ev}
              featured={ev.id === featuredId}
              formatDate={formatEventDate}
            />
          ))}
        </div>
      ) : null}

      <style>{`
        @media (min-width: 720px) {
          .admin-events-page-header {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: flex-start;
            justify-content: space-between;
          }
          .admin-events-create-cta {
            align-self: center;
          }
          .admin-events-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
