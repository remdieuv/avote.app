"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadStoredMyEvents } from "@/lib/myEventsStorage";

const API = "http://localhost:4000";

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

const btn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.6rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  borderRadius: "10px",
  textDecoration: "none",
  border: "1px solid transparent",
  boxSizing: "border-box",
  textAlign: "center",
};

const btnPrimary = {
  ...btn,
  background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
  color: "#fff",
  borderColor: "#1e40af",
  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
};

const btnSecondary = {
  ...btn,
  background: "#fff",
  color: "#334155",
  borderColor: "#cbd5e1",
  fontWeight: 600,
};

export default function AdminEventsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [fromLocalFallback, setFromLocalFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API}/events`);
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) {
        setRows(list);
        setFromLocalFallback(false);
      } else {
        const stored = loadStoredMyEvents();
        setRows(
          stored.map((x) => ({
            id: x.id,
            title: x.title,
            slug: x.slug,
            createdAt: x.savedAt,
            _localOnly: true,
          })),
        );
        setFromLocalFallback(true);
      }
    } catch (e) {
      setFetchError(e.message || "Impossible de charger les événements.");
      const stored = loadStoredMyEvents();
      setRows(
        stored.map((x) => ({
          id: x.id,
          title: x.title,
          slug: x.slug,
          createdAt: x.savedAt,
          _localOnly: true,
        })),
      );
      setFromLocalFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main
      style={{
        padding: "1.25rem 1.25rem 2.5rem",
        maxWidth: "640px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.5,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem 1rem", alignItems: "center" }}>
          <Link href="/admin" style={{ fontSize: "0.9rem", color: "#64748b", textDecoration: "none" }}>
            ← Créer un événement
          </Link>
          <Link href="/" style={{ fontSize: "0.9rem", color: "#64748b", textDecoration: "none" }}>
            Accueil
          </Link>
        </div>
        <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#1e293b" }}>Avote</span>
      </div>

      <h1 style={{ fontSize: "1.4rem", margin: "0 0 0.35rem", fontWeight: 800 }}>Mes événements</h1>
      <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: "0.95rem" }}>
        Lancez votre événement depuis la régie : liens salle participants, écran et
        overlay y sont regroupés.
      </p>

      {fetchError && (
        <p
          style={{
            margin: "0 0 1rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "8px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: "0.9rem",
          }}
          role="alert"
        >
          {fetchError} — affichage des événements enregistrés sur cet appareil le cas échéant.
        </p>
      )}

      {fromLocalFallback && rows.length > 0 && (
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            color: "#7c3aed",
            fontWeight: 600,
          }}
        >
          Source : appareil (aucun événement renvoyé par le serveur ou API indisponible).
        </p>
      )}

      {loading && <p style={{ color: "#64748b" }}>Chargement…</p>}

      {!loading && rows.length === 0 && (
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px dashed #cbd5e1",
            background: "#f8fafc",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <p style={{ margin: "0 0 1rem" }}>Aucun événement pour l’instant.</p>
          <Link
            href="/admin"
            style={{
              ...btn,
              background: "#7c3aed",
              color: "#fff",
              borderColor: "#6d28d9",
            }}
          >
            Créer un événement
          </Link>
        </div>
      )}

      {!loading &&
        rows.length > 0 &&
        rows.map((ev) => (
          <article
            key={ev.id}
            style={{
              marginBottom: "1rem",
              padding: "1.15rem 1.25rem",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
            }}
          >
            <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.35rem", fontWeight: 700, color: "#0f172a" }}>
              {ev.title}
            </h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "#64748b" }}>
              {formatEventDate(
                ev.createdAt,
                ev._localOnly ? "Date locale" : null,
              )}
              {ev._localOnly ? (
                <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.78rem", color: "#94a3b8" }}>
                  Enregistré sur cet appareil
                </span>
              ) : null}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
              }}
              className="admin-events-actions"
            >
              <Link
                href={`/admin/event/${ev.id}`}
                style={{
                  ...btnPrimary,
                  width: "100%",
                }}
              >
                Lancer mon événement
              </Link>
              {ev._localOnly ? (
                <span
                  title="Créez l’événement sur le serveur pour personnaliser la salle."
                  style={{
                    ...btnSecondary,
                    width: "100%",
                    opacity: 0.55,
                    cursor: "not-allowed",
                    background: "#f8fafc",
                  }}
                >
                  Personnaliser ma salle
                </span>
              ) : (
                <Link
                  href={`/admin/events/${ev.id}/customization`}
                  style={{
                    ...btnSecondary,
                    width: "100%",
                  }}
                >
                  Personnaliser ma salle
                </Link>
              )}
            </div>
          </article>
        ))}

      <style>{`
        @media (min-width: 480px) {
          .admin-events-actions {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: stretch;
          }
          .admin-events-actions a,
          .admin-events-actions span {
            flex: 1 1 calc(50% - 0.35rem);
            min-width: 200px;
            width: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
