"use client";

import { useCallback, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  isSelfServiceCatalogType,
  normalizeConsultationModeUi,
} from "@/lib/consultationMode";

/**
 * Régie — bascule Live animé / Libre-service + ouverture consultation + questions ouvertes.
 * @param {{
 *   eventId: string;
 *   consultationMode?: string | null;
 *   selfServiceOpen?: boolean | null;
 *   polls?: Array<{ id: string; question?: string | null; title?: string | null; type?: string; status?: string }> | null;
 *   busy?: boolean;
 *   eventLocked?: boolean;
 *   onChanged?: () => void | Promise<void>;
 * }} props
 */
export function ConsultationModePanel({
  eventId,
  consultationMode,
  selfServiceOpen = false,
  polls = [],
  busy = false,
  eventLocked = false,
  onChanged,
}) {
  const mode = normalizeConsultationModeUi(consultationMode);
  const isSs = mode === "self_service";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const eligiblePolls = useMemo(
    () =>
      (Array.isArray(polls) ? polls : []).filter(
        (p) =>
          p?.id &&
          String(p.status || "").toUpperCase() !== "ARCHIVED" &&
          isSelfServiceCatalogType(p.type),
      ),
    [polls],
  );

  const openIds = useMemo(
    () =>
      new Set(
        eligiblePolls
          .filter((p) => String(p.status || "").toUpperCase() === "ACTIVE")
          .map((p) => p.id),
      ),
    [eligiblePolls],
  );

  const run = useCallback(
    async (fn) => {
      if (!eventId || busy || eventLocked || pending) return;
      setPending(true);
      setError(null);
      try {
        await fn();
        if (onChanged) await onChanged();
      } catch (e) {
        setError(e?.message || "Action impossible.");
      } finally {
        setPending(false);
      }
    },
    [eventId, busy, eventLocked, pending, onChanged],
  );

  const setMode = (next) =>
    run(async () => {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/consultation-mode`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: next }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
    });

  const setOpen = (open) =>
    run(async () => {
      const path = open ? "open" : "close";
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/consultation/${path}`,
        { method: "POST" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
    });

  const togglePollOpen = (pollId, wantOpen) =>
    run(async () => {
      const next = new Set(openIds);
      if (wantOpen) next.add(pollId);
      else next.delete(pollId);
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/consultation/polls`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollIds: [...next] }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`);
    });

  const disabled = busy || eventLocked || pending;

  return (
    <section
      aria-label="Mode de consultation"
      style={{
        marginTop: "0.85rem",
        padding: "0.85rem 0.9rem",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        background: "#fff",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          margin: "0 0 0.55rem",
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        Mode
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.4rem",
        }}
      >
        <button
          type="button"
          disabled={disabled || !isSs}
          onClick={() => setMode("live")}
          style={modeBtnStyle(!isSs, disabled)}
        >
          Live animé
        </button>
        <button
          type="button"
          disabled={disabled || isSs}
          onClick={() => setMode("self_service")}
          style={modeBtnStyle(isSs, disabled)}
        >
          Libre-service
        </button>
      </div>

      {isSs ? (
        <div style={{ marginTop: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              flexWrap: "wrap",
              marginBottom: "0.65rem",
            }}
          >
            <button
              type="button"
              disabled={disabled || Boolean(selfServiceOpen)}
              onClick={() => setOpen(true)}
              style={actionBtnStyle(Boolean(selfServiceOpen), disabled)}
            >
              Ouvrir la consultation
            </button>
            <button
              type="button"
              disabled={disabled || !selfServiceOpen}
              onClick={() => setOpen(false)}
              style={actionBtnStyle(!selfServiceOpen, disabled, true)}
            >
              Mettre en pause
            </button>
          </div>
          <p
            style={{
              margin: "0 0 0.45rem",
              fontSize: "0.78rem",
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            {selfServiceOpen
              ? "Consultation ouverte — les participants votent sans régisseur."
              : "Consultation en pause — les votes sont temporairement fermés."}
          </p>
          <p
            style={{
              margin: "0 0 0.4rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#475569",
            }}
          >
            Questions ouvertes
          </p>
          {eligiblePolls.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
              Aucune question éligible (ajoutez un sondage simple / QCM / quiz).
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {eligiblePolls.map((p) => {
                const label =
                  (typeof p.question === "string" && p.question.trim()) ||
                  (typeof p.title === "string" && p.title.trim()) ||
                  "Question";
                const checked = openIds.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.45rem",
                        fontSize: "0.82rem",
                        color: "#0f172a",
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) =>
                          togglePollOpen(p.id, e.target.checked)
                        }
                        style={{ marginTop: "0.15rem" }}
                      />
                      <span style={{ lineHeight: 1.35 }}>{label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <p
          style={{
            margin: "0.65rem 0 0",
            fontSize: "0.78rem",
            color: "#64748b",
            lineHeight: 1.4,
          }}
        >
          Une question à la fois, pilotée depuis la régie.
        </p>
      )}

      {error ? (
        <p
          role="alert"
          style={{
            margin: "0.55rem 0 0",
            fontSize: "0.8rem",
            color: "#b91c1c",
          }}
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}

function modeBtnStyle(active, disabled) {
  return {
    padding: "0.55rem 0.4rem",
    borderRadius: "10px",
    border: active ? "2px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#f8fafc",
    color: active ? "#1d4ed8" : "#334155",
    fontWeight: 700,
    fontSize: "0.78rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled && !active ? 0.65 : 1,
  };
}

function actionBtnStyle(active, disabled, muted = false) {
  return {
    padding: "0.45rem 0.7rem",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: active ? "#e2e8f0" : muted ? "#fff7ed" : "#ecfdf5",
    color: active ? "#64748b" : muted ? "#9a3412" : "#065f46",
    fontWeight: 700,
    fontSize: "0.76rem",
    cursor: disabled || active ? "not-allowed" : "pointer",
  };
}
