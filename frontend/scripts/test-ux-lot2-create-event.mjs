/**
 * Lot 2 UX — création d’événement (libellés, dates FR, checklist).
 * Exécution : node frontend/scripts/test-ux-lot2-create-event.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCreateEventPrepChecklist,
  createBlankQuestion,
} from "../lib/createEventForm.js";
import {
  EVENT_PAGE_LABEL,
  EVENT_PAGE_NAV_EMOJI,
  EVENT_PAGE_VIEW_CTA,
} from "../lib/eventPageLabels.js";
import {
  formatDatetimeLocalFr,
  frDateTimeToDatetimeLocal,
  parseFrDateParts,
  parseFrTimeParts,
  splitDatetimeLocalFr,
} from "../lib/frDateTime.js";
import {
  PUBLISH_PUBLIC_WARNING_LINES,
  UNPUBLISH_PRIVATE_WARNING_LINES,
} from "../lib/eventVisibility.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let failed = 0;

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

test("dates FR : format + parse roundtrip", () => {
  assert.deepEqual(splitDatetimeLocalFr("2026-12-15T19:30"), {
    dateFr: "15/12/2026",
    timeFr: "19:30",
  });
  assert.equal(formatDatetimeLocalFr("2026-12-15T19:30"), "15/12/2026 19:30");
  assert.equal(formatDatetimeLocalFr(""), "");
  assert.ok(parseFrDateParts("15/12/2026"));
  assert.equal(parseFrDateParts("32/12/2026"), null);
  assert.ok(parseFrTimeParts("19:30"));
  assert.equal(parseFrTimeParts("25:00"), null);
  assert.equal(frDateTimeToDatetimeLocal("15/12/2026", "19:30"), "2026-12-15T19:30");
  assert.equal(frDateTimeToDatetimeLocal("", ""), null);
  assert.equal(frDateTimeToDatetimeLocal("15/12/2026", ""), undefined);
  assert.doesNotMatch(formatDatetimeLocalFr("2026-12-15T19:30"), /PM|AM/i);
});

test("checklist non bloquante et progressive", () => {
  const empty = buildCreateEventPrepChecklist({});
  assert.equal(empty.length, 4);
  assert.equal(empty.filter((i) => i.done).length, 1); // private visibility default
  assert.ok(empty.some((i) => i.id === "after" && i.optional === true && !i.done));

  const q = createBlankQuestion("q-1");
  q.question = "Priorité 2027 ?";
  q.options = ["Innovation", "Croissance"];
  const filled = buildCreateEventPrepChecklist({
    eventTitle: "Soirée test",
    questions: [q],
    visibilityIntent: "private",
  });
  assert.equal(filled.find((i) => i.id === "title")?.done, true);
  assert.equal(filled.find((i) => i.id === "questions")?.done, true);
  assert.equal(filled.find((i) => i.id === "visibility")?.done, true);
  assert.equal(filled.find((i) => i.id === "after")?.done, false);

  const pub = buildCreateEventPrepChecklist({
    eventTitle: "Pub",
    questions: [q],
    visibilityIntent: "public",
    publicConfirmed: false,
  });
  assert.equal(pub.find((i) => i.id === "visibility")?.done, false);
});

test("libellés Page de l’événement (plus de Landing UI clé)", () => {
  assert.match(EVENT_PAGE_LABEL, /Page de l’événement|Page de l'événement/);
  assert.match(EVENT_PAGE_NAV_EMOJI, /Page/);
  assert.match(EVENT_PAGE_VIEW_CTA, /page/i);
  assert.doesNotMatch(EVENT_PAGE_LABEL, /Landing/i);

  for (const line of PUBLISH_PUBLIC_WARNING_LINES) {
    assert.doesNotMatch(line, /\bLanding\b/);
  }
  for (const line of UNPUBLISH_PRIVATE_WARNING_LINES) {
    assert.doesNotMatch(line, /\bLanding\b/);
  }

  const createPage = read("app/admin/page.js");
  assert.match(createPage, /buildCreateEventPrepChecklist/);
  assert.match(createPage, /CreateEventPrepChecklist/);
  assert.match(createPage, /create-event-questions/);
  assert.match(createPage, /Essentiel pour le live/);
  assert.match(createPage, /EVENT_PAGE_ROLE_HINT/);

  const fields = read("components/admin/EventStructuredInfoFields.jsx");
  assert.match(fields, /FrDatetimeLocalField/);
  assert.match(fields, /EVENT_PAGE_STRUCTURED_HINT/);
  assert.match(fields, /page de l’événement|page de l'événement/i);
  assert.doesNotMatch(fields, /textes libres de la Landing/);

  const card = read("components/admin/EventDashboardCard.jsx");
  assert.match(card, /EVENT_PAGE_VIEW_CTA|EVENT_PAGE_NAV_SHORT_EMOJI/);
  assert.doesNotMatch(card, />Voir la landing</);
  assert.doesNotMatch(card, />✨ Landing</);

  // Routes/API inchangées
  assert.match(card, /\/admin\/events\/\$\{ev\.id\}\/landing/);
  assert.match(createPage, /\/admin\/event\//);
});

test("FrDatetimeLocalField + checklist composants présents", () => {
  const frField = read("components/admin/FrDatetimeLocalField.jsx");
  assert.match(frField, /jj\/mm\/aaaa/);
  assert.match(frField, /HH:mm/);
  assert.match(frField, /frDateTimeToDatetimeLocal/);
  const checklist = read("components/admin/CreateEventPrepChecklist.jsx");
  assert.match(checklist, /create-event-prep-checklist/);
  assert.match(checklist, /Rien\s+n[’']est bloqué/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll test-ux-lot2-create-event tests passed.");
