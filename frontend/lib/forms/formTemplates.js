/**
 * Presets & validation de formDefinition (L0).
 * Aucune I/O — clonage profond pour édition orga.
 */

import {
  FORM_DEFINITION_VERSION,
  FORM_DEFAULT_TEMPLATE_CONTEST,
  FORM_DEFAULT_TEMPLATE_LEAD,
  FORM_FIELD_SLOTS,
  FORM_FIELD_TYPES,
  FORM_MAX_FIELDS,
  FORM_TEMPLATE_KEYS,
  FORM_UI_TITLE_CONTEST,
  FORM_UI_TITLE_LEAD,
  defaultFormTemplateKeyForPollKind,
  formUiTitleForPollKind,
} from "./formConstants.js";

/**
 * @typedef {import("./formConstants.js").FormTemplateKey} FormTemplateKey
 * @typedef {import("./formConstants.js").FormFieldType} FormFieldType
 * @typedef {import("./formConstants.js").FormFieldSlot} FormFieldSlot
 * @typedef {import("./formConstants.js").FormPollKind} FormPollKind
 */

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   order?: number;
 * }} FormFieldOption
 */

/**
 * @typedef {{
 *   id: string;
 *   type: FormFieldType;
 *   label: string;
 *   required: boolean;
 *   order: number;
 *   placeholder?: string;
 *   options: FormFieldOption[];
 *   slot?: FormFieldSlot | null;
 * }} FormField
 */

/**
 * @typedef {{
 *   requireFirstName?: boolean;
 *   requireEmailOrPhone?: boolean;
 * }} FormDefinitionRules
 */

/**
 * @typedef {{
 *   version: number;
 *   templateKey: FormTemplateKey;
 *   title: string;
 *   fields: FormField[];
 *   rules: FormDefinitionRules;
 * }} FormDefinition
 */

/** @returns {FormFieldOption[]} */
function opts(pairs) {
  return pairs.map(([id, label], order) => ({ id, label, order }));
}

/**
 * @param {Partial<FormField> & { id: string; type: FormFieldType; label: string }} partial
 * @returns {FormField}
 */
function field(partial) {
  return {
    id: partial.id,
    type: partial.type,
    label: partial.label,
    required: Boolean(partial.required),
    order: typeof partial.order === "number" ? partial.order : 0,
    placeholder:
      typeof partial.placeholder === "string" ? partial.placeholder : "",
    options: Array.isArray(partial.options) ? partial.options : [],
    slot: partial.slot ?? null,
  };
}

/** @type {Record<FormTemplateKey, () => FormDefinition>} */
const PRESET_BUILDERS = {
  contact: () => ({
    version: FORM_DEFINITION_VERSION,
    templateKey: "contact",
    title: FORM_UI_TITLE_LEAD,
    rules: { requireFirstName: false, requireEmailOrPhone: false },
    fields: [
      field({
        id: "fld_firstName",
        type: "short_text",
        label: "Prénom",
        required: true,
        order: 0,
        slot: "firstName",
      }),
      field({
        id: "fld_phone",
        type: "phone",
        label: "Téléphone",
        required: true,
        order: 1,
        slot: "phone",
      }),
      field({
        id: "fld_email",
        type: "email",
        label: "Email",
        required: false,
        order: 2,
        slot: "email",
      }),
    ],
  }),

  signup: () => ({
    version: FORM_DEFINITION_VERSION,
    templateKey: "signup",
    title: FORM_UI_TITLE_LEAD,
    rules: { requireFirstName: false, requireEmailOrPhone: false },
    fields: [
      field({
        id: "fld_firstName",
        type: "short_text",
        label: "Prénom",
        required: true,
        order: 0,
        slot: "firstName",
      }),
      field({
        id: "fld_lastName",
        type: "short_text",
        label: "Nom",
        required: true,
        order: 1,
        slot: "lastName",
      }),
      field({
        id: "fld_email",
        type: "email",
        label: "Email",
        required: true,
        order: 2,
        slot: "email",
      }),
      field({
        id: "fld_peopleCount",
        type: "number",
        label: "Nombre de personnes",
        required: true,
        order: 3,
      }),
    ],
  }),

  contest: () => ({
    version: FORM_DEFINITION_VERSION,
    templateKey: "contest",
    title: FORM_UI_TITLE_CONTEST,
    rules: { requireFirstName: true, requireEmailOrPhone: true },
    fields: [
      field({
        id: "fld_firstName",
        type: "short_text",
        label: "Prénom",
        required: true,
        order: 0,
        slot: "firstName",
      }),
      field({
        id: "fld_email",
        type: "email",
        label: "Email",
        required: false,
        order: 1,
        slot: "email",
      }),
      field({
        id: "fld_phone",
        type: "phone",
        label: "Téléphone",
        required: false,
        order: 2,
        slot: "phone",
      }),
    ],
  }),

  civic: () => ({
    version: FORM_DEFINITION_VERSION,
    templateKey: "civic",
    title: FORM_UI_TITLE_LEAD,
    rules: { requireFirstName: false, requireEmailOrPhone: false },
    fields: [
      field({
        id: "fld_neighborhood",
        type: "short_text",
        label: "Quartier",
        required: true,
        order: 0,
      }),
      field({
        id: "fld_email",
        type: "email",
        label: "Email",
        required: false,
        order: 1,
        slot: "email",
      }),
      field({
        id: "fld_comment",
        type: "long_text",
        label: "Commentaire",
        required: false,
        order: 2,
      }),
    ],
  }),

  custom: () => ({
    version: FORM_DEFINITION_VERSION,
    templateKey: "custom",
    title: FORM_UI_TITLE_LEAD,
    rules: { requireFirstName: false, requireEmailOrPhone: false },
    fields: [],
  }),

  /** Miroir formulaire figé actuel — backfill L1 uniquement (non sélectionnable). */
  contact_legacy: () => ({
    version: FORM_DEFINITION_VERSION,
    templateKey: "contact_legacy",
    title: FORM_UI_TITLE_LEAD,
    rules: { requireFirstName: false, requireEmailOrPhone: false },
    fields: [
      field({
        id: "fld_firstName",
        type: "short_text",
        label: "Prénom",
        required: true,
        order: 0,
        slot: "firstName",
      }),
      field({
        id: "fld_lastName",
        type: "short_text",
        label: "Nom",
        required: false,
        order: 1,
        slot: "lastName",
      }),
      field({
        id: "fld_phone",
        type: "phone",
        label: "Téléphone",
        required: true,
        order: 2,
        slot: "phone",
      }),
      field({
        id: "fld_email",
        type: "email",
        label: "Email",
        required: false,
        order: 3,
        slot: "email",
      }),
    ],
  }),
};

/**
 * Clone profond d’un preset (D1).
 * @param {FormTemplateKey | string} templateKey
 * @param {{ pollKind?: FormPollKind | string | null }} [opts]
 * @returns {FormDefinition | null}
 */
export function buildFormDefinitionFromTemplate(templateKey, opts = {}) {
  const key = String(templateKey || "").trim();
  const builder = PRESET_BUILDERS[/** @type {FormTemplateKey} */ (key)];
  if (!builder) return null;
  const def = cloneFormDefinition(builder());
  if (!def) return null;
  if (opts.pollKind != null) {
    def.title = formUiTitleForPollKind(opts.pollKind);
    if (String(opts.pollKind).toUpperCase() === "CONTEST_ENTRY") {
      def.rules = {
        ...def.rules,
        requireFirstName: true,
        requireEmailOrPhone: true,
      };
    }
  }
  return def;
}

/**
 * Définition par défaut à la création (D8).
 * @param {FormPollKind | string | null | undefined} pollKind
 * @returns {FormDefinition}
 */
export function defaultFormDefinitionForPollKind(pollKind) {
  const key = defaultFormTemplateKeyForPollKind(pollKind);
  const def = buildFormDefinitionFromTemplate(key, { pollKind });
  if (!def) {
    return /** @type {FormDefinition} */ (
      buildFormDefinitionFromTemplate(FORM_DEFAULT_TEMPLATE_LEAD, {
        pollKind: "LEAD",
      })
    );
  }
  return def;
}

/**
 * @param {unknown} raw
 * @returns {FormDefinition | null}
 */
export function cloneFormDefinition(raw) {
  if (!raw || typeof raw !== "object") return null;
  try {
    return /** @type {FormDefinition} */ (
      JSON.parse(JSON.stringify(raw))
    );
  } catch {
    return null;
  }
}

/**
 * @param {FormDefinition | null | undefined} def
 * @returns {FormField[]}
 */
export function sortedFormFields(def) {
  if (!def || !Array.isArray(def.fields)) return [];
  return [...def.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * La définition permet-elle la règle concours D2 (structure) ?
 * @param {FormDefinition | null | undefined} def
 */
export function formDefinitionSupportsContestRules(def) {
  if (!def || !Array.isArray(def.fields)) return false;
  const fields = def.fields;
  const hasFirstName =
    fields.some((f) => f.slot === "firstName") ||
    fields.some((f) => f.type === "short_text" && f.required);
  const hasEmailOrPhone = fields.some(
    (f) => f.type === "email" || f.type === "phone" || f.slot === "email" || f.slot === "phone",
  );
  return Boolean(hasFirstName && hasEmailOrPhone);
}

/**
 * Validation orga d’une formDefinition (max 5, ids, slots, types, choix).
 * @param {unknown} raw
 * @param {{ pollKind?: FormPollKind | string | null; enforceContestRules?: boolean }} [opts]
 * @returns {{ ok: boolean; errors: string[]; definition: FormDefinition | null }}
 */
export function validateFormDefinition(raw, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["formDefinition manquante ou invalide."], definition: null };
  }
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const version = Number(obj.version);
  if (!Number.isFinite(version) || version < 1) {
    errors.push("version de formDefinition invalide.");
  }
  const templateKey = String(obj.templateKey || "");
  if (!FORM_TEMPLATE_KEYS.includes(/** @type {FormTemplateKey} */ (templateKey))) {
    errors.push(`templateKey inconnu : ${templateKey || "(vide)"}.`);
  }
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!title) errors.push("title requis.");

  const fieldsRaw = Array.isArray(obj.fields) ? obj.fields : null;
  if (!fieldsRaw) {
    errors.push("fields doit être un tableau.");
    return { ok: false, errors, definition: null };
  }
  if (fieldsRaw.length > FORM_MAX_FIELDS) {
    errors.push(`Maximum ${FORM_MAX_FIELDS} champs (D10).`);
  }

  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Set<string>} */
  const slotsUsed = new Set();
  /** @type {FormField[]} */
  const fields = [];

  for (let i = 0; i < fieldsRaw.length; i++) {
    const f = fieldsRaw[i];
    if (!f || typeof f !== "object") {
      errors.push(`Champ #${i + 1} invalide.`);
      continue;
    }
    const fr = /** @type {Record<string, unknown>} */ (f);
    const id = typeof fr.id === "string" ? fr.id.trim() : "";
    if (!id) {
      errors.push(`Champ #${i + 1} : id requis.`);
      continue;
    }
    if (ids.has(id)) {
      errors.push(`Champ id dupliqué : ${id}.`);
    }
    ids.add(id);

    const type = String(fr.type || "");
    if (!FORM_FIELD_TYPES.includes(/** @type {FormFieldType} */ (type))) {
      errors.push(`Champ ${id} : type invalide (${type}).`);
    }
    const label = typeof fr.label === "string" ? fr.label.trim() : "";
    if (!label) errors.push(`Champ ${id} : label requis.`);

    const required = Boolean(fr.required);
    const order =
      typeof fr.order === "number" && Number.isFinite(fr.order)
        ? Math.floor(fr.order)
        : i;

    /** @type {FormFieldOption[]} */
    let options = [];
    if (type === "single_choice" || type === "multiple_choice") {
      const optsRaw = Array.isArray(fr.options) ? fr.options : [];
      /** @type {Set<string>} */
      const optIds = new Set();
      for (let j = 0; j < optsRaw.length; j++) {
        const o = optsRaw[j];
        if (!o || typeof o !== "object") continue;
        const or = /** @type {Record<string, unknown>} */ (o);
        const oid = typeof or.id === "string" ? or.id.trim() : "";
        const olabel = typeof or.label === "string" ? or.label.trim() : "";
        if (!oid || !olabel) {
          errors.push(`Champ ${id} : option #${j + 1} id/label requis.`);
          continue;
        }
        if (optIds.has(oid)) {
          errors.push(`Champ ${id} : option id dupliqué ${oid}.`);
        }
        optIds.add(oid);
        options.push({ id: oid, label: olabel, order: j });
      }
      if (options.length < 2) {
        errors.push(`Champ ${id} : au moins 2 options pour un choix.`);
      }
    }

    let slot = null;
    if (fr.slot != null && fr.slot !== "") {
      const s = String(fr.slot);
      if (!FORM_FIELD_SLOTS.includes(/** @type {FormFieldSlot} */ (s))) {
        errors.push(`Champ ${id} : slot invalide (${s}).`);
      } else if (slotsUsed.has(s)) {
        errors.push(`Slot déjà utilisé : ${s}.`);
      } else {
        slotsUsed.add(s);
        slot = /** @type {FormFieldSlot} */ (s);
      }
    }

    fields.push({
      id,
      type: /** @type {FormFieldType} */ (type),
      label,
      required,
      order,
      placeholder: typeof fr.placeholder === "string" ? fr.placeholder : "",
      options,
      slot,
    });
  }

  const rulesRaw =
    obj.rules && typeof obj.rules === "object"
      ? /** @type {Record<string, unknown>} */ (obj.rules)
      : {};
  /** @type {FormDefinitionRules} */
  const rules = {
    requireFirstName: Boolean(rulesRaw.requireFirstName),
    requireEmailOrPhone: Boolean(rulesRaw.requireEmailOrPhone),
  };

  const pollKind = opts.pollKind;
  const enforceContest =
    opts.enforceContestRules === true ||
    String(pollKind || "").toUpperCase() === "CONTEST_ENTRY";

  /** @type {FormDefinition} */
  const definition = {
    version: Number.isFinite(version) ? version : FORM_DEFINITION_VERSION,
    templateKey: /** @type {FormTemplateKey} */ (templateKey || "custom"),
    title: title || FORM_UI_TITLE_LEAD,
    fields,
    rules: enforceContest
      ? { requireFirstName: true, requireEmailOrPhone: true }
      : rules,
  };

  if (enforceContest && !formDefinitionSupportsContestRules(definition)) {
    errors.push(
      "Concours : le formulaire doit permettre un prénom et au moins un email ou téléphone (D2).",
    );
  }

  return { ok: errors.length === 0, errors, definition };
}

/**
 * Soft lock D4 — actions sur un champ déjà présent dans des réponses.
 * @param {{
 *   action: "add"|"reorder"|"rename"|"add_option"|"delete_field"|"change_type"|"remove_option"|"change_template";
 *   fieldId?: string | null;
 *   optionId?: string | null;
 *   usedFieldIds?: Iterable<string> | null;
 *   usedOptionIdsByField?: Record<string, Iterable<string>> | null;
 *   currentFieldCount?: number;
 * }} input
 * @returns {{ allowed: boolean; reason: string | null }}
 */
export function canEditFormDefinitionField(input) {
  const used = new Set(
    input.usedFieldIds ? [...input.usedFieldIds].map(String) : [],
  );
  const fieldId = input.fieldId != null ? String(input.fieldId) : "";
  const fieldUsed = fieldId !== "" && used.has(fieldId);
  const action = input.action;

  if (action === "add") {
    const count = Number(input.currentFieldCount ?? 0);
    if (count >= FORM_MAX_FIELDS) {
      return {
        allowed: false,
        reason: `Maximum ${FORM_MAX_FIELDS} champs atteint.`,
      };
    }
    return { allowed: true, reason: null };
  }

  if (
    action === "reorder" ||
    action === "rename" ||
    action === "add_option"
  ) {
    return { allowed: true, reason: null };
  }

  if (action === "change_template") {
    if (used.size > 0) {
      return {
        allowed: false,
        reason: "Changement de modèle interdit après des réponses (D4).",
      };
    }
    return { allowed: true, reason: null };
  }

  if (action === "delete_field") {
    if (fieldUsed) {
      return {
        allowed: false,
        reason: "Suppression interdite : champ déjà utilisé dans des réponses (D4).",
      };
    }
    return { allowed: true, reason: null };
  }

  if (action === "change_type") {
    if (fieldUsed) {
      return {
        allowed: false,
        reason: "Changement de type interdit : champ déjà utilisé (D4).",
      };
    }
    return { allowed: true, reason: null };
  }

  if (action === "remove_option") {
    if (!fieldUsed) return { allowed: true, reason: null };
    const map = input.usedOptionIdsByField || {};
    const usedOpts = new Set(
      map[fieldId] ? [...map[fieldId]].map(String) : [],
    );
    const optionId = input.optionId != null ? String(input.optionId) : "";
    if (optionId && usedOpts.has(optionId)) {
      return {
        allowed: false,
        reason: "Suppression d’option interdite : déjà utilisée (D4).",
      };
    }
    return { allowed: true, reason: null };
  }

  return { allowed: false, reason: `Action inconnue : ${action}.` };
}

export {
  FORM_MAX_FIELDS,
  FORM_DEFINITION_VERSION,
  FORM_DEFAULT_TEMPLATE_LEAD,
  FORM_DEFAULT_TEMPLATE_CONTEST,
  FORM_TEMPLATE_KEYS,
  defaultFormTemplateKeyForPollKind,
  formUiTitleForPollKind,
};

/** Exposé pour tests / doc : ids stables des presets. */
export function listSelectableFormTemplateKeys() {
  return FORM_TEMPLATE_KEYS.filter((k) => k !== "contact_legacy");
}

/** @deprecated internal — sample options helper for tests */
export function __testOnlyChoiceOptions() {
  return opts([
    ["opt_a", "A"],
    ["opt_b", "B"],
  ]);
}
