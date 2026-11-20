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
  CREATE_EVENT_AFTER_FOOTNOTE,
  ERR_NO_ACTIVATION_AVAILABLE,
  ERR_NO_EVENT_CREDIT,
  NEW_USER_FREE_LIVE_LINE,
  NEW_USER_TOPUP_LINE,
  NEW_USER_TOPUP_LINE_SHORT,
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

test("0 activation : messages non anxiogènes + MODE TEST / gratuit 10", () => {
  assert.match(REGIE_NO_ACTIVATION_STATUS, /MODE TEST/i);
  assert.match(REGIE_NO_ACTIVATION_STATUS, /gratuit|OK/i);
  assert.doesNotMatch(REGIE_NO_ACTIVATION_STATUS, /^Aucune activation disponible$/);
  assert.match(REGIE_NO_ACTIVATION_HINT, /10|gratuit/i);
  assert.match(ACCOUNT_NO_ACTIVATION_TITLE, /0 pack|gratuit/i);
  assert.match(ACCOUNT_NO_ACTIVATION_BODY, /MODE TEST/i);
  assert.match(ACCOUNT_NO_ACTIVATION_BODY, /10|gratuit/i);
  assert.match(getRegieTestModeHelpLine(), /Répétition|gratuit|10/i);
  assert.match(getRegieTestModeHelpLine(), /Démarrer gratuitement dans la régie/);
  assert.match(getRegieTestModeHelpLine(), /Ajoutez des participants/);
  assert.match(REGIE_START_REAL_MODAL_INTRO, /MODE TEST/i);
  assert.match(REGIE_START_REAL_MODAL_INTRO, /pack|gratuit|10/i);
});

test("Parcours nouvel utilisateur : free live + recharge (sans double 10)", () => {
  assert.match(NEW_USER_FREE_LIVE_LINE, /10 participants/);
  assert.match(NEW_USER_FREE_LIVE_LINE, /Démarrer gratuitement dans la régie/);
  assert.match(NEW_USER_TOPUP_LINE, /10 participants inclus/);
  assert.match(NEW_USER_TOPUP_LINE, /Ajoutez des participants/);
  assert.match(NEW_USER_TOPUP_LINE_SHORT, /Ajoutez des participants/);
  assert.doesNotMatch(NEW_USER_TOPUP_LINE_SHORT, /10 participants/);
  assert.match(CREATE_EVENT_AFTER_FOOTNOTE, /MODE TEST/);
  assert.match(CREATE_EVENT_AFTER_FOOTNOTE, /Démarrer gratuitement dans la régie/);
  assert.match(CREATE_EVENT_AFTER_FOOTNOTE, /Ajoutez des participants/);
});

test("Compte : explain 0 vs avec activations", () => {
  const empty = getAccountActivationExplain({ hasActivation: false });
  assert.equal(empty.title, ACCOUNT_NO_ACTIVATION_TITLE);
  assert.match(empty.body, /sans paiement|sans activation|MODE TEST/i);
  const filled = getAccountActivationExplain({ hasActivation: true });
  assert.match(filled.title, /packs|activations/i);
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

test("Régie + compte + create branchent la lib (pas de libellé brut isolé)", () => {
  const regie = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const account = readFileSync(join(here, "../app/admin/account/page.jsx"), "utf8");
  const create = readFileSync(join(here, "../app/admin/page.js"), "utf8");
  assert.match(regie, /testModeActivationCopy/);
  assert.match(regie, /REGIE_NO_ACTIVATION_STATUS/);
  assert.match(regie, /isActivationShortageError/);
  assert.match(regie, /messageForStartRealErrorCode/);
  assert.match(regie, /getRegieTestModeHelpLine/);
  assert.match(regie, /REGIE_START_REAL_MODAL_INTRO/);
  assert.match(account, /getAccountActivationExplain/);
  assert.match(account, /ACCOUNT_ACTIVATIONS_INTRO/);
  assert.match(create, /CREATE_EVENT_AFTER_FOOTNOTE/);
  assert.match(create, /NEW_USER_FREE_LIVE_LINE/);
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
