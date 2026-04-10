"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EventLivePreview } from "@/components/admin/EventLivePreview";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { rememberMyEvent } from "@/lib/myEventsStorage";

const inputStyle = {
  width: "100%",
  padding: "0.5rem 0.65rem",
  fontSize: "1rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

const CONTEST_DEFAULT_QUESTION = "Souhaitez-vous participer au tirage au sort ?";
const CONTEST_DEFAULT_OPTIONS = ["Oui", "Non"];
const CONTEST_PRIZE_PLACEHOLDER =
  "Ex : un iPhone 15 / une carte cadeau de 200€ / un week-end";
const CONTEST_WINNER_COUNT_DEFAULT = 1;

function isLeadLikeQuestionType(type) {
  return type === "LEAD" || type === "CONTEST_ENTRY";
}

function isContestEntryQuestion(type) {
  return type === "CONTEST_ENTRY";
}

function isQuizQuestion(type) {
  return type === "QUIZ";
}

function buildContestQuestion(prizeRaw) {
  const prize = typeof prizeRaw === "string" ? prizeRaw.trim() : "";
  if (!prize) return CONTEST_DEFAULT_QUESTION;
  return `Souhaitez-vous participer au tirage au sort pour gagner ${prize} ?`;
}

function normalizeContestWinnerCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return CONTEST_WINNER_COUNT_DEFAULT;
  return Math.max(1, Math.floor(n));
}

/** IDs stables (pas Date/random) pour éviter les erreurs d’hydratation SSR. */
const QUESTION_INITIALE = {
  id: "q-1",
  question: "",
  type: "SINGLE_CHOICE",
  options: ["", ""],
  leadTriggerOrder: 0,
  quizCorrectOrder: 0,
  contestPrize: "",
  contestWinnerCount: CONTEST_WINNER_COUNT_DEFAULT,
  contestQuestionCustomized: false,
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
        leadTriggerOrder: 0,
        quizCorrectOrder: 0,
        contestPrize: "",
        contestWinnerCount: CONTEST_WINNER_COUNT_DEFAULT,
        contestQuestionCustomized: false,
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
    setQuestions((q) =>
      q.map((item) => {
        if (item.id !== id) return item;
        if (!isContestEntryQuestion(item.type)) {
          return { ...item, question: texte };
        }
        const autoQuestion = buildContestQuestion(item.contestPrize);
        return {
          ...item,
          question: texte,
          contestQuestionCustomized: texte.trim() !== autoQuestion,
        };
      }),
    );
  }

  function majTypeQuestion(id, type) {
    if (type === "CONTEST_ENTRY") {
      setQuestions((q) =>
        q.map((item) => {
          if (item.id !== id) return item;
          const contestPrize = item.contestPrize ?? "";
          const contestWinnerCount = normalizeContestWinnerCount(
            item.contestWinnerCount,
          );
          return {
            ...item,
            type,
            question: buildContestQuestion(contestPrize),
            options: [...CONTEST_DEFAULT_OPTIONS],
            leadTriggerOrder: 0,
            quizCorrectOrder: 0,
            contestPrize,
            contestWinnerCount,
            contestQuestionCustomized: false,
          };
        }),
      );
      return;
    }
    if (type === "QUIZ") {
      majQuestion(id, { type, leadTriggerOrder: 0, quizCorrectOrder: 0 });
      return;
    }
    majQuestion(id, { type, leadTriggerOrder: 0 });
  }

  function majContestPrize(id, contestPrize) {
    setQuestions((q) =>
      q.map((item) => {
        if (item.id !== id) return item;
        if (!isContestEntryQuestion(item.type)) {
          return { ...item, contestPrize };
        }
        const prevAuto = buildContestQuestion(item.contestPrize);
        const nextAuto = buildContestQuestion(contestPrize);
        const questionTrim = item.question.trim();
        const shouldAutoSync =
          !item.contestQuestionCustomized ||
          !questionTrim ||
          questionTrim === prevAuto;
        return {
          ...item,
          contestPrize,
          question: shouldAutoSync ? nextAuto : item.question,
        };
      }),
    );
  }

  function majContestWinnerCount(id, rawValue) {
    const contestWinnerCount = normalizeContestWinnerCount(rawValue);
    setQuestions((q) =>
      q.map((item) =>
        item.id === id ? { ...item, contestWinnerCount } : item,
      ),
    );
  }

  function ajouterOption(id) {
    setQuestions((q) =>
      q.map((item) =>
        item.id === id
          ? item.type === "CONTEST_ENTRY"
            ? item
            : { ...item, options: [...item.options, ""] }
          : item,
      ),
    );
  }

  function retirerOption(qid, indexOption) {
    setQuestions((q) =>
      q.map((item) => {
        if (item.id !== qid) return item;
        if (item.type === "CONTEST_ENTRY") return item;
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
        if (item.type === "CONTEST_ENTRY") return item;
        const next = [...item.options];
        next[indexOption] = valeur;
        return { ...item, options: next };
      }),
    );
  }

  function majLeadTriggerOrder(qid, order) {
    const n = Number(order);
    if (!Number.isFinite(n) || n < 0) return;
    majQuestion(qid, { leadTriggerOrder: Math.floor(n) });
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
        if (item.type === "CONTEST_ENTRY") return item;
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
      if (isContestEntryQuestion(x.type) && !(x.contestPrize || "").trim()) {
        return `Question ${i + 1} : précisez le lot à gagner pour rendre le concours clair pour les participants.`;
      }
      if (
        isContestEntryQuestion(x.type) &&
        normalizeContestWinnerCount(x.contestWinnerCount) < 1
      ) {
        return `Question ${i + 1} : le nombre de gagnants doit être au minimum de 1.`;
      }
      const opts = x.options.map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) {
        return `Question ${i + 1} (« ${qi.slice(0, 40)}${qi.length > 40 ? "…" : ""} ») : au moins 2 réponses non vides.`;
      }
      if (isQuizQuestion(x.type)) {
        const idx = Number(x.quizCorrectOrder);
        const max = Math.max(0, opts.length - 1);
        if (!Number.isFinite(idx) || idx < 0 || idx > max) {
          return `Question ${i + 1} : sélectionnez la bonne réponse du quiz.`;
        }
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
      contestPrize: isContestEntryQuestion(premier.type)
        ? premier.contestPrize.trim() || null
        : null,
      contestWinnerCount: isContestEntryQuestion(premier.type)
        ? normalizeContestWinnerCount(premier.contestWinnerCount)
        : 1,
      options: premier.options.map((s) => s.trim()).filter(Boolean),
      leadTriggerOrder:
        isLeadLikeQuestionType(premier.type)
          ? Number(premier.leadTriggerOrder ?? 0)
          : 0,
      quizCorrectOrder: isQuizQuestion(premier.type)
        ? Number(premier.quizCorrectOrder ?? 0)
        : null,
      polls: questions.map((x, order) => ({
        question: x.question.trim(),
        type: x.type,
        contestPrize: isContestEntryQuestion(x.type)
          ? x.contestPrize.trim() || null
          : null,
        contestWinnerCount: isContestEntryQuestion(x.type)
          ? normalizeContestWinnerCount(x.contestWinnerCount)
          : 1,
        order,
        options: x.options.map((s) => s.trim()).filter(Boolean),
        leadTriggerOrder:
          isLeadLikeQuestionType(x.type) ? Number(x.leadTriggerOrder ?? 0) : 0,
        quizCorrectOrder: isQuizQuestion(x.type)
          ? Number(x.quizCorrectOrder ?? 0)
          : null,
      })),
    };

    try {
      const res = await adminFetch(`${apiBaseBrowser()}/polls`, {
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

  const totalQuestions = questions.length;
  const totalOptions = questions.reduce((sum, q) => sum + q.options.length, 0);
  const leadQuestions = questions.filter((q) => q.type === "LEAD").length;
  const contestQuestions = questions.filter(
    (q) => q.type === "CONTEST_ENTRY",
  ).length;
  const multipleQuestions = questions.filter(
    (q) => q.type === "MULTIPLE_CHOICE",
  ).length;
  const singleQuestions =
    totalQuestions - leadQuestions - contestQuestions - multipleQuestions;
  const eventTitlePreview = eventTitle.trim() || "Titre de l’événement";

  return (
    <main className="admin-create-page">
      <div className="admin-create-shell">
        <div className="admin-create-hero">
          <h1>Créer un événement</h1>
          <p>
            Préparez vos questions, structurez le vote et lancez votre régie en
            quelques secondes.
          </p>
        </div>

        <div className="admin-create-grid">
          <form id="create-event-form" className="admin-create-form" onSubmit={handleCreatePoll}>
            <section className="admin-section-card">
              <h2 className="admin-section-title">Informations événement</h2>
              <label className="admin-label" htmlFor="event-title">
                Titre de l’événement
              </label>
              <input
                id="event-title"
                type="text"
                value={eventTitle}
                onChange={(ev) => setEventTitle(ev.target.value)}
                placeholder="Ex. Soirée partenaires Q2"
                disabled={creating}
                style={{ ...inputStyle, marginBottom: "0.95rem" }}
              />

              <label className="admin-label" htmlFor="event-desc">
                Description (optionnelle)
              </label>
              <textarea
                id="event-desc"
                value={eventDescription}
                onChange={(ev) => setEventDescription(ev.target.value)}
                placeholder="Contexte, infos utiles, message d’introduction..."
                disabled={creating}
                rows={3}
                maxLength={2000}
                style={{
                  ...inputStyle,
                  minHeight: "4rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </section>

            <section className="admin-section-card">
              <div className="admin-questions-head">
                <div>
                  <h2 className="admin-section-title">Questions</h2>
                  <p className="admin-section-sub">
                    Ordre d’affichage = ordre du vote. Chaque question contient
                    au moins 2 réponses.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={creating}
                  onClick={ajouterQuestion}
                  className="admin-add-question"
                >
                  + Ajouter une question
                </button>
              </div>

              <div className="admin-question-list">
                {questions.map((item, indexQ) => (
                  <article key={item.id} className="admin-question-card">
                    <div className="admin-question-top">
                      <span className="admin-question-title">Question {indexQ + 1}</span>
                      <button
                        type="button"
                        disabled={creating || questions.length <= 1}
                        onClick={() => retirerQuestion(item.id)}
                        className="admin-remove-question"
                      >
                        Supprimer
                      </button>
                    </div>

                    <label className="admin-label" htmlFor={`q-text-${item.id}`}>
                      Texte de la question
                    </label>
                    <input
                      id={`q-text-${item.id}`}
                      type="text"
                      value={item.question}
                      onChange={(ev) => majTexteQuestion(item.id, ev.target.value)}
                      placeholder="Ex. Qui va marquer le prochain but ?"
                      disabled={creating}
                      style={{ ...inputStyle, marginBottom: "0.95rem" }}
                    />

                    <div className="admin-question-separator" />

                    <fieldset style={{ border: "none", padding: 0, margin: "0 0 0.9rem 0" }}>
                      <legend className="admin-label" style={{ marginBottom: "0.5rem" }}>
                        Type de vote
                      </legend>
                      <div className="admin-type-grid">
                        <label className="admin-choice">
                          <input
                            type="radio"
                            name={`pollType-${item.id}`}
                            checked={item.type === "SINGLE_CHOICE"}
                            disabled={creating}
                            onChange={() => majTypeQuestion(item.id, "SINGLE_CHOICE")}
                          />
                          <span>Choix unique</span>
                        </label>
                        <label className="admin-choice">
                          <input
                            type="radio"
                            name={`pollType-${item.id}`}
                            checked={item.type === "MULTIPLE_CHOICE"}
                            disabled={creating}
                            onChange={() => majTypeQuestion(item.id, "MULTIPLE_CHOICE")}
                          />
                          <span>Choix multiple</span>
                        </label>
                        <label className="admin-choice">
                          <input
                            type="radio"
                            name={`pollType-${item.id}`}
                            checked={item.type === "LEAD"}
                            disabled={creating}
                            onChange={() => majTypeQuestion(item.id, "LEAD")}
                          />
                          <span>Lead (Oui/Non + formulaire)</span>
                        </label>
                        <label className="admin-choice">
                          <input
                            type="radio"
                            name={`pollType-${item.id}`}
                            checked={item.type === "CONTEST_ENTRY"}
                            disabled={creating}
                            onChange={() =>
                              majTypeQuestion(item.id, "CONTEST_ENTRY")
                            }
                          />
                          <span>Participation concours</span>
                        </label>
                        <label className="admin-choice">
                          <input
                            type="radio"
                            name={`pollType-${item.id}`}
                            checked={item.type === "QUIZ"}
                            disabled={creating}
                            onChange={() => majTypeQuestion(item.id, "QUIZ")}
                          />
                          <span>Quiz (1 bonne réponse)</span>
                        </label>
                      </div>
                    </fieldset>

                    {isContestEntryQuestion(item.type) ? (
                      <div style={{ marginBottom: "0.9rem" }}>
                        <label className="admin-label" htmlFor={`q-prize-${item.id}`}>
                          Lot à gagner
                        </label>
                        <input
                          id={`q-prize-${item.id}`}
                          type="text"
                          value={item.contestPrize || ""}
                          onChange={(ev) =>
                            majContestPrize(item.id, ev.target.value)
                          }
                          placeholder={CONTEST_PRIZE_PLACEHOLDER}
                          disabled={creating}
                          style={{ ...inputStyle, marginBottom: "0.45rem" }}
                        />
                        {!(item.contestPrize || "").trim() ? (
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.86rem",
                              color: "#b45309",
                            }}
                          >
                            Précisez le lot à gagner pour rendre le concours clair
                            pour les participants.
                          </p>
                        ) : null}
                        <div style={{ marginTop: "0.65rem" }}>
                          <label
                            className="admin-label"
                            htmlFor={`q-winner-count-${item.id}`}
                          >
                            Nombre de gagnants
                          </label>
                          <input
                            id={`q-winner-count-${item.id}`}
                            type="number"
                            min={1}
                            step={1}
                            value={normalizeContestWinnerCount(
                              item.contestWinnerCount,
                            )}
                            onChange={(ev) =>
                              majContestWinnerCount(item.id, ev.target.value)
                            }
                            disabled={creating}
                            style={{ ...inputStyle, marginBottom: "0.32rem" }}
                          />
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.8rem",
                              color: "#64748b",
                            }}
                          >
                            Nombre total de gagnants à tirer pour ce concours.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="admin-question-separator" />

                    <p className="admin-label" style={{ marginBottom: "0.45rem" }}>
                      Réponses
                    </p>
                    <ul className="admin-options-list">
                      {item.options.map((value, indexOpt) => (
                        <li key={`${item.id}-opt-${indexOpt}`} className="admin-option-row">
                          <span
                            className={`admin-option-indicator ${
                              item.type === "MULTIPLE_CHOICE"
                                ? "checkbox"
                                : "radio"
                            }`}
                            aria-hidden
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(ev) => majOption(item.id, indexOpt, ev.target.value)}
                            placeholder={`Option ${indexOpt + 1}`}
                            disabled={creating || item.type === "CONTEST_ENTRY"}
                            className="admin-option-input"
                          />
                          <button
                            type="button"
                            disabled={
                              creating ||
                              item.options.length <= 2 ||
                              item.type === "CONTEST_ENTRY"
                            }
                            onClick={() => retirerOption(item.id, indexOpt)}
                            className="admin-option-remove"
                          >
                            Supprimer
                          </button>
                        </li>
                      ))}
                    </ul>

                    {isLeadLikeQuestionType(item.type) ? (
                      <div className="admin-lead-config">
                        <label htmlFor={`lead-trigger-${item.id}`} className="admin-label">
                          Option déclencheuse du formulaire
                        </label>
                        <select
                          id={`lead-trigger-${item.id}`}
                          value={Math.min(
                            Math.max(0, Number(item.leadTriggerOrder ?? 0)),
                            Math.max(0, item.options.length - 1),
                          )}
                          onChange={(ev) =>
                            majLeadTriggerOrder(item.id, Number(ev.target.value))
                          }
                          disabled={creating}
                          style={{ ...inputStyle, padding: "0.45rem 0.6rem" }}
                        >
                          {item.options.map((opt, idx) => (
                            <option key={`${item.id}-lead-trigger-${idx}`} value={idx}>
                              {opt.trim() || `Option ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {isQuizQuestion(item.type) ? (
                      <div className="admin-lead-config">
                        <label htmlFor={`quiz-correct-${item.id}`} className="admin-label">
                          Bonne réponse
                        </label>
                        <select
                          id={`quiz-correct-${item.id}`}
                          value={Math.min(
                            Math.max(0, Number(item.quizCorrectOrder ?? 0)),
                            Math.max(0, item.options.length - 1),
                          )}
                          onChange={(ev) =>
                            majQuestion(item.id, { quizCorrectOrder: Number(ev.target.value) })
                          }
                          disabled={creating}
                          style={{ ...inputStyle, padding: "0.45rem 0.6rem" }}
                        >
                          {item.options.map((opt, idx) => (
                            <option key={`${item.id}-quiz-correct-${idx}`} value={idx}>
                              {opt.trim() || `Option ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="admin-option-actions">
                      <button
                        type="button"
                        disabled={creating || item.type === "CONTEST_ENTRY"}
                        onClick={() => ajouterOption(item.id)}
                        className="admin-option-add-btn"
                      >
                        {item.type === "CONTEST_ENTRY"
                          ? "Options fixées à Oui / Non"
                          : "Ajouter une option"}
                      </button>
                      <button
                        type="button"
                        disabled={creating || item.type === "CONTEST_ENTRY"}
                        onClick={() => basculerPanneauImportMasse(item.id)}
                        className="admin-bulk-btn"
                      >
                        {importMasseQuestionId === item.id
                          ? "Fermer l’import en masse"
                          : "Ajouter en masse"}
                      </button>
                    </div>

                    {importMasseQuestionId === item.id ? (
                      <div className="admin-bulk-panel">
                        <p>
                          Collez une réponse par ligne. Les lignes vides et doublons
                          sont ignorés.
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
                        <div className="admin-bulk-actions">
                          <button
                            type="button"
                            disabled={creating}
                            onClick={() => importerOptionsEnMasse(item.id)}
                            className="admin-bulk-import"
                          >
                            Importer
                          </button>
                          <button
                            type="button"
                            disabled={creating}
                            onClick={() => setImportMasseQuestionId(null)}
                            style={btnGhost}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            {formError ? (
              <p className="admin-alert-error" role="alert">
                {formError}
              </p>
            ) : null}

            {error ? (
              <p className="admin-alert-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={creating} className="admin-create-cta mobile">
              {creating ? "Création en cours…" : "Créer l’événement"}
            </button>

            <p className="admin-footnote">
              Après création, vous êtes redirigé vers la régie. Retrouvez vos
              événements dans{" "}
              <Link href="/admin/events" style={{ color: "#7c3aed", fontWeight: 700 }}>
                Mes événements
              </Link>
              .
            </p>
          </form>

          <aside className="admin-side-panel">
            <div className="admin-side-sticky">
              <section className="admin-side-card">
                <p className="admin-side-kicker">Résumé</p>
                <h3>{eventTitlePreview}</h3>
                <ul>
                  <li>{totalQuestions} question(s)</li>
                  <li>{totalOptions} option(s) au total</li>
                  <li>{singleQuestions} en choix unique</li>
                  <li>{multipleQuestions} en choix multiple</li>
                  <li>{leadQuestions} lead(s)</li>
                  <li>{contestQuestions} concours</li>
                </ul>
              </section>

              <section className="admin-side-card">
                <EventLivePreview
                  title={eventTitle}
                  questions={questions}
                  activeQuestionIndex={0}
                />
              </section>

              <section className="admin-side-card">
                <p className="admin-side-kicker">Ce qui sera créé</p>
                <p className="admin-side-text">
                  Un événement publié, des questions prêtes pour la régie, et un
                  accès direct salle/écran après création.
                </p>
              </section>

              <button
                type="submit"
                form="create-event-form"
                disabled={creating}
                className="admin-create-cta desktop"
              >
                {creating ? "Création en cours…" : "Créer l’événement"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .admin-create-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 30%, #ffffff 100%);
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          line-height: 1.5;
          color: #0f172a;
        }
        .admin-create-shell {
          width: min(1460px, 96vw);
          margin: 0 auto;
          padding: 1rem 0.75rem 2rem;
          box-sizing: border-box;
        }
        .admin-create-hero {
          margin-bottom: 1rem;
          margin-top: 0.5rem;
          padding: 1.1rem 1.2rem;
          border: 1px solid #dbeafe;
          border-radius: 14px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .admin-create-hero h1 {
          margin: 0 0 0.35rem;
          font-size: clamp(1.4rem, 3.5vw, 1.9rem);
          letter-spacing: -0.03em;
        }
        .admin-create-hero p {
          margin: 0;
          color: #64748b;
          max-width: 56rem;
          font-size: 0.95rem;
        }
        .admin-create-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
        }
        .admin-create-form {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
        }
        .admin-section-card {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 1rem;
          box-shadow: 0 2px 16px rgba(15, 23, 42, 0.04);
        }
        .admin-section-title {
          margin: 0 0 0.65rem;
          font-size: 1.02rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .admin-section-sub {
          margin: 0.1rem 0 0;
          color: #64748b;
          font-size: 0.88rem;
        }
        .admin-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.35rem;
        }
        .admin-questions-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.65rem 0.8rem;
          margin-bottom: 0.75rem;
        }
        .admin-add-question {
          padding: 0.6rem 0.95rem;
          border-radius: 10px;
          border: 1px solid #2563eb;
          background: #eff6ff;
          color: #1e40af;
          font-weight: 700;
          cursor: pointer;
        }
        .admin-question-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .admin-question-card {
          border: 1px solid #dbe3ef;
          border-radius: 12px;
          padding: 0.9rem;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        }
        .admin-question-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.65rem;
          flex-wrap: wrap;
        }
        .admin-question-title {
          font-weight: 800;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .admin-remove-question {
          padding: 0.35rem 0.6rem;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff;
          color: #b91c1c;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .admin-question-separator {
          height: 1px;
          background: #eef2f7;
          margin: 0.15rem 0 0.85rem;
        }
        .admin-type-grid {
          display: grid;
          gap: 0.45rem;
        }
        .admin-choice {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.9rem;
          color: #334155;
        }
        .admin-option-row {
          display: flex;
          gap: 0.55rem;
          align-items: center;
          min-height: 52px;
          border: 1px solid #dbe4ef;
          border-radius: 12px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 0.45rem 0.5rem 0.45rem 0.6rem;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background-color .18s ease;
          animation: adminOptionAppear .2s ease-out;
        }
        .admin-option-row:hover {
          border-color: #c7d2fe;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
          transform: translateY(-1px);
          background: #fff;
        }
        .admin-options-list {
          list-style: none;
          padding: 0;
          margin: 0 0 0.75rem 0;
          display: grid;
          gap: 0.55rem;
        }
        .admin-option-indicator {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          border: 2px solid #cbd5e1;
          background: #fff;
          box-sizing: border-box;
          position: relative;
          transition: border-color .16s ease, background-color .16s ease;
        }
        .admin-option-indicator.radio { border-radius: 999px; }
        .admin-option-indicator.radio::after {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 999px;
          background: #93c5fd;
          opacity: 0.9;
        }
        .admin-option-indicator.checkbox { border-radius: 5px; }
        .admin-option-indicator.checkbox::after {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 5px;
          height: 9px;
          border: solid #60a5fa;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .admin-option-input {
          flex: 1;
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #0f172a;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 0.25rem 0.15rem;
          line-height: 1.35;
        }
        .admin-option-row:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
          background: #fff;
        }
        .admin-option-input::placeholder {
          color: #94a3b8;
          font-weight: 500;
        }
        .admin-option-remove {
          padding: 0.48rem 0.68rem;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff5f5;
          color: #b91c1c;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color .16s ease, border-color .16s ease, color .16s ease, opacity .16s ease;
        }
        .admin-option-remove:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }
        .admin-option-remove:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .admin-lead-config {
          margin: 0 0 0.75rem;
          padding: 0.7rem;
          border-radius: 10px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
        }
        .admin-option-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.2rem;
        }
        .admin-option-add-btn {
          width: 100%;
          padding: 0.62rem 0.95rem;
          border-radius: 10px;
          border: 1px dashed #93c5fd;
          background: #f8fbff;
          color: #1d4ed8;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: background-color .18s ease, border-color .18s ease, transform .18s ease;
        }
        .admin-option-add-btn:hover {
          background: #eff6ff;
          border-color: #60a5fa;
          transform: translateY(-1px);
        }
        .admin-bulk-btn {
          width: 100%;
          padding: 0.58rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #c7d2fe;
          background: #fff;
          color: #4338ca;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
        }
        .admin-bulk-panel {
          margin-top: 0.6rem;
          padding: 0.85rem;
          border-radius: 10px;
          border: 1px solid #c7d2fe;
          background: #f8fafc;
        }
        .admin-bulk-panel p {
          margin: 0 0 0.5rem;
          font-size: 0.82rem;
          color: #475569;
        }
        .admin-bulk-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .admin-bulk-import {
          padding: 0.45rem 0.9rem;
          font-size: 0.9rem;
          border-radius: 8px;
          border: 1px solid #4f46e5;
          background: #4f46e5;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .admin-alert-error {
          margin: 0;
          padding: 0.75rem 0.95rem;
          border-radius: 10px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .admin-create-cta {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 0.85rem 1.1rem;
          background: linear-gradient(180deg, #2563eb, #1d4ed8);
          color: #fff;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(37, 99, 235, 0.3);
        }
        .admin-create-cta.desktop { display: none; }
        .admin-footnote {
          margin: 0.2rem 0 0;
          color: #94a3b8;
          font-size: 0.88rem;
        }
        .admin-side-panel { min-width: 0; }
        .admin-side-sticky {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .admin-side-card {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 0.95rem;
          box-shadow: 0 2px 14px rgba(15, 23, 42, 0.04);
        }
        .admin-side-kicker {
          margin: 0 0 0.35rem;
          font-size: 0.73rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
        }
        .admin-side-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .admin-side-card ul {
          margin: 0;
          padding-left: 1.05rem;
          color: #334155;
          font-size: 0.88rem;
          display: grid;
          gap: 0.2rem;
        }
        .admin-side-text {
          margin: 0;
          color: #475569;
          font-size: 0.88rem;
          line-height: 1.45;
        }
        @media (min-width: 980px) {
          .admin-create-shell {
            width: min(1540px, 95vw);
            padding: 1.2rem 1.1rem 2.2rem;
          }
          .admin-create-grid {
            grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
            align-items: start;
            gap: 1.1rem;
          }
          .admin-side-sticky {
            position: sticky;
            top: 1rem;
          }
          .admin-create-cta.desktop { display: inline-flex; justify-content: center; }
          .admin-create-cta.mobile { display: none; }
          .admin-question-card {
            padding: 1rem;
          }
          .admin-option-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.55rem;
          }
        }
        @media (min-width: 1280px) {
          .admin-create-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 390px);
          }
        }
        @media (max-width: 640px) {
          .admin-option-row {
            padding: 0.42rem 0.45rem 0.42rem 0.55rem;
            min-height: 50px;
          }
          .admin-option-remove {
            padding: 0.46rem 0.6rem;
            font-size: 0.75rem;
          }
        }
        @keyframes adminOptionAppear {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
