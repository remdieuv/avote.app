/**
 * Landing publique /e/[slug] — non-régression après Lot 1 mini-site.
 * Exécution : node frontend/scripts/test-landing-public-ux-lot2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const home = readFileSync(
  join(root, "components/minisite/MiniSiteHome.jsx"),
  "utf8",
);
const hook = readFileSync(join(root, "lib/useMiniSiteLanding.js"), "utf8");
const backend = readFileSync(join(root, "../backend/server.js"), "utf8");

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

test("showcase ✨ : présentation conservée en transition", () => {
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /showEvenementSection/);
  assert.doesNotMatch(page, /Photos & infos/);
  assert.doesNotMatch(page, /showShowcaseBlock && livePriority/);
});

test("labels adaptés mode — pas de Live systématique dans Accueil", () => {
  assert.match(page, /getLandingEvenementLead/);
  assert.match(home, /publicStatus/);
  assert.match(home, /statusLabel/);
  assert.doesNotMatch(home, /Participer au live/);
  assert.doesNotMatch(home, /Live en cours/);
  assert.match(page, /LandingHybridFeed/);
});

test("CTA Accueil via statut public + Participer", () => {
  assert.match(home, /ctaLabel/);
  assert.match(home, /ctaHref/);
  assert.match(home, /\/participer/);
  assert.match(home, /joinPath|\/join\//);
});

test("shell mobile-first + couverture bornée", () => {
  assert.match(home, /min\(42vh,\s*28rem\)|maxHeight:\s*"32rem"/);
  assert.match(page, /MiniSiteShell/);
});

test("soft-refresh feed ~30s pendant / après", () => {
  assert.match(page, /30_000/);
  assert.match(page, /setInterval\(softRefresh/);
  assert.match(page, /phase !== "during" && phase !== "after"/);
  assert.match(page, /events\/slug\/\$\{encodeURIComponent\(slug\)\}\/landing/);
});

test("infoShowOnFinished exposé API (présentation conservée)", () => {
  assert.match(
    backend,
    /infoShowOnFinished: info\.infoShowOnFinished !== false/,
  );
});

test("vocabulaire public fil hybride + mini-site", () => {
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /LandingHybridFeed/);
  assert.match(home, /MiniSiteShare|Partager/);
  assert.doesNotMatch(page, /Galerie live/);
});

test("redirect landing off + invite conservés", () => {
  assert.match(hook, /data\?\.enabled === false/);
  assert.match(hook, /router\.replace\(`\/join\/\$\{encodeURIComponent\(slug\)\}`\)/);
  assert.match(hook, /INVITE_REQUIRED/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 2 landing publique OK (adaptés Lot 1)");
