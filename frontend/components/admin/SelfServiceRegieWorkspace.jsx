"use client";

import { useCallback, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  isSelfServiceCatalogType,
} from "@/lib/consultationMode";
import { getRegiePollTypeLabel } from "@/lib/regieDesktopLayout";
import { SelfServiceResultsModal } from "@/components/admin/SelfServiceResultsModal";

/**
 * Espace central régie — Libre-service (remplace le pilotage live).
 * @param {{
 *   eventId: string;
 *   slug?: string | null;
 *   selfServiceOpen?: boolean;
 *   polls?: Array<{
 *     id: string;
 *     question?: string | null;
 *     title?: string | null;
 *     type?: string;
 *     status?: string;
 *     leadEnabled?: boolean;
 *     options?: Array<{ id?: string }>;
 *     voteCount?: number;
 *     _count?: { votes?: number };
 *   }> | null;
 *   busy?: boolean;
 *   eventLocked?: boolean;
 *   onChanged?: () => void | Promise<void>;
 *   onAddQuestion?: () => void;
 *   desktop?: boolean;
 * }} props
 */
export function SelfServiceRegieWorkspace({
  eventId,
  slug = null,
  selfServiceOpen = false,
  polls = [],
  busy = false,
  eventLocked = false,
  onChanged,
  onAddQuestion,
  desktop = true,
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [resultsPollId, setResultsPollId] = useState(
    /** @type {string | null} */ (null),
  );

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
  const joinHref = slug ? `/join/${encodeURIComponent(slug)}` : null;
  const resultsPoll = useMemo(
    () =>
      resultsPollId
        ? eligiblePolls.find((p) => p.id === resultsPollId) || null
        : null,
    [eligiblePolls, resultsPollId],
  );

  return (
    <div
      data-testid="self-service-regie-workspace"
      style={{
        display: "grid",
        gap: desktop ? "1rem" : "0.85rem",
        minWidth: 0,
      }}
    >
      {/* Gestion de la consultation */}
      <section
        style={cardStyle}
        aria-label="Gestion de la consultation"
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem 1rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.28rem", minWidth: 0, flex: "1 1 16rem" }}>
            <h3 style={titleStyle}>
              <span aria-hidden style={{ marginRight: "0.35rem" }}>
                ▦
              </span>
              Gestion de la consultation
            </h3>
            <p style={mutedStyle}>
              Les participants choisissent librement leurs questions. Aucune
              régie active nécessaire.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(!selfServiceOpen)}
            data-testid="self-service-toggle-consultation"
            style={{
              ...primaryBtnStyle,
              background: selfServiceOpen
                ? "linear-gradient(180deg, #fb923c 0%, #ea580c 100%)"
                : "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
              borderColor: selfServiceOpen ? "#c2410c" : "#15803d",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {selfServiceOpen ? "Mettre en pause" : "Ouvrir la consultation"}
          </button>
        </div>

        <div
          role="status"
          style={{
            marginTop: "0.95rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.55rem 0.85rem",
            padding: "0.75rem 0.9rem",
            borderRadius: "12px",
            border: selfServiceOpen
              ? "1px solid #86efac"
              : "1px solid #fdba74",
            background: selfServiceOpen ? "#f0fdf4" : "#fff7ed",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.22rem 0.55rem",
              borderRadius: "999px",
              fontSize: "0.74rem",
              fontWeight: 800,
              background: selfServiceOpen ? "#dcfce7" : "#ffedd5",
              color: selfServiceOpen ? "#166534" : "#9a3412",
            }}
          >
            {selfServiceOpen ? "Ouverte" : "En pause"}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: "0.84rem",
              fontWeight: 600,
              color: "#334155",
              lineHeight: 1.4,
              flex: "1 1 14rem",
            }}
          >
            {selfServiceOpen
              ? "La consultation est ouverte. Les participants peuvent voter sans régisseur."
              : "La consultation est momentanément fermée. Les participants ne peuvent pas encore voter."}
          </p>
        </div>
      </section>

      {/* Questions */}
      <section style={cardStyle} aria-label="Questions proposées au public">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.55rem",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={titleStyle}>
            Questions proposées au public ({eligiblePolls.length})
          </h3>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAddQuestion?.()}
            style={{
              padding: "0.48rem 0.75rem",
              borderRadius: "10px",
              border: "1px solid rgba(167, 139, 250, 0.4)",
              background: "rgba(139, 92, 246, 0.08)",
              color: "#5b21b6",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            + Ajouter une question
          </button>
        </div>

        {eligiblePolls.length === 0 ? (
          <p style={{ ...mutedStyle, margin: 0 }}>
            Aucune question éligible. Ajoutez un sondage, QCM ou quiz (les
            concours et nuages sont exclus du Libre-service V1).
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "0.55rem",
            }}
          >
            {eligiblePolls.map((p) => {
              const selected = openIds.has(p.id);
              const label =
                (typeof p.question === "string" && p.question.trim()) ||
                (typeof p.title === "string" && p.title.trim()) ||
                "Question";
              const typeLabel = getRegiePollTypeLabel(p);
              const optCount = Array.isArray(p.options) ? p.options.length : 0;
              const votes =
                Number(p.voteCount ?? p._count?.votes ?? 0) || 0;
              return (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.55rem 0.75rem",
                    padding: "0.75rem 0.85rem",
                    borderRadius: "12px",
                    border: selected
                      ? "1px solid #86efac"
                      : "1px solid #e2e8f0",
                    background: selected ? "#f0fdf4" : "#f8fafc",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.55rem",
                      flex: "1 1 14rem",
                      minWidth: 0,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={(e) =>
                        togglePollOpen(p.id, e.target.checked)
                      }
                      style={{ marginTop: "0.2rem" }}
                      aria-label={
                        selected
                          ? `Masquer « ${label} »`
                          : `Sélectionner « ${label} »`
                      }
                    />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 700,
                          color: "#0f172a",
                          fontSize: "0.92rem",
                          lineHeight: 1.35,
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: "0.2rem",
                          fontSize: "0.76rem",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        {typeLabel}
                        {optCount > 0
                          ? ` · Choix (${optCount} réponse${optCount > 1 ? "s" : ""})`
                          : ""}
                      </span>
                    </span>
                  </label>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "999px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      background: selected ? "#dcfce7" : "#e2e8f0",
                      color: selected ? "#166534" : "#475569",
                    }}
                  >
                    {selected ? "Sélectionnée" : "Masquée"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResultsPollId(p.id)}
                    data-testid={`self-service-results-btn-${p.id}`}
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#4338ca",
                      padding: "0.35rem 0.55rem",
                      borderRadius: "8px",
                      border: "1px solid #c7d2fe",
                      background: "#eef2ff",
                      cursor: "pointer",
                    }}
                  >
                    Résultats ({votes})
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Aperçu salle */}
      <section style={cardStyle} aria-label="Aperçu de la salle publique">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.65rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.25rem", minWidth: 0 }}>
            <h3 style={titleStyle}>Aperçu de la salle publique</h3>
            <p style={{ ...mutedStyle, margin: 0 }}>
              Voyez exactement ce que voient les participants.
            </p>
          </div>
          {joinHref ? (
            <a
              href={joinHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...primaryBtnStyle,
                background:
                  "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
                borderColor: "#4338ca",
                textDecoration: "none",
              }}
            >
              Ouvrir la salle ↗
            </a>
          ) : null}
        </div>
      </section>

      {error ? (
        <p
          role="alert"
          style={{ margin: 0, fontSize: "0.84rem", color: "#b91c1c", fontWeight: 700 }}
        >
          {error}
        </p>
      ) : null}

      <SelfServiceResultsModal
        open={Boolean(resultsPollId && resultsPoll)}
        poll={resultsPoll}
        onClose={() => setResultsPollId(null)}
      />
    </div>
  );
}

const cardStyle = {
  padding: "1.05rem 1.1rem",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.96) 100%)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
  boxSizing: "border-box",
};

const titleStyle = {
  margin: 0,
  fontSize: "1.02rem",
  fontWeight: 800,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const mutedStyle = {
  margin: 0,
  fontSize: "0.84rem",
  color: "#64748b",
  lineHeight: 1.45,
  fontWeight: 500,
};

const primaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.35rem",
  minHeight: "2.75rem",
  padding: "0.65rem 1.1rem",
  borderRadius: "12px",
  border: "1px solid transparent",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
  flexShrink: 0,
};
