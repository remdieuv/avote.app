/**
 * Packs participants + recharge capacité.
 * Exécution : node backend/scripts/test-participant-packs.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  PARTICIPANT_PACK_SIZES,
  PARTICIPANT_PACKS,
  parseParticipantPackSize,
  packSizeFromPlanType,
  planTypeForPackSize,
  listParticipantPacksPublic,
} = require("../lib/participantPacks.js");
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

test("Cinq packs exacts, prix TTC figés", () => {
  assert.deepEqual([...PARTICIPANT_PACK_SIZES], [50, 100, 250, 500, 1000]);
  assert.equal(PARTICIPANT_PACKS[50].eurosTtc, 4.99);
  assert.equal(PARTICIPANT_PACKS[100].eurosTtc, 9.99);
  assert.equal(PARTICIPANT_PACKS[250].eurosTtc, 19.99);
  assert.equal(PARTICIPANT_PACKS[500].eurosTtc, 34.99);
  assert.equal(PARTICIPANT_PACKS[1000].eurosTtc, 59.99);
  assert.equal(listParticipantPacksPublic().length, 5);
});

test("parse / planType round-trip", () => {
  assert.equal(parseParticipantPackSize(250), 250);
  assert.equal(parseParticipantPackSize("1000"), 1000);
  assert.equal(parseParticipantPackSize(75), null);
  assert.equal(packSizeFromPlanType("P50"), 50);
  assert.equal(packSizeFromPlanType("FUN"), 100);
  assert.equal(packSizeFromPlanType("EVENT"), 500);
  assert.equal(planTypeForPackSize(1000), "P1000");
});

test("Recharge cumulative : limite augmente, FINISHED refusé", () => {
  const ok = planCapacityTopUp({
    participantsLimit: 100,
    liveState: "LIVE",
    isLocked: false,
    delta: 250,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.nextLimit, 350);
  assert.equal(ok.shouldUnlock, false);

  const finished = planCapacityTopUp({
    participantsLimit: 100,
    liveState: "FINISHED",
    delta: 50,
  });
  assert.equal(finished.ok, false);
  assert.equal(finished.code, "EVENT_FINISHED");
});

test("Legacy saturation lock : top-up déverrouille si non terminé", () => {
  const plan = planCapacityTopUp({
    participantsLimit: 100,
    liveState: "LIVE",
    isLocked: true,
    delta: 100,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.nextLimit, 200);
  assert.equal(plan.shouldUnlock, true);
});

test("server.js : saturation sans isLocked + topup idempotent", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.match(src, /Saturation ≠ clôture/);
  assert.match(src, /ne pas poser isLocked/);
  assert.match(src, /create-topup-session/);
  assert.match(src, /kind: "participant_topup"/);
  assert.match(src, /stripePriceIdForPack/);
  assert.equal(PARTICIPANT_PACKS[50].envPriceKey, "STRIPE_PRICE_PACK_50");
  const voteIdx = src.indexOf("limitReached: true");
  assert.ok(voteIdx > 0);
  const snippet = src.slice(Math.max(0, voteIdx - 400), voteIdx + 200);
  assert.doesNotMatch(snippet, /isLocked:\s*true/);
  assert.match(src, /stripeSessionId/);
  assert.match(src, /if \(existing\) return/);
});

test("Migration packs présente", () => {
  const sql = readFileSync(
    join(
      here,
      "../prisma/migrations/20261116140000_participant_packs_p50_p1000/migration.sql",
    ),
    "utf8",
  );
  assert.match(sql, /P50/);
  assert.match(sql, /P1000/);
  assert.match(sql, /FUN.*P100/);
  assert.match(sql, /EVENT.*P500/);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests participant-packs OK");
