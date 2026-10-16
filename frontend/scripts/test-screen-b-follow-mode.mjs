/**
 * Écran B — sync A (défaut) vs affichage indépendant.
 * Exécution : node frontend/scripts/test-screen-b-follow-mode.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildScreenBPath,
  clearScreenBDisplayState,
  normalizeScreenDisplayState,
  parseScreenBIndependentFlag,
  readScreenBDisplayState,
  readScreenBIndependent,
  resolveScreenBIndependentMode,
  resolveScreenClientDisplayState,
  screenFollowsMainDisplay,
  screenPayloadMatchesClient,
  shouldShowScreenBDisplayGap,
  writeScreenBDisplayState,
  writeScreenBIndependent,
} from "../lib/screenBFollowMode.js";
import {
  LIVE_UX_STATE,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";
import {
  clearScreenBIndependentDisplay,
  getScreenBIndependentDisplay,
  setScreenBIndependentDisplay,
  _resetScreenBIndependentDisplayStore,
} from "../../backend/lib/screenBIndependentDisplay.js";

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

function memoryStorage() {
  /** @type {Record<string, string>} */
  const map = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
    setItem: (k, v) => {
      map[k] = String(v);
    },
    removeItem: (k) => {
      delete map[k];
    },
  };
}

test("parseScreenBIndependentFlag", () => {
  assert.equal(parseScreenBIndependentFlag("1"), true);
  assert.equal(parseScreenBIndependentFlag("0"), false);
  assert.equal(parseScreenBIndependentFlag("indep"), true);
  assert.equal(parseScreenBIndependentFlag("sync"), false);
  assert.equal(parseScreenBIndependentFlag(""), null);
});

test("localStorage persist / défaut sync", () => {
  const storage = memoryStorage();
  assert.equal(readScreenBIndependent("evt1", { storage }), false);
  writeScreenBIndependent("evt1", true, { storage });
  assert.equal(readScreenBIndependent("evt1", { storage }), true);
  writeScreenBIndependent("evt1", false, { storage });
  assert.equal(readScreenBIndependent("evt1", { storage }), false);
});

test("URL prioritaire sur storage", () => {
  const storage = memoryStorage();
  writeScreenBIndependent("s", true, { storage });
  const fromUrl = resolveScreenBIndependentMode({
    slug: "s",
    searchParam: "0",
    storage,
  });
  assert.equal(fromUrl.independent, false);
  assert.equal(fromUrl.source, "url");
  const fromStore = resolveScreenBIndependentMode({
    slug: "s",
    storage,
  });
  assert.equal(fromStore.independent, true);
  assert.equal(fromStore.source, "storage");
});

test("B suit A par défaut ; indépendant ignore global", () => {
  assert.equal(screenFollowsMainDisplay({ screenId: "b" }), true);
  assert.equal(
    screenFollowsMainDisplay({ screenId: "b", independent: true }),
    false,
  );
  assert.equal(
    screenPayloadMatchesClient({
      localScreenId: "b",
      payloadScreenId: null,
      independent: false,
    }),
    true,
  );
  assert.equal(
    screenPayloadMatchesClient({
      localScreenId: "b",
      payloadScreenId: null,
      independent: true,
    }),
    false,
  );
  assert.equal(
    screenPayloadMatchesClient({
      localScreenId: "b",
      payloadScreenId: "b",
      independent: true,
    }),
    true,
  );
  // A n’accepte que le global
  assert.equal(
    screenPayloadMatchesClient({
      localScreenId: null,
      payloadScreenId: "b",
      independent: false,
    }),
    false,
  );
});

test("buildScreenBPath indep", () => {
  const sync = buildScreenBPath("mon-slug", { independent: false, projectionMode: "standard" });
  assert.match(sync, /sid=b/);
  assert.match(sync, /indep=0/);
  const indep = buildScreenBPath("mon-slug", { independent: true });
  assert.match(indep, /indep=1/);
});

test("Pas d’alerte écart sync ni indépendant", () => {
  assert.equal(
    shouldShowScreenBDisplayGap({
      screenBConnected: true,
      screenBIndependent: false,
      mainDisplayState: "question",
      screenBDisplayState: "waiting",
    }),
    false,
  );
  assert.equal(
    shouldShowScreenBDisplayGap({
      screenBConnected: true,
      screenBIndependent: true,
      mainDisplayState: "question",
      screenBDisplayState: "black",
    }),
    false,
  );
});

test("quatre affichages indépendants (vote OPEN + live voting)", () => {
  const base = {
    liveScene: "voting",
    voteState: "open",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  };
  assert.equal(
    resolveLiveUxState({ ...base, displayState: "question" }),
    LIVE_UX_STATE.VOTING,
  );
  assert.equal(
    resolveLiveUxState({ ...base, displayState: "results" }),
    LIVE_UX_STATE.RESULTS,
  );
  assert.equal(
    resolveLiveUxState({ ...base, displayState: "black" }),
    LIVE_UX_STATE.PAUSED,
  );
  assert.equal(
    resolveLiveUxState({ ...base, displayState: "waiting" }),
    LIVE_UX_STATE.WAITING,
    "Attente/QR ne doit pas rester sur la question",
  );
});

test("F5 : display B indépendant restauré (localStorage + resolve)", () => {
  const storage = memoryStorage();
  writeScreenBIndependent("evt-f5", true, { storage });
  writeScreenBDisplayState("evt-f5", "waiting", { storage });
  assert.equal(readScreenBDisplayState("evt-f5", { storage }), "waiting");
  assert.equal(
    resolveScreenClientDisplayState({
      screenId: "b",
      independent: true,
      mainDisplay: "question",
      targetedDisplay: readScreenBDisplayState("evt-f5", { storage }),
    }),
    "waiting",
  );
  // Sync : ignore la cible, reprend A
  assert.equal(
    resolveScreenClientDisplayState({
      screenId: "b",
      independent: false,
      mainDisplay: "question",
      targetedDisplay: "waiting",
    }),
    "question",
  );
  clearScreenBDisplayState("evt-f5", { storage });
  assert.equal(readScreenBDisplayState("evt-f5", { storage }), null);
});

test("retour sync : mémoire serveur B effacée", () => {
  _resetScreenBIndependentDisplayStore();
  setScreenBIndependentDisplay("ev1", "waiting");
  assert.equal(getScreenBIndependentDisplay("ev1"), "waiting");
  setScreenBIndependentDisplay("ev1", "black");
  assert.equal(getScreenBIndependentDisplay("ev1"), "black");
  for (const ds of ["question", "results", "waiting", "black"]) {
    assert.equal(normalizeScreenDisplayState(ds), ds);
  }
  clearScreenBIndependentDisplay("ev1");
  assert.equal(getScreenBIndependentDisplay("ev1"), null);
});

test("page.jsx + ScreenProjection + server branchés", () => {
  const page = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(page.includes("Affichage indépendant"));
  assert.ok(page.includes("screen:b_mode"));
  assert.ok(page.includes("handleScreenBIndependentChange"));
  assert.ok(page.includes("shouldShowScreenBDisplayGap"));
  assert.ok(!page.includes("Affichage secondaire indépendant."));
  // Boutons Ouvrir A + B (nouvel onglet)
  assert.ok(page.includes("pathScreenA"));
  assert.ok(page.includes("pathScreenB"));
  assert.ok(page.includes('ouvrirEcran(pathScreenA)'));
  assert.ok(page.includes('ouvrirEcran(pathScreenB)'));
  assert.ok(page.includes('window.open(url, "_blank"'));
  // Plus de boutons Question/Résultats sur A hors Options avancées forçage
  assert.ok(page.includes("Forçage écran principal"));
  assert.ok(page.includes("Options avancées"));

  const screen = readFileSync(
    join(here, "../components/ScreenProjection.jsx"),
    "utf8",
  );
  assert.ok(screen.includes("screenPayloadMatchesClient"));
  assert.ok(screen.includes("screen:b_mode"));
  assert.ok(screen.includes("clientFollowsMain"));
  assert.ok(screen.includes("resolveScreenClientDisplayState"));
  assert.ok(screen.includes("writeScreenBDisplayState"));
  assert.ok(screen.includes("clearScreenBDisplayState"));
  assert.ok(screen.includes('ds === "waiting"'));

  const server = readFileSync(
    join(here, "../../backend/server.js"),
    "utf8",
  );
  assert.ok(server.includes('"screen:b_mode"'));
  assert.ok(server.includes("setScreenBIndependentDisplay"));
  assert.ok(server.includes("getScreenBIndependentDisplay"));
  assert.ok(server.includes("clearScreenBIndependentDisplay"));

  const partage = page.includes("Overlay OBS") || page.includes("pathOverlay");
  assert.ok(partage);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll screen-b-follow-mode tests passed.");
