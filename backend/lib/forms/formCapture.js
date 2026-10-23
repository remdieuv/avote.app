/**
 * L1 — Capture formulaire Lead/Concours (dual-write legacy ↔ answers).
 * CommonJS miroir des contrats L0 (frontend/lib/forms) pour le runtime API.
 * Aucune dépendance Prisma ici — pure validation / projection.
 */

const FORM_DEFINITION_VERSION = 1;
const FORM_MAX_FIELDS = 5;
const FORM_CONSENT_PROOF_VERSION = 1;
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

/** Copy info usage données (aligné frontend FORM_RGPD_INFO_TEXT — D7). */
const FORM_RGPD_INFO_TEXT =
  "Les informations saisies sont destinées à l’organisateur de cet événement pour traiter votre participation ou votre demande. Elles ne sont pas affichées publiquement sur l’écran de diffusion ni dans la salle.";

const FORM_RGPD_MARKETING_CONSENT_LABEL =
  "J’accepte de recevoir des communications commerciales de la part de l’organisateur.";

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
 * @param {unknown} raw
 * @returns {{ ok: boolean; error: string | null; code: string | null }}
 */
function validateClientFormDefinitionLimits(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error: "formDefinition invalide.",
      code: "FORM_DEFINITION_INVALID",
    };
  }
  const fields = /** @type {Record<string, unknown>} */ (raw).fields;
  if (!Array.isArray(fields)) {
    return {
      ok: false,
      error: "formDefinition.fields requis.",
      code: "FORM_DEFINITION_INVALID",
    };
  }
  if (fields.length > FORM_MAX_FIELDS) {
    return {
      ok: false,
      error: `Maximum ${FORM_MAX_FIELDS} champs.`,
      code: "FORM_MAX_FIELDS",
    };
  }
  return { ok: true, error: null, code: null };
}

/**
 * Sanitize légère d’une formDefinition client (L3).
 * @param {unknown} raw
 * @param {"LEAD"|"CONTEST_ENTRY"} kind
 */
function sanitizeClientFormDefinition(raw, kind) {
  if (!raw || typeof raw !== "object") return null;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const fieldsRaw = Array.isArray(obj.fields) ? obj.fields : null;
  if (!fieldsRaw) return null;
  if (fieldsRaw.length > FORM_MAX_FIELDS) return null;
  const fields = [];
  for (let i = 0; i < fieldsRaw.length; i++) {
    const f = fieldsRaw[i];
    if (!f || typeof f !== "object") continue;
    const fr = /** @type {Record<string, unknown>} */ (f);
    const id = typeof fr.id === "string" ? fr.id.trim() : "";
    const type = typeof fr.type === "string" ? fr.type.trim() : "";
    const label = typeof fr.label === "string" ? fr.label.trim() : "";
    if (!id || !type || !label) continue;
    const allowedTypes = new Set([
      "short_text",
      "long_text",
      "number",
      "email",
      "phone",
      "single_choice",
      "multiple_choice",
      "consent",
    ]);
    if (!allowedTypes.has(type)) continue;
    /** @type {object[]} */
    let options = [];
    if (type === "single_choice" || type === "multiple_choice") {
      const opts = Array.isArray(fr.options) ? fr.options : [];
      options = opts
        .filter((o) => o && typeof o === "object")
        .map((o, j) => {
          const or = /** @type {Record<string, unknown>} */ (o);
          return {
            id: typeof or.id === "string" ? or.id : `opt_${j}`,
            label: typeof or.label === "string" ? or.label : `Option ${j + 1}`,
            order: j,
          };
        })
        .slice(0, 20);
    }
    // D7 — consentement commercial : facultatif (jamais forcé required côté serveur).
    const isMarketingConsent =
      type === "consent" &&
      (id.includes("marketing") ||
        /commercial|marketing|newsletter/i.test(label));
    fields.push({
      id: id.slice(0, 80),
      type,
      label: label.slice(0, 120),
      required: isMarketingConsent ? false : Boolean(fr.required),
      order: i,
      placeholder: typeof fr.placeholder === "string" ? fr.placeholder.slice(0, 120) : "",
      options,
      slot:
        typeof fr.slot === "string" &&
        ["firstName", "lastName", "phone", "email"].includes(fr.slot)
          ? fr.slot
          : null,
    });
  }
  const isContest = kind === "CONTEST_ENTRY";
  return {
    version: FORM_DEFINITION_VERSION,
    templateKey:
      typeof obj.templateKey === "string" && obj.templateKey.trim()
        ? obj.templateKey.trim().slice(0, 64)
        : isContest
          ? "contest"
          : "contact",
    title: isContest ? TITLE_CONTEST : TITLE_LEAD,
    rules: {
      requireFirstName: isContest,
      requireEmailOrPhone: isContest,
    },
    fields,
  };
}

/**
 * Champs Prisma à poser à la création d’un poll Lead/Concours (D8).
 * Accepte une formDefinition client (L3) si valide.
 * @param {"LEAD"|"CONTEST_ENTRY"|string} pollTypeParsed
 * @param {{ formDefinition?: unknown; formTemplateKey?: unknown } | null} [client]
 * @returns {Record<string, unknown>}
 */
function formCreateDataForPollType(pollTypeParsed, client = null) {
  const t = String(pollTypeParsed || "").toUpperCase();
  if (t !== "LEAD" && t !== "CONTEST_ENTRY") return {};
  const kind = t === "CONTEST_ENTRY" ? "CONTEST_ENTRY" : "LEAD";
  const defaults =
    kind === "CONTEST_ENTRY"
      ? buildContestDefinition()
      : buildContactDefinition();
  // Si > 5 champs : ignorer le client et poser les défauts (D10).
  // PATCH refuse explicitement via validateClientFormDefinitionLimits (400).
  const limitsOk =
    client?.formDefinition == null ||
    validateClientFormDefinitionLimits(client.formDefinition).ok;
  const sanitized = limitsOk
    ? sanitizeClientFormDefinition(client?.formDefinition, kind)
    : null;
  const def = sanitized || defaults;
  const keyRaw =
    typeof client?.formTemplateKey === "string"
      ? client.formTemplateKey.trim().slice(0, 64)
      : "";
  return {
    formTemplateKey: keyRaw || def.templateKey,
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

/**
 * Preuve consentement (D7 / L5) — reconstruite côté serveur (pas de confiance
 * aveugle au body.consents client pour accepted / neverPrechecked).
 * @param {object} def
 * @param {Record<string, unknown>} answers
 * @param {Record<string, unknown> | null | undefined} [_body]
 */
function buildConsents(def, answers, _body) {
  const now = new Date().toISOString();
  /** @type {Record<string, unknown>} */
  const proof = {
    version: FORM_CONSENT_PROOF_VERSION,
    neverPrechecked: true,
    infoAcknowledgedAt: now,
    infoTextSnapshot: FORM_RGPD_INFO_TEXT,
  };
  for (const f of sortedFields(def)) {
    if (f.type !== "consent") continue;
    const accepted = answers[f.id] === true;
    if (!accepted) continue;
    const isMarketing =
      String(f.id || "").includes("marketing") ||
      /commercial|marketing|newsletter/i.test(String(f.label || ""));
    const entry = {
      accepted: true,
      fieldId: f.id,
      labelSnapshot: f.label || FORM_RGPD_MARKETING_CONSENT_LABEL,
      acceptedAt: now,
      choice: true,
    };
    if (isMarketing) {
      proof.marketing = entry;
    } else {
      if (!Array.isArray(proof.other)) proof.other = [];
      proof.other.push(entry);
    }
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

  // L5 — préférer answers JSON ; body legacy conservé pour compat (retrait progressif).
  const hasAnswersJson =
    body &&
    body.answers &&
    typeof body.answers === "object" &&
    !Array.isArray(body.answers);
  /** @type {Record<string, unknown>} */
  let answersInput = {};
  let legacyBodyUsed = false;
  if (hasAnswersJson) {
    answersInput = /** @type {Record<string, unknown>} */ (body.answers);
  } else {
    answersInput = legacyBodyToAnswers(body || {}, def);
    legacyBodyUsed = true;
  }

  if ((def.fields || []).length > FORM_MAX_FIELDS) {
    return {
      ok: false,
      error: `Maximum ${FORM_MAX_FIELDS} champs.`,
      errors: [`Maximum ${FORM_MAX_FIELDS} champs.`],
      answers: {},
      projected: { firstName: null, lastName: null, phone: null, email: null },
      consents: null,
      schemaVersion: FORM_DEFINITION_VERSION,
      legacyBodyUsed,
    };
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
    legacyBodyUsed,
  };
}

/**
 * Garde PII — un payload poll/live public ne doit pas exposer answers/consents.
 * @param {unknown} payload
 * @returns {{ ok: boolean; leaks: string[] }}
 */
function assertNoLeadPiiInPublicPayload(payload) {
  /** @type {string[]} */
  const leaks = [];
  /** @param {unknown} node @param {string} path */
  function walk(node, path) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const [key, val] of Object.entries(node)) {
      const k = String(key).toLowerCase();
      if (
        k === "answers" ||
        k === "consents" ||
        k === "answersdisplay"
      ) {
        leaks.push(path ? `${path}.${key}` : key);
      }
      if (key === "formDefinition" || key === "options") continue;
      walk(val, path ? `${path}.${key}` : key);
    }
  }
  walk(payload, "");
  return { ok: leaks.length === 0, leaks };
}

/**
 * JSON stringifié pour migration SQL (contact_legacy).
 */
function contactLegacyDefinitionJson() {
  return JSON.stringify(buildContactLegacyDefinition());
}

/**
 * L4 — Collecte des ids de champs / options déjà présents dans des answers.
 * @param {Iterable<unknown>} answersList
 * @returns {{
 *   usedFieldIds: string[];
 *   usedOptionIdsByField: Record<string, string[]>;
 * }}
 */
function collectUsedFormIdsFromAnswers(answersList) {
  /** @type {Set<string>} */
  const usedFieldIds = new Set();
  /** @type {Record<string, Set<string>>} */
  const optSets = {};
  for (const answers of answersList || []) {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) continue;
    for (const [fid, val] of Object.entries(answers)) {
      if (!fid) continue;
      usedFieldIds.add(String(fid));
      if (typeof val === "string" && val) {
        if (!optSets[fid]) optSets[fid] = new Set();
        optSets[fid].add(val);
      } else if (Array.isArray(val)) {
        if (!optSets[fid]) optSets[fid] = new Set();
        for (const id of val) {
          if (id != null && id !== "") optSets[fid].add(String(id));
        }
      }
    }
  }
  /** @type {Record<string, string[]>} */
  const usedOptionIdsByField = {};
  for (const [fid, set] of Object.entries(optSets)) {
    usedOptionIdsByField[fid] = [...set];
  }
  return {
    usedFieldIds: [...usedFieldIds],
    usedOptionIdsByField,
  };
}

/**
 * Résout ids de choix → libellés (D6 / D9) — miroir frontend.
 * @param {object | null | undefined} def
 * @param {Record<string, unknown> | null | undefined} answers
 * @returns {{ fieldId: string; label: string; value: string; raw: unknown }[]}
 */
function resolveAnswersForDisplay(def, answers) {
  if (!def || typeof def !== "object") return [];
  const raw = answers && typeof answers === "object" ? answers : {};
  /** @type {{ fieldId: string; label: string; value: string; raw: unknown }[]} */
  const rows = [];
  for (const field of sortedFields(def)) {
    const v = raw[field.id];
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
      rows.push({
        fieldId: field.id,
        label: field.label || field.id,
        value: "",
        raw: v ?? null,
      });
      continue;
    }
    if (field.type === "single_choice") {
      const opt = (field.options || []).find((o) => o.id === v);
      rows.push({
        fieldId: field.id,
        label: field.label || field.id,
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
        label: field.label || field.id,
        value: labels.join(", "),
        raw: v,
      });
      continue;
    }
    if (field.type === "consent") {
      rows.push({
        fieldId: field.id,
        label: field.label || field.id,
        value: v === true ? "Oui" : "Non",
        raw: v,
      });
      continue;
    }
    rows.push({
      fieldId: field.id,
      label: field.label || field.id,
      value: String(v),
      raw: v,
    });
  }
  return rows;
}

/**
 * Soft lock D4 — compare définitions avant/après + usage answers.
 * @param {object | null | undefined} prevDef
 * @param {object | null | undefined} nextDef
 * @param {{
 *   usedFieldIds?: Iterable<string>;
 *   usedOptionIdsByField?: Record<string, Iterable<string>>;
 * }} [usage]
 * @returns {{ ok: boolean; status: number; error: string | null; code: string | null }}
 */
function evaluateFormDefinitionSoftLock(prevDef, nextDef, usage = {}) {
  const usedFieldIds = new Set(
    usage.usedFieldIds ? [...usage.usedFieldIds].map(String) : [],
  );
  /** @type {Record<string, Set<string>>} */
  const usedOpts = {};
  const map = usage.usedOptionIdsByField || {};
  for (const [fid, ids] of Object.entries(map)) {
    usedOpts[fid] = new Set([...(ids || [])].map(String));
  }

  if (!nextDef || typeof nextDef !== "object") {
    return {
      ok: false,
      status: 400,
      error: "formDefinition invalide.",
      code: "FORM_DEFINITION_INVALID",
    };
  }

  const nextFields = Array.isArray(nextDef.fields) ? nextDef.fields : [];
  if (nextFields.length > FORM_MAX_FIELDS) {
    return {
      ok: false,
      status: 400,
      error: `Maximum ${FORM_MAX_FIELDS} champs.`,
      code: "FORM_MAX_FIELDS",
    };
  }

  const prev = prevDef && typeof prevDef === "object" ? prevDef : null;
  const prevFields = prev && Array.isArray(prev.fields) ? prev.fields : [];
  const prevById = new Map(prevFields.map((f) => [String(f.id), f]));
  const nextById = new Map(
    nextFields.filter((f) => f && f.id).map((f) => [String(f.id), f]),
  );

  const prevTemplate = prev ? String(prev.templateKey || "") : "";
  const nextTemplate = String(nextDef.templateKey || "");
  if (
    usedFieldIds.size > 0 &&
    prevTemplate &&
    nextTemplate &&
    prevTemplate !== nextTemplate
  ) {
    // Reset template = perte des champs utilisés
    const removedUsed = [...usedFieldIds].some((id) => !nextById.has(id));
    if (removedUsed || prevTemplate !== nextTemplate) {
      return {
        ok: false,
        status: 409,
        error:
          "Changement de modèle interdit après des réponses (D4).",
        code: "FORM_SOFT_LOCK_TEMPLATE",
      };
    }
  }

  for (const fieldId of usedFieldIds) {
    if (!prevById.has(fieldId)) continue;
    if (!nextById.has(fieldId)) {
      return {
        ok: false,
        status: 409,
        error:
          "Suppression interdite : champ déjà utilisé dans des réponses (D4).",
        code: "FORM_SOFT_LOCK_DELETE_FIELD",
      };
    }
    const before = prevById.get(fieldId);
    const after = nextById.get(fieldId);
    if (String(before.type) !== String(after.type)) {
      return {
        ok: false,
        status: 409,
        error: "Changement de type interdit : champ déjà utilisé (D4).",
        code: "FORM_SOFT_LOCK_CHANGE_TYPE",
      };
    }
    const beforeOptIds = new Set(
      (before.options || []).map((o) => String(o.id)),
    );
    const afterOptIds = new Set((after.options || []).map((o) => String(o.id)));
    const usedForField = usedOpts[fieldId] || new Set();
    for (const optId of usedForField) {
      if (beforeOptIds.has(optId) && !afterOptIds.has(optId)) {
        return {
          ok: false,
          status: 409,
          error: "Suppression d’option interdite : déjà utilisée (D4).",
          code: "FORM_SOFT_LOCK_REMOVE_OPTION",
        };
      }
    }
  }

  return { ok: true, status: 200, error: null, code: null };
}

/**
 * Valide une définition Concours (présence prénom + email/tél).
 * @param {object} def
 * @param {"LEAD"|"CONTEST_ENTRY"|string} pollType
 */
function definitionAllowsContestRules(def, pollType) {
  if (String(pollType || "").toUpperCase() !== "CONTEST_ENTRY") return true;
  const fields = sortedFields(def);
  const hasFirst =
    fields.some((f) => f.slot === "firstName") ||
    fields.some((f) => /pr[eé]nom/i.test(f.label || ""));
  const hasContact = fields.some(
    (f) => f.type === "email" || f.type === "phone" || f.slot === "email" || f.slot === "phone",
  );
  return hasFirst && hasContact;
}

module.exports = {
  FORM_DEFINITION_VERSION,
  FORM_MAX_FIELDS,
  FORM_CONSENT_PROOF_VERSION,
  FORM_LIMITS,
  FORM_RGPD_INFO_TEXT,
  TITLE_LEAD,
  TITLE_CONTEST,
  buildContactLegacyDefinition,
  buildContactDefinition,
  buildContestDefinition,
  formCreateDataForPollType,
  sanitizeClientFormDefinition,
  validateClientFormDefinitionLimits,
  resolvePollFormDefinition,
  resolveLeadSubmitPayload,
  legacyBodyToAnswers,
  projectSlots,
  isValidEmailFormat,
  isValidPhoneFormat,
  contactLegacyDefinitionJson,
  collectUsedFormIdsFromAnswers,
  resolveAnswersForDisplay,
  evaluateFormDefinitionSoftLock,
  definitionAllowsContestRules,
  buildConsents,
  assertNoLeadPiiInPublicPayload,
};
