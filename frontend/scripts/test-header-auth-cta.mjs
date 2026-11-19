/**
 * Bouton droit header pages classiques — Se connecter / Mon compte.
 * Exécution : node frontend/scripts/test-header-auth-cta.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let failed = 0;

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

test("HeaderAuthCta : libellés et cibles", () => {
  const src = read("components/navigation/HeaderAuthCta.jsx");
  assert.match(src, /Se connecter/);
  assert.match(src, /Mon compte/);
  assert.match(src, /\/admin\/account/);
  assert.match(src, /\/login\?next=/);
  assert.doesNotMatch(src, /Mes événements|Créer un événement|\/admin\/events/);
});

test("LandingHeader : un seul CTA via HeaderAuthCta", () => {
  const src = read("components/landing/LandingHeader.jsx");
  assert.match(src, /HeaderAuthCta/);
  assert.match(src, /rightSlot=\{<HeaderAuthCta/);
  assert.doesNotMatch(src, /Mes événements|Créer un événement|landing-header-cta/);
});

test("EventLandingNav : même CTA (variant subtle)", () => {
  const src = read("components/event/EventLandingNav.jsx");
  assert.match(src, /HeaderAuthCta/);
  assert.match(src, /variant=["']subtle["']/);
  assert.doesNotMatch(src, /Mes événements|\/admin\/events/);
});

test("AdminAccountBar : Mes événements reste en nav, Mon compte à droite", () => {
  const bar = read("components/admin/AdminAccountBar.jsx");
  assert.match(bar, /href:\s*["']\/admin\/events["']/);
  assert.match(bar, /Mes événements/);
  assert.match(bar, /AdminAccountMenu/);
  const menu = read("components/admin/AdminAccountMenu.jsx");
  assert.match(menu, /Mon compte/);
  assert.match(menu, /\/admin\/account/);
});

test("Régie non touchée", () => {
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /HeaderAuthCta|LandingHeader/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — header auth CTA");
