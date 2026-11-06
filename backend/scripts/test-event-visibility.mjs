/**
 * Lot A — tests unitaires visibilité événement.
 * Exécution : node scripts/test-event-visibility.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  EVENT_VISIBILITY,
  parseEventVisibility,
  normalizeEventVisibility,
  isEventPublic,
  isDiscoverEligible,
  eventLandingRobots,
  validateVisibilityChange,
  visibilityApiFields,
} = require("../lib/eventVisibility.js");

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

test("parseEventVisibility accepte private/public (casse)", () => {
  assert.equal(parseEventVisibility("private"), "PRIVATE");
  assert.equal(parseEventVisibility("PUBLIC"), "PUBLIC");
  assert.equal(parseEventVisibility("nope"), null);
  assert.equal(parseEventVisibility(1), null);
});

test("normalizeEventVisibility défaut PRIVATE", () => {
  assert.equal(normalizeEventVisibility(null), "PRIVATE");
  assert.equal(normalizeEventVisibility("public"), "PUBLIC");
});

test("isEventPublic / isDiscoverEligible (Lot B : thème + startsAt)", () => {
  assert.equal(isEventPublic("PUBLIC"), true);
  assert.equal(isEventPublic("PRIVATE"), false);
  assert.equal(isDiscoverEligible({ visibility: "PUBLIC" }), false);
  assert.equal(
    isDiscoverEligible({
      visibility: "PUBLIC",
      primaryThemeId: "theme_sport",
      startsAt: new Date("2026-12-01T00:00:00.000Z"),
    }),
    true,
  );
  assert.equal(isDiscoverEligible({ visibility: "PRIVATE" }), false);
});

test("eventLandingRobots : public + landing = index", () => {
  const r = eventLandingRobots({ visibility: "PUBLIC", landingEnabled: true });
  assert.equal(r.index, true);
  assert.equal(r.robots, "index,follow");
});

test("eventLandingRobots : privé = noindex même si landing", () => {
  const r = eventLandingRobots({ visibility: "PRIVATE", landingEnabled: true });
  assert.equal(r.index, false);
  assert.equal(r.robots, "noindex,nofollow");
});

test("eventLandingRobots : public sans landing = noindex", () => {
  const r = eventLandingRobots({ visibility: "PUBLIC", landingEnabled: false });
  assert.equal(r.index, false);
});

test("validateVisibilityChange refuse PUBLIC sans confirmPublic", () => {
  const r = validateVisibilityChange({
    currentVisibility: "PRIVATE",
    nextVisibility: "PUBLIC",
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "CONFIRM_PUBLIC_REQUIRED");
  assert.equal(r.status, 400);
});

test("validateVisibilityChange accepte PUBLIC avec confirmPublic", () => {
  const r = validateVisibilityChange({
    currentVisibility: "PRIVATE",
    nextVisibility: "public",
    confirmPublic: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.visibility, "PUBLIC");
  assert.equal(r.becomingPublic, true);
});

test("validateVisibilityChange PRIVATE sans confirm", () => {
  const r = validateVisibilityChange({
    currentVisibility: "PUBLIC",
    nextVisibility: "PRIVATE",
  });
  assert.equal(r.ok, true);
  assert.equal(r.becomingPrivate, true);
});

test("validateVisibilityChange noop", () => {
  const r = validateVisibilityChange({
    currentVisibility: "PRIVATE",
    nextVisibility: "PRIVATE",
  });
  assert.equal(r.ok, true);
  assert.equal(r.becomingPublic, false);
});

test("visibilityApiFields", () => {
  assert.deepEqual(visibilityApiFields("PUBLIC"), {
    visibility: "public",
    isPublic: true,
  });
  assert.deepEqual(visibilityApiFields(undefined), {
    visibility: "private",
    isPublic: false,
  });
});

test("EVENT_VISIBILITY constants", () => {
  assert.equal(EVENT_VISIBILITY.PRIVATE, "PRIVATE");
  assert.equal(EVENT_VISIBILITY.PUBLIC, "PUBLIC");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests eventVisibility OK");
