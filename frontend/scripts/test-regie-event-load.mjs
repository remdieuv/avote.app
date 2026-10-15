/**
 * Régie — course loading / start-real → rechargement.
 * Exécution : node frontend/scripts/test-regie-event-load.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertRegieUsableAfterStartReal,
  shouldClearRegieEventLoadingAfterFetch,
  shouldRenderRegieEventBody,
} from "../lib/regieEventLoad.js";

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

test("silent courant lève le spinner (race join_event / start-real)", () => {
  assert.equal(
    shouldClearRegieEventLoadingAfterFetch({
      generation: 1,
      currentGeneration: 2,
    }),
    false,
  );
  assert.equal(
    shouldClearRegieEventLoadingAfterFetch({
      generation: 2,
      currentGeneration: 2,
    }),
    true,
  );
});

test("corps régie dès eventData (pas de blank si loading coincé)", () => {
  assert.equal(
    shouldRenderRegieEventBody({
      eventData: { id: "e1" },
      loading: true,
    }),
    true,
  );
  assert.equal(
    shouldRenderRegieEventBody({ eventData: null, loading: true }),
    false,
  );
  assert.equal(
    shouldRenderRegieEventBody({ eventData: { id: "e1" }, loading: false }),
    true,
  );
});

test("non-régression start-real → régie utilisable (Q1 WAITING)", () => {
  const check = assertRegieUsableAfterStartReal({
    isLiveConsumed: true,
    liveState: "waiting",
    voteState: "closed",
    displayState: "waiting",
    activePollId: "p1",
    questionTimerTotalSec: 90,
    questionTimerAccumulatedSec: 0,
    questionTimerStartedAt: null,
    questionTimerIsPaused: true,
    polls: [
      { id: "p1", order: 0, status: "ACTIVE" },
      { id: "p2", order: 1, status: "DRAFT" },
    ],
  });
  assert.equal(check.ok, true, check.errors.join("; "));
  assert.equal(check.firstPollId, "p1");
});

test("non-régression : questions conservées, pas d’effacement autre event", () => {
  const bad = assertRegieUsableAfterStartReal({
    isLiveConsumed: true,
    liveState: "waiting",
    voteState: "closed",
    displayState: "waiting",
    activePollId: null,
    polls: [],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /playable poll/i.test(e)));
});

test("page.jsx source : génération + render body sans gate !loading", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("shouldClearRegieEventLoadingAfterFetch"));
  assert.ok(src.includes("shouldRenderRegieEventBody"));
  assert.ok(src.includes("fetchEventGenerationRef"));
  assert.equal(
    src.includes("{!loading && eventData && ("),
    false,
    "ne plus conditionner le corps à !loading",
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests regie-event-load OK");
