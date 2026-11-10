/**
 * Lot 1 UX — copy MODE TEST / activations.
 * Exécution : node frontend/scripts/test-test-mode-activation-copy.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCOUNT_NO_ACTIVATION_BODY,
  ACCOUNT_NO_ACTIVATION_TITLE,
  ERR_NO_ACTIVATION_AVAILABLE,
  ERR_NO_EVENT_CREDIT,
  REGIE_NO_ACTIVATION_HINT,
  REGIE_NO_ACTIVATION_STATUS,
  REGIE_START_REAL_MODAL_INTRO,
  getAccountActivationExplain,
  getRegieTestModeHelpLine,
  isActivationShortageError,
  messageForStartRealErrorCode,
} from "../lib/testModeActivationCopy.js";

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

test("0 activation : messages non anxiogènes + MODE TEST gratuit", () => {
  assert.match(REGIE_NO_ACTIVATION_STATUS, /MODE TEST/i);
  assert.match(REGIE_NO_ACTIVATION_STATUS, /gratuit|OK/i);
  assert.doesNotMatch(REGIE_NO_ACTIVATION_STATUS, /^Aucune activation disponible$/);
  assert.match(REGIE_NO_ACTIVATION_HINT, /live réel/i);
  assert.match(ACCOUNT_NO_ACTIVATION_TITLE, /0 activation|gratuit/i);
  assert.match(ACCOUNT_NO_ACTIVATION_BODY, /MODE TEST/i);
  assert.match(ACCOUNT_NO_ACTIVATION_BODY, /live réel/i);
  assert.match(getRegieTestModeHelpLine(), /Répétition|gratuit/i);
  assert.match(REGIE_START_REAL_MODAL_INTRO, /MODE TEST/i);
  assert.match(REGIE_START_REAL_MODAL_INTRO, /activation/i);
});

test("Compte : explain 0 vs avec activations", () => {
  const empty = getAccountActivationExplain({ hasActivation: false });
  assert.equal(empty.title, ACCOUNT_NO_ACTIVATION_TITLE);
  assert.match(empty.body, /sans activation|MODE TEST/i);
  const filled = getAccountActivationExplain({ hasActivation: true });
  assert.match(filled.title, /activations/i);
  assert.match(filled.body, /live réel/i);
});

test("Codes API start-real mappés clairement", () => {
  assert.equal(messageForStartRealErrorCode("NO_EVENT_CREDIT"), ERR_NO_EVENT_CREDIT);
  assert.equal(
    messageForStartRealErrorCode("NO_ACTIVATION_AVAILABLE"),
    ERR_NO_ACTIVATION_AVAILABLE,
  );
  assert.match(ERR_NO_EVENT_CREDIT, /MODE TEST/i);
  assert.match(ERR_NO_ACTIVATION_AVAILABLE, /MODE TEST/i);
});

test("isActivationShortageError couvre anciennes et nouvelles formulations", () => {
  assert.equal(isActivationShortageError(ERR_NO_EVENT_CREDIT), true);
  assert.equal(isActivationShortageError(ERR_NO_ACTIVATION_AVAILABLE), true);
  assert.equal(
    isActivationShortageError("Aucune activation disponible pour cette formule."),
    true,
  );
  assert.equal(
    isActivationShortageError(
      "Vous n’avez plus d’activation disponible. Choisissez une formule pour lancer le live réel.",
    ),
    true,
  );
  assert.equal(isActivationShortageError("Cet événement est terminé et verrouillé."), false);
  assert.equal(isActivationShortageError(""), false);
});

test("Régie + compte branchent la lib (pas de libellé brut isolé)", () => {
  const regie = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const account = readFileSync(join(here, "../app/admin/account/page.jsx"), "utf8");
  assert.match(regie, /testModeActivationCopy/);
  assert.match(regie, /REGIE_NO_ACTIVATION_STATUS/);
  assert.match(regie, /isActivationShortageError/);
  assert.match(regie, /messageForStartRealErrorCode/);
  assert.match(regie, /getRegieTestModeHelpLine/);
  assert.match(regie, /REGIE_START_REAL_MODAL_INTRO/);
  assert.match(account, /getAccountActivationExplain/);
  assert.match(account, /ACCOUNT_ACTIVATIONS_INTRO/);
  assert.ok(
    !regie.includes(">Aucune activation disponible<") &&
      !regie.includes('"Aucune activation disponible"'),
    "régie : plus de libellé anxiogène isolé",
  );
  assert.ok(
    !account.includes('"Aucune activation disponible"') &&
      !account.includes(">Aucune activation disponible<"),
    "compte : plus de libellé anxiogène isolé",
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll test-test-mode-activation-copy tests passed.");
