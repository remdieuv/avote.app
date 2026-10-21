/**
 * L2 — Résolution de la formDefinition côté participant / aperçu.
 */

import {
  buildFormDefinitionFromTemplate,
  cloneFormDefinition,
  defaultFormDefinitionForPollKind,
  sortedFormFields,
} from "./formTemplates.js";

/**
 * @param {{
 *   type?: string | null;
 *   leadEnabled?: boolean | null;
 *   formDefinition?: unknown;
 *   formTemplateKey?: string | null;
 * }} [poll]
 */
export function resolveParticipantFormDefinition(poll = {}) {
  const cloned = cloneFormDefinition(poll?.formDefinition);
  if (cloned && Array.isArray(cloned.fields)) {
    return cloned;
  }

  const type = String(poll?.type || "").toUpperCase();
  const templateKey = String(poll?.formTemplateKey || "").trim();
  if (templateKey) {
    const fromKey = buildFormDefinitionFromTemplate(templateKey, {
      pollKind: type === "CONTEST_ENTRY" ? "CONTEST_ENTRY" : "LEAD",
    });
    if (fromKey) return fromKey;
  }

  // Fallback runtime : miroir formulaire figé (events non migrés / sans définition).
  if (poll?.leadEnabled || type === "CONTEST_ENTRY") {
    if (type === "CONTEST_ENTRY" && !poll?.formDefinition) {
      // Avant backfill L1 : comportement legacy (tél. requis), pas le preset contest D8.
      return buildFormDefinitionFromTemplate("contact_legacy", {
        pollKind: "CONTEST_ENTRY",
      });
    }
    return buildFormDefinitionFromTemplate("contact_legacy", {
      pollKind: type === "CONTEST_ENTRY" ? "CONTEST_ENTRY" : "LEAD",
    });
  }

  return defaultFormDefinitionForPollKind(
    type === "CONTEST_ENTRY" ? "CONTEST_ENTRY" : "LEAD",
  );
}

/**
 * Définition d’aperçu création admin (pas encore de formDefinition persistée — L3).
 * @param {"LEAD"|"CONTEST_ENTRY"|string} questionType
 */
export function resolvePreviewFormDefinition(questionType) {
  const t = String(questionType || "").toUpperCase();
  if (t === "CONTEST_ENTRY") {
    return defaultFormDefinitionForPollKind("CONTEST_ENTRY");
  }
  if (t === "LEAD") {
    return defaultFormDefinitionForPollKind("LEAD");
  }
  return null;
}

/**
 * @param {import("./formTemplates.js").FormDefinition | null | undefined} def
 * @returns {Record<string, unknown>}
 */
export function emptyAnswersForDefinition(def) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const f of sortedFormFields(def)) {
    if (f.type === "multiple_choice") out[f.id] = [];
    else if (f.type === "consent") out[f.id] = false;
    else out[f.id] = "";
  }
  return out;
}

/**
 * Draft sessionStorage v2 (answers) avec fallback v1 legacy.
 * @param {unknown} raw
 * @param {import("./formTemplates.js").FormDefinition | null | undefined} def
 * @returns {Record<string, unknown>}
 */
export function parseAnswersDraft(raw, def) {
  const empty = emptyAnswersForDefinition(def);
  if (raw == null || typeof raw !== "string" || !raw.trim()) return empty;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return empty;
    if (o.v === 2 && o.answers && typeof o.answers === "object") {
      return { ...empty, ...o.answers };
    }
    // v1 : firstName/lastName/phone/email
    const map = {
      firstName: typeof o.firstName === "string" ? o.firstName : "",
      lastName: typeof o.lastName === "string" ? o.lastName : "",
      phone: typeof o.phone === "string" ? o.phone : "",
      email: typeof o.email === "string" ? o.email : "",
    };
    for (const f of sortedFormFields(def)) {
      if (f.slot && map[f.slot] != null) empty[f.id] = map[f.slot];
    }
    return empty;
  } catch {
    return empty;
  }
}

/**
 * @param {Record<string, unknown>} answers
 */
export function serializeAnswersDraft(answers = {}) {
  return JSON.stringify({ v: 2, answers });
}
