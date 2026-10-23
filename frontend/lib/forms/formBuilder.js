/**
 * L3 — Helpers builder formulaire (création événement admin).
 * Libs pures, sans React.
 */

import {
  FORM_MAX_FIELDS,
  FORM_TEMPLATE_META,
  formUiTitleForPollKind,
} from "./formConstants.js";
import {
  buildFormDefinitionFromTemplate,
  cloneFormDefinition,
  defaultFormDefinitionForPollKind,
  formDefinitionSupportsContestRules,
  sortedFormFields,
  validateFormDefinition,
} from "./formTemplates.js";

/** Types ajoutables via le builder (consent = L5 toggle optionnel). */
export const FORM_BUILDER_FIELD_TYPES = [
  { type: "short_text", label: "Texte court" },
  { type: "long_text", label: "Texte long" },
  { type: "number", label: "Nombre" },
  { type: "email", label: "Email" },
  { type: "phone", label: "Téléphone" },
  { type: "single_choice", label: "Choix unique" },
  { type: "multiple_choice", label: "Choix multiple" },
];

/** Templates sélectionnables orga (D1) — hors contact_legacy. */
export const FORM_BUILDER_TEMPLATES = FORM_TEMPLATE_META.filter(
  (m) => m.selectable,
);

let _fieldSeq = 0;
export function newFormFieldId() {
  _fieldSeq += 1;
  return `fld_${Date.now().toString(36)}_${_fieldSeq}`;
}

let _optSeq = 0;
function newOptionId() {
  _optSeq += 1;
  return `opt_${Date.now().toString(36)}_${_optSeq}`;
}

/**
 * @param {"LEAD"|"CONTEST_ENTRY"|string} pollKind
 * @param {string} [templateKey]
 */
export function definitionFromTemplateKey(pollKind, templateKey) {
  const kind =
    String(pollKind || "").toUpperCase() === "CONTEST_ENTRY"
      ? "CONTEST_ENTRY"
      : "LEAD";
  const key = String(templateKey || "").trim();
  if (key) {
    const built = buildFormDefinitionFromTemplate(key, { pollKind: kind });
    if (built) return built;
  }
  return defaultFormDefinitionForPollKind(kind);
}

/**
 * Défauts D8 à l’entrée Lead / Concours.
 * @param {"LEAD"|"CONTEST_ENTRY"} pollKind
 */
export function defaultFormStateForPollKind(pollKind) {
  const def = defaultFormDefinitionForPollKind(pollKind);
  return {
    formTemplateKey: def.templateKey,
    formDefinition: def,
  };
}

/**
 * @param {import("./formTemplates.js").FormDefinition | null | undefined} def
 * @param {string} fieldType
 */
export function createBlankFormField(def, fieldType) {
  const order = Array.isArray(def?.fields) ? def.fields.length : 0;
  const type = String(fieldType || "short_text");
  const meta = FORM_BUILDER_FIELD_TYPES.find((t) => t.type === type);
  /** @type {import("./formTemplates.js").FormField} */
  const field = {
    id: newFormFieldId(),
    type: /** @type {any} */ (type),
    label: meta?.label || "Nouveau champ",
    required: false,
    order,
    placeholder: "",
    options: [],
    slot: null,
  };
  if (type === "single_choice" || type === "multiple_choice") {
    field.options = [
      { id: newOptionId(), label: "Option A", order: 0 },
      { id: newOptionId(), label: "Option B", order: 1 },
    ];
  }
  if (type === "email") field.slot = "email";
  if (type === "phone") field.slot = "phone";
  return field;
}

/**
 * @param {import("./formTemplates.js").FormDefinition} def
 * @param {import("./formTemplates.js").FormField} field
 */
export function addFieldToDefinition(def, field) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  if (next.fields.length >= FORM_MAX_FIELDS) return next;
  next.fields = [...sortedFormFields(next), { ...field, order: next.fields.length }];
  next.templateKey = "custom";
  return reindexFields(next);
}

/**
 * @param {import("./formTemplates.js").FormDefinition} def
 * @param {string} fieldId
 */
export function removeFieldFromDefinition(def, fieldId) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  next.fields = sortedFormFields(next).filter((f) => f.id !== fieldId);
  next.templateKey = "custom";
  return reindexFields(next);
}

/**
 * @param {import("./formTemplates.js").FormDefinition} def
 * @param {string} fieldId
 * @param {number} direction -1 | 1
 */
export function moveFieldInDefinition(def, fieldId, direction) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  const fields = sortedFormFields(next);
  const idx = fields.findIndex((f) => f.id === fieldId);
  if (idx < 0) return next;
  const j = idx + direction;
  if (j < 0 || j >= fields.length) return next;
  const swapped = [...fields];
  const tmp = swapped[idx];
  swapped[idx] = swapped[j];
  swapped[j] = tmp;
  // Réassigner order avant reindex pour ne pas annuler le swap au sort.
  next.fields = swapped.map((f, i) => ({ ...f, order: i }));
  next.templateKey = "custom";
  return reindexFields(next);
}

/**
 * @param {import("./formTemplates.js").FormDefinition} def
 * @param {string} fieldId
 * @param {Partial<import("./formTemplates.js").FormField>} patch
 */
export function patchFieldInDefinition(def, fieldId, patch) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  next.fields = sortedFormFields(next).map((f) => {
    if (f.id !== fieldId) return f;
    const merged = { ...f, ...patch, id: f.id };
    if (merged.type === "single_choice" || merged.type === "multiple_choice") {
      if (!Array.isArray(merged.options) || merged.options.length < 2) {
        merged.options = [
          { id: newOptionId(), label: "Option A", order: 0 },
          { id: newOptionId(), label: "Option B", order: 1 },
        ];
      }
    } else {
      merged.options = [];
    }
    // Slot sync basique selon type
    if (merged.type === "email" && !merged.slot) merged.slot = "email";
    if (merged.type === "phone" && !merged.slot) merged.slot = "phone";
    if (merged.type !== "email" && merged.slot === "email") merged.slot = null;
    if (merged.type !== "phone" && merged.slot === "phone") merged.slot = null;
    return merged;
  });
  next.templateKey = "custom";
  return reindexFields(dedupeSlots(next));
}

/**
 * @param {import("./formTemplates.js").FormDefinition} def
 */
function reindexFields(def) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  next.fields = sortedFormFields(next).map((f, i) => ({ ...f, order: i }));
  if (next.rules?.requireEmailOrPhone) {
    next.rules = { requireFirstName: true, requireEmailOrPhone: true };
    next.title = formUiTitleForPollKind("CONTEST_ENTRY");
  } else {
    next.title = next.title || formUiTitleForPollKind("LEAD");
  }
  return next;
}

/**
 * @param {import("./formTemplates.js").FormDefinition} def
 */
function dedupeSlots(def) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  /** @type {Set<string>} */
  const seen = new Set();
  next.fields = sortedFormFields(next).map((f) => {
    if (!f.slot) return f;
    if (seen.has(f.slot)) return { ...f, slot: null };
    seen.add(f.slot);
    return f;
  });
  return next;
}

/**
 * Applique un template et force les règles selon le type de question.
 * @param {string} templateKey
 * @param {"LEAD"|"CONTEST_ENTRY"|string} pollKind
 */
export function applyTemplateToFormState(templateKey, pollKind) {
  const kind =
    String(pollKind || "").toUpperCase() === "CONTEST_ENTRY"
      ? "CONTEST_ENTRY"
      : "LEAD";
  const def = definitionFromTemplateKey(kind, templateKey);
  if (kind === "CONTEST_ENTRY") {
    def.rules = { requireFirstName: true, requireEmailOrPhone: true };
    def.title = formUiTitleForPollKind("CONTEST_ENTRY");
  } else {
    def.rules = {
      requireFirstName: Boolean(def.rules?.requireFirstName),
      requireEmailOrPhone: Boolean(def.rules?.requireEmailOrPhone),
    };
    def.title = formUiTitleForPollKind("LEAD");
  }
  return {
    formTemplateKey: def.templateKey,
    formDefinition: def,
  };
}

/**
 * Validation builder pour une question Lead/Concours.
 * @param {{ type?: string; formDefinition?: unknown; formTemplateKey?: string }} question
 * @returns {{ ok: boolean; error: string | null }}
 */
export function validateQuestionFormBuilder(question) {
  const type = String(question?.type || "").toUpperCase();
  if (type !== "LEAD" && type !== "CONTEST_ENTRY") {
    return { ok: true, error: null };
  }
  const pollKind = type === "CONTEST_ENTRY" ? "CONTEST_ENTRY" : "LEAD";
  const raw =
    question?.formDefinition ||
    definitionFromTemplateKey(pollKind, question?.formTemplateKey);
  const res = validateFormDefinition(raw, {
    pollKind,
    enforceContestRules: pollKind === "CONTEST_ENTRY",
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.errors[0] || "Formulaire invalide.",
    };
  }
  if (
    pollKind === "CONTEST_ENTRY" &&
    !formDefinitionSupportsContestRules(res.definition)
  ) {
    return {
      ok: false,
      error:
        "Concours : le formulaire doit permettre un prénom et un email ou téléphone (D2).",
    };
  }
  if ((res.definition?.fields?.length || 0) > FORM_MAX_FIELDS) {
    return { ok: false, error: `Maximum ${FORM_MAX_FIELDS} champs.` };
  }
  return { ok: true, error: null };
}

export { FORM_MAX_FIELDS };
