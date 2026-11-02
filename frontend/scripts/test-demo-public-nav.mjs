/**
 * Navigation publique démo — liens /e/demo → salle + écran de vote sans API.
 * Exécution : node frontend/scripts/test-demo-public-nav.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(here, "..");
let failed = 0;

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(frontendRoot, rel), "utf8");
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

test("/e/demo CTA salle → /join/demo (statique)", () => {
  const src = read("components/event/EventLandingDemoPage.jsx");
  assert.match(src, /href=["']\/join\/demo["']/);
  assert.match(src, /Rejoindre la salle live/);
});

test("/e/demo CTA écran de vote → /p/demo", () => {
  const src = read("components/event/EventLandingDemoPage.jsx");
  assert.match(src, /href=["']\/p\/demo["']/);
  assert.match(src, /Voir l[’']écran de vote/);
});

test("Route statique /p/demo sans PollExperience / API", () => {
  const page = read("app/p/demo/page.js");
  assert.match(page, /JoinDemoExperience/);
  assert.match(page, /variant=["']poll["']/);
  assert.doesNotMatch(page, /PollExperience/);
  assert.doesNotMatch(page, /API_URL|\/p\/\$\{|events\/slug/);
});

test("Garde slug===demo dans /p/[slug] (pas d’API)", () => {
  const page = read("app/p/[slug]/page.js");
  assert.match(page, /slug\s*===\s*["']demo["']/);
  assert.match(page, /JoinDemoExperience/);
  assert.match(page, /variant=["']poll["']/);
});

test("Route /join/demo + garde join/[slug] intactes", () => {
  const staticJoin = read("app/join/demo/page.js");
  assert.match(staticJoin, /JoinDemoExperience/);
  const dynamicJoin = read("app/join/[slug]/page.js");
  assert.match(dynamicJoin, /slug\s*===\s*["']demo["']/);
  assert.match(dynamicJoin, /JoinDemoExperience/);
  assert.match(dynamicJoin, /JoinLiveHub/);
});

test("Landing /e/[slug] démo sans fetch landing API", () => {
  const page = read("app/e/[slug]/page.jsx");
  assert.match(page, /isDemoSlug\s*=\s*slug\s*===\s*["']demo["']/);
  assert.match(page, /EventLandingDemoPage/);
  assert.match(page, /if\s*\(\s*isDemoSlug\s*\)\s*\{[\s\S]*?return\s+undefined/);
});

test("JoinDemoExperience : variants hub + poll", () => {
  const src = read("components/JoinDemoExperience.jsx");
  assert.match(src, /variant\s*=\s*["']hub["']/);
  assert.match(src, /isPollVariant/);
  assert.match(src, /\/p\/demo/);
  assert.match(src, /\/join\/demo/);
  assert.match(src, /Retour à la salle/);
});

test("Slugs réels /p/[slug] restent sur PollExperience", () => {
  const page = read("app/p/[slug]/page.js");
  assert.match(page, /<PollExperience/);
  assert.match(page, /slugPublic=\{slug\}/);
  // La branche demo doit précéder le rendu PollExperience
  const demoIdx = page.indexOf('slug === "demo"');
  const pollIdx = page.indexOf("<PublicPollBody");
  assert.ok(demoIdx > 0 && pollIdx > demoIdx, "garde demo avant PollExperience");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll demo public nav checks passed.");
