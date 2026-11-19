/**
 * En-tête mobile : logo | CTA auth | ☰ (Les événements + Tarifs dans le menu).
 * Exécution : node frontend/scripts/test-header-mobile.mjs
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

test("AppHeaderShell : ordre mobile CTA puis menu, a11y ☰", () => {
  const src = read("components/navigation/AppHeaderShell.jsx");
  const rightIdx = src.indexOf("{rightSlot}");
  const moreIdx = src.indexOf("app-header-mobile-more-wrap");
  const quickIdx = src.indexOf("app-header-mobile-quick");
  assert.ok(rightIdx > 0 && moreIdx > rightIdx, "rightSlot avant le menu ☰");
  assert.ok(quickIdx > rightIdx, "quick après rightSlot si présent");
  assert.match(src, /aria-label=["']Menu["']/);
  assert.match(src, /aria-controls/);
  assert.match(src, /aria-expanded/);
  assert.match(src, /Escape/);
  assert.match(src, /app-header-mobile-more-icon/);
  assert.doesNotMatch(src, />Plus</);
  assert.match(src, /@media \(max-width: 640px\)[\s\S]*padding:\s*0 12px/);
});

test("LandingHeader : pas de quick « Les événements », menu 2 items", () => {
  const src = read("components/landing/LandingHeader.jsx");
  assert.match(src, /mobileQuickItem=\{null\}/);
  assert.match(src, /mobileMoreItems=\{\[/);
  assert.match(src, /href:\s*["']\/discover["']/);
  assert.match(src, /href:\s*["']\/pricing["']/);
  assert.match(src, /Les événements/);
  assert.match(src, /Tarifs/);
  assert.match(src, /HeaderAuthCta/);
  // Pas de quick item « Les événements » en prop dédiée
  assert.doesNotMatch(
    src,
    /mobileQuickItem=\{\{\s*href:\s*["']\/discover["']/,
  );
});

test("EventLandingNav : discover dans ☰, pas en barre", () => {
  const src = read("components/event/EventLandingNav.jsx");
  assert.match(src, /mobileQuickItem=\{null\}/);
  assert.match(src, /mobileMoreItems=\{\[/);
  assert.match(src, /\/discover/);
});

test("Desktop nav inchangée (navItems marketing)", () => {
  const src = read("components/landing/LandingHeader.jsx");
  assert.match(src, /navItems=\{\[[\s\S]*\/discover[\s\S]*\/pricing/);
});

test("AdminAccountBar : Mes événements quick conservé", () => {
  const src = read("components/admin/AdminAccountBar.jsx");
  assert.match(src, /mobileQuickItem=\{\{\s*href:\s*["']\/admin\/events["']/);
  assert.match(src, /Mes événements/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — header mobile");
