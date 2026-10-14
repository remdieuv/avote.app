/**
 * Guards PATCH /polls/:id — soft / options / quiz, TEST vs RÉEL.
 * Exécution : node backend/scripts/test-poll-patch-guards.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  evaluatePollPatchGuards,
  pollPatchRequestsQuizCorrectChange,
  pollPatchRequestsSoftFields,
  pollPatchRequestsOptionsChange,
  validatePollOptionLabels,
} = require("../lib/pollPatchGuards.js");

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

test("Événement verrouillé → 403", () => {
  const g = evaluatePollPatchGuards({
    isLocked: true,
    isLiveConsumed: true,
    voteCount: 0,
    wantsQuizCorrectChange: false,
    wantsOptionsChange: true,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 403);
});

test("RÉEL + votes + options → 409", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 3,
    wantsOptionsChange: true,
    wantsQuizCorrectChange: false,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
  assert.match(String(g.error), /réel/i);
});

test("TEST + votes + options → 409 replay", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: false,
    voteCount: 2,
    wantsOptionsChange: true,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
  assert.match(String(g.error), /Rejouer/i);
});

test("RÉEL + 0 vote + options → OK", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 0,
    quizRevealed: true,
    wantsOptionsChange: true,
    wantsQuizCorrectChange: true,
  });
  assert.equal(g.ok, true);
});

test("RÉEL + votes + quizCorrect seul → 409", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 3,
    quizRevealed: false,
    wantsQuizCorrectChange: true,
    wantsOptionsChange: false,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
});

test("RÉEL soft edit avec votes → OK", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 5,
    quizRevealed: true,
    wantsQuizCorrectChange: false,
    wantsOptionsChange: false,
  });
  assert.equal(g.ok, true);
});

test("TEST + votes + quizCorrect seul → OK", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: false,
    voteCount: 2,
    wantsQuizCorrectChange: true,
    wantsOptionsChange: false,
  });
  assert.equal(g.ok, true);
});

test("Validation labels options", () => {
  assert.equal(validatePollOptionLabels(["A"]).ok, false);
  assert.equal(validatePollOptionLabels(["A", "B"]).ok, true);
  assert.equal(
    pollPatchRequestsOptionsChange({ options: ["A", "B"] }, "SINGLE_CHOICE"),
    true,
  );
  assert.equal(
    pollPatchRequestsOptionsChange({ options: ["Oui", "Non"] }, "CONTEST_ENTRY"),
    false,
  );
  assert.equal(
    pollPatchRequestsQuizCorrectChange({ quizCorrectOrder: 1 }, "QUIZ"),
    true,
  );
  assert.equal(pollPatchRequestsSoftFields({ question: "Hello" }, "QUIZ"), true);
});

test("server.js PATCH : options + guards + emit sync", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const patchIdx = src.indexOf('app.patch("/polls/:pollId"');
  assert.ok(patchIdx > 0);
  const slice = src.slice(patchIdx, patchIdx + 6500);
  assert.ok(slice.includes("evaluatePollPatchGuards"));
  assert.ok(slice.includes("wantsOptionsChange"));
  assert.ok(slice.includes("applyPollOptionsPatch"));
  assert.ok(slice.includes("resolvePatchOptionsRequest"));
  assert.ok(slice.includes("emitPollUpdated"));
  assert.ok(slice.includes("emitEventLiveUpdated"));
  assert.ok(slice.includes("_count"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — poll patch guards");
