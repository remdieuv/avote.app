"use client";

import { useEffect, useMemo } from "react";
import { optionVoteCount } from "@/lib/normalizeLivePayload";
import {
  formatRegieOptionStatMeta,
  getRegieOptionStatBarStyles,
} from "@/lib/regieOptionStats";

/**
 * Popup résultats Libre-service (régie) — lecture seule, live via props parent.
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   poll?: {
 *     id?: string;
 *     question?: string | null;
 *     title?: string | null;
 *     options?: Array<{ id?: string; label?: string; voteCount?: number; votes?: number }>;
 *     voteCount?: number;
 *     _count?: { votes?: number };
 *   } | null;
 * }} props
 */
export function SelfServiceResultsModal({ open, onClose, poll = null }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const question =
    (typeof poll?.question === "string" && poll.question.trim()) ||
    (typeof poll?.title === "string" && poll.title.trim()) ||
    "Question";

  const options = useMemo(() => {
    const raw = Array.isArray(poll?.options) ? poll.options : [];
    const rows = raw.map((o, i) => ({
      id: String(o?.id || i),
      label: String(o?.label || `Option ${i + 1}`),
      voteCount: optionVoteCount(o),
    }));
    const totalFromOpts = rows.reduce((a, o) => a + o.voteCount, 0);
    const total = Math.max(
      totalFromOpts,
      Number(poll?.voteCount ?? poll?._count?.votes ?? 0) || 0,
    );
    return {
      total,
      rows: rows.map((o) => ({
        ...o,
        pct: total > 0 ? Math.round((o.voteCount / total) * 1000) / 10 : 0,
      })),
    };
  }, [poll]);

  if (!open || !poll) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ss-results-modal-title"
      data-testid="self-service-results-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.55)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "32rem",
          maxHeight: "min(90vh, 40rem)",
          overflow: "auto",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.22)",
          padding: "1.15rem 1.2rem 1.25rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "0.85rem",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Résultats
            </p>
            <h2
              id="ss-results-modal-title"
              style={{
                margin: "0.25rem 0 0",
                fontSize: "1.08rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
              }}
            >
              {question}
            </h2>
            <p
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.88rem",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              {options.total} vote{options.total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Fermer"
            data-testid="self-service-results-close"
            style={{
              flexShrink: 0,
              minWidth: "2.4rem",
              minHeight: "2.4rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "1.1rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {options.rows.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
            Aucune option pour cette question.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {options.rows.map((opt) => {
              const bar = getRegieOptionStatBarStyles({ pct: opt.pct });
              return (
                <div key={opt.id} style={{ display: "grid", gap: "0.28rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "0.55rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        color: "#334155",
                      }}
                    >
                      {formatRegieOptionStatMeta(opt)}
                    </span>
                  </div>
                  <div style={bar.track}>
                    <div style={bar.fill} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
