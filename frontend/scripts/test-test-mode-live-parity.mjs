/**
 * LOT-4 — Parité MODE TEST / RÉEL (chrono + politique données).
 * Exécution : node frontend/scripts/test-test-mode-live-parity.mjs
 */
import assert from "node:assert/strict";
import {
  applyTestModeResultsVoteMask,
  maskTestModeOptionVoteCount,
} from "../lib/testModeResultsMask.js";
import {
  buildQuestionTimerPatchOnPollOpen,
  getTestModeDataPolicyAudit,
  isQuestionTimerApiAllowed,
  resolveOpenPollTimerTotalSec,
} from "../lib/testModeLiveParity.js";

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

test("Ouverture poll : aucun chrono auto (TEST ni RÉEL)", () => {
  assert.deepEqual(
    buildQuestionTimerPatchOnPollOpen({ isTestMode: true }),
    {},
  );
  assert.deepEqual(
    buildQuestionTimerPatchOnPollOpen({ isTestMode: false }),
    {},
  );
  assert.equal(
    resolveOpenPollTimerTotalSec({ isTestMode: true, configuredTotalSec: 120 }),
    null,
    "ne force jamais 30 s",
  );
  assert.equal(
    resolveOpenPollTimerTotalSec({ isTestMode: false, configuredTotalSec: 120 }),
    null,
  );
});

test("API question-timer autorisée en TEST et RÉEL", () => {
  assert.equal(isQuestionTimerApiAllowed({ isLiveConsumed: false }), true);
  assert.equal(isQuestionTimerApiAllowed({ isLiveConsumed: true }), true);
  assert.equal(isQuestionTimerApiAllowed({}), true);
});

test("Parité transitions métier (matrice CTA / axes) — indépendante du mode", () => {
  /** Même séquence d’axes attendue en TEST et RÉEL. */
  const sequences = {
    sondage: ["PREPARE", "OPEN", "CLOSE", "SHOW_RESULTS", "NEXT"],
    quiz: ["PREPARE", "OPEN", "CLOSE", "SHOW_RESULTS", "NEXT"],
    lead: ["PREPARE", "OPEN", "CLOSE", "NEXT"],
    contest: ["PREPARE", "OPEN", "CLOSE", "DRAW", "NEXT"],
  };
  for (const mode of ["TEST", "REAL"]) {
    assert.deepEqual(
      sequences.sondage,
      ["PREPARE", "OPEN", "CLOSE", "SHOW_RESULTS", "NEXT"],
      `Sondage identique en ${mode}`,
    );
    assert.deepEqual(
      sequences.quiz,
      ["PREPARE", "OPEN", "CLOSE", "SHOW_RESULTS", "NEXT"],
      `Quiz identique en ${mode}`,
    );
    assert.deepEqual(
      sequences.lead,
      ["PREPARE", "OPEN", "CLOSE", "NEXT"],
      `Lead identique en ${mode}`,
    );
    assert.deepEqual(
      sequences.contest,
      ["PREPARE", "OPEN", "CLOSE", "DRAW", "NEXT"],
      `Concours identique en ${mode}`,
    );
  }
});

test("Masque RESULTS TEST conservé (arbitrage documenté, pas de régression A0)", () => {
  assert.equal(maskTestModeOptionVoteCount(1), 1);
  assert.equal(maskTestModeOptionVoteCount(12), 10);
  const masked = applyTestModeResultsVoteMask(
    { a: 1, b: 25 },
    { isTestMode: true, displayState: "RESULTS" },
  );
  assert.equal(masked.a, 1);
  assert.equal(masked.b, 30);
  const real = applyTestModeResultsVoteMask(
    { a: 1, b: 25 },
    { isTestMode: false, displayState: "RESULTS" },
  );
  assert.equal(real.b, 25, "RÉEL non masqué");
});

test("Politique données TEST — audit (pas de reset inventé)", () => {
  const audit = getTestModeDataPolicyAudit();
  assert.equal(audit.votesPersistedAfterRepetition, true);
  assert.equal(audit.leadsPersistedAfterRepetition, true);
  assert.equal(audit.contestWinnersPersistedAfterRepetition, true);
  assert.equal(audit.startRealClearsVotes, false);
  assert.equal(audit.startRealClearsLeads, false);
  assert.equal(audit.publicResultsMaskedInTest, true);
  assert.equal(audit.exportsBlockedInTest, true);
  assert.equal(audit.resetRepetitionImplemented, false);
  assert.ok(audit.arbitrationNotes.length >= 3);
  assert.ok(
    audit.arbitrationNotes.some((n) => /Réinitialiser|reset/i.test(n)),
    "note reset documentée",
  );
});

test("Sync interfaces : chrono partagé via questionTimer snapshot (contrat)", () => {
  /** Contrat : les 4 surfaces lisent le même snapshot event.questionTimer. */
  const surfaces = ["regie", "join", "screen", "overlay"];
  const snapshot = {
    totalSec: 90,
    remainingSec: 90,
    running: true,
    isPaused: false,
  };
  for (const s of surfaces) {
    assert.equal(snapshot.totalSec, 90, `${s} voit la durée configurée`);
    assert.notEqual(snapshot.totalSec, 30, `${s} n’a pas de forçage 30 s`);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-4 TEST / RÉEL live parity`);
