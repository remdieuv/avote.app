/**
 * Contrats submitVote après perf : replace Lead/Concours, capacité, MC.
 * Exécution : node backend/scripts/test-submit-vote-perf-guards.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "../server.js"), "utf8");
const fnStart = src.indexOf("async function submitVote");
const fnEnd = src.indexOf("async function emitPollUpdated");
assert.ok(fnStart > 0 && fnEnd > fnStart);
const body = src.slice(fnStart, fnEnd);

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

test("replace Lead/Concours conservé", () => {
  assert.match(body, /canReplaceLeadContestVote/);
  assert.match(body, /CONTEST_ENTRY/);
  assert.match(body, /leadEnabled/);
  assert.match(body, /deleteMany/);
});

test("alreadyVoted si non-replaceable", () => {
  assert.match(body, /alreadyVoted:\s*true/);
  assert.match(body, /MULTIPLE_CHOICE/);
});

test("capacité via COUNT DISTINCT helper + isLocked", () => {
  assert.match(body, /countDistinctParticipantsForEvent/);
  assert.match(body, /limitReached:\s*true/);
  assert.match(body, /isLocked:\s*true/);
  assert.match(body, /participantsLimit/);
});

test("FOR UPDATE Event + Poll conservés", () => {
  assert.match(body, /FOR UPDATE/);
  assert.match(body, /SELECT 1 FROM "Event"/);
  assert.match(body, /SELECT 1 FROM "Poll"/);
});

test("P2002 alwaysVoted conservé (unique DB)", () => {
  assert.match(body, /P2002/);
});

if (failed) process.exit(1);
console.log("all ok");
