/**
 * Tests unitaires gardes init load-staging (sans DB).
 * Exécution : node scripts/test-init-load-staging-1000.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  LOAD_STAGING_DB_MARKER,
  LOAD_SEED_IDS,
  assertLoadStagingDbMarker,
  assertLoadStagingInitAuthorized,
  assertNoLoadSeedCollisions,
} = require("../lib/loadStagingInit");

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

test("marqueur exact requis", () => {
  assert.equal(assertLoadStagingDbMarker(LOAD_STAGING_DB_MARKER).ok, true);
  assert.equal(assertLoadStagingDbMarker("prod").ok, false);
  assert.equal(assertLoadStagingDbMarker(null).ok, false);
});

test("double confirmation CLI", () => {
  assert.equal(
    assertLoadStagingInitAuthorized({
      allowInit: "1",
      confirmLoadStaging: true,
      railwayEnvironmentName: "load-staging",
    }).ok,
    true,
  );
  assert.equal(
    assertLoadStagingInitAuthorized({
      allowInit: "1",
      confirmLoadStaging: false,
    }).ok,
    false,
  );
  assert.equal(
    assertLoadStagingInitAuthorized({
      allowInit: "0",
      confirmLoadStaging: true,
    }).ok,
    false,
  );
  assert.equal(
    assertLoadStagingInitAuthorized({
      allowInit: "1",
      confirmLoadStaging: true,
      railwayEnvironmentName: "production",
    }).ok,
    false,
  );
});

test("collisions refusées", () => {
  assert.equal(assertNoLoadSeedCollisions({}).ok, true);
  assert.equal(
    assertNoLoadSeedCollisions({ userByEmail: { id: "x" } }).ok,
    false,
  );
  assert.equal(
    assertNoLoadSeedCollisions({ eventBySlug: { id: "x" } }).ok,
    false,
  );
});

test("IDs fixes documentés", () => {
  assert.equal(LOAD_SEED_IDS.eventId, "cldstgevt0000000000000001");
  assert.equal(LOAD_SEED_IDS.pollId, "cldstgpoll000000000000001");
  assert.equal(LOAD_SEED_IDS.optionOuiId, "cldstgopt0000000000000001");
  assert.equal(LOAD_SEED_IDS.slug, "load-1000");
});

test("script CLI hors start serveur", () => {
  const cli = readFileSync(join(here, "init-load-staging-1000.mjs"), "utf8");
  assert.match(cli, /LOAD_STAGING_INIT/);
  assert.match(cli, /--confirm-load-staging/);
  assert.match(cli, /Ne modifie PAS le démarrage/);
  const server = readFileSync(join(here, "..", "server.js"), "utf8");
  assert.doesNotMatch(server, /init-load-staging-1000/);
  assert.doesNotMatch(server, /runLoadStaging1000Init/);
});

test("User via $executeRaw — pas user.create (évite P2022 role)", () => {
  const lib = readFileSync(join(here, "..", "lib", "loadStagingInit.js"), "utf8");
  assert.match(lib, /\$executeRaw`/);
  assert.match(lib, /INSERT INTO "User"/);
  assert.doesNotMatch(lib, /user\.create\s*\(/);
  assert.doesNotMatch(lib, /["']role["']\s*,/);
  assert.doesNotMatch(lib, /role:\s*["']USER["']/);
  // Colonnes User explicites (alignées seed SQL staging)
  for (const col of [
    '"id"',
    '"email"',
    '"passwordHash"',
    '"provider"',
    '"eventCredits"',
    '"createdAt"',
    '"updatedAt"',
  ]) {
    assert.match(lib, new RegExp(col.replace(/"/g, '\\"')));
  }
});

test("Event/Poll/PollOption restent en create Prisma (colonnes migrées)", () => {
  const lib = readFileSync(join(here, "..", "lib", "loadStagingInit.js"), "utf8");
  assert.match(lib, /event\.create\s*\(/);
  assert.match(lib, /poll\.create\s*\(/);
  assert.match(lib, /pollOption\.createMany\s*\(/);
  assert.match(lib, /participantsLimit:\s*1000/);
  assert.match(lib, /eventPlanType:\s*["']P1000["']/);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exitCode = 1;
} else {
  console.log("\nTous les tests init-load-staging-1000 OK");
}
