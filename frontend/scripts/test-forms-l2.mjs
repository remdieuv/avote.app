/**
 * L2 — FormRenderer / résolution participant / validation soumission.
 * Exécution : npm run test:forms-l2
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFormDefinitionFromTemplate,
  defaultFormDefinitionForPollKind,
  emptyAnswersForDefinition,
  parseAnswersDraft,
  resolveParticipantFormDefinition,
  resolvePreviewFormDefinition,
  serializeAnswersDraft,
  validateFormAnswers,
  FORM_UI_TITLE_CONTEST,
  FORM_UI_TITLE_LEAD,
  FORM_MAX_FIELDS,
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

test("resolveParticipantFormDefinition : formDefinition poll prioritaire", () => {
  const contest = defaultFormDefinitionForPollKind("CONTEST_ENTRY");
  const def = resolveParticipantFormDefinition({
    type: "CONTEST_ENTRY",
    leadEnabled: true,
    formDefinition: contest,
  });
  assert.equal(def.templateKey, "contest");
  assert.equal(def.fields.length <= FORM_MAX_FIELDS, true);
});

test("fallback sans définition → contact_legacy", () => {
  const def = resolveParticipantFormDefinition({
    type: "SINGLE_CHOICE",
    leadEnabled: true,
  });
  assert.equal(def.templateKey, "contact_legacy");
  assert.equal(def.fields.some((f) => f.slot === "lastName"), true);
});

test("aperçu création : Lead=contact, Concours=contest (D8)", () => {
  assert.equal(resolvePreviewFormDefinition("LEAD")?.templateKey, "contact");
  assert.equal(
    resolvePreviewFormDefinition("CONTEST_ENTRY")?.templateKey,
    "contest",
  );
  assert.equal(resolvePreviewFormDefinition("QUIZ"), null);
});

test("D2 — Concours email-only validé côté participant", () => {
  const def = defaultFormDefinitionForPollKind("CONTEST_ENTRY");
  const ok = validateFormAnswers(
    def,
    { fld_firstName: "Ada", fld_email: "ada@ex.com" },
    { pollKind: "CONTEST_ENTRY" },
  );
  assert.equal(ok.ok, true);
  const ko = validateFormAnswers(
    def,
    { fld_firstName: "Ada" },
    { pollKind: "CONTEST_ENTRY" },
  );
  assert.equal(ko.ok, false);
});

test("D3/D5 — Lead contact_legacy sans soumission possible (validation seulement si submit)", () => {
  const def = buildFormDefinitionFromTemplate("contact_legacy");
  // Abandon = ne pas appeler validate ; helper empty answers OK
  const empty = emptyAnswersForDefinition(def);
  assert.equal(empty.fld_firstName, "");
  assert.equal(Object.keys(empty).length, 4);
});

test("draft answers v2 round-trip + fallback v1", () => {
  const def = buildFormDefinitionFromTemplate("contact");
  const raw = serializeAnswersDraft({
    fld_firstName: "Sam",
    fld_phone: "0612345678",
  });
  const parsed = parseAnswersDraft(raw, def);
  assert.equal(parsed.fld_firstName, "Sam");
  assert.equal(parsed.fld_phone, "0612345678");

  const v1 = JSON.stringify({
    firstName: "Léa",
    lastName: "",
    phone: "0606060606",
    email: "",
  });
  const fromV1 = parseAnswersDraft(v1, def);
  assert.equal(fromV1.fld_firstName, "Léa");
  assert.equal(fromV1.fld_phone, "0606060606");
});

test("titres D12", () => {
  assert.equal(FORM_UI_TITLE_LEAD, "Formulaire de contact");
  assert.equal(FORM_UI_TITLE_CONTEST, "Formulaire de participation");
  assert.equal(
    defaultFormDefinitionForPollKind("CONTEST_ENTRY").title,
    FORM_UI_TITLE_CONTEST,
  );
});

test("fichiers L2 présents (FormRenderer + PollExperience branché)", () => {
  const renderer = readFileSync(
    join(root, "components/forms/FormRenderer.jsx"),
    "utf8",
  );
  assert.ok(renderer.includes("FormRenderer"));
  assert.ok(renderer.includes("FORM_RGPD_INFO_SHORT"));

  const pollExp = readFileSync(
    join(root, "components/PollExperience.jsx"),
    "utf8",
  );
  assert.ok(pollExp.includes("FormRenderer"));
  assert.ok(pollExp.includes("validateFormAnswers"));
  assert.ok(pollExp.includes("answers: validated.answers"));
  // Plus de champs hardcodés leadFirstName state
  assert.equal(/const \[leadFirstName/.test(pollExp), false);

  const preview = readFileSync(
    join(root, "components/admin/EventLivePreview.jsx"),
    "utf8",
  );
  assert.ok(preview.includes("FormRenderer"));
  assert.ok(preview.includes("resolvePreviewFormDefinition"));
});

test("FormRenderer ne touche pas Screen/Régie", () => {
  const renderer = readFileSync(
    join(root, "components/forms/FormRenderer.jsx"),
    "utf8",
  );
  assert.equal(/screenDisplayState|ScreenResults|régie/i.test(renderer), false);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nOK — forms L2");
