/**
 * Navigation publique démo — liens /e/demo → salle participant + écran diffusion.
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

test("/e/demo CTA salle → /join/demo (participant)", () => {
  const src = read("components/event/EventLandingDemoPage.jsx");
  assert.match(src, /href=["']\/join\/demo["']/);
  assert.match(src, /Rejoindre la salle live/);
});

test("/e/demo CTA écran → /screen/demo (diffusion), pas /p/demo", () => {
  const src = read("components/event/EventLandingDemoPage.jsx");
  assert.match(src, /href=["']\/screen\/demo["']/);
  assert.match(src, /Voir l[’']écran de vote/);
  assert.doesNotMatch(src, /href=["']\/p\/demo["']/);
});

test("Destinations CTA distinctes (join ≠ screen)", () => {
  const src = read("components/event/EventLandingDemoPage.jsx");
  const joinIdx = src.indexOf('href="/join/demo"');
  const screenIdx = src.indexOf('href="/screen/demo"');
  assert.ok(joinIdx > 0, "CTA join présent");
  assert.ok(screenIdx > 0, "CTA screen présent");
  assert.notEqual(joinIdx, screenIdx);
});

test("Route /join/demo = JoinDemoExperience (participant, pas Screen)", () => {
  const page = read("app/join/demo/page.js");
  assert.match(page, /JoinDemoExperience/);
  assert.doesNotMatch(page, /ScreenDemoExperience|ScreenProjection|ScreenQuestion/);
});

test("Route /screen/demo = ScreenDemoExperience (pas Join / Poll)", () => {
  const page = read("app/screen/demo/page.js");
  assert.match(page, /ScreenDemoExperience/);
  assert.doesNotMatch(page, /JoinDemoExperience|PollExperience|ScreenProjection/);
});

test("Garde slug===demo dans /screen/[slug] (pas d’API)", () => {
  const page = read("app/screen/[slug]/page.js");
  assert.match(page, /slug\s*===\s*["']demo["']/);
  assert.match(page, /ScreenDemoExperience/);
  const demoIdx = page.indexOf('slug === "demo"');
  const projIdx = page.indexOf("<ScreenProjection");
  assert.ok(demoIdx > 0 && projIdx > demoIdx, "garde demo avant ScreenProjection");
});

test("ScreenDemoExperience réutilise ScreenQuestion + ScreenResults", () => {
  const src = read("components/ScreenDemoExperience.jsx");
  assert.match(src, /from ["']@\/components\/ScreenQuestion["']/);
  assert.match(src, /from ["']@\/components\/ScreenResults["']/);
  assert.match(src, /<ScreenQuestion[\s\S]*voteOuvert/);
  assert.match(src, /<ScreenResults/);
  assert.match(src, /scene\s*===\s*["']question["']/);
  assert.match(src, /scene\s*===\s*["']results["']/);
  assert.match(src, /joinSlug=["']demo["']/);
  assert.doesNotMatch(src, /from ["']@\/components\/JoinDemoExperience["']/);
  assert.doesNotMatch(src, /from ["']@\/components\/PollExperience["']/);
  assert.doesNotMatch(src, /API_URL|socket\.io|fetch\s*\(/);
  assert.match(src, /Quelle fonctionnalité préférez-vous \?/);
  assert.match(src, /QR code simple/);
  assert.match(src, /Résultats en direct/);
  assert.match(src, /Projection écran/);
});

test("JoinDemoExperience reste participant (hub + poll), distinct du screen", () => {
  const src = read("components/JoinDemoExperience.jsx");
  assert.match(src, /variant\s*=\s*["']hub["']/);
  assert.match(src, /isPollVariant/);
  assert.match(src, /Valider mon choix/);
  assert.match(src, /Testez l.expérience participant/);
  assert.doesNotMatch(src, /from ["']@\/components\/Screen(Question|Results|DemoExperience)["']/);
  assert.doesNotMatch(src, /<Screen(Question|Results|DemoExperience)/);
});

test("Route /p/demo + garde /p/[slug] restent participant (pas diffusion)", () => {
  const page = read("app/p/demo/page.js");
  assert.match(page, /JoinDemoExperience/);
  assert.match(page, /variant=["']poll["']/);
  assert.doesNotMatch(page, /ScreenDemoExperience|ScreenProjection/);
  const dyn = read("app/p/[slug]/page.js");
  assert.match(dyn, /slug\s*===\s*["']demo["']/);
  assert.match(dyn, /JoinDemoExperience/);
});

test("Landing /e/[slug] démo sans fetch landing API", () => {
  const page = read("app/e/[slug]/page.jsx");
  assert.match(page, /isDemoSlug\s*=\s*slug\s*===\s*["']demo["']/);
  assert.match(page, /EventLandingDemoPage/);
  assert.match(page, /if\s*\(\s*isDemoSlug\s*\)\s*\{[\s\S]*?return\s+undefined/);
});

test("Route /join/demo + garde join/[slug] intactes", () => {
  const staticJoin = read("app/join/demo/page.js");
  assert.match(staticJoin, /JoinDemoExperience/);
  const dynamicJoin = read("app/join/[slug]/page.js");
  assert.match(dynamicJoin, /slug\s*===\s*["']demo["']/);
  assert.match(dynamicJoin, /JoinDemoExperience/);
  assert.match(dynamicJoin, /JoinLiveHub/);
});

test("Slugs réels /screen/[slug] restent sur ScreenProjection", () => {
  const page = read("app/screen/[slug]/page.js");
  assert.match(page, /<ScreenProjection/);
  assert.match(page, /slugPublic=\{slug\}/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll demo public nav checks passed.");
