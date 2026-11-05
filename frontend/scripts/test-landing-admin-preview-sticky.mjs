/**
 * Admin Landing — aperçu sticky desktop + hint photos messages.
 * Exécution : node frontend/scripts/test-landing-admin-preview-sticky.mjs
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

test("desktop : sticky + max-height viewport + actions visibles", () => {
  const desktop = page.match(
    /@media \(min-width: 901px\) \{([\s\S]*?)\}[\s\n]*@media \(max-width: 900px\)/,
  );
  assert.ok(desktop, "bloc media desktop attendu");
  const css = desktop[1];
  assert.match(css, /\.customization-preview-card/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /max-height:\s*calc\(100vh/);
  assert.match(css, /display:\s*flex/);
  assert.match(css, /flex-direction:\s*column/);
  assert.match(page, /customization-preview-actions/);
  assert.match(page, /Ouvrir la landing publiée/);
  assert.match(page, /gridTemplateColumns:\s*"minmax\(340px, 42%\) minmax\(320px, 1fr\)"/);
});

test("mobile : tabs + pas de sticky flottant", () => {
  assert.match(page, /customization-mobile-tabs/);
  assert.match(page, /data-mobile-panel=\{mobilePanel\}/);
  const mobile = page.match(/@media \(max-width: 900px\) \{([\s\S]*?)\}[\s\n]*`\}<\/style>/);
  assert.ok(mobile, "bloc media mobile attendu");
  const css = mobile[1];
  assert.match(css, /position:\s*static/);
  assert.match(css, /max-height:\s*none/);
  assert.match(
    css,
    /customization-layout\[data-mobile-panel="form"\] \.customization-preview-card/,
  );
});

test("hint message organisateur mis à jour", () => {
  assert.match(page, /photo directement/);
  assert.match(page, /galerie événement/);
  assert.doesNotMatch(page, /pas de nouvel upload/);
});

test("pas de changement surface publique /e", () => {
  assert.doesNotMatch(page, /resolveEventLandingPhase/);
  // Ce lot ne touche pas le fil /e
  assert.match(publicLanding, /LandingHybridFeed/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-admin-preview-sticky tests passed.");
