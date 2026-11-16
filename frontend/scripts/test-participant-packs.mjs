/**
 * Packs FE + solde activations.
 * Exécution : node frontend/scripts/test-participant-packs.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeActivationBalance } from "../lib/activationBalance.js";
import {
  PARTICIPANT_PACK_SIZES,
  PARTICIPANT_PACKS,
  parseParticipantPackSize,
  packSizeFromPlanType,
} from "../lib/participantPacks.js";

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

test("Cinq packs TTC alignés commercial", () => {
  assert.deepEqual([...PARTICIPANT_PACK_SIZES], [50, 100, 250, 500, 1000]);
  assert.equal(PARTICIPANT_PACKS[50].priceLabel, "4,99 €");
  assert.equal(PARTICIPANT_PACKS[1000].priceLabel, "59,99 €");
  assert.equal(parseParticipantPackSize("250"), 250);
  assert.equal(packSizeFromPlanType("P500"), 500);
});

test("computeActivationBalance par pack + legacy FUN/EVENT", () => {
  const bal = computeActivationBalance(3, { 50: 1, 250: 2 });
  assert.equal(bal.byPack["50"], 1);
  assert.equal(bal.byPack["250"], 2);
  assert.equal(bal.typedTotal, 3);
  assert.equal(bal.totalAvailable, 3);

  const legacy = computeActivationBalance(2, { FUN: 1, EVENT: 1 });
  assert.equal(legacy.byPack["100"], 1);
  assert.equal(legacy.byPack["500"], 1);
  assert.equal(legacy.typedTotal, 2);
});

test("CheckoutEventButton + pricing + compte branchent pack=", () => {
  const btn = readFileSync(
    join(here, "../components/billing/CheckoutEventButton.jsx"),
    "utf8",
  );
  const pricing = readFileSync(join(here, "../app/pricing/page.js"), "utf8");
  const account = readFileSync(join(here, "../app/admin/account/page.jsx"), "utf8");
  const regie = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(btn, /create-checkout-session/);
  assert.match(btn, /JSON\.stringify\(\{ pack \}\)/);
  assert.doesNotMatch(btn, /plan:\s*["']FUN["']/);
  assert.match(pricing, /pack=\{size\}/);
  assert.match(pricing, /PARTICIPANT_PACKS\[size\]/);
  assert.match(pricing, /pricing-packs/);
  assert.match(account, /pack=\{size\}/);
  assert.match(regie, /create-topup-session/);
  assert.match(regie, /Ajouter des participants/);
  assert.match(regie, /startTopupCheckout/);
  assert.doesNotMatch(regie, /startRealLive\("FUN"\)/);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests participant-packs FE OK");
