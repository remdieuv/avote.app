/**
 * Contrats capacité atomique (sans DB).
 * Exécution : node scripts/test-participant-capacity.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  lockParticipantSession,
  claimParticipantSlot,
  releaseParticipantSlot,
  syncParticipantsUsedFromVotes,
} = require("../lib/participantCapacity");
const { buildStartRealEventResetPatch } = require("../lib/startRealEventReset");

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

await test("exports helpers", () => {
  assert.equal(typeof lockParticipantSession, "function");
  assert.equal(typeof claimParticipantSlot, "function");
  assert.equal(typeof releaseParticipantSlot, "function");
  assert.equal(typeof syncParticipantsUsedFromVotes, "function");
});

await test("claim refuse eventId vide", async () => {
  const r = await claimParticipantSlot({ $queryRaw: async () => [] }, "");
  assert.equal(r.ok, false);
  assert.equal(r.code, "EVENT_REQUIRED");
});

await test("claim LIMIT_REACHED si UPDATE ne retourne rien", async () => {
  const r = await claimParticipantSlot({ $queryRaw: async () => [] }, "evt1");
  assert.equal(r.ok, false);
  assert.equal(r.code, "LIMIT_REACHED");
});

await test("claim OK lit participantsUsed retourné", async () => {
  const r = await claimParticipantSlot(
    { $queryRaw: async () => [{ participantsUsed: 42 }] },
    "evt1",
  );
  assert.equal(r.ok, true);
  assert.equal(r.participantsUsed, 42);
});

await test("lock / claim / release SQL attendus", async () => {
  /** @type {string[]} */
  const sqlBits = [];
  const capture = (strings) => {
    const parts = Array.isArray(strings) ? [...strings] : [String(strings)];
    sqlBits.push(parts.join("?"));
  };
  const tx = {
    $executeRaw: async (strings) => {
      capture(strings);
      return 0;
    },
    $queryRaw: async (strings) => {
      capture(strings);
      return [{ participantsUsed: 1 }];
    },
  };
  await lockParticipantSession(tx, "e1", "s1");
  await claimParticipantSlot(tx, "e1");
  await releaseParticipantSlot(tx, "e1");
  await syncParticipantsUsedFromVotes(tx, "e1");
  const blob = sqlBits.join("\n");
  assert.match(blob, /pg_advisory_xact_lock/);
  assert.match(blob, /hashtext/);
  assert.match(blob, /participantsUsed/);
  assert.match(blob, /participantsLimit/);
  assert.match(blob, /GREATEST/);
  assert.match(blob, /COUNT\(DISTINCT/);
});

await test("submitVote : plus de FOR UPDATE Event/Poll ; claim atomique", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const fnStart = src.indexOf("async function submitVote");
  const fnEnd = src.indexOf("async function emitPollUpdated");
  assert.ok(fnStart > 0 && fnEnd > fnStart);
  const body = src.slice(fnStart, fnEnd);
  assert.doesNotMatch(body, /FOR UPDATE/);
  assert.match(body, /lockParticipantSession/);
  assert.match(body, /claimParticipantSlot/);
  assert.match(body, /releaseParticipantSlot/);
  assert.match(body, /limitReached:\s*true/);
  assert.match(body, /canReplaceLeadContestVote/);
  assert.match(body, /P2002/);
});

await test("migration + schema participantsUsed", () => {
  const schema = readFileSync(join(here, "../prisma/schema.prisma"), "utf8");
  assert.match(schema, /participantsUsed\s+Int\s+@default\(0\)/);
  const mig = readFileSync(
    join(
      here,
      "../prisma/migrations/20261117140000_event_participants_used/migration.sql",
    ),
    "utf8",
  );
  assert.match(mig, /ADD COLUMN IF NOT EXISTS "participantsUsed"/);
  assert.match(mig, /COUNT\(DISTINCT v\."voterSessionId"\)/);
});

await test("start-real reset remet participantsUsed à 0", () => {
  const patch = buildStartRealEventResetPatch({ firstPollId: "p1" });
  assert.equal(patch.participantsUsed, 0);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exitCode = 1;
} else {
  console.log("\nTous les tests participant-capacity OK");
}
