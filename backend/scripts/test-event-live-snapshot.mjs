/**
 * Snapshot live join_event — helpers purs + contrat source serveur.
 * Exécution : node backend/scripts/test-event-live-snapshot.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  shouldIncludePollInEventLivePayload,
  buildEventLiveUpdatedPayload,
  joinEventEmitsSnapshotToJoiningSocketOnly,
} = require("../lib/eventLiveSnapshot.js");

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

test("OPEN + ACTIVE → inclure poll", () => {
  assert.equal(
    shouldIncludePollInEventLivePayload(
      { voteState: "OPEN", displayState: "QUESTION", activePollId: "p1" },
      { id: "p1", status: "ACTIVE" },
    ),
    true,
  );
});

test("RESULTS → inclure poll (visibilité résultats)", () => {
  assert.equal(
    shouldIncludePollInEventLivePayload(
      { voteState: "CLOSED", displayState: "RESULTS", activePollId: "p1" },
      { id: "p1", status: "CLOSED" },
    ),
    true,
  );
});

test("WAITING + poll ACTIVE préparé → inclure (LOT-5)", () => {
  assert.equal(
    shouldIncludePollInEventLivePayload(
      { voteState: "CLOSED", displayState: "WAITING", activePollId: "p2" },
      { id: "p2", status: "ACTIVE" },
    ),
    true,
  );
});

test("WAITING + poll CLOSED d’un autre id → exclure", () => {
  assert.equal(
    shouldIncludePollInEventLivePayload(
      { voteState: "CLOSED", displayState: "WAITING", activePollId: "p1" },
      { id: "p-other", status: "CLOSED" },
    ),
    false,
  );
});

test("vote CLOSED + poll CLOSED actif → inclure (contexte post-chrono)", () => {
  assert.equal(
    shouldIncludePollInEventLivePayload(
      { voteState: "CLOSED", displayState: "WAITING", activePollId: "p1" },
      { id: "p1", status: "CLOSED" },
    ),
    true,
  );
});

test("event ou poll null → exclure", () => {
  assert.equal(shouldIncludePollInEventLivePayload(null, { id: "p" }), false);
  assert.equal(
    shouldIncludePollInEventLivePayload({ voteState: "OPEN" }, null),
    false,
  );
});

test("payload axes lower-case + poll tel quel (pollToJson amont)", () => {
  const revealAt = new Date("2026-01-01T12:00:00.000Z");
  const payload = buildEventLiveUpdatedPayload(
    {
      id: "ev1",
      slug: "e-demo",
      isLiveConsumed: true,
      isLocked: false,
      liveState: "VOTING",
      voteState: "OPEN",
      displayState: "QUESTION",
      screenDisplayState: null,
      activePollId: "p1",
      autoReveal: true,
      autoRevealDelaySec: 5,
      autoRevealShowResultsAt: revealAt,
    },
    {
      id: "p1",
      quizRevealed: false,
      options: [{ id: "o1", label: "A", votes: 2 }],
    },
    { remainingSec: 10, running: true },
  );
  assert.equal(payload.eventId, "ev1");
  assert.equal(payload.liveState, "voting");
  assert.equal(payload.voteState, "open");
  assert.equal(payload.displayState, "question");
  assert.equal(payload.autoRevealShowResultsAt, revealAt.toISOString());
  assert.equal(payload.poll.id, "p1");
  assert.equal(payload.poll.quizRevealed, false);
  assert.equal(payload.questionTimer.remainingSec, 10);
});

test("MODE TEST RESULTS : pollJson déjà masqué est transmis tel quel", () => {
  const payload = buildEventLiveUpdatedPayload(
    {
      id: "ev-test",
      slug: "e-test",
      isLiveConsumed: false,
      isLocked: false,
      liveState: "RESULTS",
      voteState: "CLOSED",
      displayState: "RESULTS",
      activePollId: "p1",
      autoReveal: false,
      autoRevealDelaySec: 5,
      autoRevealShowResultsAt: null,
    },
    {
      id: "p1",
      eventIsLiveConsumed: false,
      options: [{ id: "o1", votes: 10, voteCount: 10 }],
    },
    null,
  );
  assert.equal(payload.isLiveConsumed, false);
  assert.equal(payload.poll.options[0].votes, 10);
});

test("contrat : join = snapshot socket-only", () => {
  assert.equal(joinEventEmitsSnapshotToJoiningSocketOnly(), true);
});

test("server.js : join_event appelle emitEventLiveSnapshotToSocket", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.ok(src.includes("emitEventLiveSnapshotToSocket"));
  const joinIdx = src.indexOf('socket.on("join_event"');
  assert.ok(joinIdx > 0);
  const joinBlock = src.slice(joinIdx, joinIdx + 450);
  assert.ok(joinBlock.includes("emitEventLiveSnapshotToSocket(socket, id)"));
  assert.equal(
    joinBlock.includes('io.to(roomPourEvent'),
    false,
    "join_event ne doit pas broadcaster via io.to(room)",
  );
});

test("server.js : snapshot socket-only n’émet pas poll_updated", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const fnIdx = src.indexOf("async function emitEventLiveSnapshotToSocket");
  assert.ok(fnIdx > 0);
  const fnBody = src.slice(fnIdx, fnIdx + 350);
  assert.ok(fnBody.includes('socket.emit("event_live_updated"'));
  assert.equal(fnBody.includes("poll_updated"), false);
  assert.equal(fnBody.includes("io.to("), false);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests event-live-snapshot OK");
