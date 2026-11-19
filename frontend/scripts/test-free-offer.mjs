/**
 * Offre gratuite FE — pricing + régie + copy.
 * Exécution : node frontend/scripts/test-free-offer.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FREE_OFFER_LABEL,
  FREE_PARTICIPANTS_LIMIT,
  FREE_PLAN_TYPE,
} from "../lib/freeOffer.js";
import { PARTICIPANT_PACK_SIZES } from "../lib/participantPacks.js";
import {
  REGIE_START_REAL_FREE_CTA_LABEL,
  REGIE_NO_ACTIVATION_HINT,
  getRegieTestModeHelpLine,
} from "../lib/testModeActivationCopy.js";
import {
  getStartRealFreeConfirmMessage,
  getStartRealConfirmMessage,
} from "../lib/startRealResetClient.js";

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

test("Constantes FREE alignées", () => {
  assert.equal(FREE_PARTICIPANTS_LIMIT, 10);
  assert.equal(FREE_PLAN_TYPE, "FREE");
  assert.match(FREE_OFFER_LABEL, /10/);
  assert.deepEqual([...PARTICIPANT_PACK_SIZES], [50, 100, 250, 500, 1000]);
});

test("Copy régie mentionne gratuit + recharge", () => {
  assert.match(REGIE_START_REAL_FREE_CTA_LABEL, /gratuit/i);
  assert.match(REGIE_NO_ACTIVATION_HINT, /10/);
  assert.match(REGIE_NO_ACTIVATION_HINT, /[Rr]echarge/);
  assert.match(getRegieTestModeHelpLine(), /10/);
});

test("Confirmations start-real free vs pack", () => {
  const freeMsg = getStartRealFreeConfirmMessage();
  assert.match(freeMsg, /10/);
  assert.match(freeMsg, /Aucun paiement|sans.*pack|ne sera consommé/i);
  assert.doesNotMatch(freeMsg, /1 activation sera consommée/);
  const paid = getStartRealConfirmMessage(100);
  assert.match(paid, /1 activation sera consommée/);
});

test("Régie branche startRealLiveFree + free: true", () => {
  const regie = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(regie, /startRealLiveFree/);
  assert.match(regie, /REGIE_START_REAL_FREE_CTA_LABEL/);
  assert.match(regie, /free:\s*true/);
  assert.match(regie, /FREE_PLAN_TYPE/);
  assert.match(regie, /FREE_OFFER_LABEL/);
});

test("Pricing : carte gratuite + six offres, démo n’est plus l’unique gratuit", () => {
  const pricing = readFileSync(join(here, "../app/pricing/page.js"), "utf8");
  assert.match(pricing, /FREE_OFFER_LABEL/);
  assert.match(pricing, /Démarrer gratuitement/);
  assert.match(pricing, /Six offres/);
  assert.match(pricing, /href=\"\/admin\"/);
  assert.match(pricing, /Recharge possible à tout moment/);
  // Hero launch ne pousse plus uniquement /join/demo comme gratuit
  const heroSlice = pricing.slice(
    pricing.indexOf("pricing-hero-cta"),
    pricing.indexOf("pricing-packs"),
  );
  assert.match(heroSlice, /\/admin/);
  assert.doesNotMatch(heroSlice, /href=\"\/join\/demo\"/);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests free-offer FE OK");
