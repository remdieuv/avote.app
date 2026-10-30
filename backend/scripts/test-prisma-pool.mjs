/**
 * Pool Prisma — connection_limit + singleton.
 * Exécution : node backend/scripts/test-prisma-pool.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  withPrismaConnectionLimit,
  DEFAULT_CONNECTION_LIMIT,
} = require("../lib/prisma.js");

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

test("ajoute connection_limit par défaut si absent", () => {
  const out = withPrismaConnectionLimit(
    "postgresql://u:p@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  );
  const u = new URL(out);
  assert.equal(u.searchParams.get("connection_limit"), String(DEFAULT_CONNECTION_LIMIT));
  assert.equal(u.searchParams.get("pgbouncer"), "true");
});

test("ne remplace pas un connection_limit déjà présent", () => {
  const out = withPrismaConnectionLimit(
    "postgresql://u:p@host:6543/postgres?connection_limit=2&pgbouncer=true",
  );
  assert.equal(new URL(out).searchParams.get("connection_limit"), "2");
});

test("URL invalide / vide : renvoie tel quel", () => {
  assert.equal(withPrismaConnectionLimit(undefined), undefined);
  assert.equal(withPrismaConnectionLimit(""), "");
  assert.equal(withPrismaConnectionLimit("not-a-url"), "not-a-url");
});

test("prisma.js : singleton globalThis aussi en production", () => {
  const src = readFileSync(join(here, "../lib/prisma.js"), "utf8");
  assert.ok(src.includes("globalForPrisma.prisma = prisma"));
  assert.equal(
    /if\s*\(\s*process\.env\.NODE_ENV\s*!==\s*["']production["']\s*\)\s*\{\s*globalForPrisma\.prisma\s*=/.test(
      src,
    ),
    false,
    "le cache global ne doit plus être réservé au hors-prod",
  );
});

test("server.js : join_event snapshot + présence ont .catch", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const joinIdx = src.indexOf('socket.on("join_event"');
  assert.ok(joinIdx > 0);
  const joinBlock = src.slice(joinIdx, joinIdx + 700);
  assert.ok(joinBlock.includes("emitEventLiveSnapshotToSocket(socket, id)"));
  assert.ok(joinBlock.includes(".catch("));
  assert.ok(src.includes('process.on("unhandledRejection"'));
  assert.ok(src.includes("timer auto-reveal"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests prisma-pool OK");
