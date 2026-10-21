/**
 * Tests lot L4 — CRM Mes leads / CSV / Détail / soft lock UI.
 * Exécution : npm run test:forms-l4
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const {
  buildFormDefinitionFromTemplate,
  canEditFormDefinitionField,
} = await import(
  pathToFileURL(join(root, "lib/forms/formTemplates.js")).href
);
const {
  buildLeadsCsv,
  collectLeadCsvFieldColumns,
  leadDetailRows,
  csvColumnPrefixForLead,
} = await import(pathToFileURL(join(root, "lib/forms/leadsCrm.js")).href);

function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    console.error(`FAIL — ${name}`);
    throw e;
  }
}

test("CSV — 1 colonne par champ avec libellés (pas ids)", () => {
  const def = buildFormDefinitionFromTemplate("civic");
  const rows = [
    {
      createdAt: "2026-10-21T10:00:00.000Z",
      pollType: "LEAD",
      pollOrder: 0,
      pollId: "p1",
      pollQuestion: "Votre avis ?",
      firstName: null,
      lastName: null,
      phone: "",
      email: "",
      formDefinition: def,
      answers: {
        fld_neighborhood: "Centre",
        fld_peopleCount: 2,
      },
    },
  ];
  const cols = collectLeadCsvFieldColumns(rows);
  assert.ok(cols.includes("Quartier") || cols.some((c) => /Quartier/i.test(c)));
  assert.ok(!cols.includes("fld_neighborhood"));
  const csv = buildLeadsCsv(rows, { includeEventTitle: false });
  assert.ok(csv.includes("Quartier"));
  assert.ok(csv.includes("Centre"));
  assert.ok(!csv.includes("fld_neighborhood"));
});

test("CSV — préfixe O4 multi-polls", () => {
  const def = buildFormDefinitionFromTemplate("contact");
  const rows = [
    {
      pollId: "a",
      pollOrder: 0,
      formDefinition: def,
      answers: { fld_firstName: "Ada" },
    },
    {
      pollId: "b",
      pollOrder: 1,
      formDefinition: def,
      answers: { fld_firstName: "Bob" },
    },
  ];
  const cols = collectLeadCsvFieldColumns(rows);
  assert.ok(cols.some((c) => c.startsWith("Q1 — ")));
  assert.ok(cols.some((c) => c.startsWith("Q2 — ")));
  assert.equal(csvColumnPrefixForLead({ pollOrder: 2 }), "Q3 — ");
});

test("CSV — conserve colonnes projetées + contact_legacy", () => {
  const def = buildFormDefinitionFromTemplate("contact_legacy");
  const csv = buildLeadsCsv(
    [
      {
        createdAt: "2026-10-21T12:00:00.000Z",
        eventTitle: "Soirée",
        pollType: "LEAD",
        pollOrder: 0,
        pollId: "legacy1",
        pollQuestion: "Lead",
        firstName: "Léa",
        lastName: "Dupont",
        phone: "0612345678",
        email: "lea@example.com",
        formDefinition: def,
        answers: {
          fld_firstName: "Léa",
          fld_lastName: "Dupont",
          fld_phone: "0612345678",
          fld_email: "lea@example.com",
        },
      },
    ],
    { includeEventTitle: true },
  );
  assert.ok(csv.includes("Prénom"));
  assert.ok(csv.includes("Léa"));
  assert.ok(csv.includes("Dupont"));
  assert.ok(csv.includes("Soirée"));
});

test("Détail — labels choix (D9) via answersDisplay", () => {
  const rows = leadDetailRows({
    answersDisplay: [
      { fieldId: "fld_choice", label: "Préférence", value: "Oui" },
    ],
  });
  assert.equal(rows[0].label, "Préférence");
  assert.equal(rows[0].value, "Oui");
});

test("Détail — fallback colonnes projetées sans answers", () => {
  const rows = leadDetailRows({
    firstName: "Ada",
    phone: "0611111111",
    email: "",
  });
  assert.ok(rows.some((r) => r.label === "Prénom" && r.value === "Ada"));
  assert.ok(rows.some((r) => r.label === "Téléphone"));
});

test("Soft lock D4 — helpers inchangés", () => {
  assert.equal(
    canEditFormDefinitionField({
      action: "delete_field",
      fieldId: "fld_x",
      usedFieldIds: ["fld_x"],
    }).allowed,
    false,
  );
});

test("UI Mes leads / event leads branchés CSV + Détail", () => {
  const mes = readFileSync(join(root, "app/admin/leads/page.jsx"), "utf8");
  const ev = readFileSync(
    join(root, "app/admin/event/[eventId]/leads/page.jsx"),
    "utf8",
  );
  assert.ok(mes.includes("buildLeadsCsv"));
  assert.ok(mes.includes("LeadAnswersDetail"));
  assert.ok(mes.includes("setDetailLead"));
  assert.ok(ev.includes("buildLeadsCsv"));
  assert.ok(ev.includes("LeadAnswersDetail"));
  // Liste simple conservée
  assert.ok(mes.includes("Mes leads"));
  assert.ok(mes.includes("<Th>Prénom</Th>"));
});

test("FormBuilderPanel soft lock D4 props", () => {
  const src = readFileSync(
    join(root, "components/admin/FormBuilderPanel.jsx"),
    "utf8",
  );
  assert.ok(src.includes("usedFieldIds"));
  assert.ok(src.includes("canEditFormDefinitionField"));
  assert.ok(src.includes("data-soft-lock"));
  assert.ok(!/Screen|Régie|JoinLive/i.test(src));
});

test("pas de modification Screen / Salle live dans livrables L4 CRM", () => {
  const detail = readFileSync(
    join(root, "components/admin/LeadAnswersDetail.jsx"),
    "utf8",
  );
  const crm = readFileSync(join(root, "lib/forms/leadsCrm.js"), "utf8");
  assert.ok(!/emitPollUpdated|screen-b|JoinLiveHub/i.test(detail + crm));
});

console.log("\nOK — forms L4");
