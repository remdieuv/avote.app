/**
 * Offre gratuite permanente (10 participants).
 * Exécution : node backend/scripts/test-free-offer.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  FREE_PARTICIPANTS_LIMIT,
  FREE_PLAN_TYPE,
  wantsFreeStartReal,
} = require("../lib/freeOffer.js");
const {
  PARTICIPANT_PACK_SIZES,
  parseParticipantPackSize,
  packSizeFromPlanType,
} = require("../lib/participantPacks.js");
const { startRealResetAppliesToPlan } = require("../lib/startRealEventReset.js");
const { planCapacityTopUp } = require("../lib/capacityTopUp.js");

const here = dirname(fileURLToPath(import.meta.url));
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

test("Constante FREE = 10, hors packs payants", () => {
  assert.equal(FREE_PARTICIPANTS_LIMIT, 10);
  assert.equal(FREE_PLAN_TYPE, "FREE");
  assert.equal(parseParticipantPackSize(10), null);
  assert.equal(packSizeFromPlanType("FREE"), null);
  assert.deepEqual([...PARTICIPANT_PACK_SIZES], [50, 100, 250, 500, 1000]);
});

test("wantsFreeStartReal détecte free / planType FREE", () => {
  assert.equal(wantsFreeStartReal({ free: true }), true);
  assert.equal(wantsFreeStartReal({ planType: "FREE" }), true);
  assert.equal(wantsFreeStartReal({ planType: "free" }), true);
  assert.equal(wantsFreeStartReal({ pack: 50 }), false);
  assert.equal(wantsFreeStartReal({}), false);
  assert.equal(wantsFreeStartReal(null), false);
});

test("Reset start-real accepte FREE", () => {
  assert.equal(startRealResetAppliesToPlan("FREE"), true);
  assert.equal(startRealResetAppliesToPlan("PACK"), true);
});

test("Recharge additive depuis limite gratuite 10", () => {
  const plan = planCapacityTopUp({
    participantsLimit: FREE_PARTICIPANTS_LIMIT,
    liveState: "VOTING",
    isLocked: false,
    delta: 100,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.nextLimit, 110);
});

test("server.js : branche free sans consommation activation", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const idx = src.indexOf('app.post("/events/:eventId/start-real"');
  assert.ok(idx > 0);
  const body = src.slice(idx, idx + 9000);
  assert.match(body, /wantsFreeStartReal/);
  assert.match(body, /FREE_PARTICIPANTS_LIMIT/);
  assert.match(body, /FREE_PLAN_TYPE/);
  assert.match(body, /isFreeStart/);
  assert.match(body, /Offre FREE : aucun débit/);
  assert.match(body, /participantsLimit = isFreeStart \? FREE_PARTICIPANTS_LIMIT/);
});

test("Schema + migration FREE additive, défaut 500 inchangé", () => {
  const schema = readFileSync(join(here, "../prisma/schema.prisma"), "utf8");
  assert.match(schema, /FREE/);
  assert.match(schema, /participantsLimit\s+Int\s+@default\(500\)/);
  const mig = readFileSync(
    join(
      here,
      "../prisma/migrations/20261119170000_activation_plan_type_free/migration.sql",
    ),
    "utf8",
  );
  assert.match(mig, /ADD VALUE IF NOT EXISTS 'FREE'/);
  assert.doesNotMatch(mig, /ALTER TABLE|"participantsLimit"|@default\(500\)/);
});

test("Cinq packs payants non régressés", () => {
  const packsSrc = readFileSync(join(here, "../lib/participantPacks.js"), "utf8");
  assert.match(packsSrc, /4\.99/);
  assert.match(packsSrc, /9\.99/);
  assert.match(packsSrc, /19\.99/);
  assert.match(packsSrc, /34\.99/);
  assert.match(packsSrc, /59\.99/);
  assert.doesNotMatch(packsSrc, /planType:\s*"FREE"/);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests free-offer OK");
