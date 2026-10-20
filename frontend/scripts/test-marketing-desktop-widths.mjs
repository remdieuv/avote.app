/**
 * Largeurs desktop marketing (header + contenu 1200).
 * Exécution : node frontend/scripts/test-marketing-desktop-widths.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

test("Token marketing 1200", () => {
  assert.equal(MARKETING_CONTENT_MAX, 1200);
  assert.equal(marketingContentMaxWidth(), "1200px");
  const s = marketingContentShellStyle({ flex: 1 });
  assert.equal(s.maxWidth, "1200px");
  assert.equal(s.margin, "0 auto");
  assert.equal(s.flex, 1);
});

test("LandingHeader aligné sur token marketing", () => {
  const header = read("components/landing/LandingHeader.jsx");
  assert.match(header, /MARKETING_CONTENT_MAX/);
  assert.match(header, /contentMaxWidth=\{MARKETING_CONTENT_MAX\}/);
});

test("Pages marketing utilisent le shell 1200", () => {
  for (const f of ["app/page.js", "app/pricing/page.js", "app/success/page.js"]) {
    const src = read(f);
    assert.match(src, /marketingContentShellStyle/, `${f} doit utiliser marketingLayout`);
    assert.doesNotMatch(
      src,
      /maxWidth:\s*"1100px"|maxWidth:\s*"920px"/,
      `${f} ne doit plus fixer 1100/920 en shell`,
    );
  }
});

test("Rapport partagé + landings événement à 1200", () => {
  const report = read("app/report/account/[token]/page.jsx");
  assert.match(report, /marketingContentShellStyle/);
  const eventLanding = read("app/e/[slug]/page.jsx");
  assert.match(eventLanding, /maxWidth:\s*"1200px"/);
  assert.doesNotMatch(eventLanding, /maxWidth:\s*"1100px"/);
  const demo = read("components/event/EventLandingDemoPage.jsx");
  assert.match(demo, /max-width:\s*1200px/);
});

test("Participant / diffusion non touchés par marketingLayout", () => {
  for (const f of [
    "components/JoinLiveHub.jsx",
    "components/PollExperience.jsx",
    "components/ScreenProjection.jsx",
    "components/OverlayProjection.jsx",
  ]) {
    const src = read(f);
    assert.doesNotMatch(src, /marketingLayout|adminLayout|AdminContentShell/);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll marketing desktop width tests passed.");
