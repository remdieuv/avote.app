"use client";

import { leadDetailRows, leadSourceFromPollType } from "@/lib/forms/leadsCrm";

/**
 * Panneau Détail — toutes les réponses custom d’un participant (L4 / D6 / D9).
 *
 * @param {{
 *   lead: Record<string, unknown> | null;
 *   open: boolean;
 *   onClose: () => void;
 *   showEventTitle?: boolean;
 * }} props
 */
export function LeadAnswersDetail({
  lead,
  open,
  onClose,
  showEventTitle = true,
}) {
  if (!open || !lead) return null;

  const rows = leadDetailRows(lead);
  const source =
    leadSourceFromPollType(lead.pollType) === "contest" ? "Concours" : "Lead";
  const when =
    lead.createdAt != null
      ? new Date(/** @type {string|number|Date} */ (lead.createdAt)).toLocaleString(
          "fr-FR",
          { dateStyle: "short", timeStyle: "short" },
        )
      : "—";

  return (
    <div
      className="lead-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-detail-title"
      onClick={onClose}
    >
      <div
        className="lead-detail-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lead-detail-head">
          <div>
            <p className="lead-detail-eyebrow">Détail des réponses</p>
            <h2 id="lead-detail-title" className="lead-detail-title">
              {String(lead.firstName || "").trim() || "Participant"}
            </h2>
          </div>
          <button
            type="button"
            className="lead-detail-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <dl className="lead-detail-meta">
          <div>
            <dt>Date</dt>
            <dd>{when}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{source}</dd>
          </div>
          {showEventTitle && lead.eventTitle ? (
            <div>
              <dt>Événement</dt>
              <dd>{String(lead.eventTitle)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Question</dt>
            <dd>
              {String(lead.pollQuestion || "").trim() ||
                (typeof lead.pollOrder === "number"
                  ? `Question ${lead.pollOrder + 1}`
                  : "—")}
            </dd>
          </div>
        </dl>

        <p className="lead-detail-section">Réponses du formulaire</p>
        {rows.length === 0 ? (
          <p className="lead-detail-empty">Aucune réponse enregistrée.</p>
        ) : (
          <ul className="lead-detail-list">
            {rows.map((row) => (
              <li key={row.fieldId || row.label}>
                <span className="lead-detail-label">{row.label}</span>
                <span className="lead-detail-value">
                  {row.value && String(row.value).trim()
                    ? row.value
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <style>{`
          .lead-detail-overlay {
            position: fixed;
            inset: 0;
            z-index: 80;
            background: rgba(15, 23, 42, 0.45);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 0;
          }
          @media (min-width: 720px) {
            .lead-detail-overlay {
              align-items: center;
              padding: 1.5rem;
            }
          }
          .lead-detail-panel {
            width: min(520px, 100%);
            max-height: min(88vh, 720px);
            overflow: auto;
            background: #fff;
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.18);
            padding: 1.1rem 1.15rem 1.35rem;
          }
          @media (min-width: 720px) {
            .lead-detail-panel {
              border-radius: 16px;
              box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
            }
          }
          .lead-detail-head {
            display: flex;
            justify-content: space-between;
            gap: 0.75rem;
            align-items: flex-start;
            margin-bottom: 0.85rem;
          }
          .lead-detail-eyebrow {
            margin: 0;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #64748b;
          }
          .lead-detail-title {
            margin: 0.2rem 0 0;
            font-size: 1.2rem;
            color: #0f172a;
            letter-spacing: -0.02em;
          }
          .lead-detail-close {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            width: 2.1rem;
            height: 2.1rem;
            border-radius: 10px;
            font-size: 1.25rem;
            line-height: 1;
            cursor: pointer;
            color: #334155;
          }
          .lead-detail-meta {
            display: grid;
            gap: 0.55rem;
            margin: 0 0 1rem;
            padding: 0.75rem 0.8rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .lead-detail-meta div {
            display: grid;
            grid-template-columns: 6.5rem 1fr;
            gap: 0.4rem;
            font-size: 0.84rem;
          }
          .lead-detail-meta dt {
            margin: 0;
            color: #64748b;
            font-weight: 600;
          }
          .lead-detail-meta dd {
            margin: 0;
            color: #0f172a;
            font-weight: 600;
          }
          .lead-detail-section {
            margin: 0 0 0.55rem;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #64748b;
          }
          .lead-detail-empty {
            margin: 0;
            color: #64748b;
            font-size: 0.9rem;
          }
          .lead-detail-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 0.45rem;
          }
          .lead-detail-list li {
            display: grid;
            gap: 0.15rem;
            padding: 0.65rem 0.7rem;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
          }
          .lead-detail-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #64748b;
          }
          .lead-detail-value {
            font-size: 0.92rem;
            font-weight: 600;
            color: #0f172a;
            word-break: break-word;
          }
        `}</style>
      </div>
    </div>
  );
}
