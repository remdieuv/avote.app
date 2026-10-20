"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * @param {{
 *  title: string;
 *  questions: Array<{
 *    id?: string;
 *    question?: string;
 *    type?: string;
 *    options?: string[];
 *    leadTriggerOrder?: number;
 *    quizCorrectOrder?: number;
 *  }>;
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
            leadTriggerOrder: Number(q?.leadTriggerOrder ?? 0) || 0,
            quizCorrectOrder: Number(q?.quizCorrectOrder ?? 0) || 0,
          }))
        : [],
    [questions],
  );

  const clampedActive = useMemo(() => {
    if (!safeQuestions.length) return 0;
    const n = Number(activeQuestionIndex);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(0, Math.floor(n)), safeQuestions.length - 1);
  }, [activeQuestionIndex, safeQuestions.length]);

  const [selectedIdx, setSelectedIdx] = useState(clampedActive);

  useEffect(() => {
    setSelectedIdx(clampedActive);
  }, [clampedActive]);

  useEffect(() => {
    if (selectedIdx > safeQuestions.length - 1) {
      setSelectedIdx(Math.max(0, safeQuestions.length - 1));
    }
  }, [safeQuestions.length, selectedIdx]);

  const question = safeQuestions[selectedIdx] || safeQuestions[0] || null;
  const previewTitle = title?.trim() || "Titre de votre événement";
  const hasQuestion = Boolean(question && question.question);
  const options = question
    ? question.options.map((x) => x.trim()).filter(Boolean)
    : [];
  const showLead =
    question?.type === "LEAD" || question?.type === "CONTEST_ENTRY";
  const isQuiz = question?.type === "QUIZ";
  const multiple = question?.type === "MULTIPLE_CHOICE";
  const triggerIdx = Math.min(
    Math.max(0, Number(question?.leadTriggerOrder ?? 0) || 0),
    Math.max(0, options.length - 1),
  );
  const triggerLabel =
    options[triggerIdx] || (showLead ? "Oui" : "");
  const correctIdx = Math.min(
    Math.max(0, Number(question?.quizCorrectOrder ?? 0) || 0),
    Math.max(0, options.length - 1),
  );

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
              {options.map((opt, idx) => {
                const isCorrect = isQuiz && idx === correctIdx;
                const isTrigger = showLead && idx === triggerIdx;
                return (
                  <li
                    key={`${question?.id || "q"}-${idx}`}
                    className={
                      isCorrect
                        ? "is-correct"
                        : isTrigger
                          ? "is-trigger"
                          : undefined
                    }
                  >
                    <label>
                      <input
                        type={showLead || !multiple ? "radio" : "checkbox"}
                        disabled
                        readOnly
                      />
                      <span>{opt}</span>
                      {isCorrect ? (
                        <em className="event-preview-tag">Bonne réponse</em>
                      ) : null}
                      {isTrigger ? (
                        <em className="event-preview-tag trigger">Déclencheur</em>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {showLead ? (
            <div className="event-preview-lead">
              <p>
                Formulaire lead
                {triggerLabel
                  ? ` (après « ${triggerLabel} »)`
                  : " (après le déclencheur)"}
              </p>
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
          display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap;
          padding: 0.4rem 0.45rem;
          border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
          transition: border-color .18s ease, background-color .18s ease;
        }
        .event-preview-options li.is-correct label {
          border-color: #86efac; background: #f0fdf4;
        }
        .event-preview-options li.is-trigger label {
          border-color: #93c5fd; background: #eff6ff;
        }
        .event-preview-options li label:hover { border-color: #c7d2fe; background: #f8fafc; }
        .event-preview-options input { pointer-events: none; }
        .event-preview-options span { font-size: 0.8rem; color: #1f2937; flex: 1; min-width: 0; }
        .event-preview-tag {
          font-style: normal; font-size: 0.62rem; font-weight: 800;
          color: #15803d; background: #dcfce7; border-radius: 999px;
          padding: 0.12rem 0.4rem; letter-spacing: 0.02em;
        }
        .event-preview-tag.trigger {
          color: #1d4ed8; background: #dbeafe;
        }
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
