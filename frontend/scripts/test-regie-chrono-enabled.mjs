/**
 * Régie simplifiée — état Actif / Inactif du chrono (dérivé du snapshot API).
 * Exécution : node frontend/scripts/test-regie-chrono-enabled.mjs
 */
import assert from "node:assert/strict";
import {
  formatCountdownCompact,
  getRegieChronoEnabledLabel,
  getRegieChronoRunningHint,
  isRegieChronoEnabled,
} from "../lib/chronoFormat.js";

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

test("Inactif = pas de snapshot (totalSec null côté serveur)", () => {
  assert.equal(isRegieChronoEnabled(null), false);
  assert.equal(isRegieChronoEnabled(undefined), false);
  assert.equal(getRegieChronoEnabledLabel(null), "Inactif");
  assert.equal(getRegieChronoRunningHint(null), "");
});

test("Actif = snapshot présent (armé ou en cours) — un seul état source", () => {
  const armed = {
    totalSec: 120,
    remainingSec: 120,
    isPaused: true,
    running: false,
  };
  assert.equal(isRegieChronoEnabled(armed), true);
  assert.equal(getRegieChronoEnabledLabel(armed), "Actif");
  assert.equal(getRegieChronoRunningHint(armed), "en pause");

  const running = {
    totalSec: 120,
    remainingSec: 90,
    isPaused: false,
    running: true,
  };
  assert.equal(getRegieChronoEnabledLabel(running), "Actif");
  assert.equal(getRegieChronoRunningHint(running), "en cours");
});

test("Compact : durée grisée côté UI reste formatable hors snapshot", () => {
  assert.equal(formatCountdownCompact(120), "02:00");
  assert.equal(formatCountdownCompact(null), "—");
  assert.equal(formatCountdownCompact(3661), "01:01:01");
});

test("Pas de second flag : label suit uniquement questionTimer", () => {
  // Simule « preset local 02:00 » sans armement serveur → reste Inactif
  assert.equal(getRegieChronoEnabledLabel(null), "Inactif");
  assert.notEqual(formatCountdownCompact(120), "Inactif");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie chrono Actif/Inactif");
