"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const MESSAGE_MAX = 500;

/**
 * Régie — publier / masquer / supprimer des messages du fil landing.
 * @param {{ eventId: string }} props
 */
export function RegieLandingJournalPanel({ eventId }) {
  const [messages, setMessages] = useState(
    /** @type {{ id: string; body: string; hidden: boolean; createdAt: string }[]} */ ([]),
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/messages`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(
        rows.map((m) => ({
          id: String(m.id),
          body: String(m.body || ""),
          hidden: Boolean(m.hidden),
          createdAt: typeof m.createdAt === "string" ? m.createdAt : "",
        })),
      );
      setLoaded(true);
    } catch {
      /* silent */
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    const body = draft.trim().slice(0, MESSAGE_MAX);
    if (!body || !eventId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Publication impossible.",
        );
      }
      setDraft("");
      setMessages((prev) => [
        {
          id: String(data.id),
          body: String(data.body || body),
          hidden: Boolean(data.hidden),
          createdAt:
            typeof data.createdAt === "string"
              ? data.createdAt
              : new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (e) {
      setError(e?.message || "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function setHidden(messageId, hidden) {
    if (!eventId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/messages/${encodeURIComponent(messageId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Mise à jour impossible.",
        );
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, hidden: Boolean(data.hidden) } : m,
        ),
      );
    } catch (e) {
      setError(e?.message || "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(messageId) {
    if (!eventId || busy) return;
    if (!window.confirm("Supprimer ce message du fil ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/messages/${encodeURIComponent(messageId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string" ? data.error : "Suppression impossible.",
        );
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e) {
      setError(e?.message || "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid rgba(148,163,184,0.35)",
        borderRadius: "14px",
        background: "rgba(255,255,255,0.9)",
        padding: "0.7rem 0.75rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        Message landing
      </p>
      <p
        style={{
          margin: "0.28rem 0 0 0",
          fontSize: "0.72rem",
          color: "#64748b",
          lineHeight: 1.35,
        }}
      >
        Court message publié dans le fil chronologique public.
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
        rows={3}
        placeholder="Ex. Merci d’être venus — les résultats arrivent…"
        disabled={busy}
        style={{
          marginTop: "0.55rem",
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
          minHeight: "4.2rem",
          padding: "0.5rem 0.55rem",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
          fontSize: "0.78rem",
          lineHeight: 1.4,
          color: "#0f172a",
          fontFamily: "inherit",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginTop: "0.4rem",
        }}
      >
        <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
          {draft.length}/{MESSAGE_MAX}
        </span>
        <button
          type="button"
          disabled={busy || draft.trim().length === 0}
          onClick={() => void publish()}
          style={{
            minHeight: "2rem",
            padding: "0.35rem 0.7rem",
            borderRadius: "10px",
            border: "1px solid rgba(37, 99, 235, 0.28)",
            background:
              "linear-gradient(180deg, rgba(239,246,255,0.98) 0%, rgba(219,234,254,0.9) 100%)",
            color: "#1d4ed8",
            fontSize: "0.76rem",
            fontWeight: 800,
            cursor:
              busy || draft.trim().length === 0 ? "not-allowed" : "pointer",
            opacity: busy || draft.trim().length === 0 ? 0.65 : 1,
          }}
        >
          {busy ? "…" : "Publier"}
        </button>
      </div>
      {error ? (
        <p
          style={{
            margin: "0.45rem 0 0",
            fontSize: "0.72rem",
            color: "#b91c1c",
          }}
        >
          {error}
        </p>
      ) : null}
      {loaded && messages.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: "0.65rem 0 0",
            padding: 0,
            display: "grid",
            gap: "0.45rem",
            maxHeight: "11rem",
            overflow: "auto",
          }}
        >
          {messages.slice(0, 12).map((m) => (
            <li
              key={m.id}
              style={{
                padding: "0.45rem 0.5rem",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: m.hidden ? "#f8fafc" : "#fff",
                opacity: m.hidden ? 0.72 : 1,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.74rem",
                  color: "#0f172a",
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.body}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.35rem",
                  marginTop: "0.35rem",
                }}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setHidden(m.id, !m.hidden)}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.45rem",
                    borderRadius: "999px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#475569",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  {m.hidden ? "Réafficher" : "Masquer"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(m.id)}
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.45rem",
                    borderRadius: "999px",
                    border: "1px solid #fecaca",
                    background: "#fff",
                    color: "#b91c1c",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
