/**
 * Métadonnées structurées Discover (création + Mes événements).
 * Exécution : node frontend/scripts/test-event-discover-meta.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  blankEventStructuredInfo,
  buildDiscoverMetaPatchBody,
  datetimeLocalToIso,
  hasAnyStructuredInfo,
  isoToDatetimeLocal,
  listDiscoverEligibilityGaps,
  structuredInfoFromEvent,
} from "../lib/eventDiscoverMeta.js";
import { listCreatePublicDiscoverGaps } from "../lib/createEventForm.js";

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

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("datetime local ↔ ISO roundtrip basique", () => {
  assert.equal(datetimeLocalToIso(""), null);
  assert.equal(datetimeLocalToIso("not-a-date"), undefined);
  const iso = datetimeLocalToIso("2026-12-01T18:30");
  assert.ok(typeof iso === "string" && iso.includes("2026"));
  assert.match(isoToDatetimeLocal(iso), /^2026-12-01T/);
});

test("buildDiscoverMetaPatchBody refuse thèmes identiques", () => {
  const bad = buildDiscoverMetaPatchBody({
    ...blankEventStructuredInfo(),
    primaryThemeId: "t1",
    secondaryThemeId: "t1",
  });
  assert.equal(bad.ok, false);
  const ok = buildDiscoverMetaPatchBody({
    ...blankEventStructuredInfo(),
    city: " Lyon ",
    startsAtLocal: "2026-12-01T18:30",
    primaryThemeId: "t1",
    secondaryThemeId: "t2",
    organizerProfileId: "p1",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.body.city, "Lyon");
  assert.equal(ok.body.primaryThemeId, "t1");
  assert.equal(ok.body.secondaryThemeId, "t2");
});

test("hasAnyStructuredInfo / structuredInfoFromEvent", () => {
  assert.equal(hasAnyStructuredInfo(blankEventStructuredInfo()), false);
  assert.equal(
    hasAnyStructuredInfo({
      ...blankEventStructuredInfo(),
      city: "Paris",
    }),
    true,
  );
  const from = structuredInfoFromEvent({
    city: "Nantes",
    startsAt: "2026-06-01T10:00:00.000Z",
    primaryThemeId: "th1",
    organizerProfileId: "org1",
  });
  assert.equal(from.city, "Nantes");
  assert.equal(from.primaryThemeId, "th1");
  assert.equal(from.organizerProfileId, "org1");
  assert.ok(from.startsAtLocal);
});

test("écarts Discover : privé peut être incomplet ; public explique les manques", () => {
  const empty = listDiscoverEligibilityGaps({
    profiles: [],
    startsAtLocal: "",
    primaryThemeId: "",
    organizerProfileId: "",
  });
  assert.ok(empty.some((g) => /date/i.test(g)));
  assert.ok(empty.some((g) => /thème/i.test(g)));
  assert.ok(empty.some((g) => /profil/i.test(g)));

  const complete = listDiscoverEligibilityGaps({
    profiles: [{ id: "p1", isPublic: true }],
    startsAtLocal: "2026-12-01T12:00",
    primaryThemeId: "th1",
    organizerProfileId: "p1",
  });
  assert.equal(complete.length, 0);

  const nonPublic = listDiscoverEligibilityGaps({
    profiles: [{ id: "p1", isPublic: false }],
    startsAtLocal: "2026-12-01T12:00",
    primaryThemeId: "th1",
    organizerProfileId: "p1",
  });
  assert.ok(nonPublic.some((g) => /public/i.test(g)));

  assert.deepEqual(
    listCreatePublicDiscoverGaps({
      profiles: [{ id: "p1", isPublic: true }],
      startsAtLocal: "2026-12-01T12:00",
      primaryThemeId: "th1",
      organizerProfileId: "p1",
    }),
    [],
  );
});

test("création : champs structurés sous Privé/Public + PATCH discover-meta", () => {
  const src = read("app/admin/page.js");
  assert.match(src, /EventStructuredInfoFields/);
  assert.match(src, /Informations structurées/);
  assert.match(src, /discover-meta/);
  assert.match(src, /buildDiscoverMetaPatchBody|hasAnyStructuredInfo/);
  assert.match(src, /datetime-local|startsAtLocal|primaryThemeId/);
});

test("Mes événements : panneau Infos + terminés modifiables", () => {
  const panel = read("components/admin/EventStructuredInfoPanel.jsx");
  assert.match(panel, /Informations de l’événement|Informations de l'événement/);
  assert.match(panel, /discover-meta/);
  assert.match(panel, /listDiscoverEligibilityGaps/);
  assert.doesNotMatch(panel, /finished|isFinished|liveState\s*===\s*["']finished["']/);
  const card = read("components/admin/EventDashboardCard.jsx");
  assert.match(card, /EventStructuredInfoPanel/);
  assert.doesNotMatch(card, /EventOrganizerSelect/);
  const eventsPage = read("app/admin/events/page.js");
  assert.match(eventsPage, /onStructuredInfoChange/);
  assert.match(eventsPage, /primaryThemeId|startsAt|city/);
});

test("pas de confusion Landing : copy structurée explicite", () => {
  const fields = read("components/admin/EventStructuredInfoFields.jsx");
  assert.match(fields, /Landing/);
  assert.match(fields, /Thème principal/);
  assert.match(fields, /Thème secondaire/);
  assert.match(fields, /Profil organisateur/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — event discover meta");
