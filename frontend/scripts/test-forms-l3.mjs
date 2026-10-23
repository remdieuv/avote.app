/**
 * L3 — Builder formulaire création événement.
 * Exécution : npm run test:forms-l3
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FORM_MAX_FIELDS,
  addFieldToDefinition,
  applyTemplateToFormState,
  createBlankFormField,
  defaultFormStateForPollKind,
  moveFieldInDefinition,
  removeFieldFromDefinition,
  validateQuestionFormBuilder,
} from "../lib/forms/index.js";
import {
  applyQuestionType,
  createBlankQuestion,
  validateCreateEventForm,
} from "../lib/createEventForm.js";

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

test("D8 — applyQuestionType Lead → contact, Concours → contest", () => {
  const lead = applyQuestionType(createBlankQuestion("q1"), "LEAD");
  assert.equal(lead.formTemplateKey, "contact");
  assert.equal(lead.formDefinition?.templateKey, "contact");
  assert.equal(lead.formDefinition?.fields?.length, 3);

  const contest = applyQuestionType(createBlankQuestion("q2"), "CONTEST_ENTRY");
  assert.equal(contest.formTemplateKey, "contest");
  assert.equal(contest.formDefinition?.rules?.requireEmailOrPhone, true);
});

test("templates sélectionnables appliqués", () => {
  const civic = applyTemplateToFormState("civic", "LEAD");
  assert.equal(civic.formTemplateKey, "civic");
  assert.equal(
    civic.formDefinition.fields.some((f) => f.label === "Quartier"),
    true,
  );
  const custom = applyTemplateToFormState("custom", "LEAD");
  assert.equal(custom.formDefinition.fields.length, 0);
});

test("max 5 champs — add bloqué au-delà", () => {
  let def = defaultFormStateForPollKind("LEAD").formDefinition;
  // contact a 3 champs
  def = addFieldToDefinition(def, createBlankFormField(def, "short_text"));
  def = addFieldToDefinition(def, createBlankFormField(def, "short_text"));
  assert.equal(def.fields.length, 5);
  const blocked = addFieldToDefinition(
    def,
    createBlankFormField(def, "short_text"),
  );
  assert.equal(blocked.fields.length, FORM_MAX_FIELDS);
});

test("remove / reorder champs", () => {
  let def = defaultFormStateForPollKind("LEAD").formDefinition;
  const firstId = def.fields[0].id;
  def = removeFieldFromDefinition(def, firstId);
  assert.equal(def.fields.length, 2);
  assert.equal(
    def.fields.some((f) => f.id === firstId),
    false,
  );
  const before = def.fields.map((f) => f.id);
  const id0 = before[0];
  def = moveFieldInDefinition(def, id0, 1);
  const after = def.fields.map((f) => f.id);
  assert.deepEqual(after, [before[1], before[0]]);
});

test("validateQuestionFormBuilder Concours sans contact → KO", () => {
  const bad = {
    type: "CONTEST_ENTRY",
    formTemplateKey: "custom",
    formDefinition: {
      version: 1,
      templateKey: "custom",
      title: "Formulaire de participation",
      rules: { requireFirstName: true, requireEmailOrPhone: true },
      fields: [
        {
          id: "fld_x",
          type: "short_text",
          label: "Prénom",
          required: true,
          order: 0,
          options: [],
          slot: "firstName",
        },
      ],
    },
  };
  const res = validateQuestionFormBuilder(bad);
  assert.equal(res.ok, false);
});

test("validateCreateEventForm inclut erreur formulaire", () => {
  const q = applyQuestionType(createBlankQuestion("q1"), "CONTEST_ENTRY");
  q.question = "Participer ?";
  q.contestPrize = "Lot";
  q.formDefinition = {
    version: 1,
    templateKey: "custom",
    title: "Formulaire de participation",
    rules: { requireFirstName: true, requireEmailOrPhone: true },
    fields: [
      {
        id: "fld_only",
        type: "short_text",
        label: "Prénom",
        required: true,
        order: 0,
        options: [],
        slot: "firstName",
      },
    ],
  };
  const res = validateCreateEventForm({
    eventTitle: "Test",
    questions: [q],
  });
  assert.equal(res.ok, false);
  assert.ok(res.fieldErrors.questions.q1?.formDefinition);
});

test("UI builder + payload formDefinition dans page admin", () => {
  const page = readFileSync(join(root, "app/admin/page.js"), "utf8");
  assert.ok(page.includes("FormBuilderPanel"));
  assert.ok(page.includes("formDefinition: x.formDefinition"));
  const panel = readFileSync(
    join(root, "components/admin/FormBuilderPanel.jsx"),
    "utf8",
  );
  assert.ok(panel.includes("FORM_BUILDER_TEMPLATES"));
  assert.ok(panel.includes("Max"));
});

test("pas de Screen/Régie dans FormBuilderPanel", () => {
  const panel = readFileSync(
    join(root, "components/admin/FormBuilderPanel.jsx"),
    "utf8",
  );
  assert.equal(/screenDisplayState|ScreenResults/i.test(panel), false);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nOK — forms L3");
