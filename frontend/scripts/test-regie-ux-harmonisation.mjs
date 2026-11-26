/**
 * Harmonisation UI/UX régie — bandeau commun + badges SS.
 * Exécution : node frontend/scripts/test-regie-ux-harmonisation.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getRegieSelfServicePlaylistBadge } = require("../lib/regieDesktopLayout.js");

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

test("badges playlist Libre-service", () => {
  assert.equal(
    getRegieSelfServicePlaylistBadge({ pollStatus: "ACTIVE" }),
    "Visible",
  );
  assert.equal(
    getRegieSelfServicePlaylistBadge({ pollStatus: "DRAFT" }),
    "Masquée",
  );
  assert.equal(
    getRegieSelfServicePlaylistBadge({ pollStatus: "CLOSED" }),
    "Masquée",
  );
  assert.equal(
    getRegieSelfServicePlaylistBadge({
      pollStatus: "CLOSED",
      selected: true,
    }),
    "Visible",
  );
  assert.equal(
    getRegieSelfServicePlaylistBadge({ pollStatus: "ARCHIVED" }),
    "Terminée",
  );
});

test("page : chrono + télécommande hors bandeau, dans pilotage Live", () => {
  const src = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  const topStart = src.indexOf("<RegieTopBar");
  const topEnd = src.indexOf("/>", topStart);
  assert.ok(topStart > 0 && topEnd > topStart);
  const topBlock = src.slice(topStart, topEnd);
  assert.doesNotMatch(topBlock, /Chrono scène/);
  assert.doesNotMatch(topBlock, /regie-telecommande-qr-btn/);
  assert.doesNotMatch(topBlock, /activeQuestionTitle/);

  const liveStrip = src.indexOf("regie-live-context-strip");
  assert.ok(liveStrip > topEnd, "strip Live après le bandeau");
  assert.match(src, /regie-telecommande-qr-btn/);
  assert.match(src, /playlistVariant=\{isSelfServiceRegie \? "self_service" : "live"\}/);
  assert.match(src, /isSelfService=\{isSelfServiceRegie\}/);
});

test("panneau droit SS : Diffusion avancée", () => {
  const src = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(src, /Diffusion avancée/);
  assert.match(src, /onlyScreenOverlay/);
  assert.match(src, /showScreenOverlay=\{!isSelfService\}/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll regie-ux-harmonisation FE tests passed.");
