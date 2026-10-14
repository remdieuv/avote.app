/**
 * Aperçu public régie — cadre smartphone lisible (~390 px desktop).
 * Exécution : node frontend/scripts/test-regie-public-preview.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REGIE_PUBLIC_PREVIEW_PHONE_DESIGN,
  computeRegiePublicPreviewPhoneSize,
  getRegiePublicPreviewFitMode,
  getRegiePublicPreviewPhoneFrameStyle,
  getRegiePublicPreviewPhoneStageStyle,
  getRegiePublicPreviewShellStyle,
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

test("Fit mode : below/beside = width, drawer = contain", () => {
  assert.equal(getRegiePublicPreviewFitMode("below"), "width");
  assert.equal(getRegiePublicPreviewFitMode("beside"), "width");
  assert.equal(getRegiePublicPreviewFitMode("drawer"), "contain");
});

test("Desktop width-first : ~390 px même si hauteur stage faible", () => {
  const desktop = computeRegiePublicPreviewPhoneSize(800, 280, {
    mode: "width",
    padX: 0,
    padY: 0,
  });
  assert.equal(desktop.width, REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.width);
  assert.equal(desktop.height, REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.height);

  const mid = computeRegiePublicPreviewPhoneSize(420, 200, {
    mode: "width",
    padX: 24,
    padY: 0,
  });
  assert.equal(mid.width, 390);
  assert.equal(mid.height, 844);
});

test("Mobile width-first : s’adapte à la largeur disponible", () => {
  const mobile = computeRegiePublicPreviewPhoneSize(320, 900, {
    mode: "width",
    padX: 24,
    padY: 0,
  });
  assert.equal(mobile.width, 296);
  assert.ok(
    Math.abs(mobile.width / mobile.height - 390 / 844) < 0.02,
    "aspect conservé",
  );
});

test("Drawer contain : réduit si hauteur limitée", () => {
  const short = computeRegiePublicPreviewPhoneSize(800, 400, {
    mode: "contain",
    padX: 0,
    padY: 0,
  });
  assert.ok(short.height <= 400);
  assert.ok(short.width < REGIE_PUBLIC_PREVIEW_PHONE_DESIGN.width);
});

test("Shell below : pas de maxHeight (scroll régie)", () => {
  const shell = getRegiePublicPreviewShellStyle({
    layout: "below",
    fused: true,
    phoneHeight: 844,
  });
  assert.equal("maxHeight" in shell, false);
  assert.ok(Number(shell.minHeight) >= 844);
  const stage = getRegiePublicPreviewPhoneStageStyle({ naturalHeight: true });
  assert.equal(stage.flex, "0 0 auto");
  assert.equal(stage.justifyContent, "center");
});

test("Cadre overflow hidden + Agrandir source", () => {
  const frame = getRegiePublicPreviewPhoneFrameStyle({ width: 390, height: 844 });
  assert.equal(frame.width, 390);
  assert.equal(frame.overflow, "hidden");

  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const start = src.indexOf("function RegiePublicPreviewPanel(");
  const end = src.indexOf("\nfunction ", start + 1);
  const body = src.slice(start, end > start ? end : start + 9000);
  assert.ok(body.includes("getRegiePublicPreviewFitMode"));
  assert.ok(body.includes("mode: fitMode"));
  assert.ok(body.includes("Agrandir"));
  assert.ok(body.includes("window.open"));
  assert.ok(
    src.includes('overflow: desktop && previewJoinOpen ? "visible"'),
    "shell live ne clippe pas l’aperçu — scroll régie",
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests regie-public-preview OK");
