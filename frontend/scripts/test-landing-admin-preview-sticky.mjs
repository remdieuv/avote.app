/**
 * Admin Landing — aperçu sticky desktop (containing block correct).
 * Exécution : node frontend/scripts/test-landing-admin-preview-sticky.mjs
 *
 * Cause #48 : sticky appliqué directement sur l’item grille avec
 * align-items:start → containing block = hauteur de la carte seule →
 * l’aperçu décroche en scrollant un formulaire long (colonne droite vide).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const publicLanding = readFileSync(
  join(root, "app/e/[slug]/page.jsx"),
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

test("structure : colonne stretch + carte sticky (pas sticky sur item grille seul)", () => {
  assert.match(page, /className="customization-preview-col"/);
  assert.match(page, /className="customization-preview-card"/);
  assert.match(page, /alignItems:\s*"start"/);
  // Ordre DOM : preview-col enveloppe preview-card
  const colIdx = page.indexOf('className="customization-preview-col"');
  const cardIdx = page.indexOf(
    'className="customization-preview-card"',
    colIdx,
  );
  assert.ok(colIdx >= 0 && cardIdx > colIdx, "card doit être dans preview-col");
  // Sticky sur la carte, stretch sur la colonne
  assert.match(
    page,
    /\.customization-preview-col\s*\{[^}]*align-self:\s*stretch/s,
  );
  assert.match(
    page,
    /\.customization-preview-card\s*\{[^}]*position:\s*sticky/s,
  );
  // Anti-régression : ne plus sticky-er uniquement l’item grille sans wrapper
  assert.match(page, /containing block sticky = colonne stretch/i);
});

test("desktop : taille confortable + actions + max-height viewport", () => {
  assert.match(page, /min-height:\s*min\(520px,\s*62vh\)/);
  assert.match(page, /min-height:\s*min\(520px,\s*calc\(100vh - 14rem\)\)/);
  assert.match(page, /max-height:\s*calc\(100vh - 1rem - 5\.25rem\)/);
  assert.match(page, /customization-preview-actions/);
  assert.match(page, /Ouvrir la landing publiée/);
  assert.match(
    page,
    /gridTemplateColumns:\s*"minmax\(340px, 42%\) minmax\(320px, 1fr\)"/,
  );
  // Ne pas réintroduire le min-height trop bas qui réduisait l’aperçu
  assert.doesNotMatch(
    page,
    /\.customization-preview-iframe\s*\{[^}]*min-height:\s*240px/s,
  );
});

test("mobile : tabs + masque la colonne (pas sticky flottant)", () => {
  assert.match(page, /customization-mobile-tabs/);
  assert.match(page, /data-mobile-panel=\{mobilePanel\}/);
  assert.match(
    page,
    /customization-layout\[data-mobile-panel="form"\] \.customization-preview-col/,
  );
  assert.match(
    page,
    /customization-layout\[data-mobile-panel="preview"\] \.customization-form-col/,
  );
  assert.match(
    page,
    /@media \(max-width: 900px\)[\s\S]*?\.customization-preview-card\s*\{[\s\S]*?position:\s*static/,
  );
});

test("hint message organisateur + pas de surface publique", () => {
  assert.match(page, /photo directement/);
  assert.doesNotMatch(page, /resolveEventLandingPhase/);
  assert.match(publicLanding, /LandingHybridFeed/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-admin-preview-sticky tests passed.");
