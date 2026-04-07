"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

/** IDs stables (pas Date/random) pour éviter les erreurs d’hydratation SSR. */
const QUESTION_INITIALE = {
  id: "q-1",
  question: "",
  type: "SINGLE_CHOICE",
  options: ["", ""],
  leadTriggerOrder: 0,
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
    majQuestion(id, { type, leadTriggerOrder: 0 });
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
      leadTriggerOrder:
        premier.type === "LEAD" ? Number(premier.leadTriggerOrder ?? 0) : 0,
      polls: questions.map((x, order) => ({
        question: x.question.trim(),
        type: x.type,
        order,
        options: x.options.map((s) => s.trim()).filter(Boolean),
        leadTriggerOrder:
          x.type === "LEAD" ? Number(x.leadTriggerOrder ?? 0) : 0,
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
  const multipleQuestions = questions.filter(
    (q) => q.type === "MULTIPLE_CHOICE",
  ).length;
  const singleQuestions = totalQuestions - leadQuestions - multipleQuestions;
  const eventTitlePreview = eventTitle.trim() || "Titre de l’événement";

  return (
    <main className="admin-create-page">
      <div className="admin-create-shell">
        <header className="admin-create-topbar">
          <div className="admin-create-links">
            <Link href="/" className="admin-create-link-muted">
              ← Accueil
            </Link>
            <Link href="/admin/events" className="admin-create-link-accent">
              Mes événements
            </Link>
          </div>
          <span className="admin-create-brand">Avote</span>
        </header>

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
                      </div>
                    </fieldset>

                    <div className="admin-question-separator" />

                    <p className="admin-label" style={{ marginBottom: "0.45rem" }}>
                      Réponses
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.6rem 0" }}>
                      {item.options.map((value, indexOpt) => (
                        <li key={`${item.id}-opt-${indexOpt}`} className="admin-option-row">
                          <input
                            type="text"
                            value={value}
                            onChange={(ev) => majOption(item.id, indexOpt, ev.target.value)}
                            placeholder={`Option ${indexOpt + 1}`}
                            disabled={creating}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <button
                            type="button"
                            disabled={creating || item.options.length <= 2}
                            onClick={() => retirerOption(item.id, indexOpt)}
                            className="admin-option-remove"
                          >
                            Supprimer
                          </button>
                        </li>
                      ))}
                    </ul>

                    {item.type === "LEAD" ? (
                      <div className="admin-lead-config">
                        <label htmlFor={`lead-trigger-${item.id}`} className="admin-label">
                          Option déclencheuse du formulaire lead
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

                    <div className="admin-option-actions">
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => ajouterOption(item.id)}
                        style={btnGhost}
                      >
                        Ajouter une option
                      </button>
                      <button
                        type="button"
                        disabled={creating}
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
                </ul>
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
        .admin-create-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .admin-create-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.6rem 1rem;
        }
        .admin-create-link-muted,
        .admin-create-link-accent {
          font-size: 0.9rem;
          text-decoration: none;
        }
        .admin-create-link-muted { color: #64748b; }
        .admin-create-link-accent { color: #7c3aed; font-weight: 700; }
        .admin-create-brand {
          font-weight: 800;
          font-size: 1.02rem;
          letter-spacing: -0.03em;
        }
        .admin-create-hero {
          margin-bottom: 1rem;
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
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        .admin-option-remove {
          padding: 0.45rem 0.65rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          flex-shrink: 0;
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
          margin-top: 0.15rem;
        }
        .admin-bulk-btn {
          padding: 0.45rem 0.65rem;
          border-radius: 8px;
          border: 1px solid #818cf8;
          background: #fff;
          color: #4338ca;
          font-size: 0.85rem;
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
        }
        @media (min-width: 1280px) {
          .admin-create-grid {
            grid-template-columns: minmax(0, 1fr) minmax(340px, 390px);
          }
        }
      `}</style>
    </main>
  );
}
