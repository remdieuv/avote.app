"use client";

import { useMemo, useState } from "react";

/**
 * @param {{
 *  title: string;
 *  questions: Array<{ id?: string; question?: string; type?: string; options?: string[] }>;
 *  activeQuestionIndex?: number;
 * }} props
 */
export function EventLivePreview({
  title,
  questions,
  activeQuestionIndex = 0,
}) {
  const safeQuestions = useMemo(
    () =>
      Array.isArray(questions)
        ? questions.map((q, idx) => ({
            id: q?.id || `q-${idx}`,
            question:
              typeof q?.question === "string" ? q.question.trim() : "",
            type: String(q?.type || "SINGLE_CHOICE").toUpperCase(),
            options: Array.isArray(q?.options)
              ? q.options.map((x) => String(x ?? ""))
              : [],
          }))
        : [],
    [questions],
  );

  const [selectedIdx, setSelectedIdx] = useState(
    Number.isFinite(activeQuestionIndex) ? Math.max(0, activeQuestionIndex) : 0,
  );
  const question = safeQuestions[selectedIdx] || safeQuestions[0] || null;
  const previewTitle = title?.trim() || "Titre de votre événement";
  const hasQuestion = Boolean(question && question.question);
  const options = question
    ? question.options.map((x) => x.trim()).filter(Boolean)
    : [];
  const showLead = question?.type === "LEAD";
  const multiple = question?.type === "MULTIPLE_CHOICE";

  return (
    <section className="event-preview-wrap" aria-label="Aperçu en direct">
      <div className="event-preview-head">
        <p className="event-preview-kicker">Aperçu en direct</p>
        <span className="event-preview-badge">Aperçu mobile</span>
      </div>

      {safeQuestions.length > 1 ? (
        <div className="event-preview-tabs" role="tablist" aria-label="Questions">
          {safeQuestions.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-selected={idx === selectedIdx}
              onClick={() => setSelectedIdx(idx)}
              className={`event-preview-tab ${idx === selectedIdx ? "active" : ""}`}
            >
              Q{idx + 1}
            </button>
          ))}
        </div>
      ) : null}

      <article className="event-preview-phone">
        <header>
          <h4>{previewTitle}</h4>
          <p>{question ? `Question ${selectedIdx + 1}` : "Aucune question"}</p>
        </header>

        <div className="event-preview-card">
          <p className="event-preview-question">
            {hasQuestion
              ? question.question
              : "Votre question apparaîtra ici"}
          </p>

          {options.length === 0 ? (
            <p className="event-preview-empty">
              Ajoutez des réponses pour voir l’aperçu.
            </p>
          ) : (
            <ul className="event-preview-options">
              {options.map((opt, idx) => (
                <li key={`${question?.id || "q"}-${idx}`}>
                  <label>
                    <input
                      type={showLead || !multiple ? "radio" : "checkbox"}
                      disabled
                      readOnly
                    />
                    <span>{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {showLead ? (
            <div className="event-preview-lead">
              <p>Formulaire lead (après “Oui”)</p>
              <input type="text" disabled value="Prénom" readOnly />
              <input type="text" disabled value="Téléphone" readOnly />
              <input type="text" disabled value="Email (optionnel)" readOnly />
            </div>
          ) : null}
        </div>
      </article>

      <style>{`
        .event-preview-wrap { display: grid; gap: 0.55rem; }
        .event-preview-head {
          display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;
        }
        .event-preview-kicker {
          margin: 0; font-size: 0.73rem; color: #64748b; text-transform: uppercase;
          letter-spacing: 0.08em; font-weight: 800;
        }
        .event-preview-badge {
          font-size: 0.68rem; font-weight: 700; color: #3730a3;
          background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 999px;
          padding: 0.2rem 0.5rem;
        }
        .event-preview-tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .event-preview-tab {
          border: 1px solid #cbd5e1; background: #fff; color: #475569;
          border-radius: 999px; padding: 0.2rem 0.5rem; font-size: 0.72rem; font-weight: 700;
          cursor: pointer; transition: all .18s ease;
        }
        .event-preview-tab.active { background: #e0e7ff; border-color: #a5b4fc; color: #3730a3; }
        .event-preview-phone {
          border: 1px solid #dbe2ea; border-radius: 18px; padding: 0.7rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }
        .event-preview-phone header h4 {
          margin: 0; font-size: 0.86rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .event-preview-phone header p {
          margin: 0.1rem 0 0.55rem; font-size: 0.72rem; color: #64748b;
        }
        .event-preview-card {
          border: 1px solid #e2e8f0; border-radius: 14px; background: #fff;
          padding: 0.7rem; transition: transform .18s ease, opacity .18s ease;
        }
        .event-preview-question {
          margin: 0 0 0.55rem; font-size: 0.84rem; font-weight: 700; color: #0f172a;
          line-height: 1.35;
        }
        .event-preview-empty { margin: 0; font-size: 0.8rem; color: #94a3b8; }
        .event-preview-options { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.38rem; }
        .event-preview-options li label {
          display: flex; gap: 0.45rem; align-items: center; padding: 0.4rem 0.45rem;
          border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
          transition: border-color .18s ease, background-color .18s ease;
        }
        .event-preview-options li label:hover { border-color: #c7d2fe; background: #f8fafc; }
        .event-preview-options input { pointer-events: none; }
        .event-preview-options span { font-size: 0.8rem; color: #1f2937; }
        .event-preview-lead {
          margin-top: 0.6rem; display: grid; gap: 0.35rem; padding-top: 0.55rem;
          border-top: 1px dashed #dbeafe;
        }
        .event-preview-lead p { margin: 0; font-size: 0.72rem; font-weight: 700; color: #1d4ed8; }
        .event-preview-lead input {
          width: 100%; border-radius: 9px; border: 1px solid #cbd5e1; background: #f8fafc;
          padding: 0.38rem 0.5rem; font-size: 0.76rem; color: #94a3b8;
        }
      `}</style>
    </section>
  );
}

