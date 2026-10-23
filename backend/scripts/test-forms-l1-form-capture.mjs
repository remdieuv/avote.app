/**
 * L1 — Dual-write / presets / compat Lead-Concours (sans DB).
 * Exécution : node backend/scripts/test-forms-l1-form-capture.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const forms = require("../lib/forms/formCapture.js");
const {
  buildContactLegacyDefinition,
  buildContactDefinition,
  buildContestDefinition,
  formCreateDataForPollType,
  resolveLeadSubmitPayload,
  resolvePollFormDefinition,
  contactLegacyDefinitionJson,
} = forms;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
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

test("presets D8 : Lead=contact, Concours=contest", () => {
  const lead = formCreateDataForPollType("LEAD");
  assert.equal(lead.formTemplateKey, "contact");
  assert.equal(lead.formDefinition.templateKey, "contact");
  const contest = formCreateDataForPollType("CONTEST_ENTRY");
  assert.equal(contest.formTemplateKey, "contest");
  assert.equal(contest.formDefinition.rules.requireEmailOrPhone, true);
  assert.deepEqual(formCreateDataForPollType("QUIZ"), {});
});

test("fallback sans formDefinition → contact_legacy", () => {
  const def = resolvePollFormDefinition({
    leadEnabled: true,
    type: "SINGLE_CHOICE",
  });
  assert.equal(def.templateKey, "contact_legacy");
  assert.equal(def.fields.length, 4);
});

test("legacy body dual-write (prénom+tél) OK sur contact_legacy", () => {
  const poll = {
    leadEnabled: true,
    type: "SINGLE_CHOICE",
    formDefinition: buildContactLegacyDefinition(),
  };
  const r = resolveLeadSubmitPayload(
    {
      voterSessionId: "v1",
      firstName: "Sam",
      phone: "0612345678",
      email: "sam@ex.com",
    },
    poll,
  );
  assert.equal(r.ok, true);
  assert.equal(r.projected.firstName, "Sam");
  assert.equal(r.projected.phone, "0612345678");
  assert.equal(r.answers.fld_firstName, "Sam");
  assert.equal(r.answers.fld_phone, "0612345678");
  assert.ok(r.consents.neverPrechecked);
});

test("legacy body sans tél → KO (contact_legacy)", () => {
  const r = resolveLeadSubmitPayload(
    { firstName: "Sam" },
    {
      leadEnabled: true,
      type: "SINGLE_CHOICE",
      formDefinition: buildContactLegacyDefinition(),
    },
  );
  assert.equal(r.ok, false);
});

test("answers JSON Concours email-only OK (D2)", () => {
  const r = resolveLeadSubmitPayload(
    {
      answers: {
        fld_firstName: "Ada",
        fld_email: "ada@ex.com",
      },
    },
    {
      type: "CONTEST_ENTRY",
      leadEnabled: true,
      formDefinition: buildContestDefinition(),
    },
  );
  assert.equal(r.ok, true);
  assert.equal(r.projected.phone, null);
  assert.equal(r.projected.email, "ada@ex.com");
});

test("Concours sans contact → KO", () => {
  const r = resolveLeadSubmitPayload(
    { answers: { fld_firstName: "Ada" } },
    {
      type: "CONTEST_ENTRY",
      leadEnabled: true,
      formDefinition: buildContestDefinition(),
    },
  );
  assert.equal(r.ok, false);
});

test("nouveau contact Lead sans nom OK", () => {
  const r = resolveLeadSubmitPayload(
    { firstName: "Léa", phone: "0606060606" },
    {
      type: "SINGLE_CHOICE",
      leadEnabled: true,
      formDefinition: buildContactDefinition(),
    },
  );
  assert.equal(r.ok, true);
  assert.equal(r.answers.fld_lastName, undefined);
});

test("alignement field ids contact_legacy avec frontend L0", async () => {
  const fe = await import(
    pathToFileURL(join(root, "frontend/lib/forms/formTemplates.js")).href,
  );
  const feDef = fe.buildFormDefinitionFromTemplate("contact_legacy");
  const beDef = buildContactLegacyDefinition();
  assert.deepEqual(
    beDef.fields.map((f) => f.id),
    feDef.fields.map((f) => f.id),
  );
  assert.deepEqual(
    beDef.fields.map((f) => [f.slot, f.required, f.type]),
    feDef.fields.map((f) => [f.slot, f.required, f.type]),
  );
});

test("migration SQL présente et additive", () => {
  const sqlPath = join(
    root,
    "backend/prisma/migrations/20261020160000_forms_l1_form_definition/migration.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");
  assert.ok(sql.includes("ADD COLUMN"));
  assert.ok(sql.includes("formDefinition"));
  assert.ok(sql.includes("contact_legacy"));
  assert.ok(sql.includes('ALTER COLUMN "firstName" DROP NOT NULL'));
  assert.ok(sql.includes('ALTER COLUMN "phone" DROP NOT NULL'));
  assert.equal(/DROP TABLE|DELETE FROM/i.test(sql), false);
  // JSON backfill coherent
  const json = contactLegacyDefinitionJson();
  assert.ok(sql.includes('"templateKey":"contact_legacy"'));
  assert.ok(json.includes("fld_firstName"));
});

test("schema.prisma L1 fields", () => {
  const schema = readFileSync(
    join(root, "backend/prisma/schema.prisma"),
    "utf8",
  );
  assert.ok(schema.includes("formDefinition"));
  assert.ok(schema.includes("formTemplateKey"));
  assert.ok(/model LeadCapture[\s\S]*answers\s+Json\?/.test(schema));
  assert.ok(/model LeadCapture[\s\S]*consents\s+Json\?/.test(schema));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nOK — forms L1 formCapture");
