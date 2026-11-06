"use client";

import { useCallback, useEffect, useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { DiscoverEventCard } from "@/components/discover/DiscoverEventCard";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { DISCOVER_CATEGORY_TABS } from "@/lib/discoverUi";
import { marketingContentShellStyle } from "@/lib/marketingLayout";

const PAGE_SIZE = 12;

const inputStyle = {
  width: "100%",
  minHeight: 42,
  padding: "0.5rem 0.7rem",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: "0.9rem",
  boxSizing: "border-box",
  color: "#0f172a",
};

/**
 * Lot C — annuaire public Découvrir (client).
 */
export function DiscoverPageClient() {
  const [category, setCategory] = useState(/** @type {"upcoming"|"live"|"finished"} */ ("upcoming"));
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [city, setCity] = useState("");
  const [cityDebounced, setCityDebounced] = useState("");
  const [theme, setTheme] = useState("");
  const [themes, setThemes] = useState(/** @type {Array<{id:string,slug:string,label:string}>} */ ([]));
  const [events, setEvents] = useState(/** @type {Array<Record<string, any>>} */ ([]));
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(/** @type {number|null} */ (null));

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => setCityDebounced(city.trim()), 280);
    return () => clearTimeout(t);
  }, [city]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/discover/themes`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(body.themes)) {
          setThemes(body.themes);
        }
      } catch {
        /* catalogue optionnel à l’affichage */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPage = useCallback(
    async ({ offset = 0, append = false } = {}) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams();
        params.set("category", category);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        if (qDebounced) params.set("q", qDebounced);
        if (cityDebounced) params.set("city", cityDebounced);
        if (theme) params.set("theme", theme);

        const res = await adminFetch(
          `${apiBaseBrowser()}/discover/events?${params.toString()}`,
          { cache: "no-store" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || `Erreur ${res.status}`);
        }
        const rows = Array.isArray(body.events) ? body.events : [];
        setEvents((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(Boolean(body?.pagination?.hasMore));
        setNextOffset(
          typeof body?.pagination?.nextOffset === "number"
            ? body.pagination.nextOffset
            : null,
        );
      } catch (e) {
        if (!append) {
          setEvents([]);
          setHasMore(false);
          setNextOffset(null);
        }
        setError(e?.message || "Impossible de charger les événements.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, qDebounced, cityDebounced, theme],
  );

  useEffect(() => {
    void fetchPage({ offset: 0, append: false });
  }, [fetchPage]);

  const emptyHint = (() => {
    if (qDebounced || cityDebounced || theme) {
      return "Aucun événement ne correspond à votre recherche. Essayez un autre thème, une autre ville, ou élargissez les mots-clés.";
    }
    if (category === "live") {
      return "Aucun événement en direct pour le moment. Revenez bientôt, ou explorez les événements à venir.";
    }
    if (category === "finished") {
      return "Pas encore de souvenirs publics. Les événements terminés avec une Landing apparaîtront ici.";
    }
    return "Aucun événement à venir pour l’instant. Les organisateurs AVOTE publieront bientôt leurs prochains rendez-vous.";
  })();

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        color: "#0f172a",
        background: "linear-gradient(180deg, #f8fafc 0%, #fff 42%)",
      }}
    >
      <LandingHeader />
      <main style={marketingContentShellStyle({ paddingTop: "1.75rem" })}>
        <header style={{ marginBottom: "1.35rem", maxWidth: 640 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Annuaire public
          </p>
          <h1
            style={{
              margin: "0.35rem 0 0.45rem",
              fontSize: "clamp(1.65rem, 4vw, 2.15rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            Découvrir
          </h1>
          <p style={{ margin: 0, color: "#475569", fontSize: "1rem", lineHeight: 1.55 }}>
            Trouvez des événements publics organisés avec AVOTE — à venir, en
            direct, ou leurs souvenirs.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Catégories"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            marginBottom: "1rem",
          }}
        >
          {DISCOVER_CATEGORY_TABS.map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(/** @type {any} */ (tab.id))}
                style={{
                  padding: "0.48rem 0.85rem",
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

        <form
          onSubmit={(e) => e.preventDefault()}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.65rem",
            marginBottom: "1.25rem",
            alignItems: "end",
          }}
        >
          <label style={fieldLabel}>
            Recherche
            <input
              style={inputStyle}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, organisateur…"
              aria-label="Rechercher par nom ou organisateur"
            />
          </label>
          <label style={fieldLabel}>
            Ville
            <input
              style={inputStyle}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex. Lyon"
              aria-label="Filtrer par ville"
            />
          </label>
          <label style={fieldLabel}>
            Thème
            <select
              style={inputStyle}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              aria-label="Filtrer par thème"
            >
              <option value="">Tous les thèmes</option>
              {themes.map((t) => (
                <option key={t.id} value={t.slug || t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </form>

        {error ? (
          <p style={{ color: "#b91c1c", fontWeight: 700 }} role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p style={{ color: "#64748b" }}>Chargement des événements…</p>
        ) : null}

        {!loading && !error && events.length === 0 ? (
          <div
            style={{
              border: "1px dashed #cbd5e1",
              borderRadius: 14,
              padding: "1.75rem 1.25rem",
              background: "#f8fafc",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: "0 0 0.35rem",
                fontWeight: 850,
                fontSize: "1.05rem",
                color: "#0f172a",
              }}
            >
              Rien à afficher ici
            </p>
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5, maxWidth: 480, marginInline: "auto" }}>
              {emptyHint}
            </p>
          </div>
        ) : null}

        {!loading && events.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {events.map((ev) => (
              <DiscoverEventCard key={ev.id} event={ev} />
            ))}
          </div>
        ) : null}

        {!loading && hasMore && nextOffset != null ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void fetchPage({ offset: nextOffset, append: true })}
              style={{
                padding: "0.6rem 1.1rem",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: loadingMore ? "wait" : "pointer",
              }}
            >
              {loadingMore ? "Chargement…" : "Voir plus"}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

const fieldLabel = {
  display: "grid",
  gap: "0.3rem",
  fontSize: "0.78rem",
  fontWeight: 800,
  color: "#475569",
  letterSpacing: "0.02em",
};
