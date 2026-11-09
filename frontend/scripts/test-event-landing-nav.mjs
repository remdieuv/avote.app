/**
 * En-tête discret Landing `/e/[slug]` — navigation seule.
 * Exécution : node frontend/scripts/test-event-landing-nav.mjs
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

test("EventLandingNav : logo, discover, CTA auth", () => {
  const src = read("components/event/EventLandingNav.jsx");
  assert.match(src, /logoHref=["']\/["']/);
  assert.match(src, /logoLabel=["']AVOTE["']/);
  assert.match(src, /href:\s*["']\/discover["']/);
  assert.match(src, /Les événements/);
  assert.match(src, /Mes événements/);
  assert.match(src, /Se connecter/);
  assert.match(src, /\/admin\/events/);
  assert.match(src, /\/login\?next=/);
  assert.match(src, /AppHeaderShell/);
  assert.doesNotMatch(src, /invite|inviteEnabled|guestAccess/i);
});

test("Landing /e/[slug] monte EventLandingNav hors hero", () => {
  const src = read("app/e/[slug]/page.jsx");
  assert.match(src, /EventLandingNav/);
  const navIdx = src.lastIndexOf("<EventLandingNav");
  const heroIdx = src.indexOf('className="ev-landing-hero"');
  assert.ok(navIdx > 0, "EventLandingNav présent");
  assert.ok(heroIdx > navIdx, "nav avant le hero (pas overlay)");
});

test("Landing demo monte aussi EventLandingNav", () => {
  const src = read("components/event/EventLandingDemoPage.jsx");
  assert.match(src, /EventLandingNav/);
  assert.match(src, /<EventLandingNav\s*\/>/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — event landing nav");
