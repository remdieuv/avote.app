/**
 * Lot 1 finition UX — partage, libellé salle, textes publics, invite, admin.
 * Exécution : node frontend/scripts/test-lot1-finition-ux.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

test("bouton Partager : contraste onDark + libellé visible", () => {
  const share = read("components/minisite/MiniSiteShare.jsx");
  const home = read("components/minisite/MiniSiteHome.jsx");
  assert.match(share, /variant === ["']onDark["']/);
  assert.match(share, /rgba\(255,255,255,0\.14\)/);
  assert.match(share, /color:\s*onDark\s*\?\s*["']#fff["']/);
  assert.match(share, /\{copied \? ["']Lien copié["'] : ["']Partager["']\}/);
  assert.match(home, /variant=["']onDark["']/);
  assert.doesNotMatch(home, /accent=["']#fff["']/);
});

test("salle → mini-site : libellé Mini-site de l’événement", () => {
  const join = read("components/JoinLiveHub.jsx");
  assert.match(join, /Mini-site de l&apos;événement|Mini-site de l’événement/);
  assert.doesNotMatch(join, /Voir les photos & infos|Photos & infos/);
  assert.match(join, /href=\{`\/e\/\$\{encodeURIComponent\(slug\)\}`\}/);
});

test("Participer : pas de formulations techniques", () => {
  const part = read("components/minisite/MiniSiteParticipate.jsx");
  assert.doesNotMatch(part, /Aucun nouveau moteur de vote/);
  assert.doesNotMatch(part, /lien de participation directe restent inchangés/);
  assert.doesNotMatch(part, /consultation existante/);
  assert.match(part, /Répondez à votre rythme|Rejoignez la salle interactive/);
});

test("invite : explication connexion avant code, pas de champs inactifs", () => {
  const invite = read("app/invite/[slug]/page.jsx");
  assert.match(invite, /Connexion requise/);
  assert.match(invite, /Avant de pouvoir saisir le code d’accès/);
  assert.match(invite, /Se connecter ou créer un compte/);
  // Formulaire code uniquement dans la branche connectée
  const authedBlock = invite.slice(invite.indexOf("Compte connecté"));
  assert.match(authedBlock, /Code d’accès/);
  assert.match(authedBlock, /Accéder aux souvenirs/);
});

test("admin : pas de référence aux lots de développement", () => {
  const admin = read("app/admin/events/[eventId]/customization/page.jsx");
  assert.match(admin, /Navigation du mini-site/);
  assert.match(admin, /Pages publiées pour vos visiteurs/);
  assert.doesNotMatch(admin, /Lot\s*1\s*:/);
  assert.doesNotMatch(admin, /lots suivants/i);
  assert.doesNotMatch(admin, /côté serveur pour les lots/i);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 1 finition UX OK");
