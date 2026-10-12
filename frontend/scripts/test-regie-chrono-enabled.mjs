/**
 * Régie simplifiée — états chrono + boutons de pilotage (snapshot API).
 * Exécution : node frontend/scripts/test-regie-chrono-enabled.mjs
 */
import assert from "node:assert/strict";
import {
  formatCountdownCompact,
  getRegieChronoControlFlags,
  getRegieChronoControlMode,
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
  assert.equal(getRegieChronoControlMode(null), "inactive");
  assert.equal(getRegieChronoEnabledLabel(null), "Inactif");
  assert.equal(getRegieChronoRunningHint(null), "");
  const flags = getRegieChronoControlFlags("inactive");
  assert.equal(flags.activer, true);
  assert.equal(flags.regler, true);
  assert.equal(flags.demarrer, false);
  assert.equal(flags.desactiver, false);
});

test("Actif à l’arrêt → Démarrer + Désactiver + Régler", () => {
  const armed = {
    totalSec: 120,
    remainingSec: 120,
    accumulatedSec: 0,
    isPaused: true,
    running: false,
  };
  assert.equal(getRegieChronoControlMode(armed), "stopped");
  assert.equal(getRegieChronoRunningHint(armed), "à l’arrêt");
  const flags = getRegieChronoControlFlags("stopped");
  assert.equal(flags.demarrer, true);
  assert.equal(flags.desactiver, true);
  assert.equal(flags.regler, true);
  assert.equal(flags.activer, false);
  assert.equal(flags.pause, false);
});

test("En cours → Pause + Désactiver", () => {
  const running = {
    totalSec: 120,
    remainingSec: 90,
    accumulatedSec: 0,
    isPaused: false,
    running: true,
  };
  assert.equal(getRegieChronoControlMode(running), "running");
  assert.equal(getRegieChronoRunningHint(running), "en cours");
  const flags = getRegieChronoControlFlags("running");
  assert.equal(flags.pause, true);
  assert.equal(flags.desactiver, true);
  assert.equal(flags.regler, false);
  assert.equal(flags.demarrer, false);
});

test("En pause → Reprendre + Réinitialiser + Désactiver", () => {
  const paused = {
    totalSec: 120,
    remainingSec: 90,
    accumulatedSec: 30,
    isPaused: true,
    running: false,
  };
  assert.equal(getRegieChronoControlMode(paused), "paused");
  assert.equal(getRegieChronoRunningHint(paused), "en pause");
  const flags = getRegieChronoControlFlags("paused");
  assert.equal(flags.reprendre, true);
  assert.equal(flags.reinitialiser, true);
  assert.equal(flags.desactiver, true);
  assert.equal(flags.regler, false);
  assert.equal(flags.demarrer, false);
});

test("Compact + pas de second flag UI", () => {
  assert.equal(formatCountdownCompact(120), "02:00");
  assert.equal(getRegieChronoEnabledLabel(null), "Inactif");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie chrono pilotage par états");
