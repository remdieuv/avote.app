/**
 * Sous-titres Connexion / Inscription (parcours nouvel utilisateur).
 * Exécution : node scripts/test-login-auth-copy.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

test("login/register : sous-titres parcours (pas admin)", () => {
  const src = readFileSync(join(root, "app/login/page.jsx"), "utf8");
  assert.match(
    src,
    /Connectez-vous pour organiser et gérer vos événements\./,
  );
  assert.match(
    src,
    /Créez votre compte gratuitement et lancez votre premier événement jusqu'à 10 participants\./,
  );
  assert.doesNotMatch(src, /Accès réservé à l’administration des événements/);
  assert.match(src, /mode === "register"/);
  assert.match(src, /router\.replace\(nextPath\)/);
  assert.match(src, /\/auth\/register/);
  assert.match(src, /\/auth\/login/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll login auth copy tests passed.");
