/**
 * Correctif UX — indicateur écrans connectés (Projection avancée).
 * Exécution : node frontend/scripts/test-regie-projection-screens-count.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REGIE_SCREENS_PRESENCE_UNKNOWN,
  formatConnectedScreensLabel,
  getProjectionAdvancedScreensLabel,
  resolveConnectedScreensPresence,
} from "../lib/regieScreenPresenceCopy.js";

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

test("libellés 0 / 1 / plusieurs", () => {
  assert.equal(formatConnectedScreensLabel(0), "0 écran connecté");
  assert.equal(formatConnectedScreensLabel(1), "1 écran connecté");
  assert.equal(formatConnectedScreensLabel(2), "2 écrans connectés");
  assert.equal(formatConnectedScreensLabel(5), "5 écrans connectés");
});

test("inconnu → État des écrans indisponible (pas de faux zéro)", () => {
  assert.equal(
    getProjectionAdvancedScreensLabel({ known: false, count: 0 }),
    REGIE_SCREENS_PRESENCE_UNKNOWN,
  );
  assert.equal(
    getProjectionAdvancedScreensLabel({}),
    REGIE_SCREENS_PRESENCE_UNKNOWN,
  );
  assert.equal(
    getProjectionAdvancedScreensLabel({ known: true, count: null }),
    REGIE_SCREENS_PRESENCE_UNKNOWN,
  );
  assert.equal(
    getProjectionAdvancedScreensLabel({ known: true, count: 0 }),
    "0 écran connecté",
  );
});

test("agrégation : screen:count prioritaire ; sinon main+B connus", () => {
  assert.deepEqual(
    resolveConnectedScreensPresence({ serverCount: 3 }),
    { known: true, count: 3 },
  );
  assert.deepEqual(
    resolveConnectedScreensPresence({
      mainKnown: true,
      bKnown: true,
      mainConnected: true,
      bConnected: false,
    }),
    { known: true, count: 1 },
  );
  assert.deepEqual(
    resolveConnectedScreensPresence({
      mainKnown: true,
      bKnown: true,
      mainConnected: true,
      bConnected: true,
    }),
    { known: true, count: 2 },
  );
  assert.deepEqual(
    resolveConnectedScreensPresence({
      mainKnown: true,
      bKnown: true,
      mainConnected: false,
      bConnected: false,
    }),
    { known: true, count: 0 },
  );
  // Un seul slot connu → pas d’invention
  assert.deepEqual(
    resolveConnectedScreensPresence({
      mainKnown: true,
      mainConnected: false,
      bKnown: false,
    }),
    { known: false, count: null },
  );
  // Déconnexion / pas encore de snapshot
  assert.deepEqual(resolveConnectedScreensPresence({}), {
    known: false,
    count: null,
  });
});

test("page régie : en-tête Projection avancée + listeners screen:count/presence", () => {
  const page = read("app/admin/event/[eventId]/page.jsx");
  assert.match(page, /regie-projection-screens-count/);
  assert.match(page, /getProjectionAdvancedScreensLabel/);
  assert.match(page, /screen:count/);
  assert.match(page, /onScreenCount/);
  assert.match(page, /screenMainPresenceKnown/);
  assert.match(page, /setScreenClientsCount\(null\)/);
  // Panneau reste un <details> repliable
  assert.match(page, /REGIE_ZONE_PROJECTION_AVANCEE/);
  assert.match(page, /<details[\s\S]*REGIE_ZONE_PROJECTION_AVANCEE/);
  assert.match(page, /BlocProjectionEcran/);
  // Pas de nouvel endpoint HTTP
  assert.doesNotMatch(page, /\/api\/.*screen.*presence/i);
});

test("backend : événements présence déjà émis (pas de nouvelle API)", () => {
  const server = readFileSync(
    join(root, "..", "backend", "server.js"),
    "utf8",
  );
  assert.match(server, /emit\("screen:count"/);
  assert.match(server, /emit\("screen:presence"/);
  assert.match(server, /emitScreenCountToAdmins/);
  assert.match(server, /emitScreenPresenceToAdmins/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll test-regie-projection-screens-count tests passed.");
