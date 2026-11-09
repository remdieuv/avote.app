"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEventsToolbar } from "@/components/admin/AdminEventsToolbar";
import { EventDashboardCard } from "@/components/admin/EventDashboardCard";
import { DiscoverEventCard } from "@/components/discover/DiscoverEventCard";
import { adminContentShellStyle } from "@/lib/adminLayout";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  EVENT_SORT_OPTIONS,
  EVENT_STATUS_FILTERS,
  filterEventsBySearch,
  filterEventsByStatus,
  sortEventsByMode,
  SORT_ACTIVE_FIRST,
  EVENT_STATUS_FILTER_ALL,
} from "@/lib/adminEventsFilters";
import { getEventUxState } from "@/lib/eventUxState";

const LEADS_LAST_SEEN_LS_PREFIX = "avote_leads_seen_at_";

/** @typedef {"organized"|"favorites"|"invitations"} MesEventsSection */

const MES_EVENTS_SECTIONS = [
  { id: /** @type {MesEventsSection} */ ("organized"), label: "Organisés" },
  { id: /** @type {MesEventsSection} */ ("favorites"), label: "Favoris" },
  { id: /** @type {MesEventsSection} */ ("invitations"), label: "Invitations" },
];

function mapApiError(body, status) {
  const code = String(body?.error || "").trim();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (code === "EVENT_ALREADY_ACTIVE") {
    return "Vous avez déjà un événement actif. Terminez-le avant d’en créer un nouveau.";
  }
  return message || code || `Erreur ${status}`;
}

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

/** En direct → lecture → en attente → sinon premier. */
function pickFeaturedEventId(events) {
  if (!events.length) return null;
  const by = (key) => events.find((e) => getEventUxState(e).key === key);
  return (
    by("voting")?.id ??
    by("lecture")?.id ??
    by("waiting")?.id ??
    events[0].id
  );
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
    participantsUsed:
      typeof e.participantsUsed === "number"
        ? e.participantsUsed
        : typeof e.participantCount === "number"
          ? e.participantCount
          : null,
    participantsLimit:
      typeof e.participantsLimit === "number" ? e.participantsLimit : null,
    voteState:
      typeof e.voteState === "string" && e.voteState.trim()
        ? String(e.voteState).toLowerCase()
        : "",
    displayState:
      typeof e.displayState === "string" && e.displayState.trim()
        ? String(e.displayState).toLowerCase()
        : "",
    landingEnabled:
      typeof e.landingEnabled === "boolean" ? e.landingEnabled : undefined,
    visibility:
      typeof e.visibility === "string" && e.visibility.trim()
        ? String(e.visibility).toLowerCase()
        : e.isPublic === true
          ? "public"
          : "private",
    organizerProfileId:
      typeof e.organizerProfileId === "string" && e.organizerProfileId.trim()
        ? e.organizerProfileId
        : null,
    _localOnly: Boolean(e._localOnly),
  };
}

export default function AdminEventsPage() {
  const [section, setSection] = useState(/** @type {MesEventsSection} */ ("organized"));
  const [rows, setRows] = useState([]);
  const [favorites, setFavorites] = useState(/** @type {Array<Record<string, any>>} */ ([]));
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState(/** @type {string|null} */ (null));
  const [newLeadCounts, setNewLeadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(EVENT_STATUS_FILTER_ALL);
  const [sortMode, setSortMode] = useState(SORT_ACTIVE_FIRST);
  const [actionEventId, setActionEventId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/events`);
      if (res.status === 401) {
        setRows([]);
        setFetchError("Session expirée ou non connecté. Rechargez la page ou reconnectez-vous.");
        return;
      }
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRows(list.map(normalizeEventRow));
    } catch (e) {
      setFetchError(e.message || "Impossible de charger les événements.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    setFetchError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/me/favorites`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setFavorites([]);
        setFetchError("Session expirée ou non connecté. Rechargez la page ou reconnectez-vous.");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      const list = Array.isArray(body.favorites) ? body.favorites : [];
      setFavorites(
        list
          .map((row) => row?.event)
          .filter((ev) => ev && typeof ev.id === "string"),
      );
    } catch (e) {
      setFavorites([]);
      setFetchError(e?.message || "Impossible de charger les favoris.");
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (section === "favorites") {
      void loadFavorites();
    }
  }, [section, loadFavorites]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!rows.length) {
      setNewLeadCounts({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      const next = {};
      for (const ev of rows) {
        const eventId = String(ev.id || "");
        if (!eventId) continue;
        try {
          const seenRaw = window.localStorage.getItem(
            LEADS_LAST_SEEN_LS_PREFIX + eventId,
          );
          const seenMs = Number(seenRaw || "0");
          const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}/leads`);
          const body = await res.json().catch(() => []);
          if (!res.ok || !Array.isArray(body)) continue;
          next[eventId] = body.filter((x) => {
            const ts = Date.parse(String(x?.createdAt || ""));
            return Number.isFinite(ts) && ts > seenMs;
          }).length;
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setNewLeadCounts(next);
    };
    void run();
    const id = window.setInterval(() => void run(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [rows]);

  const duplicateEvent = useCallback(
    async (eventId) => {
      if (!eventId) return;
      setActionEventId(eventId);
      setFetchError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/duplicate`,
          { method: "POST" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(mapApiError(body, res.status));
        }
        await load();
        setToastMsg("Événement dupliqué");
        window.setTimeout(() => setToastMsg(null), 2600);
      } catch (e) {
        setFetchError(e?.message || "Duplication impossible.");
      } finally {
        setActionEventId(null);
      }
    },
    [load],
  );

  const renameEvent = useCallback(async (eventId, title) => {
    const trimmed = String(title ?? "").trim();
    if (!eventId) {
      throw new Error("Événement introuvable.");
    }
    if (!trimmed) {
      throw new Error("Le titre ne peut pas être vide.");
    }
    if (trimmed.length > 200) {
      throw new Error("Le titre ne peut pas dépasser 200 caractères.");
    }
    setActionEventId(eventId);
    setFetchError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      const newTitle =
        typeof body?.title === "string" && body.title.trim()
          ? body.title.trim()
          : trimmed;
      setRows((prev) =>
        prev.map((r) =>
          String(r.id) === String(eventId) ? { ...r, title: newTitle } : r,
        ),
      );
      setToastMsg("Titre enregistré");
      window.setTimeout(() => setToastMsg(null), 2600);
    } catch (e) {
      throw new Error(e?.message || "Impossible de renommer l’événement.");
    } finally {
      setActionEventId(null);
    }
  }, []);

  const deleteEvent = useCallback(
    async (eventId) => {
      const ev = rows.find((x) => String(x.id) === String(eventId));
      const titre = ev?.title || "cet événement";
      const ok = window.confirm(
        `Supprimer définitivement « ${titre} » ? Cette action est irréversible.`,
      );
      if (!ok) return;
      setActionEventId(eventId);
      setFetchError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}`,
          { method: "DELETE" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(mapApiError(body, res.status));
        }
        await load();
        setToastMsg("Événement supprimé");
        window.setTimeout(() => setToastMsg(null), 2600);
      } catch (e) {
        setFetchError(e?.message || "Suppression impossible.");
      } finally {
        setActionEventId(null);
      }
    },
    [rows, load],
  );

  const changeEventVisibility = useCallback(
    async (eventId, next, opts) => {
      if (!eventId) {
        throw new Error("Événement introuvable.");
      }
      setActionEventId(eventId);
      setFetchError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/visibility`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visibility: next,
              confirmPublic: Boolean(opts?.confirmPublic),
            }),
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(mapApiError(body, res.status));
        }
        const nextVis =
          typeof body?.visibility === "string" && body.visibility.trim()
            ? String(body.visibility).toLowerCase()
            : next;
        setRows((prev) =>
          prev.map((r) =>
            String(r.id) === String(eventId)
              ? { ...r, visibility: nextVis }
              : r,
          ),
        );
        setToastMsg(
          nextVis === "public"
            ? "Événement rendu public"
            : "Événement repassé en privé",
        );
        window.setTimeout(() => setToastMsg(null), 2600);
      } catch (e) {
        throw new Error(e?.message || "Impossible de modifier la visibilité.");
      } finally {
        setActionEventId(null);
      }
    },
    [],
  );

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

  const removeFavorite = useCallback(
    async (event) => {
      const eventId = typeof event?.id === "string" ? event.id : "";
      if (!eventId) return;
      setFavoriteBusyId(eventId);
      setFetchError(null);
      const previous = favorites;
      setFavorites((prev) => prev.filter((ev) => ev.id !== eventId));
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/favorite`,
          { method: "DELETE" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || `Erreur ${res.status}`);
        }
        setToastMsg("Retiré des favoris");
        window.setTimeout(() => setToastMsg(null), 2600);
      } catch (e) {
        setFavorites(previous);
        setFetchError(e?.message || "Impossible de retirer le favori.");
      } finally {
        setFavoriteBusyId(null);
      }
    },
    [favorites],
  );

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
      {toastMsg ? (
        <div
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 60,
            padding: "0.55rem 0.9rem",
            borderRadius: "10px",
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #1f2937",
            boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
            fontSize: "0.84rem",
            fontWeight: 700,
          }}
          role="status"
          aria-live="polite"
        >
          {toastMsg}
        </div>
      ) : null}
      <div style={adminContentShellStyle("workspace")}>
        <AdminPageHeader
          title="Mes événements"
          subtitle="Organisés, favoris et prochainement vos invitations — un seul espace."
          actions={
            <Link
              href="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "0.72rem 1.1rem",
                fontSize: "0.88rem",
                fontWeight: 800,
                borderRadius: "10px",
                textDecoration: "none",
                border: "1px solid #1e40af",
                background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.28)",
                whiteSpace: "nowrap",
              }}
            >
              + Créer un événement
            </Link>
          }
        />

        <div
          role="tablist"
          aria-label="Sections Mes événements"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            marginBottom: "1.15rem",
          }}
        >
          {MES_EVENTS_SECTIONS.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(tab.id)}
                style={{
                  padding: "0.48rem 0.9rem",
                  borderRadius: 999,
                  border: active ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                  background: active ? "#1d4ed8" : "#fff",
                  color: active ? "#fff" : "#334155",
                  fontWeight: 800,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

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
            {fetchError}
          </p>
        ) : null}

        {section === "invitations" ? (
          <div
            style={{
              padding: "clamp(2rem, 5vw, 3rem) 1.5rem",
              borderRadius: "16px",
              border: "1px dashed #cbd5e1",
              background: "#f8fafc",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 0.45rem", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              Invitations bientôt disponibles
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.92rem", lineHeight: 1.55, maxWidth: 420, marginInline: "auto" }}>
              Les invitations privées arriveront dans un prochain lot. Cet espace est prêt pour les accueillir.
            </p>
          </div>
        ) : null}

        {section === "favorites" ? (
          <>
            {favoritesLoading ? (
              <p style={{ color: "#64748b", fontWeight: 500, margin: "0 0 1rem" }}>
                Chargement des favoris…
              </p>
            ) : null}
            {!favoritesLoading && favorites.length === 0 ? (
              <div
                style={{
                  padding: "clamp(2rem, 5vw, 3rem) 1.5rem",
                  borderRadius: "16px",
                  border: "1px dashed #cbd5e1",
                  background: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: "0 0 0.45rem", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                  Aucun favori pour le moment
                </p>
                <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.92rem", lineHeight: 1.55 }}>
                  Sur l’annuaire « Les événements », utilisez le cœur pour enregistrer un événement public.
                </p>
                <Link
                  href="/discover"
                  style={{
                    display: "inline-flex",
                    padding: "0.6rem 1rem",
                    borderRadius: 10,
                    background: "#1d4ed8",
                    color: "#fff",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Parcourir les événements
                </Link>
              </div>
            ) : null}
            {!favoritesLoading && favorites.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "1rem",
                }}
              >
                {favorites.map((ev) => (
                  <DiscoverEventCard
                    key={ev.id}
                    event={{ ...ev, isFavorite: true, favorited: true }}
                    isFavorite
                    favoriteBusy={favoriteBusyId === ev.id}
                    onToggleFavorite={removeFavorite}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {section === "organized" && loading ? (
          <p style={{ color: "#64748b", fontWeight: 500, margin: "0 0 1rem" }}>Chargement…</p>
        ) : null}

        {section === "organized" && !loading && rows.length === 0 ? (
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

        {section === "organized" && !loading && rows.length > 0 ? (
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
              showCreate={false}
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

        {section === "organized" &&
        !loading &&
        rows.length > 0 &&
        filteredSorted.length === 0 ? (
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

        {section === "organized" && !loading && orderedEvents.length > 0 ? (
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
                  newLeadCount={newLeadCounts[ev.id] || 0}
                  formatDate={formatEventDate}
                  actionBusy={actionEventId === ev.id}
                  onDuplicate={duplicateEvent}
                  onDelete={deleteEvent}
                  onRename={renameEvent}
                  onVisibilityChange={changeEventVisibility}
                  onOrganizerProfileChange={(eventId, profileId) => {
                    setRows((prev) =>
                      prev.map((r) =>
                        String(r.id) === String(eventId)
                          ? { ...r, organizerProfileId: profileId }
                          : r,
                      ),
                    );
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        <style>{`
        .admin-events-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .admin-events-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
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
