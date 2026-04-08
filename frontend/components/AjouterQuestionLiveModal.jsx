"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/config";

const CONTEST_DEFAULT_QUESTION = "Souhaitez-vous participer au tirage au sort ?";
const CONTEST_DEFAULT_OPTIONS = ["Oui", "Non"];
const CONTEST_PRIZE_PLACEHOLDER =
  "Ex : un iPhone 15 / une carte cadeau de 200€ / un week-end";

function isLeadLikeQuestionType(type) {
  return type === "LEAD" || type === "CONTEST_ENTRY";
}

function buildContestQuestion(prizeRaw) {
  const prize = typeof prizeRaw === "string" ? prizeRaw.trim() : "";
  if (!prize) return CONTEST_DEFAULT_QUESTION;
  return `Souhaitez-vous participer au tirage au sort pour gagner ${prize} ?`;
}

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
  const [pollType, setPollType] = useState(
    /** @type {"SINGLE_CHOICE"|"MULTIPLE_CHOICE"|"LEAD"|"CONTEST_ENTRY"} */ ("SINGLE_CHOICE"),
  );
  const [reponses, setReponses] = useState(["", ""]);
  const [leadTriggerOrder, setLeadTriggerOrder] = useState(0);
  const [contestPrize, setContestPrize] = useState("");
  const [contestQuestionCustomized, setContestQuestionCustomized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!open) return;
    setQuestion("");
    setPollType("SINGLE_CHOICE");
    setReponses(["", ""]);
    setLeadTriggerOrder(0);
    setContestPrize("");
    setContestQuestionCustomized(false);
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

  const onQuestionChange = useCallback(
    (value) => {
      setQuestion(value);
      if (pollType !== "CONTEST_ENTRY") return;
      setContestQuestionCustomized(value.trim() !== buildContestQuestion(contestPrize));
    },
    [pollType, contestPrize],
  );

  const onContestPrizeChange = useCallback(
    (value) => {
      setContestPrize(value);
      if (pollType !== "CONTEST_ENTRY") return;
      const prevAuto = buildContestQuestion(contestPrize);
      const nextAuto = buildContestQuestion(value);
      const questionTrim = question.trim();
      const shouldAutoSync =
        !contestQuestionCustomized || !questionTrim || questionTrim === prevAuto;
      if (shouldAutoSync) setQuestion(nextAuto);
    },
    [pollType, contestPrize, question, contestQuestionCustomized],
  );

  const ajouterLigne = useCallback(() => {
    setReponses((prev) =>
      pollType === "CONTEST_ENTRY" ? prev : [...prev, ""],
    );
  }, [pollType]);

  const majLigne = useCallback((idx, val) => {
    if (pollType === "CONTEST_ENTRY") return;
    setReponses((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, [pollType]);

  const supprimerLigne = useCallback((idx) => {
    setReponses((prev) => {
      if (pollType === "CONTEST_ENTRY") return prev;
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, [pollType]);

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
      if (pollType === "CONTEST_ENTRY" && !contestPrize.trim()) {
        setErreur(
          "Précisez le lot à gagner pour rendre le concours clair pour les participants.",
        );
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
              contestPrize:
                pollType === "CONTEST_ENTRY" ? contestPrize.trim() || null : null,
              options: opts,
              leadTriggerOrder: isLeadLikeQuestionType(pollType)
                ? Number(leadTriggerOrder ?? 0)
                : 0,
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
    [
      eventId,
      apiBase,
      question,
      reponses,
      pollType,
      contestPrize,
      leadTriggerOrder,
      onSuccess,
      onClose,
    ],
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
          onChange={(e) => onQuestionChange(e.target.value)}
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
              checked={pollType === "LEAD"}
              disabled={submitting}
              onChange={() => {
                setPollType("LEAD");
                setLeadTriggerOrder(0);
              }}
            />
            Lead (Oui/Non + formulaire)
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
              checked={pollType === "CONTEST_ENTRY"}
              disabled={submitting}
              onChange={() => {
                setPollType("CONTEST_ENTRY");
                setContestPrize("");
                setQuestion(buildContestQuestion(""));
                setReponses([...CONTEST_DEFAULT_OPTIONS]);
                setLeadTriggerOrder(0);
                setContestQuestionCustomized(false);
              }}
            />
            Participation concours
          </label>
        </div>
        {pollType === "CONTEST_ENTRY" ? (
          <div style={{ marginBottom: "0.85rem" }}>
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
              Lot à gagner
            </label>
            <input
              type="text"
              value={contestPrize}
              onChange={(e) => onContestPrizeChange(e.target.value)}
              disabled={submitting}
              placeholder={CONTEST_PRIZE_PLACEHOLDER}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.5rem 0.6rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                fontFamily: "inherit",
                marginBottom: "0.35rem",
              }}
            />
            {!contestPrize.trim() ? (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#b45309" }}>
                Précisez le lot à gagner pour rendre le concours clair pour les
                participants.
              </p>
            ) : null}
          </div>
        ) : null}
        {isLeadLikeQuestionType(pollType) ? (
          <div
            style={{
              margin: "0 0 0.85rem 0",
              padding: "0.55rem 0.65rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "0.35rem",
              }}
            >
              Déclencheur du formulaire
            </label>
            <select
              value={Math.max(0, Number(leadTriggerOrder ?? 0))}
              onChange={(e) => {
                const n = Number(e.target.value);
                setLeadTriggerOrder(Number.isFinite(n) && n >= 0 ? n : 0);
              }}
              disabled={submitting}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.42rem 0.5rem",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "0.84rem",
                background: "#fff",
              }}
            >
              {reponses.map((r, idx) => (
                <option key={`lead-trigger-${idx}`} value={idx}>
                  {`Option ${idx + 1}${r.trim() ? ` - ${r.trim()}` : ""}`}
                </option>
              ))}
            </select>
            <p
              style={{
                margin: "0.35rem 0 0 0",
                fontSize: "0.72rem",
                color: "#64748b",
              }}
            >
              Le formulaire s’ouvre après un vote sur cette option.
            </p>
          </div>
        ) : null}

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
                disabled={submitting || pollType === "CONTEST_ENTRY"}
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
                disabled={
                  submitting ||
                  reponses.length <= 2 ||
                  pollType === "CONTEST_ENTRY"
                }
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
          disabled={submitting || pollType === "CONTEST_ENTRY"}
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
          {pollType === "CONTEST_ENTRY"
            ? "Options fixées à Oui / Non"
            : "+ Ajouter une réponse"}
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
