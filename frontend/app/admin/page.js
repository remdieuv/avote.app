"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EventLivePreview } from "@/components/admin/EventLivePreview";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  CONTEST_PRIZE_PLACEHOLDER,
  QUESTION_TYPE_META,
  applyQuestionType,
  buildContestQuestion,
  clearCreateEventDraft,
  createBlankQuestion,
  duplicateQuestion,
  isContestEntryQuestion,
  isCreateEventDraftMeaningful,
  isLeadLikeQuestionType,
  isQuizQuestion,
  loadCreateEventDraft,
  moveItem,
  normalizeContestWinnerCount,
  saveCreateEventDraft,
  summarizeQuestionTypes,
  validateCreateEventForm,
} from "@/lib/createEventForm";
import { rememberMyEvent } from "@/lib/myEventsStorage";

const inputStyle = {
  width: "100%",
  minHeight: "42px",
  padding: "0.58rem 0.68rem",
  fontSize: "0.9rem",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  outline: "none",
};

const inputErrorStyle = {
  ...inputStyle,
  borderColor: "#f87171",
  boxShadow: "0 0 0 3px rgba(248, 113, 113, 0.18)",
};

const btnGhost = {
  padding: "0.45rem 0.65rem",
  fontSize: "0.85rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const QUESTION_INITIALE = createBlankQuestion("q-1");

export default function AdminPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [questions, setQuestions] = useState(() => [{ ...QUESTION_INITIALE }]);
  const [openQuestionId, setOpenQuestionId] = useState(QUESTION_INITIALE.id);
  const [formError, setFormError] = useState(null);
  /** @type {[Record<string, unknown>, Function]} */
  const [fieldErrors, setFieldErrors] = useState({ questions: {} });
  const [draftBanner, setDraftBanner] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(
    /** @type {"form" | "preview"} */ ("form"),
  );

  const createLockRef = useRef(false);
  const nextQuestionIdRef = useRef(2);
  const questionCardRefs = useRef(/** @type {Record<string, HTMLElement|null>} */ ({}));
  const titleInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
  const skipNextDraftSaveRef = useRef(false);
  /** Import en masse des réponses (une question à la fois) */
  const [importMasseQuestionId, setImportMasseQuestionId] = useState(null);
  const [importMasseTexte, setImportMasseTexte] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = loadCreateEventDraft(window.localStorage);
    if (draft && isCreateEventDraftMeaningful(draft)) {
      skipNextDraftSaveRef.current = true;
      setEventTitle(draft.eventTitle);
      setEventDescription(draft.eventDescription);
      setQuestions(draft.questions);
      setOpenQuestionId(draft.questions[draft.questions.length - 1]?.id || "q-1");
      let maxN = 1;
      for (const q of draft.questions) {
        const m = /^q-(\d+)$/.exec(String(q.id || ""));
        if (m) maxN = Math.max(maxN, Number(m[1]));
      }
      nextQuestionIdRef.current = maxN + 1;
      setDraftBanner(true);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || typeof window === "undefined") return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      saveCreateEventDraft(window.localStorage, {
        eventTitle,
        eventDescription,
        questions,
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [eventTitle, eventDescription, questions, draftHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dirty = isCreateEventDraftMeaningful({
      eventTitle,
      eventDescription,
      questions,
    });
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [eventTitle, eventDescription, questions]);

  useEffect(() => {
    if (importMasseQuestionId === null) setImportMasseTexte("");
  }, [importMasseQuestionId]);

  function resetFormToBlank() {
    const blank = createBlankQuestion("q-1");
    nextQuestionIdRef.current = 2;
    skipNextDraftSaveRef.current = true;
    setEventTitle("");
    setEventDescription("");
    setQuestions([{ ...blank }]);
    setOpenQuestionId(blank.id);
    setFormError(null);
    setFieldErrors({ questions: {} });
    setError(null);
    setImportMasseQuestionId(null);
    setDraftBanner(false);
    if (typeof window !== "undefined") {
      clearCreateEventDraft(window.localStorage);
    }
  }

  function ajouterQuestion() {
    const nid = `q-${nextQuestionIdRef.current++}`;
    setQuestions((q) => [...q, createBlankQuestion(nid)]);
    setOpenQuestionId(nid);
    setImportMasseQuestionId(null);
    window.setTimeout(() => {
      const el = questionCardRefs.current[nid];
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function retirerQuestion(id) {
    if (questions.length <= 1) return;
    const next = questions.filter((item) => item.id !== id);
    setImportMasseQuestionId((ouvert) => (ouvert === id ? null : ouvert));
    setQuestions(next);
    setOpenQuestionId((cur) =>
      cur === id ? next[next.length - 1]?.id || next[0]?.id || null : cur,
    );
    setFieldErrors((fe) => {
      const qs = { ...(fe.questions || {}) };
      delete qs[id];
      return { ...fe, questions: qs };
    });
  }

  function dupliquerQuestion(id) {
    const nid = `q-${nextQuestionIdRef.current++}`;
    setQuestions((q) => {
      const idx = q.findIndex((item) => item.id === id);
      if (idx < 0) return q;
      const copy = duplicateQuestion(q[idx], nid);
      const next = [...q];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setOpenQuestionId(nid);
    window.setTimeout(() => {
      questionCardRefs.current[nid]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  }

  function deplacerQuestion(id, direction) {
    setQuestions((q) => {
      const from = q.findIndex((item) => item.id === id);
      if (from < 0) return q;
      const to = direction === "up" ? from - 1 : from + 1;
      return moveItem(q, from, to);
    });
  }

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
    setQuestions((q) =>
      q.map((item) =>
        item.id === id ? applyQuestionType(item, type) : item,
      ),
    );
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

  function focusValidationError(result) {
    setFormError(result.formError);
    setFieldErrors(result.fieldErrors);
    if (result.fieldErrors?.eventTitle) {
      setMobilePanel("form");
      window.setTimeout(() => titleInputRef.current?.focus(), 40);
      return;
    }
    const qid = result.firstErrorQuestionId;
    if (qid) {
      setOpenQuestionId(qid);
      setMobilePanel("form");
      window.setTimeout(() => {
        questionCardRefs.current[qid]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 60);
    }
  }

  async function handleCreatePoll(e) {
    e.preventDefault();
    const result = validateCreateEventForm({ eventTitle, questions });
    if (!result.ok) {
      focusValidationError(result);
      return;
    }
    setFormError(null);
    setFieldErrors({ questions: {} });

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
      leadTriggerOrder: isLeadLikeQuestionType(premier.type)
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
        leadTriggerOrder: isLeadLikeQuestionType(x.type)
          ? Number(x.leadTriggerOrder ?? 0)
          : 0,
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
        const code = String(errBody?.error || "").trim();
        const serverMessage =
          typeof errBody?.message === "string" ? errBody.message.trim() : "";
        if (code === "EVENT_ALREADY_ACTIVE") {
          throw new Error(
            "Vous avez déjà un événement actif. Terminez-le avant d’en créer un nouveau.",
          );
        }
        throw new Error(serverMessage || code || `Erreur ${res.status}`);
      }
      const created = await res.json();
      const eventId = created.eventId;
      const slug = created.eventSlug;

      if (eventId) {
        if (typeof window !== "undefined") {
          clearCreateEventDraft(window.localStorage);
        }
        const titre = eventTitle.trim();
        if (slug) {
          rememberMyEvent({ id: eventId, title: titre, slug });
        }
        router.replace(`/admin/event/${eventId}`);
        return;
      }
    } catch (err) {
      setError(err.message || "Échec de la création du sondage");
    } finally {
      setCreating(false);
      createLockRef.current = false;
    }
  }

  const stats = useMemo(() => summarizeQuestionTypes(questions), [questions]);
  const eventTitlePreview = eventTitle.trim() || "Titre de l’événement";
  const activeQuestionIndex = Math.max(
    0,
    questions.findIndex((q) => q.id === openQuestionId),
  );
  const titleHasError = Boolean(fieldErrors?.eventTitle);

  function questionSummaryLine(item) {
    const meta = QUESTION_TYPE_META.find((t) => t.type === item.type);
    const filled = (item.options || []).filter((o) => String(o).trim()).length;
    const label = meta?.label || item.type;
    const qText = item.question.trim();
    return `${label} · ${filled} réponse(s)${qText ? ` · ${qText.slice(0, 42)}${qText.length > 42 ? "…" : ""}` : ""}`;
  }

  return (
    <main className="admin-create-page">
      <div className="admin-create-shell">
        <AdminPageHeader
          title="Créer un événement"
          subtitle="Préparez vos questions, structurez le vote et lancez votre régie en quelques secondes."
          breadcrumbs={
            <Link
              href="/admin/events"
              style={{
                color: "#64748b",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              ← Mes événements
            </Link>
          }
        />

        {draftBanner ? (
          <div className="admin-draft-banner" role="status">
            <p>
              Brouillon récupéré automatiquement. Vous pouvez continuer ou
              repartir de zéro.
            </p>
            <div className="admin-draft-actions">
              <button
                type="button"
                className="admin-draft-continue"
                onClick={() => setDraftBanner(false)}
              >
                Continuer
              </button>
              <button type="button" style={btnGhost} onClick={resetFormToBlank}>
                Repartir de zéro
              </button>
            </div>
          </div>
        ) : null}

        <div
          className="admin-mobile-tabs"
          role="tablist"
          aria-label="Formulaire ou aperçu"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "form"}
            className={mobilePanel === "form" ? "active" : ""}
            onClick={() => setMobilePanel("form")}
          >
            Formulaire
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "preview"}
            className={mobilePanel === "preview" ? "active" : ""}
            onClick={() => setMobilePanel("preview")}
          >
            Aperçu
          </button>
        </div>

        <div
          className="admin-create-grid"
          data-mobile-panel={mobilePanel}
        >
          <form
            id="create-event-form"
            className="admin-create-form"
            onSubmit={handleCreatePoll}
          >
            <section className="admin-section-card">
              <h2 className="admin-section-title">Informations événement</h2>
              <label className="admin-label" htmlFor="event-title">
                Titre de l’événement
              </label>
              <input
                id="event-title"
                ref={titleInputRef}
                type="text"
                value={eventTitle}
                onChange={(ev) => {
                  setEventTitle(ev.target.value);
                  if (fieldErrors?.eventTitle) {
                    setFieldErrors((fe) => {
                      const next = { ...fe };
                      delete next.eventTitle;
                      return next;
                    });
                  }
                }}
                placeholder="Ex. Soirée partenaires Q2"
                disabled={creating}
                aria-invalid={titleHasError ? "true" : undefined}
                style={{
                  ...(titleHasError ? inputErrorStyle : inputStyle),
                  marginBottom: titleHasError ? "0.35rem" : "0.95rem",
                }}
              />
              {titleHasError ? (
                <p className="admin-field-error" role="alert">
                  {fieldErrors.eventTitle}
                </p>
              ) : null}

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
                    Une question ouverte à la fois. Ordre d’affichage = ordre du
                    vote. Chaque question contient au moins 2 réponses.
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
                {questions.map((item, indexQ) => {
                  const isOpen = openQuestionId === item.id;
                  const qErr = fieldErrors?.questions?.[item.id] || {};
                  const hasQErr = Object.keys(qErr).length > 0;
                  return (
                    <article
                      key={item.id}
                      ref={(el) => {
                        questionCardRefs.current[item.id] = el;
                      }}
                      className={`admin-question-card ${isOpen ? "is-open" : "is-collapsed"} ${hasQErr ? "has-error" : ""}`}
                      data-question-id={item.id}
                    >
                      <div className="admin-question-top">
                        <button
                          type="button"
                          className="admin-question-toggle"
                          aria-expanded={isOpen}
                          disabled={creating}
                          onClick={() =>
                            setOpenQuestionId(isOpen ? null : item.id)
                          }
                        >
                          <span className="admin-question-title">
                            Question {indexQ + 1}
                            {hasQErr ? (
                              <span className="admin-q-error-dot" aria-hidden>
                                !
                              </span>
                            ) : null}
                          </span>
                          {!isOpen ? (
                            <span className="admin-question-summary">
                              {questionSummaryLine(item)}
                            </span>
                          ) : null}
                        </button>
                        <div className="admin-question-toolbar">
                          <button
                            type="button"
                            className="admin-q-tool"
                            disabled={creating || indexQ === 0}
                            onClick={() => deplacerQuestion(item.id, "up")}
                            title="Monter"
                            aria-label={`Monter la question ${indexQ + 1}`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-q-tool"
                            disabled={
                              creating || indexQ === questions.length - 1
                            }
                            onClick={() => deplacerQuestion(item.id, "down")}
                            title="Descendre"
                            aria-label={`Descendre la question ${indexQ + 1}`}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-q-tool"
                            disabled={creating}
                            onClick={() => dupliquerQuestion(item.id)}
                          >
                            Dupliquer
                          </button>
                          <button
                            type="button"
                            disabled={creating || questions.length <= 1}
                            onClick={() => retirerQuestion(item.id)}
                            className="admin-remove-question"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="admin-question-body">
                          <label
                            className="admin-label"
                            htmlFor={`q-text-${item.id}`}
                          >
                            Texte de la question
                          </label>
                          <input
                            id={`q-text-${item.id}`}
                            type="text"
                            value={item.question}
                            onChange={(ev) =>
                              majTexteQuestion(item.id, ev.target.value)
                            }
                            placeholder="Ex. Qui va marquer le prochain but ?"
                            disabled={creating}
                            aria-invalid={qErr.question ? "true" : undefined}
                            style={{
                              ...(qErr.question ? inputErrorStyle : inputStyle),
                              marginBottom: qErr.question
                                ? "0.35rem"
                                : "0.95rem",
                            }}
                          />
                          {qErr.question ? (
                            <p className="admin-field-error" role="alert">
                              {qErr.question}
                            </p>
                          ) : null}

                          <div className="admin-question-separator" />

                          <fieldset
                            style={{
                              border: "none",
                              padding: 0,
                              margin: "0 0 0.9rem 0",
                            }}
                          >
                            <legend
                              className="admin-label"
                              style={{ marginBottom: "0.5rem" }}
                            >
                              Type de vote
                            </legend>
                            <div className="admin-type-grid">
                              {QUESTION_TYPE_META.map((meta) => {
                                const checked = item.type === meta.type;
                                return (
                                  <label
                                    key={meta.type}
                                    className={`admin-type-card ${checked ? "is-selected" : ""}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`pollType-${item.id}`}
                                      checked={checked}
                                      disabled={creating}
                                      onChange={() =>
                                        majTypeQuestion(item.id, meta.type)
                                      }
                                    />
                                    <span className="admin-type-card-label">
                                      {meta.label}
                                    </span>
                                    <span className="admin-type-card-help">
                                      {meta.help}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>

                          {isContestEntryQuestion(item.type) ? (
                            <div style={{ marginBottom: "0.9rem" }}>
                              <label
                                className="admin-label"
                                htmlFor={`q-prize-${item.id}`}
                              >
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
                                aria-invalid={
                                  qErr.contestPrize ? "true" : undefined
                                }
                                style={{
                                  ...(qErr.contestPrize
                                    ? inputErrorStyle
                                    : inputStyle),
                                  marginBottom: "0.45rem",
                                }}
                              />
                              {qErr.contestPrize ||
                              !(item.contestPrize || "").trim() ? (
                                <p
                                  className={
                                    qErr.contestPrize
                                      ? "admin-field-error"
                                      : undefined
                                  }
                                  style={
                                    qErr.contestPrize
                                      ? undefined
                                      : {
                                          margin: 0,
                                          fontSize: "0.86rem",
                                          color: "#b45309",
                                        }
                                  }
                                  role={qErr.contestPrize ? "alert" : undefined}
                                >
                                  {qErr.contestPrize ||
                                    "Précisez le lot à gagner pour rendre le concours clair pour les participants."}
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
                                    majContestWinnerCount(
                                      item.id,
                                      ev.target.value,
                                    )
                                  }
                                  disabled={creating}
                                  style={{
                                    ...inputStyle,
                                    marginBottom: "0.32rem",
                                  }}
                                />
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.8rem",
                                    color: "#64748b",
                                  }}
                                >
                                  Nombre total de gagnants à tirer pour ce
                                  concours.
                                </p>
                              </div>
                            </div>
                          ) : null}

                          <div className="admin-question-separator" />

                          <p
                            className="admin-label"
                            style={{ marginBottom: "0.45rem" }}
                          >
                            Réponses
                          </p>
                          <ul className="admin-options-list">
                            {item.options.map((value, indexOpt) => (
                              <li
                                key={`${item.id}-opt-${indexOpt}`}
                                className="admin-option-row"
                              >
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
                                  onChange={(ev) =>
                                    majOption(
                                      item.id,
                                      indexOpt,
                                      ev.target.value,
                                    )
                                  }
                                  placeholder={`Option ${indexOpt + 1}`}
                                  disabled={
                                    creating || item.type === "CONTEST_ENTRY"
                                  }
                                  className="admin-option-input"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    creating ||
                                    item.options.length <= 2 ||
                                    item.type === "CONTEST_ENTRY"
                                  }
                                  onClick={() =>
                                    retirerOption(item.id, indexOpt)
                                  }
                                  className="admin-option-remove"
                                >
                                  Supprimer
                                </button>
                              </li>
                            ))}
                          </ul>
                          {qErr.options ? (
                            <p className="admin-field-error" role="alert">
                              {qErr.options}
                            </p>
                          ) : null}

                          {isLeadLikeQuestionType(item.type) ? (
                            <div className="admin-lead-config">
                              <label
                                htmlFor={`lead-trigger-${item.id}`}
                                className="admin-label"
                              >
                                Option déclencheuse du formulaire
                              </label>
                              <select
                                id={`lead-trigger-${item.id}`}
                                value={Math.min(
                                  Math.max(
                                    0,
                                    Number(item.leadTriggerOrder ?? 0),
                                  ),
                                  Math.max(0, item.options.length - 1),
                                )}
                                onChange={(ev) =>
                                  majLeadTriggerOrder(
                                    item.id,
                                    Number(ev.target.value),
                                  )
                                }
                                disabled={creating}
                                style={{
                                  ...inputStyle,
                                  padding: "0.45rem 0.6rem",
                                }}
                              >
                                {item.options.map((opt, idx) => (
                                  <option
                                    key={`${item.id}-lead-trigger-${idx}`}
                                    value={idx}
                                  >
                                    {opt.trim() || `Option ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                          {isQuizQuestion(item.type) ? (
                            <div className="admin-lead-config">
                              <label
                                htmlFor={`quiz-correct-${item.id}`}
                                className="admin-label"
                              >
                                Bonne réponse
                              </label>
                              <select
                                id={`quiz-correct-${item.id}`}
                                value={Math.min(
                                  Math.max(
                                    0,
                                    Number(item.quizCorrectOrder ?? 0),
                                  ),
                                  Math.max(0, item.options.length - 1),
                                )}
                                onChange={(ev) =>
                                  majQuestion(item.id, {
                                    quizCorrectOrder: Number(ev.target.value),
                                  })
                                }
                                disabled={creating}
                                aria-invalid={
                                  qErr.quizCorrectOrder ? "true" : undefined
                                }
                                style={{
                                  ...(qErr.quizCorrectOrder
                                    ? inputErrorStyle
                                    : inputStyle),
                                  padding: "0.45rem 0.6rem",
                                }}
                              >
                                {item.options.map((opt, idx) => (
                                  <option
                                    key={`${item.id}-quiz-correct-${idx}`}
                                    value={idx}
                                  >
                                    {opt.trim() || `Option ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                              {qErr.quizCorrectOrder ? (
                                <p className="admin-field-error" role="alert">
                                  {qErr.quizCorrectOrder}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="admin-option-actions">
                            <button
                              type="button"
                              disabled={
                                creating || item.type === "CONTEST_ENTRY"
                              }
                              onClick={() => ajouterOption(item.id)}
                              className="admin-option-add-btn"
                            >
                              {item.type === "CONTEST_ENTRY"
                                ? "Options fixées à Oui / Non"
                                : "Ajouter une option"}
                            </button>
                            <button
                              type="button"
                              disabled={
                                creating || item.type === "CONTEST_ENTRY"
                              }
                              onClick={() =>
                                basculerPanneauImportMasse(item.id)
                              }
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
                                Collez une réponse par ligne. Les lignes vides et
                                doublons sont ignorés.
                              </p>
                              <textarea
                                value={importMasseTexte}
                                onChange={(ev) =>
                                  setImportMasseTexte(ev.target.value)
                                }
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
                                  onClick={() =>
                                    importerOptionsEnMasse(item.id)
                                  }
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
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="admin-questions-footer">
                <button
                  type="button"
                  disabled={creating}
                  onClick={ajouterQuestion}
                  className="admin-add-question"
                >
                  + Ajouter une question
                </button>
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

            <button
              type="submit"
              disabled={creating}
              className="admin-create-cta mobile"
            >
              {creating ? "Création en cours…" : "Créer l’événement"}
            </button>

            <p className="admin-footnote">
              Après création, vous êtes redirigé vers la régie. Retrouvez vos
              événements dans{" "}
              <Link
                href="/admin/events"
                style={{ color: "#7c3aed", fontWeight: 700 }}
              >
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
                  <li>{stats.totalQuestions} question(s)</li>
                  <li>{stats.totalOptions} option(s) au total</li>
                  <li>{stats.single} en choix unique</li>
                  <li>{stats.multiple} en choix multiple</li>
                  <li>{stats.quiz} quiz</li>
                  <li>{stats.lead} lead(s)</li>
                  <li>{stats.contest} concours</li>
                </ul>
              </section>

              <section className="admin-side-card">
                <EventLivePreview
                  title={eventTitle}
                  questions={questions}
                  activeQuestionIndex={
                    activeQuestionIndex >= 0 ? activeQuestionIndex : 0
                  }
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
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px clamp(16px, 3vw, 24px) 40px;
          box-sizing: border-box;
        }
        .admin-draft-banner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #c7d2fe;
          background: #eef2ff;
        }
        .admin-draft-banner p {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: #312e81;
        }
        .admin-draft-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .admin-draft-continue {
          min-height: 36px;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #4338ca;
          background: #4338ca;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .admin-mobile-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
          margin-bottom: 0.75rem;
        }
        .admin-mobile-tabs button {
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #475569;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .admin-mobile-tabs button.active {
          border-color: #4f46e5;
          background: #eef2ff;
          color: #3730a3;
        }
        .admin-create-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.75rem;
        }
        .admin-create-form {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .admin-create-grid[data-mobile-panel="form"] .admin-side-panel {
          display: none;
        }
        .admin-create-grid[data-mobile-panel="preview"] .admin-create-form {
          display: none;
        }
        .admin-section-card {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
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
        .admin-field-error {
          margin: 0 0 0.75rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #b91c1c;
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
          min-height: 40px;
          padding: 0.58rem 0.95rem;
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
        .admin-question-card.has-error {
          border-color: #fca5a5;
        }
        .admin-question-card.is-collapsed {
          padding: 0.7rem 0.85rem;
        }
        .admin-question-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0;
          flex-wrap: wrap;
        }
        .admin-question-card.is-open .admin-question-top {
          margin-bottom: 0.65rem;
        }
        .admin-question-toggle {
          flex: 1;
          min-width: 0;
          text-align: left;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: grid;
          gap: 0.2rem;
        }
        .admin-question-title {
          font-weight: 800;
          font-size: 0.95rem;
          color: #0f172a;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .admin-q-error-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.05rem;
          height: 1.05rem;
          border-radius: 999px;
          background: #fee2e2;
          color: #b91c1c;
          font-size: 0.72rem;
          font-weight: 900;
        }
        .admin-question-summary {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
          line-height: 1.35;
        }
        .admin-question-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          align-items: center;
        }
        .admin-q-tool {
          min-height: 36px;
          padding: 0.42rem 0.6rem;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .admin-q-tool:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .admin-remove-question {
          min-height: 36px;
          padding: 0.42rem 0.68rem;
          border-radius: 9px;
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
          gap: 0.5rem;
        }
        .admin-type-card {
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-rows: auto auto;
          column-gap: 0.55rem;
          row-gap: 0.1rem;
          align-items: start;
          padding: 0.65rem 0.75rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          cursor: pointer;
          transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease;
        }
        .admin-type-card input {
          grid-row: 1 / span 2;
          margin-top: 0.2rem;
        }
        .admin-type-card-label {
          font-size: 0.9rem;
          font-weight: 800;
          color: #0f172a;
        }
        .admin-type-card-help {
          font-size: 0.78rem;
          color: #64748b;
          line-height: 1.35;
        }
        .admin-type-card.is-selected {
          border-color: #818cf8;
          background: #eef2ff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
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
          min-height: 36px;
          padding: 0.48rem 0.7rem;
          border-radius: 9px;
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
          min-height: 40px;
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
          min-height: 40px;
          padding: 0.58rem 0.8rem;
          border-radius: 10px;
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
          min-height: 40px;
          padding: 0.52rem 0.9rem;
          font-size: 0.88rem;
          border-radius: 10px;
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
          border-radius: 10px;
          min-height: 44px;
          padding: 0.72rem 1.1rem;
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
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
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
        .admin-questions-footer {
          margin-top: 0.8rem;
          display: flex;
          justify-content: center;
        }
        .admin-create-page input:focus-visible,
        .admin-create-page textarea:focus-visible,
        .admin-create-page select:focus-visible {
          border-color: #93c5fd !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
        }
        @media (min-width: 980px) {
          .admin-mobile-tabs { display: none; }
          .admin-create-grid {
            grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
            align-items: start;
            gap: 1rem;
          }
          .admin-create-grid[data-mobile-panel="form"] .admin-side-panel {
            display: block;
          }
          .admin-create-grid[data-mobile-panel="preview"] .admin-create-form {
            display: flex;
          }
          .admin-create-form {
            gap: 1rem;
          }
          .admin-side-sticky {
            position: static;
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
          .admin-type-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1280px) {
          .admin-create-grid {
            grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
            gap: 1.25rem;
          }
          .admin-side-sticky {
            position: sticky;
            top: 5rem;
          }
        }
        @media (min-width: 1440px) {
          .admin-create-grid {
            grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
            gap: 1.5rem;
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
          .admin-question-toolbar {
            width: 100%;
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
