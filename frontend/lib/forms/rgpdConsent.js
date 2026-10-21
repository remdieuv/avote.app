/**
 * L5 — Helpers RGPD / consentement commercial (D7).
 * Libs pures, sans React.
 */

import {
  FORM_CONSENT_PROOF_VERSION,
  FORM_MARKETING_CONSENT_FIELD_ID,
  FORM_MAX_FIELDS,
  FORM_RGPD_CONSENT_NEVER_PRECHECKED,
  FORM_RGPD_INFO_TEXT,
  FORM_RGPD_MARKETING_CONSENT_LABEL,
} from "./formConstants.js";
import {
  cloneFormDefinition,
  sortedFormFields,
} from "./formTemplates.js";

export {
  FORM_CONSENT_PROOF_VERSION,
  FORM_MARKETING_CONSENT_FIELD_ID,
  FORM_RGPD_CONSENT_NEVER_PRECHECKED,
  FORM_RGPD_INFO_TEXT,
  FORM_RGPD_MARKETING_CONSENT_LABEL,
};

/**
 * @param {import("./formTemplates.js").FormDefinition | null | undefined} def
 */
export function hasMarketingConsentField(def) {
  if (!def || !Array.isArray(def.fields)) return false;
  return def.fields.some(
    (f) =>
      f &&
      (f.id === FORM_MARKETING_CONSENT_FIELD_ID ||
        (f.type === "consent" &&
          /commercial|marketing|newsletter/i.test(String(f.label || "")))),
  );
}

/**
 * Active / désactive le consentement commercial (facultatif, jamais required).
 * Compte dans la limite de 5 champs (D10).
 * @param {import("./formTemplates.js").FormDefinition | null | undefined} def
 * @param {boolean} enabled
 */
export function setMarketingConsentEnabled(def, enabled) {
  const next = cloneFormDefinition(def);
  if (!next) return def;
  const without = sortedFormFields(next).filter(
    (f) => f.id !== FORM_MARKETING_CONSENT_FIELD_ID,
  );
  if (!enabled) {
    next.fields = without.map((f, i) => ({ ...f, order: i }));
    return next;
  }
  if (hasMarketingConsentField({ fields: without })) {
    next.fields = without.map((f, i) => ({ ...f, order: i }));
    return next;
  }
  if (without.length >= FORM_MAX_FIELDS) {
    return next; // inchangé — max atteint
  }
  without.push({
    id: FORM_MARKETING_CONSENT_FIELD_ID,
    type: "consent",
    label: FORM_RGPD_MARKETING_CONSENT_LABEL,
    required: false,
    order: without.length,
    placeholder: "",
    options: [],
    slot: null,
  });
  next.fields = without.map((f, i) => ({ ...f, order: i }));
  next.templateKey = next.templateKey || "custom";
  return next;
}

/**
 * Valeurs initiales answers pour champs consent — toujours `false` (D7).
 * @param {import("./formTemplates.js").FormDefinition | null | undefined} def
 * @returns {Record<string, false>}
 */
export function consentDefaultsNeverPrechecked(def) {
  /** @type {Record<string, false>} */
  const out = {};
  if (!def) return out;
  for (const f of sortedFormFields(def)) {
    if (f.type === "consent") out[f.id] = false;
  }
  return out;
}

/**
 * Normalise / valide une preuve consent côté lecture CRM.
 * @param {unknown} raw
 * @returns {{
 *   version: number;
 *   neverPrechecked: boolean;
 *   infoAcknowledgedAt: string | null;
 *   infoTextSnapshot: string | null;
 *   marketing: {
 *     accepted: boolean;
 *     fieldId: string | null;
 *     labelSnapshot: string | null;
 *     acceptedAt: string | null;
 *   } | null;
 * } | null}
 */
export function normalizeConsentsProof(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const marketingRaw =
    o.marketing && typeof o.marketing === "object" && !Array.isArray(o.marketing)
      ? /** @type {Record<string, unknown>} */ (o.marketing)
      : null;
  return {
    version:
      typeof o.version === "number" && Number.isFinite(o.version)
        ? o.version
        : FORM_CONSENT_PROOF_VERSION,
    neverPrechecked: o.neverPrechecked !== false,
    infoAcknowledgedAt:
      typeof o.infoAcknowledgedAt === "string" ? o.infoAcknowledgedAt : null,
    infoTextSnapshot:
      typeof o.infoTextSnapshot === "string" ? o.infoTextSnapshot : null,
    marketing: marketingRaw
      ? {
          accepted: marketingRaw.accepted === true,
          fieldId:
            typeof marketingRaw.fieldId === "string"
              ? marketingRaw.fieldId
              : null,
          labelSnapshot:
            typeof marketingRaw.labelSnapshot === "string"
              ? marketingRaw.labelSnapshot
              : null,
          acceptedAt:
            typeof marketingRaw.acceptedAt === "string"
              ? marketingRaw.acceptedAt
              : null,
        }
      : null,
  };
}

/**
 * Lignes affichables preuve consent (Détail CRM).
 * @param {unknown} consents
 * @returns {{ label: string; value: string }[]}
 */
export function consentsProofDetailRows(consents) {
  const proof = normalizeConsentsProof(consents);
  if (!proof) return [];
  /** @type {{ label: string; value: string }[]} */
  const rows = [];
  if (proof.infoAcknowledgedAt) {
    rows.push({
      label: "Information données personnelles",
      value: `Prise de connaissance · ${formatFrDate(proof.infoAcknowledgedAt)}`,
    });
  }
  if (proof.infoTextSnapshot) {
    rows.push({
      label: "Texte d’information (version)",
      value: proof.infoTextSnapshot,
    });
  }
  if (proof.marketing) {
    rows.push({
      label:
        proof.marketing.labelSnapshot ||
        FORM_RGPD_MARKETING_CONSENT_LABEL,
      value: proof.marketing.accepted
        ? `Accepté · ${formatFrDate(proof.marketing.acceptedAt)}`
        : "Non accepté",
    });
  }
  rows.push({
    label: "Cases précochées",
    value: proof.neverPrechecked ? "Non (conforme D7)" : "Attention",
  });
  return rows;
}

/**
 * @param {string | null} iso
 */
function formatFrDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Garde PII : un payload public (poll / live) ne doit pas contenir answers/consents.
 * @param {unknown} payload
 * @returns {{ ok: boolean; leaks: string[] }}
 */
export function assertNoLeadPiiInPublicPayload(payload) {
  /** @type {string[]} */
  const leaks = [];
  walk(payload, "", (path, key) => {
    const k = String(key).toLowerCase();
    if (
      k === "answers" ||
      k === "consents" ||
      k === "answersdisplay" ||
      k === "phone" ||
      k === "email" ||
      (k === "firstname" && path.includes("lead"))
    ) {
      leaks.push(path ? `${path}.${key}` : String(key));
    }
  });
  return { ok: leaks.length === 0, leaks };
}

/**
 * @param {unknown} node
 * @param {string} path
 * @param {(path: string, key: string) => void} onKey
 */
function walk(node, path, onKey) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`, onKey));
    return;
  }
  for (const [key, val] of Object.entries(node)) {
    onKey(path, key);
    // Ne pas descendre dans formDefinition (schéma sans PII participant)
    if (key === "formDefinition" || key === "options") continue;
    walk(val, path ? `${path}.${key}` : key, onKey);
  }
}
