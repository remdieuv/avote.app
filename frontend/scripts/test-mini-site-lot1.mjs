/**
 * Lot 1 — socle mini-site frontend (shell, Accueil, Participer, admin).
 * Exécution : node frontend/scripts/test-mini-site-lot1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveVisibleMiniSiteTabs,
  miniSiteTabHref,
  MINI_SITE_TAB_LABELS,
} from "../lib/miniSiteUi.js";

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

const page = read("app/e/[slug]/page.jsx");
const participate = read("app/e/[slug]/participer/page.jsx");
const shell = read("components/minisite/MiniSiteShell.jsx");
const home = read("components/minisite/MiniSiteHome.jsx");
const part = read("components/minisite/MiniSiteParticipate.jsx");
const admin = read("app/admin/events/[eventId]/customization/page.jsx");
const landingEntry = read("app/admin/events/[eventId]/landing/page.jsx");
const hook = read("lib/useMiniSiteLanding.js");
const labels = read("lib/eventPageLabels.js");

test("onglets visibles : Accueil + Participer + Résultats si enabled", () => {
  const withResults = resolveVisibleMiniSiteTabs([
    { id: "accueil", enabled: true },
    { id: "participer", enabled: true },
    { id: "resultats", enabled: true },
    { id: "journal", enabled: true },
  ]);
  assert.deepEqual(
    withResults.map((t) => t.id),
    ["accueil", "participer", "resultats"],
  );
  const without = resolveVisibleMiniSiteTabs([
    { id: "accueil", enabled: true },
    { id: "participer", enabled: true },
    { id: "resultats", enabled: false },
    { id: "journal", enabled: true },
  ]);
  assert.deepEqual(
    without.map((t) => t.id),
    ["accueil", "participer"],
  );
  assert.equal(MINI_SITE_TAB_LABELS.resultats, "Résultats");
  assert.equal(miniSiteTabHref("demo", ""), "/e/demo");
  assert.equal(miniSiteTabHref("demo", "/participer"), "/e/demo/participer");
});

test("Accueil : MiniSiteShell + MiniSiteHome + fil transitionnel", () => {
  assert.match(page, /MiniSiteShell/);
  assert.match(page, /MiniSiteHome/);
  assert.match(page, /activeTab=["']accueil["']/);
  assert.match(page, /LandingHybridFeed/);
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /useMiniSiteLanding/);
  assert.doesNotMatch(page, /ev-landing-sticky-join|Participer au live/);
  assert.doesNotMatch(page, /iframe/);
});

test("Participer : route /e/[slug]/participer sans iframe ni moteur dupliqué", () => {
  assert.match(participate, /MiniSiteParticipate/);
  assert.match(participate, /activeTab=["']participer["']/);
  assert.doesNotMatch(participate, /iframe/i);
  assert.match(part, /\/join\//);
  assert.match(part, /\/p\//);
  assert.match(part, /Déjà répondu/);
  assert.match(part, /capacité maximale|pas une clôture définitive/i);
  assert.doesNotMatch(part, /submitVote|POST.*\/votes/);
});

test("Shell : pas d’onglets Lots 3–5 (ni Bientôt)", () => {
  assert.match(shell, /resolveVisibleMiniSiteTabs/);
  assert.match(shell, /EventLandingNav/);
  assert.match(shell, /AVOTE/);
  assert.doesNotMatch(shell, /Bientôt/);
  assert.doesNotMatch(shell, /journal|galerie|a-propos/);
  const tabs = resolveVisibleMiniSiteTabs([
    { id: "accueil", enabled: true },
    { id: "participer", enabled: true },
    { id: "resultats", enabled: false },
    { id: "journal", enabled: false },
    { id: "galerie", enabled: true },
    { id: "a-propos", enabled: true },
  ]);
  assert.deepEqual(
    tabs.map((t) => t.id),
    ["accueil", "participer"],
  );
});

test("Accueil : chiffres clés, news, partage, CTA", () => {
  assert.match(home, /miniSiteShowKeyStats/);
  assert.match(home, /publicStats/);
  assert.match(home, /latestNews|Dernière actualité/);
  assert.match(home, /MiniSiteShare/);
  assert.match(home, /publicStatus/);
});

test("hook : invite / SEO / landing off préservés", () => {
  assert.match(hook, /INVITE_REQUIRED/);
  assert.match(hook, /\/invite\//);
  assert.match(hook, /enabled === false/);
  assert.match(hook, /router\.replace\(`\/join\//);
  assert.match(hook, /meta\[name="robots"\]/);
});

test("admin landing : QR distincts + keyStats + toggle Résultats", () => {
  assert.match(landingEntry, /mode=["']landing["']/);
  assert.match(admin, /QRCodeSVG/);
  assert.match(admin, /QR participation directe/);
  assert.match(admin, /QR mini-site événementiel/);
  assert.match(admin, /miniSiteShowKeyStats/);
  assert.match(admin, /Afficher les chiffres clés/);
  assert.match(admin, /Navigation du mini-site/);
  assert.match(admin, /Afficher l’onglet Résultats/);
  assert.match(admin, /miniSiteTabResults/);
  assert.doesNotMatch(admin, /Bientôt/);
  assert.doesNotMatch(admin, /Lot\s*1|lots suivants/i);
  assert.doesNotMatch(
    admin,
    /id:\s*["']journal["']|id:\s*["']galerie["']/,
  );
  assert.match(admin, /\/join/);
  assert.match(admin, /\/e\//);
});

test("Accueil : bouton Partager lisible sur hero sombre", () => {
  assert.match(home, /variant=["']onDark["']/);
  assert.match(
    read("components/minisite/MiniSiteShare.jsx"),
    /variant === ["']onDark["']|onDark/,
  );
  assert.match(
    read("components/minisite/MiniSiteShare.jsx"),
    /Partager/,
  );
  assert.doesNotMatch(
    home,
    /MiniSiteShare[^>]*accent=["']#fff["']/,
  );
});

test("Participer : textes publics sans jargon technique", () => {
  assert.doesNotMatch(part, /Aucun nouveau moteur de vote/);
  assert.doesNotMatch(part, /participation directe restent inchangés/);
  assert.doesNotMatch(part, /consultation existante/);
});

test("libellés mini-site (pas de constructeur)", () => {
  assert.match(labels, /Mini-site/);
  assert.doesNotMatch(admin, /page builder|constructeur de pages/i);
  assert.doesNotMatch(admin, /miniSiteTabResults:\s*true/);
});

test("régie inchangée (pas d’import minisite dans la régie)", () => {
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /minisite|MiniSite/);
  assert.doesNotMatch(regie, /miniSiteShowKeyStats/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 1 mini-site frontend OK");
