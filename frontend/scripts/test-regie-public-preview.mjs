/**
 * Aperçu public régie — non-régression `desktop` défini.
 * Exécution : node frontend/scripts/test-regie-public-preview.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRegiePublicPreviewFrameInset,
  getRegiePublicPreviewTitleFontSize,
} from "../lib/regiePublicPreview.js";

const here = dirname(fileURLToPath(import.meta.url));
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

test("Responsive titre / inset desktop vs mobile", () => {
  assert.equal(getRegiePublicPreviewTitleFontSize(true), "0.94rem");
  assert.equal(getRegiePublicPreviewTitleFontSize(false), "0.84rem");
  assert.equal(getRegiePublicPreviewFrameInset(true), "5.4rem 1rem 1rem");
  assert.equal(getRegiePublicPreviewFrameInset(false), "6rem 0.8rem 0.8rem");
});

test("RegiePublicPreviewPanel définit desktop (plus de ReferenceError)", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const start = src.indexOf("function RegiePublicPreviewPanel(");
  assert.ok(start > 0);
  const end = src.indexOf("\nfunction ", start + 1);
  const body = src.slice(start, end > start ? end : start + 4000);
  assert.ok(
    body.includes("const desktop = useBreakpointMin(1024)"),
    "le panel doit résoudre desktop localement (drawer mobile inclus)",
  );
  assert.ok(body.includes("getRegiePublicPreviewTitleFontSize(desktop)"));
  assert.ok(body.includes("getRegiePublicPreviewFrameInset(desktop)"));
  const desktopDecl = body.indexOf("const desktop = useBreakpointMin(1024)");
  const titleUse = body.indexOf("getRegiePublicPreviewTitleFontSize(desktop)");
  const insetUse = body.indexOf("getRegiePublicPreviewFrameInset(desktop)");
  assert.ok(desktopDecl > 0 && titleUse > desktopDecl && insetUse > desktopDecl);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests regie-public-preview OK");
