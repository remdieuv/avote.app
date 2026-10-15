/**
 * Régie — « Passer cette question » (UI state).
 * Exécution : node frontend/scripts/test-regie-skip-question.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSkipPollRequestBody,
  getRegieSkipQuestionState,
} from "../lib/regieSkipQuestion.js";

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

test("Disponible avec vote ouvert (confirm)", () => {
  const s = getRegieSkipQuestionState({
    isLocked: false,
    eventFinished: false,
    busy: false,
    hasActivePoll: true,
    hasNextPoll: true,
    voteState: "open",
    pollType: "SINGLE_CHOICE",
  });
  assert.equal(s.canSkip, true);
  assert.equal(s.needsConfirmOpenVote, true);
  assert.match(String(s.confirmMessage), /vote est encore ouvert/i);
});

test("Disponible après résultats / 0 vote", () => {
  const s = getRegieSkipQuestionState({
    isLocked: false,
    eventFinished: false,
    hasActivePoll: true,
    hasNextPoll: true,
    voteState: "closed",
    pollType: "MULTIPLE_CHOICE",
  });
  assert.equal(s.canSkip, true);
  assert.equal(s.needsConfirmOpenVote, false);
});

test("Quiz / Lead / Concours : même commande", () => {
  for (const type of ["QUIZ", "SINGLE_CHOICE", "CONTEST_ENTRY"]) {
    const s = getRegieSkipQuestionState({
      hasActivePoll: true,
      hasNextPoll: true,
      pollType: type,
      leadEnabled: type === "SINGLE_CHOICE" ? false : undefined,
      contestQuotaReached: type === "CONTEST_ENTRY" ? true : undefined,
    });
    assert.equal(s.buttonLabel, "Passer cette question");
    assert.equal(s.canSkip, true);
  }
  const lead = getRegieSkipQuestionState({
    hasActivePoll: true,
    hasNextPoll: true,
    pollType: "SINGLE_CHOICE",
    leadEnabled: true,
  });
  assert.equal(lead.canSkip, true);
});

test("Concours sans quota : abandon tirage", () => {
  const s = getRegieSkipQuestionState({
    hasActivePoll: true,
    hasNextPoll: true,
    pollType: "CONTEST_ENTRY",
    contestQuotaReached: false,
    voteState: "closed",
  });
  assert.equal(s.needsConfirmAbandonDraw, true);
  assert.match(String(s.confirmMessage), /tirage/i);
});

test("Dernière question → finish confirm", () => {
  const s = getRegieSkipQuestionState({
    hasActivePoll: true,
    hasNextPoll: false,
    voteState: "open",
  });
  assert.equal(s.isLastQuestion, true);
  assert.equal(s.canSkip, true);
  assert.match(String(s.finishConfirmMessage), /dernière question/i);
  assert.match(String(s.finishConfirmMessage), /vote est encore ouvert/i);
});

test("Verrouillé / terminé : bloqué", () => {
  assert.equal(
    getRegieSkipQuestionState({ isLocked: true, hasActivePoll: true, hasNextPoll: true })
      .canSkip,
    false,
  );
  assert.equal(
    getRegieSkipQuestionState({
      eventFinished: true,
      hasActivePoll: true,
      hasNextPoll: true,
    }).canSkip,
    false,
  );
});

test("buildSkipPollRequestBody", () => {
  const body = buildSkipPollRequestBody({
    needsConfirmOpenVote: true,
    needsConfirmAbandonDraw: false,
  });
  assert.deepEqual(body, {
    confirmOpenVote: true,
    confirmAbandonDraw: false,
  });
});

test("page.jsx branche Passer cette question", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("getRegieSkipQuestionState"));
  assert.ok(src.includes("handleSkipQuestion"));
  assert.ok(src.includes("skip-poll"));
  assert.ok(src.includes("buildSkipPollRequestBody"));
  assert.ok(src.includes("Passer cette question") || src.includes("skipQuestionState.buttonLabel"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll regie skip-question tests passed.");
