/**
 * Chrono affichage — correction skew via serverNow (offset figé).
 * Exécution : node frontend/scripts/test-chrono-restant-server-now.mjs
 */
import assert from "node:assert/strict";
import {
  chronoRestantSecondes,
  formatCountdownCompact,
  resolveQuestionTimerClockOffsetMs,
  syncQuestionTimerClockOffset,
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

const TOTAL = 120; // 02:00
const STARTED = "2026-10-28T12:00:00.000Z";

/**
 * Ancienne formule (pré-fix) : seg négatif → secondes ajoutées.
 * @param {{ totalSec: number; accumulatedSec?: number; startedAt: string }} tm
 * @param {number} nowMs
 */
function legacyRestantBuggy(tm, nowMs) {
  const seg = Math.floor((nowMs - Date.parse(tm.startedAt)) / 1000);
  const acc = typeof tm.accumulatedSec === "number" ? tm.accumulatedSec : 0;
  return Math.max(0, tm.totalSec - acc - seg);
}

/**
 * @param {number} clientSkewMs positif = client en avance
 * @param {number} [elapsedServerMs]
 */
function runningSnapshot(clientSkewMs, elapsedServerMs = 0) {
  const serverNowMs = Date.parse(STARTED) + elapsedServerMs;
  const remaining = Math.max(0, TOTAL - Math.floor(elapsedServerMs / 1000));
  return {
    totalSec: TOTAL,
    remainingSec: remaining,
    accumulatedSec: 0,
    startedAt: STARTED,
    serverNow: new Date(serverNowMs).toISOString(),
    running: true,
    isPaused: false,
    /** @type {number} */
    _clientNow: serverNowMs + clientSkewMs,
  };
}

test("client en retard 5 s au start → 02:00 (pas 02:05)", () => {
  const tm = runningSnapshot(-5000, 0);
  const offset = resolveQuestionTimerClockOffsetMs(tm, tm._clientNow);
  assert.equal(offset, -5000);
  const restant = chronoRestantSecondes(tm, tm._clientNow, offset);
  assert.equal(restant, 120);
  assert.equal(formatCountdownCompact(restant), "02:00");
  // Ancienne formule sans sync : 02:05
  assert.equal(legacyRestantBuggy(tm, tm._clientNow), 125);
  assert.equal(formatCountdownCompact(125), "02:05");
});

test("client en avance 5 s au start → 02:00 (pas 01:55)", () => {
  const tm = runningSnapshot(5000, 0);
  const offset = resolveQuestionTimerClockOffsetMs(tm, tm._clientNow);
  assert.equal(offset, 5000);
  const restant = chronoRestantSecondes(tm, tm._clientNow, offset);
  assert.equal(restant, 120);
  assert.equal(formatCountdownCompact(restant), "02:00");
});

test("offset figé : tick +10 s → décompte −10 (horloge retard)", () => {
  const tm0 = runningSnapshot(-5000, 0);
  const slot = {
    offsetMs: 0,
    serverNow: /** @type {string | null} */ (null),
    startedAt: /** @type {string | null} */ (null),
  };
  const offset = syncQuestionTimerClockOffset(tm0, slot, tm0._clientNow);
  assert.equal(offset, -5000);
  assert.equal(chronoRestantSecondes(tm0, tm0._clientNow, offset), 120);

  // Même snapshot (serverNow inchangé) : 10 s plus tard côté client
  const laterClient = tm0._clientNow + 10_000;
  const offsetStill = syncQuestionTimerClockOffset(tm0, slot, laterClient);
  assert.equal(offsetStill, -5000, "offset ne doit pas être recalculé");
  assert.equal(chronoRestantSecondes(tm0, laterClient, offsetStill), 110);
  assert.equal(formatCountdownCompact(110), "01:50");
});

test("pause → remainingSec serveur (pas de recalcul startedAt)", () => {
  const paused = {
    totalSec: TOTAL,
    remainingSec: 87,
    accumulatedSec: 33,
    startedAt: null,
    serverNow: "2026-10-28T12:00:33.000Z",
    running: false,
    isPaused: true,
  };
  assert.equal(chronoRestantSecondes(paused, Date.now(), -5000), 87);
  assert.equal(formatCountdownCompact(87), "01:27");
});

test("reprise après pause + skew retard → restant = total − accumulated", () => {
  const startedResume = "2026-10-28T12:01:00.000Z";
  const accumulated = 33;
  const tm = {
    totalSec: TOTAL,
    remainingSec: TOTAL - accumulated,
    accumulatedSec: accumulated,
    startedAt: startedResume,
    serverNow: startedResume,
    running: true,
    isPaused: false,
  };
  const clientBehind = Date.parse(startedResume) - 5000;
  const slot = {
    offsetMs: 0,
    serverNow: /** @type {string | null} */ (null),
    startedAt: /** @type {string | null} */ (null),
  };
  const offset = syncQuestionTimerClockOffset(tm, slot, clientBehind);
  assert.equal(offset, -5000);
  assert.equal(chronoRestantSecondes(tm, clientBehind, offset), 87);
  // +4 s client après reprise
  assert.equal(
    chronoRestantSecondes(tm, clientBehind + 4000, offset),
    83,
  );
});

test("nouveau serverNow (snapshot live) → offset resynchronisé", () => {
  const slot = {
    offsetMs: 0,
    serverNow: /** @type {string | null} */ (null),
    startedAt: /** @type {string | null} */ (null),
  };
  const tm0 = runningSnapshot(-5000, 0);
  syncQuestionTimerClockOffset(tm0, slot, tm0._clientNow);
  assert.equal(slot.offsetMs, -5000);

  const tm1 = runningSnapshot(-2000, 8000); // skew différent, 8 s écoulées serveur
  const clientNow = Date.parse(tm1.serverNow) - 2000;
  const offset = syncQuestionTimerClockOffset(tm1, slot, clientNow);
  assert.equal(offset, -2000);
  assert.equal(chronoRestantSecondes(tm1, clientNow, offset), 112);
});

test("sans serverNow : offset 0 + clamp seg → pas de +5 au start (mais sticky)", () => {
  const tm = {
    totalSec: TOTAL,
    remainingSec: TOTAL,
    accumulatedSec: 0,
    startedAt: STARTED,
    running: true,
    isPaused: false,
  };
  const clientBehind = Date.parse(STARTED) - 5000;
  assert.equal(resolveQuestionTimerClockOffsetMs(tm, clientBehind), 0);
  // Clamp seg>=0 évite 02:05 ; sans serverNow le décompte reste collé jusqu’à rattrapage.
  assert.equal(chronoRestantSecondes(tm, clientBehind, 0), 120);
  assert.equal(legacyRestantBuggy(tm, clientBehind), 125);
});

test("null / inactif → null ou remainingSec", () => {
  assert.equal(chronoRestantSecondes(null), null);
  assert.equal(
    chronoRestantSecondes({
      totalSec: 120,
      remainingSec: 120,
      running: false,
      isPaused: true,
    }),
    120,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests OK");
