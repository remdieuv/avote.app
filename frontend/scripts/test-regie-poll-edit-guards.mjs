/**
 * Régie — guards UI Modifier (options + soft + Consulter).
 * Exécution : node frontend/scripts/test-regie-poll-edit-guards.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getRegiePollEditGuardState } from "../lib/regiePollEditGuards.js";
import {
  pollTypeAllowsOptionEdit,
  validatePollOptionLabels,
} from "../lib/pollOptionsForm.js";

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

test("Verrouillé : Consulter + tout bloqué", () => {
  const g = getRegiePollEditGuardState({
    isLocked: true,
    isLiveConsumed: true,
    voteCount: 0,
    isQuiz: true,
    allowsOptionEdit: true,
  });
  assert.equal(g.editActionLabel, "Consulter");
  assert.equal(g.canEditSoftFields, false);
  assert.equal(g.canEditOptions, false);
  assert.equal(g.canEditQuizCorrect, false);
});

test("RÉEL + 0 vote : options OK (Single / Multiple / Quiz)", () => {
  for (const type of ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "QUIZ"]) {
    assert.equal(pollTypeAllowsOptionEdit(type), true);
  }
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 0,
    isQuiz: true,
    allowsOptionEdit: true,
  });
  assert.equal(g.canEditOptions, true);
  assert.equal(g.canEditQuizCorrect, true);
  assert.equal(g.editActionLabel, "Modifier");
});

test("RÉEL + votes : options bloquées, soft OK", () => {
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: true,
    voteCount: 4,
    isQuiz: true,
    allowsOptionEdit: true,
  });
  assert.equal(g.canEditSoftFields, true);
  assert.equal(g.canEditOptions, false);
  assert.equal(g.canEditQuizCorrect, false);
  assert.match(String(g.optionsBlockedReason), /réel/i);
});

test("TEST + votes : options bloquées (replay), quizCorrect encore OK", () => {
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: false,
    voteCount: 2,
    isQuiz: true,
    allowsOptionEdit: true,
  });
  assert.equal(g.canEditOptions, false);
  assert.match(String(g.optionsBlockedReason), /Rejouer/i);
  assert.equal(g.canEditQuizCorrect, true);
});

test("CONTEST : options non éditables", () => {
  assert.equal(pollTypeAllowsOptionEdit("CONTEST_ENTRY"), false);
  const g = getRegiePollEditGuardState({
    isLocked: false,
    isLiveConsumed: false,
    voteCount: 0,
    allowsOptionEdit: false,
  });
  assert.equal(g.canEditOptions, false);
});

test("validatePollOptionLabels partagé", () => {
  assert.equal(validatePollOptionLabels(["A", "  "]).ok, false);
  assert.deepEqual(validatePollOptionLabels([" A ", "B"]).labels, ["A", "B"]);
});

test("page.jsx : éditeur réponses + Consulter", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("editOptionLabels"));
  assert.ok(src.includes("canEditOptions"));
  assert.ok(src.includes("optionsBlockedReason"));
  assert.ok(src.includes('editActionLabel={playlistEditActionLabel}'));
  assert.ok(src.includes('playlistEditActionLabel = eventLocked ? "Consulter"'));
  assert.ok(src.includes("validatePollOptionLabels"));
  assert.ok(src.includes("options: optionsPayload"));
  assert.ok(src.includes("+ Ajouter une réponse"));
  assert.ok(src.includes("pollEditGuard.canEditOptions"));
  assert.ok(src.includes("Consulter la question"));
  assert.ok(src.includes("editOptionLabels.map"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie poll edit guards");
