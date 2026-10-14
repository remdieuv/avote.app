/**
 * Guards PATCH /polls/:id — soft vs sensible, TEST vs RÉEL.
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
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 403);
});

test("RÉEL + votes + quizCorrect → 409", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 3,
    quizRevealed: false,
    wantsQuizCorrectChange: true,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
  assert.match(String(g.error), /votes/i);
});

test("RÉEL + révélée sans votes + quizCorrect → 409", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 0,
    quizRevealed: true,
    wantsQuizCorrectChange: true,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
  assert.match(String(g.error), /révélation/i);
});

test("RÉEL soft edit avec votes → OK", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 5,
    quizRevealed: true,
    wantsQuizCorrectChange: false,
  });
  assert.equal(g.ok, true);
  assert.equal(g.softEditWithVotes, true);
});

test("TEST + votes + quizCorrect → OK", () => {
  const g = evaluatePollPatchGuards({
    isLocked: false,
    isLiveConsumed: false,
    voteCount: 2,
    quizRevealed: false,
    wantsQuizCorrectChange: true,
  });
  assert.equal(g.ok, true);
  assert.equal(g.isTestMode, true);
});

test("Détection body quizCorrectOrder / soft", () => {
  assert.equal(
    pollPatchRequestsQuizCorrectChange({ quizCorrectOrder: 1 }, "QUIZ"),
    true,
  );
  assert.equal(
    pollPatchRequestsQuizCorrectChange({ quizCorrectOrder: 1 }, "SINGLE_CHOICE"),
    false,
  );
  assert.equal(pollPatchRequestsSoftFields({ question: "Hello" }, "QUIZ"), true);
  assert.equal(
    pollPatchRequestsSoftFields({ contestPrize: "Lot" }, "CONTEST_ENTRY"),
    true,
  );
});

test("server.js branche les guards PATCH", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.ok(src.includes("evaluatePollPatchGuards"));
  assert.ok(src.includes("pollPatchRequestsQuizCorrectChange"));
  const patchIdx = src.indexOf('app.patch("/polls/:pollId"');
  assert.ok(patchIdx > 0);
  const slice = src.slice(patchIdx, patchIdx + 2500);
  assert.ok(slice.includes("evaluatePollPatchGuards"));
  assert.ok(slice.includes("isLocked"));
  assert.ok(slice.includes("_count"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — poll patch guards");
