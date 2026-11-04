"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { LANDING_CAPTION_MAX } from "@/lib/landingEventPresentation";

const MESSAGE_MAX = 500;

/**
 * Admin Landing — Fil de l’événement (messages, Moments, résultats).
 * Réutilise les API PR #38 ; photos gérées via callbacks parent.
 *
 * @param {{
 *   eventId: string;
 *   photos: { id: string; url: string; createdAt?: string; caption?: string | null }[];
 *   photosMax?: number;
 *   photoBusy?: boolean;
 *   onAddPhotos?: (files: File[]) => void | Promise<void>;
 *   onRemovePhoto?: (photoId: string) => void | Promise<void>;
 *   onPhotoCaptionSaved?: (photoId: string, caption: string | null) => void;
 *   closedPolls?: {
 *     id: string;
 *     question?: string;
 *     title?: string;
 *     status?: string;
 *     type?: string;
 *     leadEnabled?: boolean;
 *     landingResultHidden?: boolean;
 *   }[];
 *   onToast?: (msg: string) => void;
 *   onChanged?: () => void;
 *   cardStyle?: Record<string, string | number>;
 *   btnPrimaryStyle?: Record<string, string | number>;
 *   btnSecondaryStyle?: Record<string, string | number>;
 *   hintStyle?: Record<string, string | number>;
 * }} props
 */
export function LandingFeedAdminPanel({
  eventId,
  photos = [],
  photosMax = 50,
  photoBusy = false,
  onAddPhotos,
  onRemovePhoto,
  onPhotoCaptionSaved,
  closedPolls = [],
  onToast,
  onChanged,
  cardStyle,
  btnPrimaryStyle,
  btnSecondaryStyle,
  hintStyle,
}) {
  const [messages, setMessages] = useState(
    /** @type {{ id: string; body: string; hidden: boolean; createdAt: string }[]} */ ([]),
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [resultBusyId, setResultBusyId] = useState(
    /** @type {string | null} */ (null),
  );
  const [pollHidden, setPollHidden] = useState(
    /** @type {Record<string, boolean>} */ ({}),
  );
  /** Brouillons légendes Moments (id → texte). */
  const [captionDrafts, setCaptionDrafts] = useState(
    /** @type {Record<string, string>} */ ({}),
  );
  const [captionBusyId, setCaptionBusyId] = useState(
    /** @type {string | null} */ (null),
  );

  useEffect(() => {
    /** @type {Record<string, string>} */
    const next = {};
    for (const ph of photos) {
      const id = String(ph.id || "");
      if (!id) continue;
      next[id] =
        typeof ph.caption === "string" && ph.caption.trim()
          ? ph.caption.trim()
          : "";
    }
    setCaptionDrafts(next);
  }, [photos]);

  useEffect(() => {
    /** @type {Record<string, boolean>} */
    const next = {};
    for (const p of closedPolls) {
      next[String(p.id)] = Boolean(p.landingResultHidden);
    }
    setPollHidden(next);
  }, [closedPolls]);

  const loadMessages = useCallback(async () => {
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
    } catch {
      /* silent */
    }
  }, [eventId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const timeline = useMemo(() => {
    /** @type {{ key: string; type: "photo" | "message"; at: number; photo?: object; message?: object }[]} */
    const items = [];
    for (const ph of photos) {
      items.push({
        key: `photo:${ph.id}`,
        type: "photo",
        at: Date.parse(ph.createdAt || "") || 0,
        photo: ph,
      });
    }
    for (const m of messages) {
      items.push({
        key: `message:${m.id}`,
        type: "message",
        at: Date.parse(m.createdAt || "") || 0,
        message: m,
      });
    }
    items.sort((a, b) => b.at - a.at);
    return items;
  }, [photos, messages]);

  const resultRows = useMemo(() => {
    return (closedPolls || []).filter((p) => {
      const type = String(p?.type || "").toUpperCase();
      if (type === "CONTEST_ENTRY") return true;
      return !p?.leadEnabled;
    });
  }, [closedPolls]);

  const shell = cardStyle || {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    padding: "1.15rem 1.2rem",
    boxSizing: "border-box",
  };
  const primary = btnPrimaryStyle || {
    padding: "0.5rem 0.95rem",
    fontSize: "0.84rem",
    fontWeight: 700,
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
    color: "#fff",
    cursor: "pointer",
  };
  const secondary = btnSecondaryStyle || {
    padding: "0.35rem 0.65rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
  };
  const hint = hintStyle || {
    margin: "0 0 0.65rem",
    fontSize: "0.72rem",
    color: "#64748b",
    lineHeight: 1.45,
  };

  async function publishMessage() {
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
      onToast?.("Message publié sur le fil");
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function setMessageHidden(messageId, hidden) {
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
      onToast?.(hidden ? "Message masqué" : "Message réaffiché");
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMessage(messageId) {
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
      onToast?.("Message supprimé");
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResultHidden(pollId, hidden) {
    if (!eventId || !pollId || resultBusyId) return;
    setResultBusyId(pollId);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/polls/${encodeURIComponent(pollId)}/landing-result`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden: Boolean(hidden) }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Mise à jour impossible.",
        );
      }
      setPollHidden((prev) => ({
        ...prev,
        [pollId]: Boolean(data.landingResultHidden),
      }));
      onToast?.(
        hidden ? "Résultat masqué du fil" : "Résultat visible sur le fil",
      );
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Mise à jour impossible.");
    } finally {
      setResultBusyId(null);
    }
  }

  async function savePhotoCaption(photoId, overrideText) {
    if (!eventId || !photoId || captionBusyId) return;
    const draft =
      overrideText !== undefined
        ? String(overrideText)
        : String(captionDrafts[photoId] ?? "");
    const existing = photos.find((p) => String(p.id) === String(photoId));
    const current =
      typeof existing?.caption === "string" && existing.caption.trim()
        ? existing.caption.trim()
        : "";
    const next = draft.trim();
    if (next === current) {
      onToast?.("Légende à jour");
      return;
    }
    setCaptionBusyId(photoId);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/photos/${encodeURIComponent(photoId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: next === "" ? null : next }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Légende non enregistrée.",
        );
      }
      const saved =
        typeof data.caption === "string" && data.caption.trim()
          ? data.caption.trim()
          : null;
      setCaptionDrafts((prev) => ({
        ...prev,
        [photoId]: saved || "",
      }));
      onPhotoCaptionSaved?.(photoId, saved);
      onToast?.(saved ? "Légende enregistrée" : "Légende retirée");
      onChanged?.();
    } catch (e) {
      setError(e?.message || "Légende non enregistrée.");
    } finally {
      setCaptionBusyId(null);
    }
  }

  const atMaxPhotos = photos.length >= photosMax;
  const actionsLocked = busy || photoBusy;

  return (
    <section style={shell} data-testid="landing-feed-admin">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.45rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Fil de l&apos;événement
        </h2>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#0f766e",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "999px",
            padding: "0.22rem 0.55rem",
          }}
        >
          En ligne dès l’ajout
        </span>
      </div>
      <p style={hint}>
        Messages, Moments live et résultats terminés — même journal que sur /e.
        Photos {photos.length}/{photosMax}.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <label
            style={{
              ...primary,
              display: "inline-block",
              cursor:
                actionsLocked || atMaxPhotos || !onAddPhotos
                  ? "not-allowed"
                  : "pointer",
              opacity: actionsLocked || atMaxPhotos || !onAddPhotos ? 0.65 : 1,
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              style={{ display: "none" }}
              disabled={actionsLocked || atMaxPhotos || !onAddPhotos}
              onChange={(e) => {
                const raw = e.target.files;
                const files = raw?.length ? Array.from(raw) : [];
                e.target.value = "";
                if (files.length) void onAddPhotos?.(files);
              }}
            />
            {photoBusy ? "Publication…" : "Publier une photo"}
          </label>
        </div>

        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MESSAGE_MAX))}
            rows={3}
            placeholder="Message court pour le fil (ex. Merci d’être venus)…"
            disabled={busy}
            style={{
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              minHeight: "4rem",
              padding: "0.55rem 0.65rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "0.84rem",
              lineHeight: 1.4,
              color: "#0f172a",
              fontFamily: "inherit",
            }}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
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
              onClick={() => void publishMessage()}
              style={{
                ...primary,
                opacity: busy || draft.trim().length === 0 ? 0.65 : 1,
                cursor:
                  busy || draft.trim().length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "…" : "Publier le message"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          style={{
            margin: "0 0 0.65rem",
            fontSize: "0.78rem",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          {error}
        </p>
      ) : null}

      <p
        style={{
          margin: "0 0 0.45rem",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#94a3b8",
        }}
      >
        Publications (récent → ancien)
      </p>

      {timeline.length === 0 ? (
        <p style={{ ...hint, margin: "0 0 0.85rem" }}>
          Aucune publication pour l’instant — ajoutez une photo ou un message.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: "0 0 1rem",
            padding: 0,
            display: "grid",
            gap: "0.55rem",
          }}
        >
          {timeline.map((item) => {
            if (item.type === "photo" && item.photo) {
              const ph = item.photo;
              const pid = String(ph.id);
              const captionDraft = captionDrafts[pid] ?? "";
              const savedCaption =
                typeof ph.caption === "string" && ph.caption.trim()
                  ? ph.caption.trim()
                  : "";
              const captionDirty = captionDraft.trim() !== savedCaption;
              const captionSaving = captionBusyId === pid;
              return (
                <li
                  key={item.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1fr",
                    gap: "0.65rem",
                    alignItems: "start",
                    padding: "0.5rem",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#f1f5f9",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ph.url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#94a3b8",
                      }}
                    >
                      Moment
                    </p>
                    <label
                      style={{
                        display: "block",
                        margin: "0.35rem 0 0.25rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Légende (facultative)
                    </label>
                    <textarea
                      value={captionDraft}
                      maxLength={LANDING_CAPTION_MAX}
                      rows={2}
                      disabled={captionSaving || actionsLocked}
                      onChange={(e) =>
                        setCaptionDrafts((prev) => ({
                          ...prev,
                          [pid]: e.target.value,
                        }))
                      }
                      placeholder="Ex. Arrivée des invités"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        resize: "vertical",
                        minHeight: "2.6rem",
                        padding: "0.4rem 0.5rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.8rem",
                        fontFamily: "inherit",
                        color: "#0f172a",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.35rem",
                        marginTop: "0.4rem",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        disabled={
                          captionSaving || actionsLocked || !captionDirty
                        }
                        onClick={() => void savePhotoCaption(pid)}
                        style={{
                          ...secondary,
                          cursor:
                            captionSaving || actionsLocked || !captionDirty
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            captionSaving || actionsLocked || !captionDirty
                              ? 0.65
                              : 1,
                        }}
                      >
                        {captionSaving ? "…" : "Enregistrer la légende"}
                      </button>
                      {savedCaption || captionDraft.trim() ? (
                        <button
                          type="button"
                          disabled={captionSaving || actionsLocked}
                          onClick={() => void savePhotoCaption(pid, "")}
                          style={{
                            ...secondary,
                            color: "#64748b",
                            cursor:
                              captionSaving || actionsLocked
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Effacer
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={actionsLocked}
                        onClick={() => void onRemovePhoto?.(pid)}
                        style={{
                          ...secondary,
                          color: "#b91c1c",
                          borderColor: "#fecaca",
                          background: "#fff",
                          cursor: actionsLocked ? "not-allowed" : "pointer",
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </li>
              );
            }
            if (item.type === "message" && item.message) {
              const m = item.message;
              return (
                <li
                  key={item.key}
                  style={{
                    padding: "0.65rem 0.75rem",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: m.hidden ? "#f8fafc" : "#fff",
                    opacity: m.hidden ? 0.78 : 1,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#94a3b8",
                    }}
                  >
                    Message{m.hidden ? " · masqué" : ""}
                  </p>
                  <p
                    style={{
                      margin: "0.35rem 0 0.5rem",
                      fontSize: "0.88rem",
                      color: "#0f172a",
                      lineHeight: 1.45,
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
                    }}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setMessageHidden(m.id, !m.hidden)}
                      style={{
                        ...secondary,
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      {m.hidden ? "Réafficher" : "Masquer"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeMessage(m.id)}
                      style={{
                        ...secondary,
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              );
            }
            return null;
          })}
        </ul>
      )}

      <p
        style={{
          margin: "0 0 0.45rem",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#94a3b8",
        }}
      >
        Résultats dans le fil
      </p>
      <p style={{ ...hint, marginBottom: "0.55rem" }}>
        Questions terminées publiées automatiquement (hors Lead CRM). Masquez
        individuellement si besoin.
      </p>
      {resultRows.length === 0 ? (
        <p style={{ ...hint, margin: 0 }}>
          Aucune question terminée pour l’instant.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: "0.45rem",
          }}
        >
          {resultRows.map((p) => {
            const pid = String(p.id);
            const hidden = Boolean(pollHidden[pid]);
            const label =
              (typeof p.question === "string" && p.question.trim()) ||
              (typeof p.title === "string" && p.title.trim()) ||
              "Question";
            const toggling = resultBusyId === pid;
            return (
              <li
                key={pid}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  padding: "0.55rem 0.65rem",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: hidden ? "#f8fafc" : "#fff",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 12rem" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#94a3b8",
                    }}
                  >
                    Résultat{hidden ? " · masqué" : ""}
                  </p>
                  <p
                    style={{
                      margin: "0.2rem 0 0",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      lineHeight: 1.35,
                    }}
                  >
                    {label}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(resultBusyId)}
                  onClick={() => void toggleResultHidden(pid, !hidden)}
                  style={{
                    ...secondary,
                    cursor: resultBusyId ? "not-allowed" : "pointer",
                    opacity: resultBusyId && !toggling ? 0.65 : 1,
                  }}
                >
                  {toggling
                    ? "…"
                    : hidden
                      ? "Réafficher"
                      : "Masquer du fil"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
