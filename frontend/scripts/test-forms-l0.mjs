/**
 * L0 — Contrats formDefinition / réponses / templates / validations (D1–D12).
 * Exécution : node frontend/scripts/test-forms-l0.mjs
 *            npm run test:forms-l0 — depuis frontend/
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORM_MAX_FIELDS,
  FORM_DEFINITION_VERSION,
  FORM_DEFAULT_TEMPLATE_CONTEST,
  FORM_DEFAULT_TEMPLATE_LEAD,
  FORM_RGPD_CONSENT_NEVER_PRECHECKED,
  FORM_RGPD_INFO_TEXT,
  FORM_RGPD_MARKETING_CONSENT_LABEL,
  FORM_TEMPLATE_META,
  FORM_UI_TITLE_CONTEST,
  FORM_UI_TITLE_LEAD,
  answersToCsvColumns,
  buildConsentsProof,
  buildFormDefinitionFromTemplate,
  canEditFormDefinitionField,
  defaultFormDefinitionForPollKind,
  defaultFormTemplateKeyForPollKind,
  formDefinitionSupportsContestRules,
  formUiTitleForPollKind,
  isLeadFormSubmissionOptional,
  isValidEmailFormat,
  isValidPhoneFormat,
  legacyLeadBodyToAnswers,
  listSelectableFormTemplateKeys,
  projectContactSlots,
  resolveAnswersForDisplay,
  validateFormAnswers,
  validateFormDefinition,
} from "../lib/forms/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let failed = 0;

/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

test("D10 — max 5 champs", () => {
  assert.equal(FORM_MAX_FIELDS, 5);
  assert.equal(FORM_DEFINITION_VERSION, 1);
});

test("D12 — libellés UI Lead / Concours", () => {
  assert.equal(FORM_UI_TITLE_LEAD, "Formulaire de contact");
  assert.equal(FORM_UI_TITLE_CONTEST, "Formulaire de participation");
  assert.equal(formUiTitleForPollKind("LEAD"), FORM_UI_TITLE_LEAD);
  assert.equal(formUiTitleForPollKind("CONTEST_ENTRY"), FORM_UI_TITLE_CONTEST);
});

test("D8 — défauts templates", () => {
  assert.equal(FORM_DEFAULT_TEMPLATE_LEAD, "contact");
  assert.equal(FORM_DEFAULT_TEMPLATE_CONTEST, "contest");
  assert.equal(defaultFormTemplateKeyForPollKind("LEAD"), "contact");
  assert.equal(defaultFormTemplateKeyForPollKind("CONTEST_ENTRY"), "contest");
  assert.equal(defaultFormDefinitionForPollKind("LEAD").templateKey, "contact");
  assert.equal(
    defaultFormDefinitionForPollKind("CONTEST_ENTRY").templateKey,
    "contest",
  );
});

test("D1 — 5 modèles sélectionnables + contact_legacy", () => {
  const selectable = listSelectableFormTemplateKeys();
  assert.deepEqual(selectable.sort(), [
    "civic",
    "contact",
    "contest",
    "custom",
    "signup",
  ]);
  assert.ok(FORM_TEMPLATE_META.some((m) => m.key === "contact_legacy" && !m.selectable));
  for (const key of selectable) {
    const def = buildFormDefinitionFromTemplate(key);
    assert.ok(def, key);
    assert.ok(def.fields.length <= FORM_MAX_FIELDS, key);
  }
});

test("D1 — contenu Contact", () => {
  const def = buildFormDefinitionFromTemplate("contact");
  assert.equal(def.fields.length, 3);
  assert.equal(def.fields[0].slot, "firstName");
  assert.equal(def.fields[0].required, true);
  assert.equal(def.fields[1].type, "phone");
  assert.equal(def.fields[1].required, true);
  assert.equal(def.fields[2].type, "email");
  assert.equal(def.fields[2].required, false);
  assert.equal(
    def.fields.some((f) => f.slot === "lastName"),
    false,
  );
});

test("D1 — Inscription", () => {
  const def = buildFormDefinitionFromTemplate("signup");
  assert.equal(def.fields.length, 4);
  assert.ok(def.fields.every((f) => f.required));
  assert.equal(def.fields[3].type, "number");
  assert.equal(def.fields[3].label, "Nombre de personnes");
});

test("D1 — Concours preset + règles D2", () => {
  const def = buildFormDefinitionFromTemplate("contest", {
    pollKind: "CONTEST_ENTRY",
  });
  assert.equal(def.rules.requireFirstName, true);
  assert.equal(def.rules.requireEmailOrPhone, true);
  assert.equal(def.fields[0].required, true);
  assert.equal(def.fields[1].required, false); // email
  assert.equal(def.fields[2].required, false); // phone
  assert.equal(formDefinitionSupportsContestRules(def), true);
});

test("D1 — Consultation citoyenne sans prénom", () => {
  const def = buildFormDefinitionFromTemplate("civic");
  assert.equal(
    def.fields.some((f) => f.slot === "firstName"),
    false,
  );
  assert.equal(def.fields[0].label, "Quartier");
  assert.equal(def.fields[0].required, true);
});

test("D1 — Personnalisé vide", () => {
  const def = buildFormDefinitionFromTemplate("custom");
  assert.deepEqual(def.fields, []);
});

test("contact_legacy miroir formulaire actuel", () => {
  const def = buildFormDefinitionFromTemplate("contact_legacy");
  assert.equal(def.fields.length, 4);
  assert.equal(def.fields.find((f) => f.slot === "lastName")?.required, false);
  assert.equal(def.fields.find((f) => f.slot === "phone")?.required, true);
});

test("validateFormDefinition refuse > 5 champs", () => {
  const def = buildFormDefinitionFromTemplate("custom");
  for (let i = 0; i < 6; i++) {
    def.fields.push({
      id: `fld_${i}`,
      type: "short_text",
      label: `F${i}`,
      required: false,
      order: i,
      options: [],
      slot: null,
    });
  }
  const res = validateFormDefinition(def);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /Maximum 5/i.test(e)));
});

test("validateFormDefinition Concours sans contact → erreur D2", () => {
  const def = {
    version: 1,
    templateKey: "custom",
    title: "Formulaire de participation",
    rules: { requireFirstName: true, requireEmailOrPhone: true },
    fields: [
      {
        id: "fld_a",
        type: "short_text",
        label: "Prénom",
        required: true,
        order: 0,
        options: [],
        slot: "firstName",
      },
    ],
  };
  const res = validateFormDefinition(def, { pollKind: "CONTEST_ENTRY" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /D2/i.test(e)));
});

test("D4 — soft lock suppression / type", () => {
  assert.equal(
    canEditFormDefinitionField({
      action: "delete_field",
      fieldId: "fld_x",
      usedFieldIds: ["fld_x"],
    }).allowed,
    false,
  );
  assert.equal(
    canEditFormDefinitionField({
      action: "delete_field",
      fieldId: "fld_y",
      usedFieldIds: ["fld_x"],
    }).allowed,
    true,
  );
  assert.equal(
    canEditFormDefinitionField({
      action: "change_type",
      fieldId: "fld_x",
      usedFieldIds: ["fld_x"],
    }).allowed,
    false,
  );
  assert.equal(
    canEditFormDefinitionField({
      action: "add",
      currentFieldCount: 5,
    }).allowed,
    false,
  );
  assert.equal(
    canEditFormDefinitionField({
      action: "change_template",
      usedFieldIds: ["fld_x"],
    }).allowed,
    false,
  );
});

test("email / téléphone formats", () => {
  assert.equal(isValidEmailFormat("a@b.co"), true);
  assert.equal(isValidEmailFormat("bad"), false);
  assert.equal(isValidPhoneFormat("0612345678"), true);
  assert.equal(isValidPhoneFormat("12"), false);
});

test("D2 — Concours email seul OK ; sans contact KO", () => {
  const def = defaultFormDefinitionForPollKind("CONTEST_ENTRY");
  const okEmail = validateFormAnswers(
    def,
    { fld_firstName: "Ada", fld_email: "ada@example.com" },
    { pollKind: "CONTEST_ENTRY" },
  );
  assert.equal(okEmail.ok, true);
  assert.equal(okEmail.projected.email, "ada@example.com");
  assert.equal(okEmail.projected.phone, null);

  const okPhone = validateFormAnswers(
    def,
    { fld_firstName: "Ada", fld_phone: "0612345678" },
    { pollKind: "CONTEST_ENTRY" },
  );
  assert.equal(okPhone.ok, true);

  const ko = validateFormAnswers(
    def,
    { fld_firstName: "Ada" },
    { pollKind: "CONTEST_ENTRY" },
  );
  assert.equal(ko.ok, false);
  assert.ok(ko.errors.some((e) => /email ou un téléphone/i.test(e)));
});

test("D5 — Lead civic sans prénom OK", () => {
  const def = buildFormDefinitionFromTemplate("civic", { pollKind: "LEAD" });
  const res = validateFormAnswers(
    def,
    { fld_neighborhood: "Centre" },
    { pollKind: "LEAD" },
  );
  assert.equal(res.ok, true);
  assert.equal(res.projected.firstName, null);
});

test("D3 — Lead soumission facultative (helper)", () => {
  assert.equal(isLeadFormSubmissionOptional({}), true);
});

test("Contact Lead — tél requis", () => {
  const def = defaultFormDefinitionForPollKind("LEAD");
  const ko = validateFormAnswers(
    def,
    { fld_firstName: "Sam" },
    { pollKind: "LEAD" },
  );
  assert.equal(ko.ok, false);
  const ok = validateFormAnswers(
    def,
    { fld_firstName: "Sam", fld_phone: "0611223344" },
    { pollKind: "LEAD" },
  );
  assert.equal(ok.ok, true);
});

test("Inscription — nombre de personnes borné", () => {
  const def = buildFormDefinitionFromTemplate("signup");
  const ko = validateFormAnswers(
    def,
    {
      fld_firstName: "A",
      fld_lastName: "B",
      fld_email: "a@b.co",
      fld_peopleCount: 0,
    },
    { pollKind: "LEAD" },
  );
  assert.equal(ko.ok, false);
  const ok = validateFormAnswers(
    def,
    {
      fld_firstName: "A",
      fld_lastName: "B",
      fld_email: "a@b.co",
      fld_peopleCount: 3,
    },
    { pollKind: "LEAD" },
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.answers.fld_peopleCount, 3);
});

test("D9 — choix par ids → labels affichage / CSV", () => {
  const def = buildFormDefinitionFromTemplate("custom");
  def.fields = [
    {
      id: "fld_choice",
      type: "single_choice",
      label: "Préférence",
      required: true,
      order: 0,
      options: [
        { id: "opt_yes", label: "Oui", order: 0 },
        { id: "opt_no", label: "Non", order: 1 },
      ],
      slot: null,
    },
  ];
  const res = validateFormAnswers(
    def,
    { fld_choice: "opt_yes" },
    { pollKind: "LEAD" },
  );
  assert.equal(res.ok, true);
  const display = resolveAnswersForDisplay(def, res.answers);
  assert.equal(display[0].value, "Oui");
  const csv = answersToCsvColumns(def, res.answers, {
    columnPrefix: "Q1 — ",
  });
  assert.equal(csv["Q1 — Préférence"], "Oui");
});

test("D7 — RGPD copy + preuve consentement jamais précoché", () => {
  assert.equal(FORM_RGPD_CONSENT_NEVER_PRECHECKED, true);
  assert.ok(FORM_RGPD_INFO_TEXT.length > 40);
  assert.ok(FORM_RGPD_MARKETING_CONSENT_LABEL.includes("commercial"));

  const def = buildFormDefinitionFromTemplate("contact");
  def.fields.push({
    id: "fld_marketing",
    type: "consent",
    label: FORM_RGPD_MARKETING_CONSENT_LABEL,
    required: false,
    order: 9,
    options: [],
    slot: null,
  });
  // trim to max 5 for definition validity in real use — here we only test proof helper
  const answers = {
    fld_firstName: "A",
    fld_phone: "0612345678",
    fld_marketing: true,
  };
  const proof = buildConsentsProof(def, answers, {
    now: new Date("2026-10-20T12:00:00.000Z"),
  });
  assert.equal(proof.neverPrechecked, true);
  assert.equal(proof.infoAcknowledgedAt, "2026-10-20T12:00:00.000Z");
  assert.equal(proof.marketing.accepted, true);
  assert.equal(proof.marketing.fieldId, "fld_marketing");
  assert.ok(proof.marketing.labelSnapshot);
});

test("legacy body → answers (dual-write helper)", () => {
  const def = buildFormDefinitionFromTemplate("contact_legacy");
  const answers = legacyLeadBodyToAnswers(
    {
      firstName: "Léa",
      lastName: "Martin",
      phone: "0606060606",
      email: "lea@ex.com",
    },
    def,
  );
  assert.equal(answers.fld_firstName, "Léa");
  assert.equal(answers.fld_lastName, "Martin");
  assert.equal(answers.fld_phone, "0606060606");
  assert.equal(answers.fld_email, "lea@ex.com");
  const projected = projectContactSlots(def, answers);
  assert.equal(projected.firstName, "Léa");
  assert.equal(projected.phone, "0606060606");
});

test("clonage preset isolé (mutation ne pollue pas)", () => {
  const a = buildFormDefinitionFromTemplate("contact");
  const b = buildFormDefinitionFromTemplate("contact");
  a.fields[0].label = "MUTATED";
  assert.equal(b.fields[0].label, "Prénom");
});

test("fichiers L0 présents (pas d’API / Prisma touchés dans ce lot)", () => {
  const formsDir = join(root, "lib/forms");
  for (const f of [
    "formConstants.js",
    "formTemplates.js",
    "formValidation.js",
    "index.js",
  ]) {
    const src = readFileSync(join(formsDir, f), "utf8");
    assert.ok(src.length > 50);
    assert.equal(/\brequire\(["']@prisma/i.test(src), false);
    assert.equal(/\bfrom ["']@prisma/i.test(src), false);
    assert.equal(/\bfetch\s*\(/i.test(src), false);
    assert.equal(/\bapp\.(get|post|put|patch|delete)\s*\(/i.test(src), false);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nOK — forms L0");
