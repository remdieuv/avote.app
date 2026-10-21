/**
 * Tests lot L4 — soft lock formDefinition (D4) + display answers.
 * Exécution : npm run test:forms-l4
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

const {
  buildContactDefinition,
  buildContestDefinition,
  collectUsedFormIdsFromAnswers,
  evaluateFormDefinitionSoftLock,
  resolveAnswersForDisplay,
  resolvePollFormDefinition,
  sanitizeClientFormDefinition,
} = require(join(root, "lib/forms/formCapture.js"));

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("collectUsedFormIdsFromAnswers", () => {
  const usage = collectUsedFormIdsFromAnswers([
    { fld_firstName: "Ada", fld_choice: "opt_yes" },
    { fld_firstName: "Bob", fld_choice: "opt_no", fld_multi: ["a", "b"] },
  ]);
  assert.ok(usage.usedFieldIds.includes("fld_firstName"));
  assert.ok(usage.usedFieldIds.includes("fld_choice"));
  assert.ok(usage.usedOptionIdsByField.fld_choice.includes("opt_yes"));
  assert.ok(usage.usedOptionIdsByField.fld_multi.includes("a"));
});

test("soft lock — delete champ utilisé → 409", () => {
  const prev = buildContactDefinition();
  const next = structuredClone(prev);
  next.fields = next.fields.filter((f) => f.id !== "fld_phone");
  const lock = evaluateFormDefinitionSoftLock(prev, next, {
    usedFieldIds: ["fld_phone"],
  });
  assert.equal(lock.ok, false);
  assert.equal(lock.status, 409);
  assert.equal(lock.code, "FORM_SOFT_LOCK_DELETE_FIELD");
});

test("soft lock — delete champ jamais utilisé → OK", () => {
  const prev = buildContactDefinition();
  const next = structuredClone(prev);
  next.fields = next.fields.filter((f) => f.id !== "fld_email");
  const lock = evaluateFormDefinitionSoftLock(prev, next, {
    usedFieldIds: ["fld_firstName", "fld_phone"],
  });
  assert.equal(lock.ok, true);
});

test("soft lock — change type champ utilisé → 409", () => {
  const prev = buildContactDefinition();
  const next = structuredClone(prev);
  const phone = next.fields.find((f) => f.id === "fld_phone");
  phone.type = "short_text";
  const lock = evaluateFormDefinitionSoftLock(prev, next, {
    usedFieldIds: ["fld_phone"],
  });
  assert.equal(lock.ok, false);
  assert.equal(lock.code, "FORM_SOFT_LOCK_CHANGE_TYPE");
});

test("soft lock — rename / reorder / add OK", () => {
  const prev = buildContactDefinition();
  const next = structuredClone(prev);
  next.fields[0].label = "Votre prénom";
  next.fields.push({
    id: "fld_extra",
    type: "short_text",
    label: "Extra",
    required: false,
    order: 9,
    options: [],
    slot: null,
  });
  // reorder
  next.fields = [...next.fields].reverse().map((f, i) => ({ ...f, order: i }));
  const lock = evaluateFormDefinitionSoftLock(prev, next, {
    usedFieldIds: ["fld_firstName"],
  });
  assert.equal(lock.ok, true);
});

test("soft lock — remove option utilisée → 409", () => {
  const prev = {
    version: 1,
    templateKey: "custom",
    title: "T",
    rules: {},
    fields: [
      {
        id: "fld_c",
        type: "single_choice",
        label: "Choix",
        required: true,
        order: 0,
        options: [
          { id: "opt_a", label: "A", order: 0 },
          { id: "opt_b", label: "B", order: 1 },
        ],
        slot: null,
      },
    ],
  };
  const next = structuredClone(prev);
  next.fields[0].options = [{ id: "opt_b", label: "B", order: 0 }];
  const lock = evaluateFormDefinitionSoftLock(prev, next, {
    usedFieldIds: ["fld_c"],
    usedOptionIdsByField: { fld_c: ["opt_a"] },
  });
  assert.equal(lock.ok, false);
  assert.equal(lock.code, "FORM_SOFT_LOCK_REMOVE_OPTION");
});

test("soft lock — change template après réponses → 409", () => {
  const prev = buildContactDefinition();
  const next = buildContestDefinition();
  const lock = evaluateFormDefinitionSoftLock(prev, next, {
    usedFieldIds: ["fld_firstName"],
  });
  assert.equal(lock.ok, false);
  assert.equal(lock.code, "FORM_SOFT_LOCK_TEMPLATE");
});

test("resolveAnswersForDisplay — labels (D9)", () => {
  const def = {
    version: 1,
    templateKey: "custom",
    title: "T",
    rules: {},
    fields: [
      {
        id: "fld_c",
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
    ],
  };
  const rows = resolveAnswersForDisplay(def, { fld_c: "opt_yes" });
  assert.equal(rows[0].value, "Oui");
  assert.equal(rows[0].label, "Préférence");
});

test("contact_legacy fallback poll sans formDefinition", () => {
  const def = resolvePollFormDefinition({
    type: "LEAD",
    leadEnabled: true,
    formDefinition: null,
  });
  assert.equal(def.templateKey, "contact_legacy");
});

test("sanitizeClientFormDefinition + soft lock path dans server.js", () => {
  const src = readFileSync(join(root, "server.js"), "utf8");
  assert.ok(src.includes("evaluateFormDefinitionSoftLock"));
  assert.ok(src.includes("FORM_SOFT_LOCK_DELETE_FIELD") || src.includes("lock.code"));
  assert.ok(src.includes("answersDisplay"));
  assert.ok(src.includes("resolveAnswersForDisplay"));
  // Ne pas toucher Screen / Salle dans le bloc soft lock form
  const patchIdx = src.indexOf('app.patch("/polls/:pollId"');
  const patchSlice = src.slice(patchIdx, patchIdx + 8000);
  assert.ok(patchSlice.includes("formDefinition"));
});

test("sanitize conserve ids stables", () => {
  const raw = buildContactDefinition();
  const sanitized = sanitizeClientFormDefinition(raw, "LEAD");
  assert.equal(sanitized.fields[0].id, "fld_firstName");
});

console.log("\nOK — forms L4 soft lock");
