"use client";

import { useState } from "react";
import {
  FORM_BUILDER_FIELD_TYPES,
  FORM_BUILDER_TEMPLATES,
  FORM_MAX_FIELDS,
  addFieldToDefinition,
  applyTemplateToFormState,
  createBlankFormField,
  moveFieldInDefinition,
  patchFieldInDefinition,
  removeFieldFromDefinition,
} from "@/lib/forms/formBuilder";
import { formUiTitleForPollKind } from "@/lib/forms/formConstants";
import {
  canEditFormDefinitionField,
  sortedFormFields,
} from "@/lib/forms/formTemplates";

/**
 * Builder formulaire Lead/Concours (création — L3 ; soft lock D4 — L4).
 *
 * @param {{
 *   pollKind: "LEAD" | "CONTEST_ENTRY";
 *   formTemplateKey: string | null;
 *   formDefinition: import("@/lib/forms/formTemplates").FormDefinition | null;
 *   onChange: (next: { formTemplateKey: string; formDefinition: object }) => void;
 *   disabled?: boolean;
 *   error?: string | null;
 *   usedFieldIds?: Iterable<string> | null;
 *   usedOptionIdsByField?: Record<string, Iterable<string>> | null;
 * }} props
 */
export function FormBuilderPanel({
  pollKind,
  formTemplateKey,
  formDefinition,
  onChange,
  disabled = false,
  error = null,
  usedFieldIds = null,
  usedOptionIdsByField = null,
}) {
  const kind =
    String(pollKind || "").toUpperCase() === "CONTEST_ENTRY"
      ? "CONTEST_ENTRY"
      : "LEAD";
  const def =
    formDefinition ||
    applyTemplateToFormState(
      kind === "CONTEST_ENTRY" ? "contest" : "contact",
      kind,
    ).formDefinition;
  const fields = sortedFormFields(def);
  const atMax = fields.length >= FORM_MAX_FIELDS;
  const sectionTitle = formUiTitleForPollKind(kind);
  const [addType, setAddType] = useState("short_text");
  const usedIds = usedFieldIds ? [...usedFieldIds].map(String) : [];
  const softLockActive = usedIds.length > 0;
  const templateLocked = !canEditFormDefinitionField({
    action: "change_template",
    usedFieldIds: usedIds,
  }).allowed;

  function commit(nextDef, templateKey) {
    onChange({
      formTemplateKey: templateKey ?? nextDef.templateKey ?? "custom",
      formDefinition: nextDef,
    });
  }

  function fieldUsed(fieldId) {
    return usedIds.includes(String(fieldId));
  }

  return (
    <div
      className="admin-form-builder"
      data-poll-kind={kind}
      data-soft-lock={softLockActive ? "1" : "0"}
    >
      <div className="admin-form-builder-head">
        <h3 className="admin-form-builder-title">{sectionTitle}</h3>
        <p className="admin-form-builder-help">
          Modèle prêt à l’emploi, puis personnalisez jusqu’à {FORM_MAX_FIELDS}{" "}
          champs. Aperçu synchronisé à droite.
        </p>
        {softLockActive ? (
          <p className="admin-form-builder-hint" data-testid="form-soft-lock-hint">
            Des réponses existent déjà : suppression et changement de type
            interdits sur les champs utilisés (D4).
          </p>
        ) : null}
      </div>

      <label className="admin-label" htmlFor={`form-template-${kind}`}>
        Modèle de formulaire
      </label>
      <select
        id={`form-template-${kind}`}
        value={formTemplateKey || def.templateKey || "custom"}
        disabled={disabled || templateLocked}
        onChange={(ev) => {
          const state = applyTemplateToFormState(ev.target.value, kind);
          onChange(state);
        }}
        style={{
          width: "100%",
          minHeight: "42px",
          padding: "0.45rem 0.6rem",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
          marginBottom: "0.75rem",
        }}
      >
        {FORM_BUILDER_TEMPLATES.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label} — {t.description}
          </option>
        ))}
      </select>

      {kind === "CONTEST_ENTRY" ? (
        <p className="admin-form-builder-hint">
          Concours : prénom obligatoire et au moins un email ou téléphone
          (valide à la soumission).
        </p>
      ) : null}

      <ul className="admin-form-field-list">
        {fields.map((field, idx) => {
          const used = fieldUsed(field.id);
          const canDelete = canEditFormDefinitionField({
            action: "delete_field",
            fieldId: field.id,
            usedFieldIds: usedIds,
          }).allowed;
          const canChangeType = canEditFormDefinitionField({
            action: "change_type",
            fieldId: field.id,
            usedFieldIds: usedIds,
          }).allowed;
          return (
          <li key={field.id} className="admin-form-field-card" data-field-used={used ? "1" : "0"}>
            <div className="admin-form-field-toolbar">
              <span className="admin-form-field-index">
                Champ {idx + 1}
                {used ? " · utilisé" : ""}
              </span>
              <div className="admin-form-field-tools">
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() =>
                    commit(moveFieldInDefinition(def, field.id, -1), "custom")
                  }
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === fields.length - 1}
                  onClick={() =>
                    commit(moveFieldInDefinition(def, field.id, 1), "custom")
                  }
                  title="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={disabled || !canDelete}
                  onClick={() =>
                    commit(removeFieldFromDefinition(def, field.id), "custom")
                  }
                  className="danger"
                  title={
                    canDelete
                      ? "Supprimer"
                      : "Champ déjà utilisé — suppression interdite (D4)"
                  }
                >
                  Supprimer
                </button>
              </div>
            </div>

            <div className="admin-form-field-grid">
              <label>
                Libellé
                <input
                  type="text"
                  value={field.label}
                  disabled={disabled}
                  onChange={(ev) =>
                    commit(
                      patchFieldInDefinition(def, field.id, {
                        label: ev.target.value,
                      }),
                      "custom",
                    )
                  }
                />
              </label>
              <label>
                Type
                <select
                  value={field.type}
                  disabled={disabled || !canChangeType}
                  onChange={(ev) =>
                    commit(
                      patchFieldInDefinition(def, field.id, {
                        type: ev.target.value,
                      }),
                      "custom",
                    )
                  }
                >
                  {FORM_BUILDER_FIELD_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-form-field-required">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  disabled={disabled}
                  onChange={(ev) =>
                    commit(
                      patchFieldInDefinition(def, field.id, {
                        required: ev.target.checked,
                      }),
                      "custom",
                    )
                  }
                />
                Obligatoire
              </label>
            </div>

            {field.type === "single_choice" ||
            field.type === "multiple_choice" ? (
              <div className="admin-form-field-options">
                <p className="admin-label">Options</p>
                {(field.options || []).map((opt, oi) => (
                  <input
                    key={opt.id}
                    type="text"
                    value={opt.label}
                    disabled={disabled}
                    placeholder={`Option ${oi + 1}`}
                    onChange={(ev) => {
                      const options = (field.options || []).map((o) =>
                        o.id === opt.id ? { ...o, label: ev.target.value } : o,
                      );
                      commit(
                        patchFieldInDefinition(def, field.id, { options }),
                        "custom",
                      );
                    }}
                  />
                ))}
              </div>
            ) : null}
          </li>
          );
        })}
      </ul>

      <div className="admin-form-builder-add">
        <label className="admin-label" htmlFor={`add-field-type-${kind}`}>
          Ajouter un champ
        </label>
        <div className="admin-form-builder-add-row">
          <select
            id={`add-field-type-${kind}`}
            disabled={disabled || atMax}
            value={addType}
            onChange={(ev) => setAddType(ev.target.value)}
          >
            {FORM_BUILDER_FIELD_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled || atMax}
            onClick={() => {
              const field = createBlankFormField(def, addType);
              commit(addFieldToDefinition(def, field), "custom");
            }}
          >
            {atMax ? `Max ${FORM_MAX_FIELDS} champs` : "+ Ajouter"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="admin-field-error" role="alert">
          {error}
        </p>
      ) : null}

      <style>{`
        .admin-form-builder {
          margin-top: 0.85rem;
          padding: 0.85rem;
          border-radius: 12px;
          border: 1px solid #c7d2fe;
          background: #f8fafc;
        }
        .admin-form-builder-title {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
          font-weight: 800;
          color: #1e1b4b;
        }
        .admin-form-builder-help,
        .admin-form-builder-hint {
          margin: 0 0 0.65rem;
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.4;
        }
        .admin-form-builder-hint { color: #4338ca; font-weight: 600; }
        .admin-form-field-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.65rem;
        }
        .admin-form-field-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem;
        }
        .admin-form-field-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .admin-form-field-index {
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .admin-form-field-tools { display: flex; gap: 0.3rem; }
        .admin-form-field-tools button {
          border: 1px solid #cbd5e1;
          background: #fff;
          border-radius: 8px;
          padding: 0.25rem 0.45rem;
          font-size: 0.78rem;
          cursor: pointer;
        }
        .admin-form-field-tools button.danger { color: #b91c1c; }
        .admin-form-field-tools button:disabled { opacity: 0.45; cursor: not-allowed; }
        .admin-form-field-grid {
          display: grid;
          gap: 0.45rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .admin-form-field-grid {
            grid-template-columns: 1.4fr 1fr auto;
            align-items: end;
          }
        }
        .admin-form-field-grid label {
          display: grid;
          gap: 0.25rem;
          font-size: 0.78rem;
          font-weight: 650;
          color: #334155;
        }
        .admin-form-field-grid input,
        .admin-form-field-grid select,
        .admin-form-field-options input,
        .admin-form-builder-add-row select {
          width: 100%;
          min-height: 38px;
          padding: 0.4rem 0.55rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font: inherit;
          box-sizing: border-box;
        }
        .admin-form-field-required {
          display: flex !important;
          flex-direction: row !important;
          align-items: center;
          gap: 0.4rem;
          min-height: 38px;
        }
        .admin-form-field-options {
          margin-top: 0.55rem;
          display: grid;
          gap: 0.35rem;
        }
        .admin-form-builder-add { margin-top: 0.75rem; }
        .admin-form-builder-add-row {
          display: flex;
          gap: 0.45rem;
          align-items: center;
        }
        .admin-form-builder-add-row button {
          white-space: nowrap;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          background: #4f46e5;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .admin-form-builder-add-row button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
