/**
 * Régie — guards UI Modifier + miroir PATCH.
 * Exécution : node frontend/scripts/test-regie-poll-edit-guards.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getRegiePollEditGuardState } from "../lib/regiePollEditGuards.js";

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

test("Verrouillé : soft + quiz bloqués", () => {
  const g = getRegiePollEditGuardState({
    isLocked: true,
    isLiveConsumed: true,
    voteCount: 0,
    isQuiz: true,
  });
  assert.equal(g.canEditSoftFields, false);
  assert.equal(g.canEditQuizCorrect, false);
  assert.ok(g.lockedReason);
});

test("RÉEL + votes : quiz bloqué, soft OK + warning", () => {
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 4,
    quizRevealed: false,
    isQuiz: true,
  });
  assert.equal(g.canEditSoftFields, true);
  assert.equal(g.canEditQuizCorrect, false);
  assert.ok(g.quizBlockedReason);
  assert.ok(g.softWarning);
});

test("RÉEL + révélée : quiz bloqué", () => {
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 0,
    quizRevealed: true,
    isQuiz: true,
  });
  assert.equal(g.canEditQuizCorrect, false);
  assert.match(String(g.quizBlockedReason), /révél/i);
});

test("TEST + votes : quiz encore éditable + hint", () => {
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: false,
    voteCount: 2,
    isQuiz: true,
  });
  assert.equal(g.canEditQuizCorrect, true);
  assert.ok(g.quizHint);
  assert.ok(g.softWarning);
});

test("page.jsx câble guards Modifier", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("getRegiePollEditGuardState"));
  assert.ok(src.includes("pollEditGuard"));
  assert.ok(src.includes("canEditQuizCorrect"));
  assert.ok(src.includes("quizBlockedReason"));
  const modalStart = src.indexOf("Modifier la question");
  assert.ok(modalStart > 0);
  const modal = src.slice(modalStart, modalStart + 6000);
  assert.ok(modal.includes("pollEditGuard.canEditSoftFields"));
  assert.ok(modal.includes("pollEditGuard.canEditQuizCorrect"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie poll edit guards");
