/**
 * Passage TEST → RÉEL — helpers reset + contrat source start-real.
 * Exécution : node backend/scripts/test-start-real-event-reset.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveFirstPlayablePollId,
  buildStartRealEventResetPatch,
  buildStartRealPollStatusUpdates,
  getStartRealDeletionScope,
  shouldPerformStartRealRuntimeReset,
  startRealResetAppliesToPlan,
} = require("../lib/startRealEventReset.js");

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

test("FUN et EVENT : même reset runtime", () => {
  assert.equal(startRealResetAppliesToPlan("FUN"), true);
  assert.equal(startRealResetAppliesToPlan("EVENT"), true);
  assert.equal(startRealResetAppliesToPlan("OTHER"), false);
});

test("Wipe uniquement si isLiveConsumed === false", () => {
  assert.equal(shouldPerformStartRealRuntimeReset({ isLiveConsumed: false }), true);
  assert.equal(shouldPerformStartRealRuntimeReset({ isLiveConsumed: true }), false);
  assert.equal(shouldPerformStartRealRuntimeReset({}), false);
});

test("Q1 = premier order non ARCHIVED", () => {
  assert.equal(
    resolveFirstPlayablePollId([
      { id: "p2", order: 1, status: "CLOSED" },
      { id: "p1", order: 0, status: "CLOSED" },
      { id: "arch", order: -1, status: "ARCHIVED" },
    ]),
    "p1",
  );
  assert.equal(resolveFirstPlayablePollId([]), null);
});

test("Statuses : Q1 ACTIVE, autres DRAFT, ARCHIVED intact", () => {
  const updates = buildStartRealPollStatusUpdates(
    [
      { id: "p1", status: "CLOSED" },
      { id: "p2", status: "ACTIVE" },
      { id: "arch", status: "ARCHIVED" },
    ],
    "p1",
  );
  assert.deepEqual(updates, [
    { id: "p1", status: "ACTIVE" },
    { id: "p2", status: "DRAFT" },
  ]);
});

test("Patch event : Q1 WAITING + chrono total conservé / runtime réarmé", () => {
  const patch = buildStartRealEventResetPatch({
    firstPollId: "p1",
    screenDisplayState: "RESULTS",
    questionTimerTotalSec: 90,
  });
  assert.equal(patch.activePollId, "p1");
  assert.equal(patch.liveState, "WAITING");
  assert.equal(patch.voteState, "CLOSED");
  assert.equal(patch.displayState, "WAITING");
  assert.equal(patch.autoRevealShowResultsAt, null);
  assert.equal(patch.questionTimerTotalSec, 90);
  assert.equal(patch.questionTimerAccumulatedSec, 0);
  assert.equal(patch.questionTimerStartedAt, null);
  assert.equal(patch.questionTimerIsPaused, true);
  assert.equal(patch.screenDisplayState, null);
});

test("Patch event : BLACK screen préservé", () => {
  const patch = buildStartRealEventResetPatch({
    firstPollId: "p1",
    screenDisplayState: "BLACK",
    questionTimerTotalSec: 30,
  });
  assert.equal("screenDisplayState" in patch, false);
});

test("Scope delete borné à eventId / pollIds (pas d’autre événement)", () => {
  const scope = getStartRealDeletionScope({
    eventId: "ev1",
    pollIds: ["p1", "p2", "p1"],
  });
  assert.equal(scope.eventId, "ev1");
  assert.deepEqual(scope.pollIds, ["p1", "p2"]);
  assert.deepEqual(scope.deleteVotesWhere, { pollId: { in: ["p1", "p2"] } });
  assert.deepEqual(scope.deleteLeadsWhere, { eventId: "ev1" });
  assert.deepEqual(scope.deleteContestDrawsWhere, { eventId: "ev1" });
  assert.deepEqual(scope.deletionOrder, [
    "contestDrawWinner",
    "contestDraw",
    "leadCapture",
    "vote",
  ]);
});

test("server.js : start-real wipe + conso dans même TX ; 2ᵉ appel sans wipe", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const idx = src.indexOf('app.post("/events/:eventId/start-real"');
  assert.ok(idx > 0);
  const nextRoute = src.indexOf('app.post("/polls/:pollId/open"', idx + 1);
  const block = src.slice(idx, nextRoute > idx ? nextRoute : idx + 12000);
  assert.ok(block.includes("shouldPerformStartRealRuntimeReset"));
  assert.ok(block.includes("getStartRealDeletionScope"));
  assert.ok(block.includes("buildStartRealEventResetPatch"));
  assert.ok(block.includes("contestDrawWinner.deleteMany"));
  assert.ok(block.includes("leadCapture.deleteMany"));
  assert.ok(block.includes("vote.deleteMany"));
  assert.ok(block.includes("EVENT_ALREADY_CONSUMED"));
  assert.ok(block.includes("emitEventLiveUpdated"));
  // Crédit après wipe dans la TX
  const wipeIdx = block.indexOf("contestDrawWinner.deleteMany");
  const consumeIdx = block.indexOf('data: { consumedAt: new Date() }');
  assert.ok(wipeIdx > 0 && consumeIdx > wipeIdx, "consume après wipe");
  // Double appel : garde avant deletes
  const guardIdx = block.indexOf("EVENT_ALREADY_CONSUMED");
  assert.ok(guardIdx > 0 && guardIdx < wipeIdx, "garde before wipe");
});

test("Échec TX sans perte de crédit (contrat : conso après wipe, même transaction)", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const idx = src.indexOf('app.post("/events/:eventId/start-real"');
  const nextRoute = src.indexOf('app.post("/polls/:pollId/open"', idx + 1);
  const block = src.slice(idx, nextRoute > idx ? nextRoute : idx + 12000);
  assert.ok(block.includes("prisma.$transaction"));
  assert.ok(block.includes("NO_ACTIVATION_AVAILABLE"));
  // Disponibilité crédit vérifiée avant deletes
  const noAct = block.indexOf("NO_ACTIVATION_AVAILABLE");
  const wipe = block.indexOf("contestDrawWinner.deleteMany");
  assert.ok(noAct > 0 && noAct < wipe, "refuse sans crédit avant wipe");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests start-real-event-reset OK");
