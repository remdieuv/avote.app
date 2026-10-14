/**
 * Validations réponses partagées création / Modifier.
 * Exécution : node frontend/scripts/test-poll-options-form.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  POLL_OPTIONS_MAX,
  POLL_OPTIONS_MIN,
  normalizePollOptionLabels,
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

test("normalize + min/max", () => {
  assert.deepEqual(normalizePollOptionLabels([" a ", "", "b"]), ["a", "b"]);
  assert.equal(POLL_OPTIONS_MIN, 2);
  assert.equal(POLL_OPTIONS_MAX, 32);
  assert.equal(validatePollOptionLabels(["x"]).ok, false);
  assert.equal(
    validatePollOptionLabels(Array.from({ length: 33 }, (_, i) => `o${i}`)).ok,
    false,
  );
});

test("types éditables", () => {
  assert.equal(pollTypeAllowsOptionEdit("SINGLE_CHOICE"), true);
  assert.equal(pollTypeAllowsOptionEdit("MULTIPLE_CHOICE"), true);
  assert.equal(pollTypeAllowsOptionEdit("QUIZ"), true);
  assert.equal(pollTypeAllowsOptionEdit("CONTEST_ENTRY"), false);
});

test("AjouterQuestionLiveModal réutilise validatePollOptionLabels", () => {
  const src = readFileSync(
    join(here, "../components/AjouterQuestionLiveModal.jsx"),
    "utf8",
  );
  assert.ok(src.includes("validatePollOptionLabels"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — poll options form");
