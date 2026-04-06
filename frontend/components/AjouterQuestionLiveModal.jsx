"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/config";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   apiBase: string;
 *   eventId: string | null;
 *   onSuccess: (payload: { pollId: string }) => void | Promise<void>;
 * }} props
 */
export function AjouterQuestionLiveModal({
  open,
  onClose,
  apiBase,
  eventId,
  onSuccess,
}) {
  const [question, setQuestion] = useState("");
  const [pollType, setPollType] = useState(/** @type {"SINGLE_CHOICE"|"MULTIPLE_CHOICE"} */ ("SINGLE_CHOICE"));
  const [reponses, setReponses] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setQuestion("");
    setPollType("SINGLE_CHOICE");
    setReponses(["", ""]);
    setErreur(null);
  }, [open, eventId]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, submitting, onClose]);

  const ajouterLigne = useCallback(() => {
    setReponses((prev) => [...prev, ""]);
  }, []);

  const majLigne = useCallback((idx, val) => {
    setReponses((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, []);

  const supprimerLigne = useCallback((idx) => {
    setReponses((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const soumettre = useCallback(
    async (launchNow) => {
      if (!eventId) return;
      const q = question.trim();
      const opts = reponses.map((x) => x.trim()).filter(Boolean);
      if (!q) {
        setErreur("Saisissez le texte de la question.");
        return;
      }
      if (opts.length < 2) {
        setErreur("Ajoutez au moins deux réponses non vides.");
        return;
      }
      setSubmitting(true);
      setErreur(null);
      try {
        const res = await adminFetch(
          `${apiBase}/events/${encodeURIComponent(eventId)}/polls/live`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: q,
              type: pollType,
              options: opts,
              launchNow,
            }),
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Erreur ${res.status}`);
        }
        const pollId = body.pollId;
        if (typeof pollId !== "string" || !pollId) {
          throw new Error("Réponse API inattendue.");
        }
        await onSuccess({ pollId });
        onClose();
      } catch (e) {
        setErreur(e?.message || "Échec de l’ajout.");
      } finally {
        setSubmitting(false);
      }
    },
    [eventId, apiBase, question, reponses, pollType, onSuccess, onClose],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ajout-question-titre"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.52)",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "26rem",
          maxHeight: "min(92vh, 640px)",
          overflow: "auto",
          background: "#fff",
          borderRadius: "14px",
          boxShadow:
            "0 25px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(15,23,42,0.06)",
          padding: "1.15rem 1.25rem",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="ajout-question-titre"
          style={{
            margin: "0 0 0.85rem 0",
            fontSize: "1.05rem",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          Nouvelle question
        </h2>

        <label
          style={{
            display: "block",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.35rem",
          }}
        >
          Texte de la question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={submitting}
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.5rem 0.6rem",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "0.88rem",
            resize: "vertical",
            minHeight: "4rem",
            fontFamily: "inherit",
            marginBottom: "0.85rem",
          }}
        />

        <p
          style={{
            margin: "0 0 0.35rem 0",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Type
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem",
            marginBottom: "0.85rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.86rem",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="radio"
              name="pollTypeAjout"
              checked={pollType === "SINGLE_CHOICE"}
              disabled={submitting}
              onChange={() => setPollType("SINGLE_CHOICE")}
            />
            Choix unique
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.86rem",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="radio"
              name="pollTypeAjout"
              checked={pollType === "MULTIPLE_CHOICE"}
              disabled={submitting}
              onChange={() => setPollType("MULTIPLE_CHOICE")}
            />
            Choix multiple
          </label>
        </div>

        <p
          style={{
            margin: "0 0 0.4rem 0",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Réponses
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            marginBottom: "0.65rem",
          }}
        >
          {reponses.map((r, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}
            >
              <input
                type="text"
                value={r}
                onChange={(e) => majLigne(i, e.target.value)}
                disabled={submitting}
                placeholder={`Réponse ${i + 1}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "0.4rem 0.5rem",
                  borderRadius: "7px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.86rem",
                }}
              />
              <button
                type="button"
                disabled={submitting || reponses.length <= 2}
                onClick={() => supprimerLigne(i)}
                style={{
                  flexShrink: 0,
                  padding: "0.35rem 0.5rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#64748b",
                  cursor:
                    submitting || reponses.length <= 2
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={ajouterLigne}
          style={{
            marginBottom: "0.85rem",
            padding: "0.4rem 0.65rem",
            fontSize: "0.78rem",
            fontWeight: 700,
            borderRadius: "8px",
            border: "1px dashed #94a3b8",
            background: "#f8fafc",
            color: "#475569",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          + Ajouter une réponse
        </button>

        {erreur ? (
          <p
            role="alert"
            style={{
              margin: "0 0 0.75rem 0",
              fontSize: "0.82rem",
              color: "#b91c1c",
              fontWeight: 600,
            }}
          >
            {erreur}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            marginTop: "0.25rem",
          }}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={() => void soumettre(true)}
            style={{
              padding: "0.55rem 0.85rem",
              fontSize: "0.86rem",
              fontWeight: 800,
              borderRadius: "10px",
              border: "1px solid #5b21b6",
              background: submitting
                ? "#c4b5fd"
                : "linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)",
              color: "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Ajouter et lancer maintenant
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void soumettre(false)}
            style={{
              padding: "0.52rem 0.85rem",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Ajouter à la file
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={{
              padding: "0.45rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
