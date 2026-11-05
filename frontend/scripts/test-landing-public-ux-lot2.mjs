/**
 * Lot 2 — Landing publique UX (/e/[slug]).
 * Garde-fous structurels : galerie mobile pendant, CTA/phase, FAB, soft-refresh, infoShowOnFinished.
 * Exécution : node frontend/scripts/test-landing-public-ux-lot2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const backend = readFileSync(
  join(root, "../backend/server.js"),
  "utf8",
);

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

test("showcase ✨ : présentation V2 (carte galerie responsive)", () => {
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /showEvenementSection/);
  // Plus de branche « livePriority ? grille seule »
  assert.doesNotMatch(page, /Photos & infos/);
  assert.doesNotMatch(page, /showShowcaseBlock && livePriority/);
  assert.doesNotMatch(page, /showShowcaseBlock && !livePriority/);
});

test("labels après : pas « Avant le live » ; lead souvenirs / fil", () => {
  assert.doesNotMatch(page, /Avant le live/);
  assert.match(page, /Retrouvez l'ambiance et les temps forts/);
  assert.match(page, /Live en cours|Événement terminé/);
  // Lot hybride : Moments remplacé par le fil chronologique
  assert.match(page, /LandingHybridFeed/);
});

test("un CTA dominant par phase", () => {
  // Avant : milieu Rejoindre la salle
  assert.match(page, /Rejoindre la salle/);
  // Pendant : sticky + hero desktop (classe hero-cta-during masquée mobile)
  assert.match(page, /ev-landing-hero-cta-during/);
  assert.match(page, /ev-landing-sticky-join/);
  assert.match(page, /Participer au live/);
  // Footer avant/pendant = lien texte « Accéder à la salle » ; après = masqué
  assert.match(page, /ev-landing-footer-link/);
  assert.match(page, /Accéder à la salle/);
  assert.match(page, /!afterLive\s*\?\s*\(/);
  assert.doesNotMatch(page, /Revoir la salle/);
  // Plus de CTA milieu pendant (desktop dupliqué)
  assert.doesNotMatch(page, /ev-landing-live-cta-desktop/);
});

test("breakpoint sticky / hero aligné 768", () => {
  assert.match(page, /@media \(max-width: 767px\)/);
  assert.doesNotMatch(page, /max-width: 720px/);
});

test("FAB au-dessus de la sticky pendant le live", () => {
  assert.match(page, /ev-landing-upload-fab--above-sticky/);
  assert.match(page, /5\.5rem \+ env\(safe-area-inset-bottom/);
  assert.match(
    page,
    /livePriority\s*\?\s*"ev-landing-upload-fab ev-landing-upload-fab--above-sticky"/,
  );
});

test("soft-refresh moments ~30s pendant during", () => {
  assert.match(page, /SOFT_MS = 30_000/);
  assert.match(page, /setInterval\(softRefresh/);
  assert.match(page, /phase !== "during"/);
  assert.match(page, /events\/slug\/\$\{encodeURIComponent\(slug\)\}\/landing/);
});

test("infoShowOnFinished exposé API + respecté côté public", () => {
  assert.match(
    backend,
    /infoShowOnFinished: info\.infoShowOnFinished !== false/,
  );
  assert.match(page, /payload\.infoShowOnFinished !== false/);
  assert.match(page, /afterLive && !infoShowOnFinished/);
});

test("vocabulaire public galerie ✨ + fil (hybride)", () => {
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /Partager une photo|LandingHybridFeed/);
  assert.doesNotMatch(page, /Galerie live/);
});

test("redirect landing off conservée", () => {
  assert.match(page, /data\?\.enabled === false/);
  assert.match(page, /router\.replace\(`\/join\/\$\{encodeURIComponent\(slug\)\}`\)/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 2 landing publique OK");
