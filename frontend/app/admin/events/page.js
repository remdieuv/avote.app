"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminEventsToolbar } from "@/components/admin/AdminEventsToolbar";
import { EventDashboardCard } from "@/components/admin/EventDashboardCard";
import { API_URL } from "@/lib/config";
import {
  EVENT_SORT_OPTIONS,
  EVENT_STATUS_FILTERS,
  filterEventsBySearch,
  filterEventsByStatus,
  sortEventsByMode,
  SORT_ACTIVE_FIRST,
  EVENT_STATUS_FILTER_ALL,
} from "@/lib/adminEventsFilters";
import { loadStoredMyEvents } from "@/lib/myEventsStorage";

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

/** Premier VOTING, sinon premier WAITING, sinon premier de la liste. */
function pickFeaturedEventId(events) {
  if (!events.length) return null;
  const ls = (e) => String(e.liveState || "").toLowerCase();
  const voting = events.find((e) => ls(e) === "voting");
  if (voting) return voting.id;
  const waiting = events.find((e) => ls(e) === "waiting");
  if (waiting) return waiting.id;
  return events[0].id;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(EVENT_STATUS_FILTER_ALL);
  const [sortMode, setSortMode] = useState(SORT_ACTIVE_FIRST);

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

  const filteredSorted = useMemo(() => {
    let list = filterEventsBySearch(rows, searchQuery);
    list = filterEventsByStatus(list, statusFilter);
    return sortEventsByMode(list, sortMode);
  }, [rows, searchQuery, statusFilter, sortMode]);

  const { featuredId, orderedEvents } = useMemo(() => {
    const fid = pickFeaturedEventId(filteredSorted);
    if (!fid || !filteredSorted.length) {
      return { featuredId: fid, orderedEvents: filteredSorted };
    }
    const hit = filteredSorted.find((e) => e.id === fid);
    const ordered = hit
      ? [hit, ...filteredSorted.filter((e) => e.id !== fid)]
      : filteredSorted;
    return { featuredId: fid, orderedEvents: ordered };
  }, [filteredSorted]);

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
        fontFamily:
          'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        lineHeight: 1.5,
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 32%, #fff 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px 16px 40px",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem 1rem",
            marginBottom: "1.5rem",
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

        <header style={{ marginBottom: "1.5rem" }}>
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

        {fromLocalFallback && rows.length > 0 ? (
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
          <p style={{ color: "#64748b", fontWeight: 500, margin: "0 0 1rem" }}>Chargement…</p>
        ) : null}

        {!loading && rows.length === 0 ? (
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

        {!loading && rows.length > 0 ? (
          <>
            <AdminEventsToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              statusValue={statusFilter}
              onStatusChange={setStatusFilter}
              sortValue={sortMode}
              onSortChange={setSortMode}
              statusOptions={EVENT_STATUS_FILTERS}
              sortOptions={EVENT_SORT_OPTIONS}
            />
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              {filteredSorted.length === 1
                ? "1 événement"
                : `${filteredSorted.length} événements`}
            </p>
          </>
        ) : null}

        {!loading && rows.length > 0 && filteredSorted.length === 0 ? (
          <div
            style={{
              padding: "clamp(1.75rem, 4vw, 2.5rem) 1.25rem",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              textAlign: "center",
              boxShadow: "0 2px 12px rgba(15, 23, 42, 0.05)",
              marginBottom: "1rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#475569" }}>
              Aucun événement ne correspond à votre recherche
            </p>
          </div>
        ) : null}

        {!loading && orderedEvents.length > 0 ? (
          <div className="admin-events-grid">
            {orderedEvents.map((ev) => (
              <div
                key={ev.id}
                className="admin-events-grid-cell"
                style={{
                  gridColumn: ev.id === featuredId ? "1 / -1" : undefined,
                  minWidth: 0,
                  width: "100%",
                }}
              >
                <EventDashboardCard
                  event={ev}
                  featured={ev.id === featuredId}
                  formatDate={formatEventDate}
                />
              </div>
            ))}
          </div>
        ) : null}

        <style>{`
        .admin-events-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .admin-events-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1200px) {
          .admin-events-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
      </div>
    </main>
  );
}
