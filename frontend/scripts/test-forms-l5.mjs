/**
 * Tests lot L5 — RGPD / consent / PII / max 5.
 * Exécution : npm run test:forms-l5
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const {
  FORM_CONSENT_PROOF_VERSION,
  FORM_MARKETING_CONSENT_FIELD_ID,
  FORM_RGPD_CONSENT_NEVER_PRECHECKED,
  FORM_RGPD_INFO_TEXT,
  FORM_MAX_FIELDS,
} = await import(pathToFileURL(join(root, "lib/forms/formConstants.js")).href);

const { buildFormDefinitionFromTemplate } = await import(
  pathToFileURL(join(root, "lib/forms/formTemplates.js")).href
);
const { validateFormAnswers, buildConsentsProof } = await import(
  pathToFileURL(join(root, "lib/forms/formValidation.js")).href
);
const {
  hasMarketingConsentField,
  setMarketingConsentEnabled,
} = await import(pathToFileURL(join(root, "lib/forms/rgpdConsent.js")).href);
const {
  consentsProofDetailRows,
  consentDefaultsNeverPrechecked,
  assertNoLeadPiiInPublicPayload,
} = await import(pathToFileURL(join(root, "lib/forms/rgpdConsent.js")).href);

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("D7 — info texte présent et non vide", () => {
  assert.ok(FORM_RGPD_INFO_TEXT.length > 40);
  assert.match(FORM_RGPD_INFO_TEXT, /organisateur/i);
});

test("D7 — consent defaults jamais précochés", () => {
  assert.equal(FORM_RGPD_CONSENT_NEVER_PRECHECKED, true);
  let def = buildFormDefinitionFromTemplate("contact");
  def = setMarketingConsentEnabled(def, true);
  const defaults = consentDefaultsNeverPrechecked(def);
  assert.equal(defaults[FORM_MARKETING_CONSENT_FIELD_ID], false);
});

test("toggle consentement commercial + max 5", () => {
  let def = buildFormDefinitionFromTemplate("contact");
  assert.equal(hasMarketingConsentField(def), false);
  def = setMarketingConsentEnabled(def, true);
  assert.equal(hasMarketingConsentField(def), true);
  assert.ok(def.fields.length <= FORM_MAX_FIELDS);
  const marketing = def.fields.find(
    (f) => f.id === FORM_MARKETING_CONSENT_FIELD_ID,
  );
  assert.equal(marketing.required, false);
  assert.equal(marketing.type, "consent");

  // 5 champs sans consent → toggle add bloqué
  const full = {
    version: 1,
    templateKey: "custom",
    title: "T",
    rules: {},
    fields: Array.from({ length: FORM_MAX_FIELDS }, (_, i) => ({
      id: `fld_${i}`,
      type: "short_text",
      label: `F${i}`,
      required: false,
      order: i,
      options: [],
      slot: null,
    })),
  };
  const blocked = setMarketingConsentEnabled(full, true);
  assert.equal(hasMarketingConsentField(blocked), false);
  assert.equal(blocked.fields.length, FORM_MAX_FIELDS);
});

test("preuve consent — version + snapshot + choix", () => {
  let def = buildFormDefinitionFromTemplate("contact");
  def = setMarketingConsentEnabled(def, true);
  const res = validateFormAnswers(
    def,
    {
      fld_firstName: "Ada",
      fld_phone: "0612345678",
      [FORM_MARKETING_CONSENT_FIELD_ID]: true,
    },
    { pollKind: "LEAD" },
  );
  assert.equal(res.ok, true);
  assert.equal(res.consents.version, FORM_CONSENT_PROOF_VERSION);
  assert.equal(res.consents.neverPrechecked, true);
  assert.ok(res.consents.infoTextSnapshot);
  assert.equal(res.consents.marketing.accepted, true);
  assert.equal(res.consents.marketing.choice, true);
  assert.ok(res.consents.marketing.acceptedAt);
  assert.ok(res.consents.marketing.labelSnapshot);

  const proof = buildConsentsProof(def, {
    [FORM_MARKETING_CONSENT_FIELD_ID]: false,
  });
  assert.equal(proof.marketing, undefined);
  assert.ok(proof.infoAcknowledgedAt);
});

test("Détail CRM — lignes preuve", () => {
  const rows = consentsProofDetailRows({
    version: 1,
    neverPrechecked: true,
    infoAcknowledgedAt: "2026-10-21T10:00:00.000Z",
    infoTextSnapshot: FORM_RGPD_INFO_TEXT,
    marketing: {
      accepted: true,
      fieldId: "fld_marketing",
      labelSnapshot: "J’accepte…",
      acceptedAt: "2026-10-21T10:00:00.000Z",
    },
  });
  assert.ok(rows.some((r) => /Information/i.test(r.label)));
  assert.ok(rows.some((r) => /Accepté/i.test(r.value)));
});

test("PII — payload public sans answers/consents", () => {
  const publicPoll = {
    id: "p1",
    question: "Q",
    leadsCount: 3,
    formDefinition: { fields: [{ id: "fld_a", type: "email", label: "E" }] },
    options: [{ id: "o1", label: "Oui", votes: 1 }],
  };
  assert.equal(assertNoLeadPiiInPublicPayload(publicPoll).ok, true);
  assert.equal(
    assertNoLeadPiiInPublicPayload({
      ...publicPoll,
      answers: { fld_a: "x@y.z" },
    }).ok,
    false,
  );
});

test("UI FormRenderer info RGPD + FormBuilder toggle", () => {
  const renderer = readFileSync(
    join(root, "components/forms/FormRenderer.jsx"),
    "utf8",
  );
  const builder = readFileSync(
    join(root, "components/admin/FormBuilderPanel.jsx"),
    "utf8",
  );
  const detail = readFileSync(
    join(root, "components/admin/LeadAnswersDetail.jsx"),
    "utf8",
  );
  assert.ok(renderer.includes("FORM_RGPD_INFO_TEXT"));
  assert.ok(renderer.includes("data-rgpd-info"));
  assert.ok(renderer.includes("data-consent-field"));
  assert.ok(builder.includes("setMarketingConsentEnabled"));
  assert.ok(builder.includes("marketing-consent-toggle"));
  assert.ok(detail.includes("consentsProofDetailRows"));
  assert.ok(!/Screen|Régie|JoinLive/i.test(renderer + builder));
});

test("guide orga présent", () => {
  const guide = readFileSync(
    join(root, "../LIVRABLES/guide-orga-formulaires-rgpd.md"),
    "utf8",
  );
  assert.ok(guide.includes("Consentement commercial"));
  assert.ok(guide.includes("jamais précoch"));
});

console.log("\nOK — forms L5");
