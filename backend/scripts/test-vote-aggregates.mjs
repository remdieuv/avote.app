/**
 * Agrégats Vote + résolution pollToJson-compatible.
 * Exécution : node backend/scripts/test-vote-aggregates.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  attachVoteAggregatesToPoll,
  resolveVoteCountsFromPoll,
  countDistinctParticipantsForEvent,
  fetchPollVoteAggregates,
} = require("../lib/voteAggregates.js");

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

test("resolve depuis agrégats attachés", () => {
  const poll = attachVoteAggregatesToPoll(
    { id: "p1" },
    { optionVoteCounts: { o1: 3, o2: 1 }, votersCount: 4, voteCount: 4 },
  );
  const r = resolveVoteCountsFromPoll(poll);
  assert.equal(r.votersCount, 4);
  assert.equal(r.voteCounts.o1, 3);
  assert.equal(r.voteCounts.o2, 1);
});

test("fallback lignes votes (MULTIPLE_CHOICE)", () => {
  const r = resolveVoteCountsFromPoll({
    votes: [
      { optionId: "a", voterSessionId: "s1" },
      { optionId: "b", voterSessionId: "s1" },
      { optionId: "a", voterSessionId: "s2" },
    ],
  });
  assert.equal(r.voteCounts.a, 2);
  assert.equal(r.voteCounts.b, 1);
  assert.equal(r.votersCount, 2);
});

test("COUNT DISTINCT SQL présent dans helper + submitVote", () => {
  const aggSrc = readFileSync(join(here, "../lib/voteAggregates.js"), "utf8");
  assert.match(aggSrc, /COUNT\(DISTINCT v\."voterSessionId"\)/);
  const serverSrc = readFileSync(join(here, "../server.js"), "utf8");
  assert.match(serverSrc, /countDistinctParticipantsForEvent/);
  assert.equal(
    /vote\.findMany\(\{\s*where: \{ poll: \{ eventId \} \},\s*distinct: \["voterSessionId"\]/m.test(
      serverSrc,
    ),
    false,
    "submitVote ne doit plus findMany distinct sessions",
  );
});

test("loadPollFull n’inclut plus votes: true", () => {
  const serverSrc = readFileSync(join(here, "../server.js"), "utf8");
  const fnStart = serverSrc.indexOf("async function loadPollFull");
  const fnEnd = serverSrc.indexOf("async function loadPublicPollPourSlug");
  const body = serverSrc.slice(fnStart, fnEnd);
  assert.match(body, /fetchPollVoteAggregates/);
  assert.equal(body.includes("votes: true"), false);
});

test("helpers exportés", () => {
  assert.equal(typeof countDistinctParticipantsForEvent, "function");
  assert.equal(typeof fetchPollVoteAggregates, "function");
});

if (failed) process.exit(1);
console.log("all ok");
