/**
 * Validation des réponses participant + projection slots + preuves consentement (L0).
 */

import {
  FORM_LIMITS,
  FORM_RGPD_CONSENT_NEVER_PRECHECKED,
  FORM_RGPD_INFO_TEXT,
  FORM_RGPD_MARKETING_CONSENT_LABEL,
} from "./formConstants.js";
import {
  cloneFormDefinition,
  sortedFormFields,
} from "./formTemplates.js";

/**
 * @typedef {import("./formTemplates.js").FormDefinition} FormDefinition
 * @typedef {import("./formTemplates.js").FormField} FormField
 * @typedef {import("./formConstants.js").FormPollKind} FormPollKind
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function asTrimmedString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/**
 * Email basique (RFC-lite).
 * @param {string} raw
 */
export function isValidEmailFormat(raw) {
  const s = asTrimmedString(raw);
  if (!s || s.length > FORM_LIMITS.emailMax) return false;
  // un @, pas d’espaces, domaine avec un point
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * @param {string} raw
 */
export function isValidPhoneFormat(raw) {
  const s = asTrimmedString(raw);
  if (!s) return false;
  const digitsAndPlus = s.replace(/[^\d+]/g, "");
  const digitCount = (s.match(/\d/g) || []).length;
  if (
    digitCount < FORM_LIMITS.phoneMinLen ||
    digitCount > FORM_LIMITS.phoneMaxLen
  ) {
    return false;
  }
  // conserve une forme raisonnable (pas uniquement des lettres)
  return digitsAndPlus.length >= FORM_LIMITS.phoneMinLen;
}

/**
 * @param {FormField} field
 * @param {unknown} rawValue
 * @returns {{ ok: boolean; value: unknown; error: string | null }}
 */
export function normalizeAndValidateFieldValue(field, rawValue) {
  const label = field.label || field.id;
  const empty =
    rawValue == null ||
    (typeof rawValue === "string" && rawValue.trim() === "") ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (empty) {
    if (field.required) {
      return { ok: false, value: null, error: `« ${label} » est obligatoire.` };
    }
    if (field.type === "multiple_choice") {
      return { ok: true, value: [], error: null };
    }
    if (field.type === "consent") {
      return { ok: true, value: false, error: null };
    }
    return { ok: true, value: null, error: null };
  }

  switch (field.type) {
    case "short_text": {
      const s = asTrimmedString(rawValue);
      if (s.length > FORM_LIMITS.shortTextMax) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » : maximum ${FORM_LIMITS.shortTextMax} caractères.`,
        };
      }
      return { ok: true, value: s, error: null };
    }
    case "long_text": {
      const s = asTrimmedString(rawValue);
      if (s.length > FORM_LIMITS.longTextMax) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » : maximum ${FORM_LIMITS.longTextMax} caractères.`,
        };
      }
      return { ok: true, value: s, error: null };
    }
    case "number": {
      const n =
        typeof rawValue === "number"
          ? rawValue
          : Number(asTrimmedString(rawValue).replace(",", "."));
      if (!Number.isFinite(n)) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » doit être un nombre.`,
        };
      }
      // Convention inscription « nombre de personnes »
      if (
        field.id === "fld_peopleCount" ||
        /nombre de personnes/i.test(field.label || "")
      ) {
        const i = Math.floor(n);
        if (i !== n || i < FORM_LIMITS.numberPeopleMin || i > FORM_LIMITS.numberPeopleMax) {
          return {
            ok: false,
            value: null,
            error: `« ${label} » : entier entre ${FORM_LIMITS.numberPeopleMin} et ${FORM_LIMITS.numberPeopleMax}.`,
          };
        }
        return { ok: true, value: i, error: null };
      }
      return { ok: true, value: n, error: null };
    }
    case "email": {
      const s = asTrimmedString(rawValue);
      if (!isValidEmailFormat(s)) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » : email invalide.`,
        };
      }
      return { ok: true, value: s.slice(0, FORM_LIMITS.emailMax), error: null };
    }
    case "phone": {
      const s = asTrimmedString(rawValue);
      if (!isValidPhoneFormat(s)) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » : téléphone invalide.`,
        };
      }
      return { ok: true, value: s, error: null };
    }
    case "single_choice": {
      const id = asTrimmedString(rawValue);
      const allowed = new Set((field.options || []).map((o) => o.id));
      if (!allowed.has(id)) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » : choix invalide.`,
        };
      }
      return { ok: true, value: id, error: null };
    }
    case "multiple_choice": {
      const arr = Array.isArray(rawValue)
        ? rawValue.map((x) => asTrimmedString(x)).filter(Boolean)
        : [asTrimmedString(rawValue)].filter(Boolean);
      const allowed = new Set((field.options || []).map((o) => o.id));
      for (const id of arr) {
        if (!allowed.has(id)) {
          return {
            ok: false,
            value: null,
            error: `« ${label} » : choix invalide.`,
          };
        }
      }
      if (field.required && arr.length < 1) {
        return {
          ok: false,
          value: null,
          error: `« ${label} » est obligatoire.`,
        };
      }
      return { ok: true, value: arr, error: null };
    }
    case "consent": {
      const accepted =
        rawValue === true ||
        rawValue === "true" ||
        rawValue === 1 ||
        rawValue === "1";
      if (field.required && !accepted) {
        return {
          ok: false,
          value: false,
          error: `« ${label} » doit être accepté.`,
        };
      }
      return { ok: true, value: Boolean(accepted), error: null };
    }
    default:
      return {
        ok: false,
        value: null,
        error: `Type de champ inconnu : ${field.type}.`,
      };
  }
}

/**
 * Projette answers normalisées vers colonnes legacy.
 * @param {FormDefinition} def
 * @param {Record<string, unknown>} normalizedAnswers
 * @returns {{
 *   firstName: string | null;
 *   lastName: string | null;
 *   phone: string | null;
 *   email: string | null;
 * }}
 */
export function projectContactSlots(def, normalizedAnswers) {
  /** @type {{ firstName: string | null; lastName: string | null; phone: string | null; email: string | null }} */
  const out = {
    firstName: null,
    lastName: null,
    phone: null,
    email: null,
  };
  const fields = sortedFormFields(def);
  const answers = normalizedAnswers || {};

  for (const f of fields) {
    const v = answers[f.id];
    if (v == null || v === "") continue;
    if (f.slot === "firstName" && typeof v === "string") out.firstName = v;
    if (f.slot === "lastName" && typeof v === "string") out.lastName = v;
    if (f.slot === "phone" && typeof v === "string") out.phone = v;
    if (f.slot === "email" && typeof v === "string") out.email = v;
  }

  // Fallback typé si slot manquant
  if (!out.phone) {
    const phoneField = fields.find((f) => f.type === "phone");
    if (phoneField && typeof answers[phoneField.id] === "string") {
      out.phone = /** @type {string} */ (answers[phoneField.id]);
    }
  }
  if (!out.email) {
    const emailField = fields.find((f) => f.type === "email");
    if (emailField && typeof answers[emailField.id] === "string") {
      out.email = /** @type {string} */ (answers[emailField.id]);
    }
  }
  if (!out.firstName) {
    const named = fields.find((f) => f.slot === "firstName");
    if (named && typeof answers[named.id] === "string") {
      out.firstName = /** @type {string} */ (answers[named.id]);
    }
  }

  return out;
}

/**
 * @param {FormDefinition | null | undefined} def
 * @param {unknown} answersRaw
 * @param {{
 *   pollKind?: FormPollKind | string | null;
 *   now?: Date;
 *   infoAcknowledged?: boolean;
 * }} [opts]
 * @returns {{
 *   ok: boolean;
 *   errors: string[];
 *   fieldErrors: Record<string, string>;
 *   answers: Record<string, unknown>;
 *   projected: {
 *     firstName: string | null;
 *     lastName: string | null;
 *     phone: string | null;
 *     email: string | null;
 *   } | null;
 *   consents: Record<string, unknown> | null;
 * }}
 */
export function validateFormAnswers(def, answersRaw, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Record<string, string>} */
  const fieldErrors = {};
  /** @type {Record<string, unknown>} */
  const answers = {};

  const definition = cloneFormDefinition(def);
  if (!definition) {
    return {
      ok: false,
      errors: ["formDefinition manquante."],
      fieldErrors,
      answers: {},
      projected: null,
      consents: null,
    };
  }

  const raw =
    answersRaw && typeof answersRaw === "object" && !Array.isArray(answersRaw)
      ? /** @type {Record<string, unknown>} */ (answersRaw)
      : {};

  for (const field of sortedFormFields(definition)) {
    const result = normalizeAndValidateFieldValue(field, raw[field.id]);
    if (!result.ok) {
      fieldErrors[field.id] = result.error || "Champ invalide.";
      errors.push(result.error || `Champ ${field.id} invalide.`);
    } else if (result.value != null) {
      answers[field.id] = result.value;
    }
  }

  const projected = projectContactSlots(definition, answers);
  const pollKind = String(opts.pollKind || "").toUpperCase();
  const isContest = pollKind === "CONTEST_ENTRY";
  const rules = definition.rules || {};

  const requireFirstName =
    isContest || rules.requireFirstName === true;
  const requireEmailOrPhone =
    isContest || rules.requireEmailOrPhone === true;

  if (requireFirstName) {
    const fn = asTrimmedString(projected.firstName);
    if (!fn) {
      const msg = "Prénom obligatoire pour le concours (D2 / D5).";
      errors.push(msg);
      const firstField = sortedFormFields(definition).find(
        (f) => f.slot === "firstName",
      );
      if (firstField && !fieldErrors[firstField.id]) {
        fieldErrors[firstField.id] = msg;
      }
    }
  }

  if (requireEmailOrPhone) {
    const emailOk =
      projected.email != null && isValidEmailFormat(String(projected.email));
    const phoneOk =
      projected.phone != null && isValidPhoneFormat(String(projected.phone));
    if (!emailOk && !phoneOk) {
      const msg =
        "Indiquez un email ou un téléphone valide (règle concours D2).";
      errors.push(msg);
    }
  }

  const consents = buildConsentsProof(definition, answers, {
    now: opts.now,
    infoAcknowledged: opts.infoAcknowledged !== false,
  });

  return {
    ok: errors.length === 0,
    errors,
    fieldErrors,
    answers,
    projected: errors.length === 0 ? projected : projected,
    consents,
  };
}

/**
 * Preuve consentement (D7) — jamais de pré-cochage côté constantes.
 * @param {FormDefinition} def
 * @param {Record<string, unknown>} answers
 * @param {{ now?: Date; infoAcknowledged?: boolean }} [opts]
 */
export function buildConsentsProof(def, answers, opts = {}) {
  const now = (opts.now instanceof Date ? opts.now : new Date()).toISOString();
  /** @type {Record<string, unknown>} */
  const proof = {};
  if (opts.infoAcknowledged !== false) {
    proof.infoAcknowledgedAt = now;
    proof.infoTextSnapshot = FORM_RGPD_INFO_TEXT;
  }

  const consentFields = sortedFormFields(def).filter((f) => f.type === "consent");
  for (const f of consentFields) {
    const accepted = answers[f.id] === true;
    if (!accepted) continue;
    const isMarketing =
      f.id.includes("marketing") ||
      /commercial|marketing|newsletter/i.test(f.label || "");
    const entry = {
      accepted: true,
      fieldId: f.id,
      labelSnapshot: f.label || FORM_RGPD_MARKETING_CONSENT_LABEL,
      acceptedAt: now,
    };
    if (isMarketing) {
      proof.marketing = entry;
    } else {
      if (!Array.isArray(proof.other)) proof.other = [];
      /** @type {unknown[]} */ (proof.other).push(entry);
    }
  }

  // Garantie produit documentée
  proof.neverPrechecked = FORM_RGPD_CONSENT_NEVER_PRECHECKED;

  return proof;
}

/**
 * Résout ids de choix → libellés pour Mes leads / CSV (D6 / D9).
 * @param {FormDefinition | null | undefined} def
 * @param {Record<string, unknown> | null | undefined} answers
 * @returns {{ fieldId: string; label: string; value: string; raw: unknown }[]}
 */
export function resolveAnswersForDisplay(def, answers) {
  const definition = cloneFormDefinition(def);
  if (!definition) return [];
  const raw = answers && typeof answers === "object" ? answers : {};
  /** @type {{ fieldId: string; label: string; value: string; raw: unknown }[]} */
  const rows = [];

  for (const field of sortedFormFields(definition)) {
    const v = raw[field.id];
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
      rows.push({
        fieldId: field.id,
        label: field.label,
        value: "",
        raw: v ?? null,
      });
      continue;
    }
    if (field.type === "single_choice") {
      const opt = (field.options || []).find((o) => o.id === v);
      rows.push({
        fieldId: field.id,
        label: field.label,
        value: opt ? opt.label : String(v),
        raw: v,
      });
      continue;
    }
    if (field.type === "multiple_choice" && Array.isArray(v)) {
      const labels = v.map((id) => {
        const opt = (field.options || []).find((o) => o.id === id);
        return opt ? opt.label : String(id);
      });
      rows.push({
        fieldId: field.id,
        label: field.label,
        value: labels.join(", "),
        raw: v,
      });
      continue;
    }
    if (field.type === "consent") {
      rows.push({
        fieldId: field.id,
        label: field.label,
        value: v === true ? "Oui" : "Non",
        raw: v,
      });
      continue;
    }
    rows.push({
      fieldId: field.id,
      label: field.label,
      value: String(v),
      raw: v,
    });
  }
  return rows;
}

/**
 * Colonnes CSV : une par champ (D6). Préfixe optionnel pour collision multi-questions (O4).
 * @param {FormDefinition | null | undefined} def
 * @param {Record<string, unknown> | null | undefined} answers
 * @param {{ columnPrefix?: string }} [opts]
 * @returns {Record<string, string>}
 */
export function answersToCsvColumns(def, answers, opts = {}) {
  const prefix = opts.columnPrefix ? String(opts.columnPrefix) : "";
  /** @type {Record<string, string>} */
  const cols = {};
  for (const row of resolveAnswersForDisplay(def, answers)) {
    const key = prefix ? `${prefix}${row.label}` : row.label;
    cols[key] = row.value;
  }
  return cols;
}

/**
 * Mapping body legacy actuel → answers (contact_legacy / contact).
 * Utile L1 dual-write ; exposé dès L0 pour tests.
 * @param {{
 *   firstName?: unknown;
 *   lastName?: unknown;
 *   phone?: unknown;
 *   email?: unknown;
 * }} body
 * @param {FormDefinition | null | undefined} [def]
 * @returns {Record<string, unknown>}
 */
export function legacyLeadBodyToAnswers(body, def) {
  const definition =
    def ||
    cloneFormDefinition({
      version: 1,
      templateKey: "contact_legacy",
      title: "Formulaire de contact",
      rules: {},
      fields: [],
    });
  /** @type {Record<string, unknown>} */
  const answers = {};
  const fields = sortedFormFields(definition);
  const map = {
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    email: body.email,
  };
  for (const f of fields) {
    if (f.slot && map[f.slot] != null && map[f.slot] !== "") {
      answers[f.id] = map[f.slot];
    }
  }
  // Fallback ids stables si def vide / custom
  if (Object.keys(answers).length === 0) {
    if (body.firstName != null) answers.fld_firstName = body.firstName;
    if (body.lastName != null && body.lastName !== "") {
      answers.fld_lastName = body.lastName;
    }
    if (body.phone != null) answers.fld_phone = body.phone;
    if (body.email != null && body.email !== "") answers.fld_email = body.email;
  }
  return answers;
}

/**
 * Lead : soumission facultative (D3) — helper documentaire pour L2.
 * @param {{ submitted?: boolean; hasVotedTrigger?: boolean }} input
 */
export function isLeadFormSubmissionOptional(input = {}) {
  void input;
  return true;
}
