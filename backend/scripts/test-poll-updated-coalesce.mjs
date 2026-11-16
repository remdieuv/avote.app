/**
 * Coalesce poll_updated (votes) vs flush critique.
 * Exécution : node backend/scripts/test-poll-updated-coalesce.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { createPollUpdatedCoalescer } = require("../lib/pollUpdatedCoalesce.js");

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

await testAsync("plusieurs schedule → un seul emit (dernier état via emit)", async () => {
  let calls = 0;
  /** @type {string[]} */
  const ids = [];
  const c = createPollUpdatedCoalescer({
    delayMs: 80,
    emit: async (pollId) => {
      calls += 1;
      ids.push(pollId);
    },
  });
  c.schedule("p1");
  c.schedule("p1");
  c.schedule("p1");
  assert.equal(c.hasPending("p1"), true);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(calls, 1);
  assert.deepEqual(ids, ["p1"]);
  assert.equal(c.hasPending("p1"), false);
});

await testAsync("flushNow immédiat annule le timer", async () => {
  let calls = 0;
  const c = createPollUpdatedCoalescer({
    delayMs: 200,
    emit: async () => {
      calls += 1;
    },
  });
  c.schedule("p2");
  await c.flushNow("p2");
  assert.equal(calls, 1);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(calls, 1, "pas de 2e emit après flush");
});

await testAsync("cancel empêche l’emit planifié", async () => {
  let calls = 0;
  const c = createPollUpdatedCoalescer({
    delayMs: 60,
    emit: async () => {
      calls += 1;
    },
  });
  c.schedule("p3");
  c.cancel("p3");
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(calls, 0);
});

test("contrat server : vote schedule, critiques emitPollUpdated/cancel", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.match(src, /schedulePollUpdatedAfterVote\(io, pollId\)/);
  assert.match(src, /createPollUpdatedCoalescer/);
  assert.match(src, /pollUpdatedCoalescer\.cancel/);
  const voteBlock = src.slice(
    src.indexOf('"/polls/:pollId/vote"'),
    src.indexOf('"/polls/:pollId/leads"'),
  );
  assert.match(voteBlock, /schedulePollUpdatedAfterVote/);
  assert.equal(
    /emitPollUpdated\(io, pollId\)/.test(voteBlock),
    false,
    "POST vote ne doit plus emitPollUpdated immédiat",
  );
});

if (failed) process.exit(1);
console.log("all ok");
