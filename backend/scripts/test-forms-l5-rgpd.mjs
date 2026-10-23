/**
 * Tests lot L5 — preuve consent serveur, max 5, PII, legacy prefer answers.
 * Exécution : npm run test:forms-l5
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
  FORM_MAX_FIELDS,
  FORM_CONSENT_PROOF_VERSION,
  FORM_RGPD_INFO_TEXT,
  buildContactDefinition,
  buildConsents,
  resolveLeadSubmitPayload,
  validateClientFormDefinitionLimits,
  sanitizeClientFormDefinition,
  assertNoLeadPiiInPublicPayload,
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

test("max 5 — validateClientFormDefinitionLimits", () => {
  const ok = validateClientFormDefinitionLimits({
    fields: [{ id: "a", type: "short_text", label: "A" }],
  });
  assert.equal(ok.ok, true);
  const tooMany = {
    fields: Array.from({ length: FORM_MAX_FIELDS + 1 }, (_, i) => ({
      id: `f${i}`,
      type: "short_text",
      label: `F${i}`,
    })),
  };
  const bad = validateClientFormDefinitionLimits(tooMany);
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "FORM_MAX_FIELDS");
  assert.equal(sanitizeClientFormDefinition(tooMany, "LEAD"), null);
});

test("preuve consent serveur — version + texte + choix", () => {
  const def = buildContactDefinition();
  def.fields.push({
    id: "fld_marketing",
    type: "consent",
    label: "J’accepte de recevoir des communications commerciales",
    required: false,
    order: 9,
    options: [],
    slot: null,
  });
  const proof = buildConsents(
    def,
    { fld_firstName: "Ada", fld_phone: "0612345678", fld_marketing: true },
    {
      // Tentative client malveillante — ignorée pour accepted / neverPrechecked
      consents: { neverPrechecked: false, marketing: { accepted: false } },
    },
  );
  assert.equal(proof.version, FORM_CONSENT_PROOF_VERSION);
  assert.equal(proof.neverPrechecked, true);
  assert.equal(proof.infoTextSnapshot, FORM_RGPD_INFO_TEXT);
  assert.ok(proof.infoAcknowledgedAt);
  assert.equal(proof.marketing.accepted, true);
  assert.equal(proof.marketing.choice, true);
  assert.ok(proof.marketing.labelSnapshot);
});

test("marketing consent forcé non-required à la sanitize", () => {
  const sanitized = sanitizeClientFormDefinition(
    {
      templateKey: "custom",
      fields: [
        {
          id: "fld_marketing",
          type: "consent",
          label: "J’accepte commercial",
          required: true,
        },
      ],
    },
    "LEAD",
  );
  assert.equal(sanitized.fields[0].required, false);
});

test("prefer answers JSON vs legacy body", () => {
  const poll = {
    type: "LEAD",
    leadEnabled: true,
    formDefinition: buildContactDefinition(),
  };
  const viaAnswers = resolveLeadSubmitPayload(
    {
      answers: { fld_firstName: "Ada", fld_phone: "0612345678" },
      firstName: "Ignore",
      phone: "0000000000",
    },
    poll,
  );
  assert.equal(viaAnswers.ok, true);
  assert.equal(viaAnswers.legacyBodyUsed, false);
  assert.equal(viaAnswers.projected.firstName, "Ada");
  assert.equal(viaAnswers.consents.version, FORM_CONSENT_PROOF_VERSION);

  const viaLegacy = resolveLeadSubmitPayload(
    { firstName: "Bob", phone: "0699999999" },
    poll,
  );
  assert.equal(viaLegacy.ok, true);
  assert.equal(viaLegacy.legacyBodyUsed, true);
  assert.equal(viaLegacy.projected.firstName, "Bob");
});

test("PII — pollToJson-like sans answers/consents", () => {
  const payload = {
    id: "p",
    leadsCount: 2,
    formDefinition: { fields: [] },
    options: [{ id: "o", label: "Oui", votes: 1 }],
  };
  assert.equal(assertNoLeadPiiInPublicPayload(payload).ok, true);
  assert.equal(
    assertNoLeadPiiInPublicPayload({ ...payload, consents: {} }).ok,
    false,
  );
});

test("server.js — PATCH max fields + leads auth + pas emit PII", () => {
  const src = readFileSync(join(root, "server.js"), "utf8");
  assert.ok(src.includes("validateClientFormDefinitionLimits"));
  assert.ok(src.includes("legacyBodyUsed"));
  assert.ok(src.includes('app.get("/me/leads", requireAuth'));
  assert.ok(src.includes('app.get("/events/:eventId/leads", requireAuth'));
  const leadIdx = src.indexOf('app.post("/polls/:pollId/leads"');
  assert.ok(leadIdx >= 0);
  const leadPost = src.slice(leadIdx, leadIdx + 4500);
  assert.ok(leadPost.includes("legacyBodyUsed"));
  assert.ok(!/io\.emit\([^)]*answers|emit.*consents/i.test(leadPost));
});

test("replay-test purge leads (answers/consents inclus)", () => {
  const src = readFileSync(join(root, "server.js"), "utf8");
  assert.ok(src.includes("deleteLeads"));
  assert.ok(src.includes("leadCapture.deleteMany"));
});

console.log("\nOK — forms L5 rgpd");
