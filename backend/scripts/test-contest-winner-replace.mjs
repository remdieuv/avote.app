/**
 * LOT-2 — Remplacement gagnant concours (helpers purs + file exclusive).
 * Exécution : node backend/scripts/test-contest-winner-replace.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  STATUS_ACTIVE,
  STATUS_REPLACED,
  createPollExclusiveQueue,
  filterActiveContestWinners,
  resolveReplaceContestWinnerPlan,
  activeWinnersStayWithinQuotaAfterReplace,
  normalizeContestWinnerStatus,
} = require("../lib/contestWinnerReplace.js");

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

await test("normalize + filter ACTIVE / REPLACED", () => {
  assert.equal(normalizeContestWinnerStatus("replaced"), STATUS_REPLACED);
  assert.equal(normalizeContestWinnerStatus(null), STATUS_ACTIVE);
  const active = filterActiveContestWinners([
    { id: "a", status: STATUS_ACTIVE },
    { id: "b", status: STATUS_REPLACED },
    { id: "c" },
  ]);
  assert.equal(active.length, 2);
  assert.deepEqual(
    active.map((w) => w.id),
    ["a", "c"],
  );
});

await test("remplacement réussi (plan)", () => {
  const plan = resolveReplaceContestWinnerPlan({
    target: { id: "w1", status: STATUS_ACTIVE, position: 2 },
    eligiblePool: [
      { voterSessionId: "s2", firstName: "Bob" },
      { voterSessionId: "s3", firstName: "Cara" },
    ],
    randomInt: () => 1,
  });
  assert.equal(plan.ok, true);
  if (plan.ok) {
    assert.equal(plan.position, 2);
    assert.equal(plan.picked.firstName, "Cara");
  }
});

await test("plusieurs gagnants : cible précise", () => {
  const plan = resolveReplaceContestWinnerPlan({
    target: { id: "w2", status: "ACTIVE", position: 1 },
    eligiblePool: [{ voterSessionId: "s9", firstName: "Zoé" }],
    randomInt: () => 0,
  });
  assert.equal(plan.ok, true);
  if (plan.ok) assert.equal(plan.position, 1);
});

await test("absence de remplaçant", () => {
  const plan = resolveReplaceContestWinnerPlan({
    target: { id: "w1", status: STATUS_ACTIVE, position: 1 },
    eligiblePool: [],
  });
  assert.equal(plan.ok, false);
  if (!plan.ok) {
    assert.equal(plan.code, "NO_REPLACEMENT");
    assert.match(plan.error, /Aucun remplaçant/i);
  }
});

await test("gagnant déjà remplacé", () => {
  const plan = resolveReplaceContestWinnerPlan({
    target: { id: "w1", status: STATUS_REPLACED, position: 1 },
    eligiblePool: [{ voterSessionId: "s2" }],
  });
  assert.equal(plan.ok, false);
  if (!plan.ok) assert.equal(plan.code, "NOT_ACTIVE");
});

await test("quota actifs inchangé après remplacement", () => {
  assert.equal(
    activeWinnersStayWithinQuotaAfterReplace({ activeBefore: 2, quota: 2 }),
    true,
  );
  assert.equal(
    activeWinnersStayWithinQuotaAfterReplace({ activeBefore: 3, quota: 2 }),
    false,
  );
});

await test("clics simultanés : file exclusive sérialise", async () => {
  const run = createPollExclusiveQueue();
  /** @type {number[]} */
  const order = [];
  let concurrent = 0;
  let maxConcurrent = 0;

  async function job(label, delayMs) {
    return run("poll-A", async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      order.push(`start-${label}`);
      await new Promise((r) => setTimeout(r, delayMs));
      order.push(`end-${label}`);
      concurrent -= 1;
      return label;
    });
  }

  const [a, b] = await Promise.all([job("1", 40), job("2", 10)]);
  assert.equal(a, "1");
  assert.equal(b, "2");
  assert.equal(maxConcurrent, 1, "jamais deux remplacements en parallèle");
  assert.deepEqual(order, ["start-1", "end-1", "start-2", "end-2"]);
});

await test("confidentialité : payload public sans coordonnées", async () => {
  // Miroir du contrat FE buildPublicContestStatusFromWinners (import dynamique).
  const { buildPublicContestStatusFromWinners } = await import(
    "../../frontend/lib/leadContestLiveFlow.js"
  );
  const pub = buildPublicContestStatusFromWinners({
    voterSessionId: "s-new",
    winners: [
      {
        id: "old",
        status: STATUS_REPLACED,
        voterSessionId: "s-old",
        firstName: "Marie",
        lastName: "Dupont",
        phone: "0601020304",
        email: "m@x.fr",
        position: 1,
      },
      {
        id: "new",
        status: STATUS_ACTIVE,
        voterSessionId: "s-new",
        firstName: "Paul",
        lastName: "Martin",
        phone: "0600000000",
        email: "p@x.fr",
        position: 1,
      },
    ],
  });
  assert.equal(pub.totalWinners, 1);
  assert.equal(pub.isCurrentVoterWinner, true);
  assert.equal(pub.winners[0].displayName, "Paul M.");
  assert.equal(
    Object.prototype.hasOwnProperty.call(pub.winners[0], "phone"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(pub.winners[0], "email"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(pub.winners[0], "displayContact"),
    false,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — LOT-2 contest winner replace`);
