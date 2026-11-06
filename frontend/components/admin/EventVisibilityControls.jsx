"use client";

import { useState } from "react";
import {
  isPublicVisibility,
  PUBLISH_PUBLIC_WARNING_LINES,
  UNPUBLISH_PRIVATE_WARNING_LINES,
} from "@/lib/eventVisibility";

/**
 * Lot A — badge + bascule Public/Privé avec confirmation explicite avant publication.
 *
 * @param {{
 *   visibility?: string;
 *   disabled?: boolean;
 *   busy?: boolean;
 *   onChangeVisibility?: (next: "public" | "private", opts: { confirmPublic: boolean }) => Promise<void>;
 * }} props
 */
export function EventVisibilityControls({
  visibility,
  disabled = false,
  busy = false,
  onChangeVisibility,
}) {
  const isPublic = isPublicVisibility(visibility);
  const [modal, setModal] = useState(
    /** @type {null | "publish" | "unpublish"} */ (null),
  );
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);

  const locked = disabled || busy || saving || !onChangeVisibility;

  async function confirmModal() {
    if (!onChangeVisibility || !modal) return;
    setLocalError("");
    setSaving(true);
    try {
      if (modal === "publish") {
        await onChangeVisibility("public", { confirmPublic: true });
      } else {
        await onChangeVisibility("private", { confirmPublic: false });
      }
      setModal(null);
    } catch (e) {
      setLocalError(
        e?.message || "Impossible de modifier la visibilité.",
      );
    } finally {
      setSaving(false);
    }
  }

  const lines =
    modal === "publish"
      ? PUBLISH_PUBLIC_WARNING_LINES
      : UNPUBLISH_PRIVATE_WARNING_LINES;

  return (
    <div style={{ margin: "0 0 0.85rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.45rem",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "0.28rem 0.58rem",
            borderRadius: "999px",
            border: isPublic
              ? "1px solid rgba(22, 163, 74, 0.35)"
              : "1px solid rgba(100, 116, 139, 0.35)",
            background: isPublic
              ? "rgba(22, 163, 74, 0.12)"
              : "rgba(100, 116, 139, 0.12)",
            color: isPublic ? "#166534" : "#475569",
          }}
        >
          {isPublic ? "Public" : "Privé"}
        </span>
        {!locked ? (
          <button
            type="button"
            onClick={() => {
              setLocalError("");
              setModal(isPublic ? "unpublish" : "publish");
            }}
            style={{
              padding: "0.32rem 0.65rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            {isPublic ? "Repasser en privé" : "Rendre public…"}
          </button>
        ) : null}
      </div>
      <p
        style={{
          margin: "0.4rem 0 0",
          fontSize: "0.72rem",
          color: "#64748b",
          lineHeight: 1.4,
        }}
      >
        {isPublic
          ? "Intention publique / SEO. L’annuaire Découvrir arrivera dans une prochaine étape."
          : "Privé par défaut : hors Découvrir et noindex. Le live par lien/QR reste ouvert."}
      </p>

      {modal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avote-visibility-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(15, 23, 42, 0.45)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setModal(null);
          }}
        >
          <div
            style={{
              width: "min(440px, 100%)",
              borderRadius: "14px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 18px 50px rgba(15, 23, 42, 0.22)",
              padding: "1.1rem 1.15rem 1rem",
            }}
          >
            <h3
              id="avote-visibility-modal-title"
              style={{
                margin: "0 0 0.65rem",
                fontSize: "1.05rem",
                color: "#0f172a",
              }}
            >
              {modal === "publish"
                ? "Rendre cet événement public ?"
                : "Repasser cet événement en privé ?"}
            </h3>
            <ul
              style={{
                margin: "0 0 0.85rem",
                paddingLeft: "1.1rem",
                color: "#475569",
                fontSize: "0.86rem",
                lineHeight: 1.45,
              }}
            >
              {lines.map((line) => (
                <li key={line} style={{ marginBottom: "0.35rem" }}>
                  {line}
                </li>
              ))}
            </ul>
            {localError ? (
              <p
                style={{
                  margin: "0 0 0.75rem",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                }}
              >
                {localError}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                style={{
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmModal()}
                style={{
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  border: "none",
                  background: modal === "publish" ? "#15803d" : "#334155",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving
                  ? "Enregistrement…"
                  : modal === "publish"
                    ? "Confirmer la publication"
                    : "Confirmer le passage en privé"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
