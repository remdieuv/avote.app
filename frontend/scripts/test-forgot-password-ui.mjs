/**
 * UI / helpers — mot de passe oublié + garde-fou Placeholder.
 * Exécution : node scripts/test-forgot-password-ui.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isDisallowedDemoQuestionText,
  validateCreateEventForm,
  createBlankQuestion,
} from "../lib/createEventForm.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

test("pages forgot / reset présentes", () => {
  const forgot = readFileSync(join(root, "app/forgot-password/page.jsx"), "utf8");
  const reset = readFileSync(join(root, "app/reset-password/page.jsx"), "utf8");
  assert.match(forgot, /auth\/forgot-password/);
  assert.match(forgot, /Si un compte existe/);
  assert.match(reset, /auth\/reset-password/);
  assert.match(reset, /token/);
});

test("login expose le lien Mot de passe oublié", () => {
  const login = readFileSync(join(root, "app/login/page.jsx"), "utf8");
  assert.match(login, /\/forgot-password/);
  assert.match(login, /Mot de passe oublié/);
});

test("création refuse Placeholder question", () => {
  assert.equal(isDisallowedDemoQuestionText("Placeholder question"), true);
  const blank = {
    ...createBlankQuestion("q-1"),
    question: "Placeholder question",
    options: ["Oui", "Non"],
  };
  const v = validateCreateEventForm({
    eventTitle: "Test",
    questions: [blank],
  });
  assert.equal(v.ok, false);
  assert.match(String(v.formError || ""), /démonstration/i);
});

test("création accepte une vraie question", () => {
  const q = {
    ...createBlankQuestion("q-1"),
    question: "Qui gagne le match ?",
    options: ["A", "B"],
  };
  const v = validateCreateEventForm({
    eventTitle: "Soirée",
    questions: [q],
  });
  assert.equal(v.ok, true);
});

test("createBlankQuestion reste vide (pas de préremplissage Placeholder)", () => {
  const q = createBlankQuestion("q-1");
  assert.equal(q.question, "");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests forgot-password-ui OK");
