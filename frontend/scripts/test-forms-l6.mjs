/**
 * Tests lot L6 — parité Régie / Créer un événement (FormBuilder).
 * Exécution : npm run test:forms-l6
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { defaultFormStateForPollKind } = await import(
  pathToFileURL(join(root, "lib/forms/formBuilder.js")).href
);
const {
  collectUsedFormIdsFromLeadRows,
  regieFormPollKind,
} = await import(pathToFileURL(join(root, "lib/forms/formUsage.js")).href);
const { buildRegiePollEditPayload } = await import(
  pathToFileURL(join(root, "lib/regiePollEditPayload.js")).href
);

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("regieFormPollKind — LEAD / CONTEST / null", () => {
  assert.equal(regieFormPollKind({ type: "CONTEST_ENTRY" }), "CONTEST_ENTRY");
  assert.equal(
    regieFormPollKind({ type: "SINGLE_CHOICE", leadEnabled: true }),
    "LEAD",
  );
  assert.equal(
    regieFormPollKind({ type: "SINGLE_CHOICE", leadEnabled: false }),
    null,
  );
});

test("collectUsedFormIdsFromLeadRows — soft lock input", () => {
  const usage = collectUsedFormIdsFromLeadRows(
    [
      {
        pollId: "p1",
        answers: { fld_firstName: "Ada", fld_choice: "opt_a" },
      },
      { pollId: "p2", answers: { fld_other: "x" } },
    ],
    "p1",
  );
  assert.ok(usage.usedFieldIds.includes("fld_firstName"));
  assert.ok(usage.usedFieldIds.includes("fld_choice"));
  assert.ok(!usage.usedFieldIds.includes("fld_other"));
  assert.ok(usage.usedOptionIdsByField.fld_choice.includes("opt_a"));
});

test("buildRegiePollEditPayload inclut formDefinition Lead", () => {
  const form = defaultFormStateForPollKind("LEAD");
  const built = buildRegiePollEditPayload({
    poll: {
      id: "p1",
      type: "SINGLE_CHOICE",
      leadEnabled: true,
      voteCount: 0,
      options: [
        { id: "a", label: "Oui", order: 0 },
        { id: "b", label: "Non", order: 1 },
      ],
    },
    isLocked: false,
    isLiveConsumed: false,
    question: "Souhaitez-vous être contacté ?",
    optionLabels: ["Oui", "Non"],
    leadTriggerOrder: 0,
    formDefinition: form.formDefinition,
    formTemplateKey: form.formTemplateKey,
  });
  assert.equal(built.ok, true);
  assert.ok(built.payload?.formDefinition);
  assert.equal(built.payload.formTemplateKey, "contact");
});

test("buildRegiePollEditPayload refuse Concours sans contact (D2)", () => {
  const built = buildRegiePollEditPayload({
    poll: {
      id: "c1",
      type: "CONTEST_ENTRY",
      leadEnabled: true,
      voteCount: 0,
      options: [
        { id: "a", label: "Oui", order: 0 },
        { id: "b", label: "Non", order: 1 },
      ],
    },
    isLocked: false,
    isLiveConsumed: false,
    question: "Participer ?",
    contestPrize: "Lot",
    contestWinnerCount: 1,
    formDefinition: {
      version: 1,
      templateKey: "custom",
      title: "X",
      rules: { requireFirstName: true, requireEmailOrPhone: true },
      fields: [
        {
          id: "fld_a",
          type: "short_text",
          label: "Note",
          required: false,
          order: 0,
          options: [],
          slot: null,
        },
      ],
    },
    formTemplateKey: "custom",
  });
  assert.equal(built.ok, false);
  assert.match(String(built.error), /Concours|D2|prénom|email|téléphone/i);
});

test("UI AjouterQuestionLiveModal + Régie page branchés FormBuilder", () => {
  const add = readFileSync(
    join(root, "components/AjouterQuestionLiveModal.jsx"),
    "utf8",
  );
  const page = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const payload = readFileSync(
    join(root, "lib/regiePollEditPayload.js"),
    "utf8",
  );
  assert.ok(add.includes("FormBuilderPanel"));
  assert.ok(add.includes("formDefinition"));
  assert.ok(add.includes("regie-add-form-builder"));
  assert.ok(page.includes("FormBuilderPanel"));
  assert.ok(page.includes("usedFieldIds"));
  assert.ok(page.includes("regie-edit-form-builder"));
  assert.ok(page.includes("collectUsedFormIdsFromLeadRows"));
  assert.ok(payload.includes("formDefinition"));
  assert.ok(payload.includes("validateQuestionFormBuilder"));
});

test("backend polls/live accepte formDefinition client", () => {
  const src = readFileSync(join(root, "../backend/server.js"), "utf8");
  const idx = src.indexOf('app.post("/events/:eventId/polls/live"');
  assert.ok(idx >= 0);
  const slice = src.slice(idx, idx + 4500);
  assert.ok(slice.includes("formCreateDataForPollType(pollTypeParsed"));
  assert.ok(slice.includes("formDefinition: body.formDefinition"));
});

test("pas de modification Screen / Salle dans helpers L6", () => {
  const usage = readFileSync(join(root, "lib/forms/formUsage.js"), "utf8");
  const payload = readFileSync(
    join(root, "lib/regiePollEditPayload.js"),
    "utf8",
  );
  assert.ok(!/screen-b|JoinLiveHub|emitPollUpdated/i.test(usage + payload));
});

console.log("\nOK — forms L6");
