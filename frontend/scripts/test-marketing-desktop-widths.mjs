/**
 * Largeurs desktop marketing (header + contenu 1440).
 * Exécution : node frontend/scripts/test-marketing-desktop-widths.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSIC_CONTENT_MAX } from "../lib/classicLayout.js";
import {
  MARKETING_CONTENT_MAX,
  MARKETING_CONTENT_PADDING,
  marketingContentMaxWidth,
  marketingContentShellStyle,
} from "../lib/marketingLayout.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

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

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("Token classique + marketing 1440", () => {
  assert.equal(CLASSIC_CONTENT_MAX, 1440);
  assert.equal(MARKETING_CONTENT_MAX, 1440);
  assert.equal(marketingContentMaxWidth(), "1440px");
  const s = marketingContentShellStyle({ flex: 1 });
  assert.equal(s.maxWidth, "1440px");
  assert.equal(s.margin, "0 auto");
  assert.equal(s.flex, 1);
  assert.match(String(MARKETING_CONTENT_PADDING), /clamp\(/);
});

test("LandingHeader aligné sur token marketing", () => {
  const header = read("components/landing/LandingHeader.jsx");
  assert.match(header, /MARKETING_CONTENT_MAX/);
  assert.match(header, /contentMaxWidth=\{MARKETING_CONTENT_MAX\}/);
});

test("EventLandingNav aligné sur token marketing", () => {
  const nav = read("components/event/EventLandingNav.jsx");
  assert.match(nav, /MARKETING_CONTENT_MAX/);
  assert.match(nav, /contentMaxWidth=\{MARKETING_CONTENT_MAX\}/);
  assert.doesNotMatch(nav, /contentMaxWidth=\{1100\}/);
});

test("Pages marketing utilisent le shell 1440", () => {
  for (const f of ["app/page.js", "app/pricing/page.js", "app/success/page.js"]) {
    const src = read(f);
    assert.match(src, /marketingContentShellStyle/, `${f} doit utiliser marketingLayout`);
    assert.doesNotMatch(
      src,
      /maxWidth:\s*"1100px"|maxWidth:\s*"920px"|maxWidth:\s*"1200px"|maxWidth:\s*"1280px"/,
      `${f} ne doit plus fixer d’anciens plafonds en shell`,
    );
  }
});

test("Rapport partagé + landings événement via token marketing", () => {
  const report = read("app/report/account/[token]/page.jsx");
  assert.match(report, /marketingContentShellStyle/);
  const eventLanding = read("app/e/[slug]/page.jsx");
  assert.match(eventLanding, /marketingContentMaxWidth\(\)/);
  assert.doesNotMatch(
    eventLanding,
    /maxWidth:\s*"1200px"|maxWidth:\s*"1100px"|maxWidth:\s*"1280px"/,
  );
  const demo = read("components/event/EventLandingDemoPage.jsx");
  assert.match(demo, /marketingContentMaxWidth\(\)/);
  assert.doesNotMatch(demo, /max-width:\s*(1200|1280)px/);
});

test("AppHeaderShell défaut 1440", () => {
  const shell = read("components/navigation/AppHeaderShell.jsx");
  assert.match(shell, /contentMaxWidth\s*=\s*1440/);
});

test("Pricing packs : 1 / 2 / 3 colonnes (mobile / tablette / desktop)", () => {
  const pricing = read("app/pricing/page.js");
  assert.match(pricing, /pricing-grid-fun-event/);
  assert.match(
    pricing,
    /\.pricing-grid\.pricing-grid-fun-event[\s\S]*?grid-template-columns:\s*repeat\(2/,
  );
  assert.match(
    pricing,
    /@media \(min-width: 1040px\)[\s\S]*?\.pricing-grid\.pricing-grid-fun-event[\s\S]*?grid-template-columns:\s*repeat\(3/,
  );
  assert.doesNotMatch(
    pricing,
    /\.pricing-grid\.pricing-grid-fun-event\s*\{[^}]*max-width:\s*920px/,
  );
  assert.doesNotMatch(pricing, /10 participants|offre gratuite|pack.?gratuit/i);
});

test("Participant / diffusion / auth non touchés par marketingLayout", () => {
  for (const f of [
    "components/JoinLiveHub.jsx",
    "components/PollExperience.jsx",
    "components/ScreenProjection.jsx",
    "components/OverlayProjection.jsx",
    "app/login/page.jsx",
  ]) {
    const src = read(f);
    assert.doesNotMatch(src, /marketingLayout|adminLayout|classicLayout|AdminContentShell/);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll marketing desktop width tests passed.");
