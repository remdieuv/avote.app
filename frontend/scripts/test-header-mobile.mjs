/**
 * En-tête mobile : logo | CTA auth | ☰ (rubriques accessibles, sans doublon).
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
  assert.ok(rightIdx > 0 && moreIdx > rightIdx, "rightSlot avant le menu ☰");
  assert.match(src, /aria-label=["']Menu["']/);
  assert.match(src, /aria-controls/);
  assert.match(src, /Escape/);
  assert.match(src, /app-header-mobile-more-icon/);
  assert.doesNotMatch(src, />Plus</);
});

test("SiteHeader : mobileMore = navItems, pas de quick isolé", () => {
  const src = read("components/navigation/SiteHeader.jsx");
  assert.match(src, /mobileQuickItem=\{null\}/);
  assert.match(src, /mobileMoreItems=\{navItems\}/);
});

test("Landing / Event / Admin via SiteHeader", () => {
  assert.match(read("components/landing/LandingHeader.jsx"), /SiteHeader/);
  assert.match(read("components/event/EventLandingNav.jsx"), /SiteHeader/);
  assert.match(read("components/admin/AdminAccountBar.jsx"), /SiteHeader/);
  assert.doesNotMatch(
    read("components/admin/AdminAccountBar.jsx"),
    /mobileQuickItem/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — header mobile");
