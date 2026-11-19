/**
 * Largeurs desktop marketing (header + contenu 1280).
 * Exécution : node frontend/scripts/test-marketing-desktop-widths.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSIC_CONTENT_MAX } from "../lib/classicLayout.js";
import {
  MARKETING_CONTENT_MAX,
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

test("Token classique + marketing 1280", () => {
  assert.equal(CLASSIC_CONTENT_MAX, 1280);
  assert.equal(MARKETING_CONTENT_MAX, 1280);
  assert.equal(marketingContentMaxWidth(), "1280px");
  const s = marketingContentShellStyle({ flex: 1 });
  assert.equal(s.maxWidth, "1280px");
  assert.equal(s.margin, "0 auto");
  assert.equal(s.flex, 1);
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

test("Pages marketing utilisent le shell 1280", () => {
  for (const f of ["app/page.js", "app/pricing/page.js", "app/success/page.js"]) {
    const src = read(f);
    assert.match(src, /marketingContentShellStyle/, `${f} doit utiliser marketingLayout`);
    assert.doesNotMatch(
      src,
      /maxWidth:\s*"1100px"|maxWidth:\s*"920px"|maxWidth:\s*"1200px"/,
      `${f} ne doit plus fixer 1100/920/1200 en shell`,
    );
  }
});

test("Rapport partagé + landings événement à 1280", () => {
  const report = read("app/report/account/[token]/page.jsx");
  assert.match(report, /marketingContentShellStyle/);
  const eventLanding = read("app/e/[slug]/page.jsx");
  assert.match(eventLanding, /marketingContentMaxWidth\(\)/);
  assert.doesNotMatch(eventLanding, /maxWidth:\s*"1200px"|maxWidth:\s*"1100px"/);
  const demo = read("components/event/EventLandingDemoPage.jsx");
  assert.match(demo, /marketingContentMaxWidth\(\)/);
  assert.doesNotMatch(demo, /max-width:\s*1200px/);
});

test("AppHeaderShell défaut 1280", () => {
  const shell = read("components/navigation/AppHeaderShell.jsx");
  assert.match(shell, /contentMaxWidth\s*=\s*1280/);
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
