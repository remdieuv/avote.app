"use client";

import { sortedFormFields } from "@/lib/forms/formTemplates";
import {
  FORM_RGPD_INFO_SHORT,
  formUiTitleForPollKind,
} from "@/lib/forms/formConstants";

/**
 * Rendu dynamique d’un formulaire Lead/Concours (participant + aperçu).
 * Mobile-first ; max 5 champs déjà garanti par la définition (D10).
 *
 * @param {{
 *   definition: import("@/lib/forms/formTemplates").FormDefinition | null | undefined;
 *   answers?: Record<string, unknown>;
 *   onChange?: (fieldId: string, value: unknown) => void;
 *   fieldErrors?: Record<string, string>;
 *   disabled?: boolean;
 *   preview?: boolean;
 *   pollKind?: "LEAD" | "CONTEST_ENTRY" | string | null;
 *   showTitle?: boolean;
 *   showRgpdInfo?: boolean;
 *   submitLabel?: string;
 *   onSubmit?: () => void;
 *   submitting?: boolean;
 *   error?: string | null;
 *   notice?: string | null;
 *   accent?: string;
 *   inputStyle?: React.CSSProperties;
 *   labelStyle?: React.CSSProperties;
 * }} props
 */
export function FormRenderer({
  definition,
  answers = {},
  onChange,
  fieldErrors = {},
  disabled = false,
  preview = false,
  pollKind = "LEAD",
  showTitle = true,
  showRgpdInfo = true,
  submitLabel = "Envoyer",
  onSubmit,
  submitting = false,
  error = null,
  notice = null,
  accent = "#4f46e5",
  textColor = "#0f172a",
  mutedColor = "#64748b",
  inputStyle,
  labelStyle,
}) {
  const fields = sortedFormFields(definition).slice(0, 5);
  const title =
    (definition && definition.title) || formUiTitleForPollKind(pollKind);
  const isContest = String(pollKind || "").toUpperCase() === "CONTEST_ENTRY";

  const baseInput = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.65rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
    fontFamily: "inherit",
    background: preview ? "#f8fafc" : "#fff",
    color: textColor,
    ...inputStyle,
  };

  const baseLabel = {
    display: "block",
    marginBottom: "0.3rem",
    fontSize: "0.82rem",
    fontWeight: 650,
    color: textColor,
    ...labelStyle,
  };

  function setValue(fieldId, value) {
    if (preview || disabled || !onChange) return;
    onChange(fieldId, value);
  }

  return (
    <div className="avote-form-renderer" data-preview={preview ? "1" : "0"}>
      {showTitle ? (
        <p
          style={{
            margin: "0 0 0.65rem",
            fontWeight: 700,
            fontSize: "1rem",
            color: textColor,
          }}
        >
          {title}
        </p>
      ) : null}

      {notice ? (
        <p
          style={{
            margin: "0 0 0.65rem",
            fontSize: "0.82rem",
            color: mutedColor,
            lineHeight: 1.4,
          }}
        >
          {notice}
        </p>
      ) : null}

      {isContest && !preview ? (
        <p
          style={{
            margin: "0 0 0.65rem",
            fontSize: "0.78rem",
            color: mutedColor,
            lineHeight: 1.4,
          }}
        >
          Prénom obligatoire · email ou téléphone requis pour participer au
          tirage.
        </p>
      ) : null}

      <div style={{ display: "grid", gap: "0.7rem" }}>
        {fields.length === 0 && preview ? (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
            Formulaire personnalisé vide — ajoutez des champs.
          </p>
        ) : null}

        {fields.map((field) => {
          const err = fieldErrors[field.id];
          const value = answers[field.id];
          const reqMark = field.required ? " *" : "";
          const id = `avote-field-${field.id}`;

          if (field.type === "long_text") {
            return (
              <div key={field.id}>
                <label htmlFor={id} style={baseLabel}>
                  {field.label}
                  {reqMark}
                </label>
                <textarea
                  id={id}
                  rows={3}
                  value={typeof value === "string" ? value : ""}
                  placeholder={field.placeholder || field.label}
                  disabled={disabled || preview || submitting}
                  readOnly={preview}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  style={{ ...baseInput, resize: "vertical", minHeight: "4.5rem" }}
                  aria-invalid={err ? "true" : undefined}
                />
                {err ? <FieldError text={err} /> : null}
              </div>
            );
          }

          if (field.type === "number") {
            return (
              <div key={field.id}>
                <label htmlFor={id} style={baseLabel}>
                  {field.label}
                  {reqMark}
                </label>
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  value={value === "" || value == null ? "" : String(value)}
                  placeholder={field.placeholder || field.label}
                  disabled={disabled || preview || submitting}
                  readOnly={preview}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  style={baseInput}
                  aria-invalid={err ? "true" : undefined}
                />
                {err ? <FieldError text={err} /> : null}
              </div>
            );
          }

          if (field.type === "single_choice") {
            const opts = Array.isArray(field.options) ? field.options : [];
            return (
              <fieldset
                key={field.id}
                style={{ margin: 0, padding: 0, border: "none" }}
              >
                <legend style={{ ...baseLabel, marginBottom: "0.45rem" }}>
                  {field.label}
                  {reqMark}
                </legend>
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  {opts.map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.95rem",
                        color: textColor,
                      }}
                    >
                      <input
                        type="radio"
                        name={id}
                        value={opt.id}
                        checked={value === opt.id}
                        disabled={disabled || preview || submitting}
                        onChange={() => setValue(field.id, opt.id)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {err ? <FieldError text={err} /> : null}
              </fieldset>
            );
          }

          if (field.type === "multiple_choice") {
            const opts = Array.isArray(field.options) ? field.options : [];
            const selected = Array.isArray(value) ? value : [];
            return (
              <fieldset
                key={field.id}
                style={{ margin: 0, padding: 0, border: "none" }}
              >
                <legend style={{ ...baseLabel, marginBottom: "0.45rem" }}>
                  {field.label}
                  {reqMark}
                </legend>
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  {opts.map((opt) => {
                    const checked = selected.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.95rem",
                          color: textColor,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled || preview || submitting}
                          onChange={() => {
                            if (checked) {
                              setValue(
                                field.id,
                                selected.filter((x) => x !== opt.id),
                              );
                            } else {
                              setValue(field.id, [...selected, opt.id]);
                            }
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                {err ? <FieldError text={err} /> : null}
              </fieldset>
            );
          }

          if (field.type === "consent") {
            return (
              <div key={field.id}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.55rem",
                    fontSize: "0.88rem",
                    lineHeight: 1.4,
                    color: textColor,
                  }}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={value === true}
                    disabled={disabled || preview || submitting}
                    // D7 — jamais précoché : valeur initiale false côté parent
                    onChange={(e) => setValue(field.id, e.target.checked)}
                    style={{ marginTop: "0.2rem" }}
                  />
                  <span>
                    {field.label}
                    {reqMark}
                  </span>
                </label>
                {err ? <FieldError text={err} /> : null}
              </div>
            );
          }

          const inputType =
            field.type === "email"
              ? "email"
              : field.type === "phone"
                ? "tel"
                : "text";

          return (
            <div key={field.id}>
              <label htmlFor={id} style={baseLabel}>
                {field.label}
                {reqMark}
              </label>
              <input
                id={id}
                type={inputType}
                autoComplete={
                  field.slot === "firstName"
                    ? "given-name"
                    : field.slot === "lastName"
                      ? "family-name"
                      : field.type === "email"
                        ? "email"
                        : field.type === "phone"
                          ? "tel"
                          : "on"
                }
                value={typeof value === "string" ? value : value == null ? "" : String(value)}
                placeholder={
                  preview
                    ? `${field.label}${field.required ? "" : " (optionnel)"}`
                    : field.placeholder || ""
                }
                disabled={disabled || preview || submitting}
                readOnly={preview}
                onChange={(e) => setValue(field.id, e.target.value)}
                style={baseInput}
                aria-invalid={err ? "true" : undefined}
              />
              {err ? <FieldError text={err} /> : null}
            </div>
          );
        })}

        {showRgpdInfo ? (
          <p
            style={{
              margin: "0.1rem 0 0",
              fontSize: "0.72rem",
              lineHeight: 1.4,
              color: mutedColor,
            }}
          >
            {FORM_RGPD_INFO_SHORT}
          </p>
        ) : null}

        {!preview && onSubmit ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || submitting}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "0.7rem 0.9rem",
              background: accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "Envoi…" : submitLabel}
          </button>
        ) : null}

        {error ? (
          <p
            role="alert"
            style={{ margin: 0, color: "#b91c1c", fontSize: "0.84rem" }}
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FieldError({ text }) {
  return (
    <p
      role="alert"
      style={{ margin: "0.25rem 0 0", color: "#b91c1c", fontSize: "0.78rem" }}
    >
      {text}
    </p>
  );
}
