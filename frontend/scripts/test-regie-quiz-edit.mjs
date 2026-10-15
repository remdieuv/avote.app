/**
 * Régie — statut « Bonne réponse » dans Modifier.
 * Exécution : node frontend/scripts/test-regie-quiz-edit.mjs
 */
import assert from "node:assert/strict";
import {
  getQuizCorrectAnswerEditStatus,
  getSavedQuizCorrectAnswer,
} from "../lib/regieQuizEdit.js";

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

test("Aucune bonne réponse enregistrée", () => {
  const poll = {
    options: [
      { label: "Alice", isCorrect: false },
      { label: "Bob", isCorrect: false },
    ],
  };
  const saved = getSavedQuizCorrectAnswer(poll);
  assert.equal(saved.hasSaved, false);
  assert.equal(saved.label, null);
  const st = getQuizCorrectAnswerEditStatus({ poll, draftOrder: 0 });
  assert.equal(st.hasSaved, false);
  assert.equal(st.draftPending, true);
  assert.equal(st.draftLabel, "Alice");
});

test("Bonne réponse enregistrée = libellé en base", () => {
  const poll = {
    options: [
      { label: "Alice", isCorrect: false },
      { label: "Bob", isCorrect: true },
      { label: "Carla", isCorrect: false },
    ],
  };
  const saved = getSavedQuizCorrectAnswer(poll);
  assert.equal(saved.hasSaved, true);
  assert.equal(saved.index, 1);
  assert.equal(saved.label, "Bob");
  const st = getQuizCorrectAnswerEditStatus({ poll, draftOrder: 1 });
  assert.equal(st.hasSaved, true);
  assert.equal(st.savedLabel, "Bob");
  assert.equal(st.draftPending, false);
});

test("Brouillon différent → modification non enregistrée", () => {
  const poll = {
    options: [
      { label: "Paris", isCorrect: true },
      { label: "Lyon", isCorrect: false },
    ],
  };
  const st = getQuizCorrectAnswerEditStatus({ poll, draftOrder: 1 });
  assert.equal(st.hasSaved, true);
  assert.equal(st.savedLabel, "Paris");
  assert.equal(st.draftPending, true);
  assert.equal(st.draftLabel, "Lyon");
});

test("Label vide → Option N", () => {
  const poll = {
    options: [
      { label: "  ", isCorrect: true },
      { label: "B", isCorrect: false },
    ],
  };
  assert.equal(getSavedQuizCorrectAnswer(poll).label, "Option 1");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie quiz edit bonne réponse");
