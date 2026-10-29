"use client";

import Link from "next/link";

/**
 * LOT-4 / P5 — Surface Télécommande live (T-E1 + sheets QR / questions).
 * Présentation minimale ; les handlers restent ceux de la régie.
 */

const btnBase = {
  width: "100%",
  minHeight: "3.15rem",
  padding: "0.85rem 1.1rem",
  borderRadius: "14px",
  fontWeight: 800,
  fontSize: "1rem",
  letterSpacing: "0.01em",
  boxSizing: "border-box",
  border: "1px solid transparent",
};

/**
 * @param {{
 *   title: string;
 *   modeBadge: { label: string; color: string; bg: string; border: string };
 *   voteLabel: string;
 *   voteIsOpen: boolean;
 *   stateLabel: string;
 *   participantsCounterLabel: string;
 *   questionProgressSummary: string;
 *   activeQuestionTitle: string;
 *   participationText: string;
 *   chronoText: string;
 *   chronoEnabled?: boolean;
 *   voteToggle: { label: string; enabled: boolean };
 *   onVoteToggle: () => void;
 *   nextAction: { label: string; enabled: boolean };
 *   onNext: () => void;
 *   finishEnabled: boolean;
 *   onFinish: () => void;
 *   onShowQr: () => void;
 *   onOpenQuestions: () => void;
 *   onOpenFullRegie: () => void;
 *   actionError?: string | null;
 *   busy?: boolean;
 *   questionsSheetOpen?: boolean;
 *   onCloseQuestions?: () => void;
 *   questions?: Array<{
 *     id: string;
 *     title: string;
 *     numberLabel: string;
 *     isActive: boolean;
 *     statusLabel?: string;
 *   }>;
 *   onSelectQuestion?: (id: string) => void;
 *   qrSheetOpen?: boolean;
 *   onCloseQr?: () => void;
 *   qrChildren?: import("react").ReactNode;
 *   inTestMode?: boolean;
 *   canStartReal?: boolean;
 *   startRealDisabled?: boolean;
 *   onStartReal?: () => void;
 *   startRealHint?: string | null;
 * }} props
 */
export function RegieTelecommande({
  title,
  modeBadge,
  voteLabel,
  voteIsOpen,
  stateLabel,
  participantsCounterLabel,
  questionProgressSummary,
  activeQuestionTitle,
  participationText,
  chronoText,
  chronoEnabled = false,
  voteToggle,
  onVoteToggle,
  nextAction,
  onNext,
  finishEnabled,
  onFinish,
  onShowQr,
  onOpenQuestions,
  onOpenFullRegie,
  actionError = null,
  busy = false,
  questionsSheetOpen = false,
  onCloseQuestions,
  questions = [],
  onSelectQuestion,
  qrSheetOpen = false,
  onCloseQr,
  qrChildren = null,
  inTestMode = false,
  canStartReal = false,
  startRealDisabled = true,
  onStartReal,
  startRealHint = null,
}) {
  return (
    <div
      data-testid="regie-telecommande"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        padding:
          "max(0.75rem, env(safe-area-inset-top)) max(0.85rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(0.85rem, env(safe-area-inset-left))",
        width: "100%",
        maxWidth: "28rem",
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "100%",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Télécommande
        </p>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={onOpenFullRegie}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#0f766e",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              cursor: "pointer",
            }}
          >
            Régie complète
          </button>
          <Link
            href="/admin/events"
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#475569",
              textDecoration: "none",
            }}
          >
            Événements
          </Link>
        </div>
      </header>

      <section
        aria-label="État live"
        style={{
          borderRadius: "18px",
          padding: "0.95rem 1rem",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 48%, #0f766e 120%)",
          color: "#fff",
          boxShadow: "0 16px 36px rgba(15, 23, 42, 0.22)",
        }}
      >
        <h1
          style={{
            margin: "0 0 0.55rem 0",
            fontSize: "1.15rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={title}
        >
          {title}
        </h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem",
          }}
        >
          {[
            {
              label: modeBadge.label,
              color: modeBadge.color,
              bg: modeBadge.bg,
              border: modeBadge.border,
            },
            {
              label: voteLabel || stateLabel,
              color: voteIsOpen ? "#166534" : "#334155",
              bg: voteIsOpen ? "#dcfce7" : "rgba(255,255,255,0.82)",
              border: voteIsOpen ? "#86efac" : "#cbd5e1",
            },
            {
              label: participantsCounterLabel,
              color: "#1e3a8a",
              bg: "rgba(255,255,255,0.82)",
              border: "#bfdbfe",
            },
          ].map((pill) => (
            <span
              key={pill.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "999px",
                padding: "0.2rem 0.55rem",
                fontSize: "0.68rem",
                fontWeight: 800,
                background: pill.bg,
                color: pill.color,
                border: `1px solid ${pill.border}`,
              }}
            >
              {pill.label}
            </span>
          ))}
        </div>
      </section>

      {inTestMode && canStartReal && typeof onStartReal === "function" ? (
        <button
          type="button"
          disabled={startRealDisabled || busy}
          onClick={onStartReal}
          style={{
            ...btnBase,
            borderColor: "#86efac",
            background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
            color: "#fff",
            opacity: startRealDisabled || busy ? 0.55 : 1,
            cursor: startRealDisabled || busy ? "not-allowed" : "pointer",
            minHeight: "2.6rem",
            fontSize: "0.9rem",
          }}
        >
          Passer en live réel
        </button>
      ) : null}
      {inTestMode && startRealHint ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#92400e",
          }}
        >
          {startRealHint}
        </p>
      ) : null}

      <section
        style={{
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          padding: "0.9rem 1rem",
          display: "grid",
          gap: "0.35rem",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748b",
          }}
        >
          {questionProgressSummary}
        </p>
        <h2
          style={{
            margin: 0,
            fontSize: "1.12rem",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            overflowWrap: "anywhere",
          }}
        >
          {activeQuestionTitle}
        </h2>
        <p
          style={{
            margin: "0.15rem 0 0 0",
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          {participationText}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            fontWeight: 700,
            color: chronoEnabled ? "#0f766e" : "#94a3b8",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Chrono · {chronoText}
        </p>
      </section>

      {actionError ? (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "0.65rem 0.8rem",
            borderRadius: "12px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#9f1239",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {actionError}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: "0.55rem" }}>
        <button
          type="button"
          disabled={!voteToggle.enabled || busy}
          onClick={onVoteToggle}
          style={{
            ...btnBase,
            borderColor: voteToggle.enabled
              ? voteIsOpen
                ? "#e11d48"
                : "#059669"
              : "#e2e8f0",
            background: !voteToggle.enabled
              ? "#f1f5f9"
              : voteIsOpen
                ? "linear-gradient(180deg, #fb7185 0%, #e11d48 100%)"
                : "linear-gradient(180deg, #34d399 0%, #059669 100%)",
            color: voteToggle.enabled ? "#fff" : "#94a3b8",
            cursor: voteToggle.enabled && !busy ? "pointer" : "not-allowed",
            opacity: voteToggle.enabled ? 1 : 0.65,
          }}
        >
          {voteToggle.label}
        </button>

        <button
          type="button"
          disabled={!nextAction.enabled || busy}
          onClick={onNext}
          style={{
            ...btnBase,
            borderColor: nextAction.enabled ? "#0d9488" : "#e2e8f0",
            background: nextAction.enabled
              ? "linear-gradient(180deg, #2dd4bf 0%, #0d9488 100%)"
              : "#f1f5f9",
            color: nextAction.enabled ? "#fff" : "#94a3b8",
            cursor: nextAction.enabled && !busy ? "pointer" : "not-allowed",
            opacity: nextAction.enabled ? 1 : 0.65,
          }}
        >
          {nextAction.label}
        </button>

        <button
          type="button"
          onClick={onShowQr}
          style={{
            ...btnBase,
            borderColor: "#cbd5e1",
            background: "linear-gradient(180deg, #fff 0%, #f8fafc 100%)",
            color: "#0f172a",
            cursor: "pointer",
          }}
        >
          Afficher QR
        </button>

        <button
          type="button"
          disabled={!finishEnabled || busy}
          onClick={onFinish}
          style={{
            ...btnBase,
            minHeight: "2.75rem",
            borderColor: finishEnabled ? "#fda4af" : "#e2e8f0",
            background: "#fff",
            color: finishEnabled ? "#be123c" : "#94a3b8",
            cursor: finishEnabled && !busy ? "pointer" : "not-allowed",
            fontSize: "0.92rem",
          }}
        >
          Terminer…
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenQuestions}
        style={{
          background: "transparent",
          border: "none",
          padding: "0.35rem 0",
          fontSize: "0.85rem",
          fontWeight: 700,
          color: "#0f766e",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
          cursor: "pointer",
          justifySelf: "start",
        }}
      >
        Liste des questions
      </button>

      {questionsSheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Questions"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={onCloseQuestions}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "28rem",
              maxHeight: "70vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px 18px 0 0",
              padding:
                "0.85rem 1rem max(1rem, env(safe-area-inset-bottom))",
              boxSizing: "border-box",
              display: "grid",
              gap: "0.55rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Questions
              </h3>
              <button
                type="button"
                onClick={onCloseQuestions}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "0.35rem 0.65rem",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
            {questions.length === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                Aucune question.
              </p>
            ) : (
              questions.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectQuestion?.(q.id)}
                  style={{
                    textAlign: "left",
                    border: q.isActive
                      ? "1px solid #5eead4"
                      : "1px solid #e2e8f0",
                    background: q.isActive ? "#f0fdfa" : "#fff",
                    borderRadius: "12px",
                    padding: "0.7rem 0.8rem",
                    cursor: "pointer",
                    display: "grid",
                    gap: "0.15rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "#64748b",
                    }}
                  >
                    {q.numberLabel}
                    {q.isActive ? " · À l’antenne" : ""}
                    {q.statusLabel ? ` · ${q.statusLabel}` : ""}
                  </span>
                  <span
                    style={{
                      fontSize: "0.92rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {q.title}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {qrSheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR et lien"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={onCloseQr}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "28rem",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px 18px 0 0",
              padding:
                "0.85rem 1rem max(1rem, env(safe-area-inset-bottom))",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.65rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                QR / lien participants
              </h3>
              <button
                type="button"
                onClick={onCloseQr}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "0.35rem 0.65rem",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
            {qrChildren}
          </div>
        </div>
      ) : null}
    </div>
  );
}
