"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/config";
import { rememberMyEvent } from "@/lib/myEventsStorage";

const API_BASE = `${API_URL}/polls`;

const inputStyle = {
  width: "100%",
  padding: "0.5rem 0.65rem",
  fontSize: "1rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

/** IDs stables (pas Date/random) pour éviter les erreurs d’hydratation SSR. */
const QUESTION_INITIALE = {
  id: "q-1",
  question: "",
  type: "SINGLE_CHOICE",
  options: ["", ""],
};

const btnGhost = {
  padding: "0.45rem 0.65rem",
  fontSize: "0.85rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

export default function AdminPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [questions, setQuestions] = useState(() => [{ ...QUESTION_INITIALE }]);
  const [formError, setFormError] = useState(null);

  const createLockRef = useRef(false);
  const nextQuestionIdRef = useRef(2);
  /** Import en masse des réponses (une question à la fois) */
  const [importMasseQuestionId, setImportMasseQuestionId] = useState(null);
  const [importMasseTexte, setImportMasseTexte] = useState("");

  function ajouterQuestion() {
    const nid = `q-${nextQuestionIdRef.current++}`;
    setQuestions((q) => [
      ...q,
      {
        id: nid,
        question: "",
        type: "SINGLE_CHOICE",
        options: ["", ""],
      },
    ]);
  }

  function retirerQuestion(id) {
    setImportMasseQuestionId((ouvert) => (ouvert === id ? null : ouvert));
    setQuestions((q) => {
      if (q.length <= 1) return q;
      return q.filter((item) => item.id !== id);
    });
  }

  useEffect(() => {
    if (importMasseQuestionId === null) setImportMasseTexte("");
  }, [importMasseQuestionId]);

  function majQuestion(id, patch) {
    setQuestions((q) =>
      q.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function majTexteQuestion(id, texte) {
    majQuestion(id, { question: texte });
  }

  function majTypeQuestion(id, type) {
    majQuestion(id, { type });
  }

  function ajouterOption(id) {
    setQuestions((q) =>
      q.map((item) =>
        item.id === id ? { ...item, options: [...item.options, ""] } : item,
      ),
    );
  }

  function retirerOption(qid, indexOption) {
    setQuestions((q) =>
      q.map((item) => {
        if (item.id !== qid) return item;
        if (item.options.length <= 2) return item;
        return {
          ...item,
          options: item.options.filter((_, i) => i !== indexOption),
        };
      }),
    );
  }

  function majOption(qid, indexOption, valeur) {
    setQuestions((q) =>
      q.map((item) => {
        if (item.id !== qid) return item;
        const next = [...item.options];
        next[indexOption] = valeur;
        return { ...item, options: next };
      }),
    );
  }

  function basculerPanneauImportMasse(questionId) {
    if (importMasseQuestionId === questionId) {
      setImportMasseQuestionId(null);
      return;
    }
    setImportMasseTexte("");
    setImportMasseQuestionId(questionId);
  }

  function importerOptionsEnMasse(questionId) {
    const brutes = importMasseTexte.split(/\r?\n/);
    setQuestions((q) =>
      q.map((item) => {
        if (item.id !== questionId) return item;
        const deja = new Set();
        for (const o of item.options) {
          const t = o.trim();
          if (t) deja.add(t);
        }
        const aAjouter = [];
        const vuBloc = new Set();
        for (const ligne of brutes) {
          const t = ligne.trim();
          if (!t || vuBloc.has(t) || deja.has(t)) continue;
          vuBloc.add(t);
          deja.add(t);
          aAjouter.push(t);
        }
        return { ...item, options: [...item.options, ...aAjouter] };
      }),
    );
    setImportMasseTexte("");
  }

  function validerFormulaire() {
    const titre = eventTitle.trim();
    if (!titre) {
      return "Indique un titre pour l’événement.";
    }
    if (questions.length < 1) {
      return "Ajoute au moins une question.";
    }
    for (let i = 0; i < questions.length; i++) {
      const x = questions[i];
      const qi = x.question.trim();
      if (!qi) {
        return `Question ${i + 1} : saisis le texte de la question.`;
      }
      const opts = x.options.map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) {
        return `Question ${i + 1} (« ${qi.slice(0, 40)}${qi.length > 40 ? "…" : ""} ») : au moins 2 réponses non vides.`;
      }
    }
    return null;
  }

  async function handleCreatePoll(e) {
    e.preventDefault();
    const msg = validerFormulaire();
    if (msg) {
      setFormError(msg);
      return;
    }
    setFormError(null);

    if (createLockRef.current) return;
    createLockRef.current = true;
    setCreating(true);
    setError(null);

    const premier = questions[0];
    const descTrim = eventDescription.trim();
    const payload = {
      title: eventTitle.trim(),
      ...(descTrim ? { description: descTrim } : {}),
      /** Rétro-compat : anciens serveurs / legacy sans tableau `polls` */
      question: premier.question.trim(),
      type: premier.type,
      options: premier.options.map((s) => s.trim()).filter(Boolean),
      polls: questions.map((x, order) => ({
        question: x.question.trim(),
        type: x.type,
        order,
        options: x.options.map((s) => s.trim()).filter(Boolean),
      })),
    };

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Erreur ${res.status}`);
      }
      const created = await res.json();
      const eventId = created.eventId;
      const slug = created.eventSlug;

      if (eventId) {
        const titre = eventTitle.trim();
        if (slug) {
          rememberMyEvent({ id: eventId, title: titre, slug });
        }
        router.replace(`/admin/event/${eventId}`);
        return;
      }
    } catch (e) {
      setError(e.message || "Échec de la création du sondage");
    } finally {
      setCreating(false);
      createLockRef.current = false;
    }
  }

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: "720px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem 1rem", alignItems: "center" }}>
          <Link
            href="/"
            style={{
              fontSize: "0.9rem",
              color: "#64748b",
              textDecoration: "none",
            }}
          >
            ← Accueil
          </Link>
          <Link
            href="/admin/events"
            style={{
              fontSize: "0.9rem",
              color: "#7c3aed",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Mes événements
          </Link>
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#1e293b" }}>
          Avote
        </span>
      </div>

      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>
        Créer un événement
      </h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
        Ajoute une ou plusieurs questions, partage le lien public et pilote le flux
        depuis la régie (question suivante, résultats, etc.).
      </p>

      <form
        onSubmit={handleCreatePoll}
        style={{
          marginBottom: "1.75rem",
          padding: "1.25rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          background: "#fafafa",
        }}
      >
        <label
          style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem" }}
          htmlFor="event-title"
        >
          Titre de l’événement
        </label>
        <input
          id="event-title"
          type="text"
          value={eventTitle}
          onChange={(ev) => setEventTitle(ev.target.value)}
          placeholder="Ex. Quiz match de foot"
          disabled={creating}
          style={{ ...inputStyle, marginBottom: "0.85rem" }}
        />

        <label
          style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem" }}
          htmlFor="event-desc"
        >
          Description (optionnelle)
        </label>
        <textarea
          id="event-desc"
          value={eventDescription}
          onChange={(ev) => setEventDescription(ev.target.value)}
          placeholder="Court texte affiché dans la régie (contexte, consignes…)"
          disabled={creating}
          rows={2}
          maxLength={2000}
          style={{
            ...inputStyle,
            marginBottom: "1.25rem",
            minHeight: "3.25rem",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        <p style={{ fontWeight: 600, margin: "0 0 0.75rem 0" }}>Questions</p>
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem 0" }}>
          Ordre d’affichage = ordre du vote. Chaque question : texte, type et au moins
          2 options.
        </p>

        {questions.map((item, indexQ) => (
          <div
            key={item.id}
            style={{
              marginBottom: "1.25rem",
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 700, color: "#334155" }}>
                Question {indexQ + 1}
              </span>
              <button
                type="button"
                disabled={creating || questions.length <= 1}
                onClick={() => retirerQuestion(item.id)}
                style={{
                  ...btnGhost,
                  color:
                    creating || questions.length <= 1 ? "#94a3b8" : "#b91c1c",
                  borderColor:
                    creating || questions.length <= 1 ? "#e2e8f0" : "#fecaca",
                  cursor:
                    creating || questions.length <= 1 ? "not-allowed" : "pointer",
                  background:
                    creating || questions.length <= 1 ? "#f8fafc" : "#fff",
                }}
              >
                Supprimer la question
              </button>
            </div>

            <label
              style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem" }}
              htmlFor={`q-text-${item.id}`}
            >
              Texte de la question
            </label>
            <input
              id={`q-text-${item.id}`}
              type="text"
              value={item.question}
              onChange={(ev) => majTexteQuestion(item.id, ev.target.value)}
              placeholder="Ex. Qui va marquer le prochain but ?"
              disabled={creating}
              style={{ ...inputStyle, marginBottom: "0.85rem" }}
            />

            <fieldset
              style={{ border: "none", padding: 0, margin: "0 0 0.85rem 0" }}
            >
              <legend style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                Type de vote
              </legend>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.35rem",
                  cursor: creating ? "default" : "pointer",
                }}
              >
                <input
                  type="radio"
                  name={`pollType-${item.id}`}
                  checked={item.type === "SINGLE_CHOICE"}
                  disabled={creating}
                  onChange={() => majTypeQuestion(item.id, "SINGLE_CHOICE")}
                />
                Choix unique
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: creating ? "default" : "pointer",
                }}
              >
                <input
                  type="radio"
                  name={`pollType-${item.id}`}
                  checked={item.type === "MULTIPLE_CHOICE"}
                  disabled={creating}
                  onChange={() => majTypeQuestion(item.id, "MULTIPLE_CHOICE")}
                />
                Choix multiple
              </label>
            </fieldset>

            <p style={{ fontWeight: 600, margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
              Réponses
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.5rem 0" }}>
              {item.options.map((value, indexOpt) => (
                <li
                  key={`${item.id}-opt-${indexOpt}`}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={value}
                    onChange={(ev) =>
                      majOption(item.id, indexOpt, ev.target.value)
                    }
                    placeholder={`Option ${indexOpt + 1}`}
                    disabled={creating}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    disabled={creating || item.options.length <= 2}
                    onClick={() => retirerOption(item.id, indexOpt)}
                    style={{
                      ...btnGhost,
                      background:
                        creating || item.options.length <= 2
                          ? "#f1f5f9"
                          : "#fff",
                      color:
                        creating || item.options.length <= 2
                          ? "#94a3b8"
                          : "#64748b",
                      cursor:
                        creating || item.options.length <= 2
                          ? "not-allowed"
                          : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                alignItems: "center",
                marginBottom:
                  importMasseQuestionId === item.id ? "0.75rem" : 0,
              }}
            >
              <button
                type="button"
                disabled={creating}
                onClick={() => ajouterOption(item.id)}
                style={{
                  ...btnGhost,
                  marginBottom: 0,
                  cursor: creating ? "wait" : "pointer",
                }}
              >
                Ajouter une option
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => basculerPanneauImportMasse(item.id)}
                style={{
                  ...btnGhost,
                  marginBottom: 0,
                  borderColor: "#818cf8",
                  color: "#4338ca",
                  background:
                    importMasseQuestionId === item.id ? "#eef2ff" : "#fff",
                  cursor: creating ? "wait" : "pointer",
                }}
              >
                {importMasseQuestionId === item.id
                  ? "Fermer l’import en masse"
                  : "Ajouter en masse"}
              </button>
            </div>

            {importMasseQuestionId === item.id ? (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #c7d2fe",
                  background: "#f8fafc",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "0.82rem",
                    color: "#475569",
                  }}
                >
                  Colle une réponse par ligne. Les lignes vides et les doublons
                  (avec les options déjà présentes) sont ignorés.
                </p>
                <textarea
                  value={importMasseTexte}
                  onChange={(ev) => setImportMasseTexte(ev.target.value)}
                  disabled={creating}
                  rows={6}
                  placeholder={"Mbappé\nDembélé\nVitinha"}
                  style={{
                    ...inputStyle,
                    display: "block",
                    width: "100%",
                    minHeight: "7rem",
                    resize: "vertical",
                    fontFamily: "inherit",
                    marginBottom: "0.65rem",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => importerOptionsEnMasse(item.id)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      fontSize: "0.9rem",
                      borderRadius: "8px",
                      border: "1px solid #4f46e5",
                      background: creating ? "#94a3b8" : "#4f46e5",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: creating ? "not-allowed" : "pointer",
                    }}
                  >
                    Importer
                  </button>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => setImportMasseQuestionId(null)}
                    style={{
                      ...btnGhost,
                      cursor: creating ? "wait" : "pointer",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          disabled={creating}
          onClick={ajouterQuestion}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.95rem",
            marginBottom: "1rem",
            borderRadius: "8px",
            border: "1px solid #2563eb",
            background: creating ? "#e2e8f0" : "#eff6ff",
            color: creating ? "#94a3b8" : "#1e40af",
            cursor: creating ? "wait" : "pointer",
            fontWeight: 600,
          }}
        >
          + Ajouter une question
        </button>

        {formError && (
          <p style={{ color: "#b91c1c", marginBottom: "0.75rem" }} role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={creating}
          style={{
            padding: "0.65rem 1.25rem",
            fontSize: "1rem",
            cursor: creating ? "wait" : "pointer",
            borderRadius: "8px",
            border: "1px solid #2563eb",
            background: creating ? "#93c5fd" : "#3b82f6",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {creating ? "Création en cours…" : "Créer l’événement"}
        </button>
      </form>

      {error && (
        <p style={{ color: "#b91c1c", marginBottom: "1rem" }} role="alert">
          {error}
        </p>
      )}

      <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Après création, vous êtes redirigé vers la régie. Retrouvez vos événements dans{" "}
        <Link href="/admin/events" style={{ color: "#7c3aed", fontWeight: 600 }}>
          Mes événements
        </Link>
        .
      </p>
    </main>
  );
}
