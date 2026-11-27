/**
 * Bandeau compact commun mini-site (hors Accueil).
 * Exécution : node frontend/scripts/test-mini-site-bandeau-compact.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

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

const banner = read("components/minisite/MiniSiteCompactBanner.jsx");
const shell = read("components/minisite/MiniSiteShell.jsx");
const home = read("components/minisite/MiniSiteHome.jsx");
const accueil = read("app/e/[slug]/page.jsx");
const participer = read("app/e/[slug]/participer/page.jsx");
const resultats = read("app/e/[slug]/resultats/page.jsx");
const detail = read("app/e/[slug]/resultats/[pollId]/page.jsx");

test("composant bandeau : cover, logo, titre, statut, hauteur, sans CTA/description", () => {
  assert.match(banner, /coverUrl/);
  assert.match(banner, /logoUrl/);
  assert.match(banner, /statusLabel/);
  assert.match(banner, /primaryColor|resolveMiniSiteAccent/);
  assert.match(banner, /min-height:\s*90px/);
  assert.match(banner, /min-height:\s*120px/);
  assert.match(banner, /linear-gradient/);
  assert.doesNotMatch(banner, /ctaLabel|MiniSiteShare|description/);
  assert.match(banner, /resolveApiAssetUrlNullable/);
});

test("shell : bandeau hors Accueil uniquement", () => {
  assert.match(shell, /MiniSiteCompactBanner/);
  assert.match(shell, /activeTab !== ["']accueil["']/);
  assert.match(shell, /landingPayload/);
});

test("Accueil : grand hero conservé, pas de bandeau compact forcé", () => {
  assert.match(home, /ms-home-hero/);
  assert.match(accueil, /activeTab=["']accueil["']/);
  assert.doesNotMatch(accueil, /landingPayload=\{payload\}/);
});

test("Participer + Résultats + détail passent landingPayload", () => {
  assert.match(participer, /landingPayload=\{payload\}/);
  assert.match(resultats, /landingPayload=\{payload\}/);
  assert.match(detail, /landingPayload=\{payload\}/);
});

test("pas de réglage orga / migration / régie", () => {
  assert.doesNotMatch(banner, /miniSiteTab|PATCH|prisma|migrate/i);
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /MiniSiteCompactBanner/);
  const admin = read("app/admin/events/[eventId]/customization/page.jsx");
  assert.doesNotMatch(admin, /bandeau compact|MiniSiteCompactBanner/i);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests bandeau compact mini-site OK");
