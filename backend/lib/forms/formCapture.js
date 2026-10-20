/**
 * L1 — Capture formulaire Lead/Concours (dual-write legacy ↔ answers).
 * CommonJS miroir des contrats L0 (frontend/lib/forms) pour le runtime API.
 * Aucune dépendance Prisma ici — pure validation / projection.
 */

const FORM_DEFINITION_VERSION = 1;
const FORM_MAX_FIELDS = 5;
const FORM_LIMITS = {
  shortTextMax: 120,
  longTextMax: 2000,
  emailMax: 320,
  phoneMinLen: 6,
  phoneMaxLen: 20,
  numberPeopleMin: 1,
  numberPeopleMax: 99,
};

const TITLE_LEAD = "Formulaire de contact";
const TITLE_CONTEST = "Formulaire de participation";

/**
 * @param {object} partial
 */
function field(partial) {
  return {
    id: partial.id,
    type: partial.type,
    label: partial.label,
    required: Boolean(partial.required),
    order: typeof partial.order === "number" ? partial.order : 0,
    placeholder: typeof partial.placeholder === "string" ? partial.placeholder : "",
    options: Array.isArray(partial.options) ? partial.options : [],
    slot: partial.slot ?? null,
  };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Définition backfill / fallback runtime (= formulaire figé historique). */
function buildContactLegacyDefinition() {
  return {
    version: FORM_DEFINITION_VERSION,
    templateKey: "contact_legacy",
    title: TITLE_LEAD,
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
  };
}

function buildContactDefinition() {
  return {
    version: FORM_DEFINITION_VERSION,
    templateKey: "contact",
    title: TITLE_LEAD,
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
  };
}

function buildContestDefinition() {
  return {
    version: FORM_DEFINITION_VERSION,
    templateKey: "contest",
    title: TITLE_CONTEST,
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
  };
}

/**
 * Champs Prisma à poser à la création d’un poll Lead/Concours (D8).
 * @param {"LEAD"|"CONTEST_ENTRY"|string} pollTypeParsed
 * @returns {Record<string, unknown>}
 */
function formCreateDataForPollType(pollTypeParsed) {
  const t = String(pollTypeParsed || "").toUpperCase();
  if (t !== "LEAD" && t !== "CONTEST_ENTRY") return {};
  const def =
    t === "CONTEST_ENTRY"
      ? buildContestDefinition()
      : buildContactDefinition();
  return {
    formTemplateKey: def.templateKey,
    formSchemaVersion: FORM_DEFINITION_VERSION,
    formDefinition: def,
  };
}

/**
 * @param {unknown} poll
 */
function resolvePollFormDefinition(poll) {
  if (poll && poll.formDefinition && typeof poll.formDefinition === "object") {
    return clone(poll.formDefinition);
  }
  const type = String(poll?.type || "").toUpperCase();
  if (type === "CONTEST_ENTRY") {
    // Polls concours existants sans définition → legacy (tél. requis), pas le nouveau contest
    return buildContactLegacyDefinition();
  }
  if (poll?.leadEnabled) {
    return buildContactLegacyDefinition();
  }
  return buildContactLegacyDefinition();
}

function asTrimmedString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function isValidEmailFormat(raw) {
  const s = asTrimmedString(raw);
  if (!s || s.length > FORM_LIMITS.emailMax) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhoneFormat(raw) {
  const s = asTrimmedString(raw);
  if (!s) return false;
  const digitCount = (s.match(/\d/g) || []).length;
  return (
    digitCount >= FORM_LIMITS.phoneMinLen &&
    digitCount <= FORM_LIMITS.phoneMaxLen
  );
}

function sortedFields(def) {
  return [...(def.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * @param {object} field
 * @param {unknown} rawValue
 */
function normalizeField(field, rawValue) {
  const label = field.label || field.id;
  const empty =
    rawValue == null ||
    (typeof rawValue === "string" && rawValue.trim() === "") ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  if (empty) {
    if (field.required) {
      return { ok: false, value: null, error: `« ${label} » est obligatoire.` };
    }
    if (field.type === "multiple_choice") return { ok: true, value: [], error: null };
    if (field.type === "consent") return { ok: true, value: false, error: null };
    return { ok: true, value: null, error: null };
  }

  switch (field.type) {
    case "short_text": {
      const s = asTrimmedString(rawValue).slice(0, FORM_LIMITS.shortTextMax);
      return { ok: true, value: s, error: null };
    }
    case "long_text": {
      const s = asTrimmedString(rawValue).slice(0, FORM_LIMITS.longTextMax);
      return { ok: true, value: s, error: null };
    }
    case "number": {
      const n =
        typeof rawValue === "number"
          ? rawValue
          : Number(asTrimmedString(rawValue).replace(",", "."));
      if (!Number.isFinite(n)) {
        return { ok: false, value: null, error: `« ${label} » doit être un nombre.` };
      }
      if (
        field.id === "fld_peopleCount" ||
        /nombre de personnes/i.test(field.label || "")
      ) {
        const i = Math.floor(n);
        if (
          i !== n ||
          i < FORM_LIMITS.numberPeopleMin ||
          i > FORM_LIMITS.numberPeopleMax
        ) {
          return {
            ok: false,
            value: null,
            error: `« ${label} » : entier invalide.`,
          };
        }
        return { ok: true, value: i, error: null };
      }
      return { ok: true, value: n, error: null };
    }
    case "email": {
      const s = asTrimmedString(rawValue);
      if (!isValidEmailFormat(s)) {
        return { ok: false, value: null, error: `« ${label} » : email invalide.` };
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
        return { ok: false, value: null, error: `« ${label} » : choix invalide.` };
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
          return { ok: false, value: null, error: `« ${label} » : choix invalide.` };
        }
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
      return { ok: false, value: null, error: `Type inconnu : ${field.type}` };
  }
}

function projectSlots(def, answers) {
  const out = {
    firstName: null,
    lastName: null,
    phone: null,
    email: null,
  };
  for (const f of sortedFields(def)) {
    const v = answers[f.id];
    if (v == null || v === "") continue;
    if (f.slot === "firstName" && typeof v === "string") out.firstName = v;
    if (f.slot === "lastName" && typeof v === "string") out.lastName = v;
    if (f.slot === "phone" && typeof v === "string") out.phone = v;
    if (f.slot === "email" && typeof v === "string") out.email = v;
  }
  return out;
}

/**
 * Body legacy → answers selon la définition.
 * @param {Record<string, unknown>} body
 * @param {object} def
 */
function legacyBodyToAnswers(body, def) {
  /** @type {Record<string, unknown>} */
  const answers = {};
  const map = {
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    email: body.email,
  };
  for (const f of sortedFields(def)) {
    if (f.slot && map[f.slot] != null && String(map[f.slot]).trim() !== "") {
      answers[f.id] = map[f.slot];
    }
  }
  return answers;
}

function buildConsents(def, answers, body) {
  const now = new Date().toISOString();
  /** @type {Record<string, unknown>} */
  const proof = {
    neverPrechecked: true,
    infoAcknowledgedAt: now,
  };
  if (body && body.consents && typeof body.consents === "object") {
    // Merge client-provided proof snapshots if present (L2+ UI)
    Object.assign(proof, body.consents);
    proof.neverPrechecked = true;
  }
  for (const f of sortedFields(def)) {
    if (f.type !== "consent") continue;
    if (answers[f.id] !== true) continue;
    proof.marketing = {
      accepted: true,
      fieldId: f.id,
      labelSnapshot: f.label,
      acceptedAt: now,
    };
  }
  return proof;
}

/**
 * Dual-write : accepte body legacy OU answers ; valide ; projette colonnes.
 * @param {Record<string, unknown>} body
 * @param {{ type?: string|null; leadEnabled?: boolean|null; formDefinition?: unknown }} poll
 * @returns {{
 *   ok: boolean;
 *   error: string | null;
 *   answers: Record<string, unknown>;
 *   projected: { firstName: string|null; lastName: string|null; phone: string|null; email: string|null };
 *   consents: Record<string, unknown>;
 *   schemaVersion: number;
 * }}
 */
function resolveLeadSubmitPayload(body, poll) {
  const def = resolvePollFormDefinition(poll);
  const pollType = String(poll?.type || "").toUpperCase();
  const isContest = pollType === "CONTEST_ENTRY";

  /** @type {Record<string, unknown>} */
  let answersInput = {};
  if (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)) {
    answersInput = /** @type {Record<string, unknown>} */ (body.answers);
  } else {
    answersInput = legacyBodyToAnswers(body || {}, def);
  }

  /** @type {string[]} */
  const errors = [];
  /** @type {Record<string, unknown>} */
  const answers = {};

  for (const f of sortedFields(def)) {
    const r = normalizeField(f, answersInput[f.id]);
    if (!r.ok) {
      errors.push(r.error || `Champ ${f.id} invalide.`);
    } else if (r.value != null) {
      answers[f.id] = r.value;
    }
  }

  const projected = projectSlots(def, answers);
  const rules = def.rules || {};
  const requireFirstName = isContest || rules.requireFirstName === true;
  const requireEmailOrPhone = isContest || rules.requireEmailOrPhone === true;

  if (requireFirstName && !asTrimmedString(projected.firstName)) {
    errors.push("Prénom obligatoire.");
  }
  if (requireEmailOrPhone) {
    const emailOk =
      projected.email != null && isValidEmailFormat(String(projected.email));
    const phoneOk =
      projected.phone != null && isValidPhoneFormat(String(projected.phone));
    if (!emailOk && !phoneOk) {
      errors.push("Indiquez un email ou un téléphone valide.");
    }
  }

  // Compat stricte contact_legacy / contact : si phone required dans def et manquant
  // déjà couvert par normalizeField.

  const consents = buildConsents(def, answers, body);

  return {
    ok: errors.length === 0,
    error: errors[0] || null,
    errors,
    answers,
    projected,
    consents,
    schemaVersion: FORM_DEFINITION_VERSION,
  };
}

/**
 * JSON stringifié pour migration SQL (contact_legacy).
 */
function contactLegacyDefinitionJson() {
  return JSON.stringify(buildContactLegacyDefinition());
}

module.exports = {
  FORM_DEFINITION_VERSION,
  FORM_MAX_FIELDS,
  FORM_LIMITS,
  TITLE_LEAD,
  TITLE_CONTEST,
  buildContactLegacyDefinition,
  buildContactDefinition,
  buildContestDefinition,
  formCreateDataForPollType,
  resolvePollFormDefinition,
  resolveLeadSubmitPayload,
  legacyBodyToAnswers,
  projectSlots,
  isValidEmailFormat,
  isValidPhoneFormat,
  contactLegacyDefinitionJson,
};
