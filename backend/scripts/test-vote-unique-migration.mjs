/**
 * Migration unique Vote : pas de DELETE ; échec si doublons.
 * Exécution : node backend/scripts/test-vote-unique-migration.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

test("migration refuse les doublons sans DELETE", () => {
  const sql = readFileSync(
    join(
      here,
      "../prisma/migrations/20261116120000_perf_vote_unique_poll_event_idx/migration.sql",
    ),
    "utf8",
  );
  assert.match(sql, /AVOTE_VOTE_DUPLICATES/);
  assert.match(sql, /RAISE EXCEPTION/);
  assert.match(sql, /Vote_pollId_voterSessionId_optionId_key/);
  assert.match(sql, /Poll_eventId_idx/);
  assert.equal(/\bDELETE\b/i.test(sql), false);
  assert.equal(/\bTRUNCATE\b/i.test(sql), false);
});

test("schema Prisma : unique triple + index eventId", () => {
  const schema = readFileSync(join(here, "../prisma/schema.prisma"), "utf8");
  assert.match(
    schema,
    /@@unique\(\[\s*pollId\s*,\s*voterSessionId\s*,\s*optionId\s*\]\)/,
  );
  const pollBlock = schema.slice(
    schema.indexOf("model Poll {"),
    schema.indexOf("model ContestDraw {"),
  );
  assert.match(pollBlock, /@@index\(\[\s*eventId\s*\]\)/);
});

if (failed) process.exit(1);
console.log("all ok");
