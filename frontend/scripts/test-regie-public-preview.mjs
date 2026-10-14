/**
 * Aperçu public régie — cadre smartphone centré + non-régression desktop.
 * Exécution : node frontend/scripts/test-regie-public-preview.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REGIE_PUBLIC_PREVIEW_PHONE_DESIGN,
  computeRegiePublicPreviewPhoneSize,
  getRegiePublicPreviewPhoneFrameStyle,
  getRegiePublicPreviewPhoneStageStyle,
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

test("Responsive titre desktop vs mobile", () => {
  assert.equal(getRegiePublicPreviewTitleFontSize(true), "0.94rem");
  assert.equal(getRegiePublicPreviewTitleFontSize(false), "0.84rem");
});

test("Taille téléphone : contain sans dépasser le design", () => {
  const roomy = computeRegiePublicPreviewPhoneSize(800, 900);
  assert.equal(roomy.width, REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.width);
  assert.equal(roomy.height, REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.height);

  const narrow = computeRegiePublicPreviewPhoneSize(300, 900, { padX: 0, padY: 0 });
  assert.ok(narrow.width <= 300);
  assert.ok(
    Math.abs(narrow.width / narrow.height - 390 / 844) < 0.02,
    "aspect ratio conservé",
  );

  const short = computeRegiePublicPreviewPhoneSize(800, 400, { padX: 0, padY: 0 });
  assert.ok(short.height <= 400);
  assert.ok(short.width < REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.width);
  assert.ok(
    Math.abs(short.width / short.height - 390 / 844) < 0.02,
    "aspect ratio sous contrainte hauteur",
  );
});

test("Stage centré + cadre overflow hidden (scroll iframe)", () => {
  const stage = getRegiePublicPreviewPhoneStageStyle();
  assert.equal(stage.display, "flex");
  assert.equal(stage.justifyContent, "center");
  assert.equal(stage.alignItems, "center");

  const frame = getRegiePublicPreviewPhoneFrameStyle({ width: 320, height: 693 });
  assert.equal(frame.width, 320);
  assert.equal(frame.height, 693);
  assert.equal(frame.overflow, "hidden");
  assert.equal(frame.position, "relative");
});

test("RegiePublicPreviewPanel : desktop défini + cadre smartphone", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const start = src.indexOf("function RegiePublicPreviewPanel(");
  assert.ok(start > 0);
  const end = src.indexOf("\nfunction ", start + 1);
  const body = src.slice(start, end > start ? end : start + 8000);
  assert.ok(body.includes("const desktop = useBreakpointMin(1024)"));
  assert.ok(body.includes("computeRegiePublicPreviewPhoneSize"));
  assert.ok(body.includes("getRegiePublicPreviewPhoneStageStyle"));
  assert.ok(body.includes("getRegiePublicPreviewPhoneFrameStyle"));
  assert.ok(body.includes("ResizeObserver"));
  assert.ok(body.includes("Agrandir"));
  assert.ok(body.includes("window.open"));
  // Plus d’iframe full-bleed en haut à gauche via inset panel
  assert.equal(body.includes("getRegiePublicPreviewFrameInset"), false);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests regie-public-preview OK");
