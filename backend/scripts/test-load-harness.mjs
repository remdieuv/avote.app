/**
 * Tests unitaires du harness de charge (sans réseau).
 * Exécution : node backend/scripts/test-load-harness.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  isProductionHostname,
  assertLoadTargetAllowed,
  assertLoadRunAuthorized,
  percentile,
  summarizeLatencies,
  buildReport,
  evaluateStopConditions,
  LOAD_TIERS,
  parseTier,
  buildTierPlan,
  evaluateVoteCoherence,
  voteIntervalMs,
  voteStartDelayMs,
  simulateCapacityTopUp,
} = require("../lib/loadHarness");

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

test("Paliers exacts 10…1000", () => {
  assert.deepEqual([...LOAD_TIERS], [10, 100, 250, 500, 1000]);
  assert.equal(parseTier(100), 100);
  assert.equal(parseTier(75), null);
});

test("Prod guard bloque domaines AVOTE production", () => {
  assert.equal(isProductionHostname("www.avote.app"), true);
  assert.equal(isProductionHostname("avote.app"), true);
  assert.equal(isProductionHostname("avoteapp-production.up.railway.app"), true);
  assert.equal(isProductionHostname("avote-app.vercel.app"), true);
  assert.equal(isProductionHostname("staging.example.com"), false);
  assert.equal(isProductionHostname("localhost"), false);
  assert.equal(
    assertLoadTargetAllowed("https://www.avote.app").code,
    "LOAD_PROD_BLOCKED",
  );
  assert.equal(
    assertLoadTargetAllowed(
      "https://avoteapp-production.up.railway.app",
    ).code,
    "LOAD_PROD_BLOCKED",
  );
  assert.equal(
    assertLoadTargetAllowed("https://load-staging.example.com").ok,
    true,
  );
});

test("Run réseau exige allow + confirm staging", () => {
  const denied = assertLoadRunAuthorized({
    apiUrl: "https://staging.example.com",
    allowRun: false,
    confirmIsolated: true,
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "LOAD_RUN_LOCKED");

  const unconfirmed = assertLoadRunAuthorized({
    apiUrl: "https://staging.example.com",
    allowRun: "1",
    confirmIsolated: false,
  });
  assert.equal(unconfirmed.ok, false);
  assert.equal(unconfirmed.code, "LOAD_STAGING_UNCONFIRMED");

  const prod = assertLoadRunAuthorized({
    apiUrl: "https://www.avote.app",
    allowRun: "1",
    confirmIsolated: "1",
  });
  assert.equal(prod.ok, false);
  assert.equal(prod.code, "LOAD_PROD_BLOCKED");

  const ok = assertLoadRunAuthorized({
    apiUrl: "http://127.0.0.1:4000",
    allowRun: "1",
    confirmIsolated: true,
  });
  assert.equal(ok.ok, true);
});

test("Percentiles et stop conditions", () => {
  const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  assert.equal(percentile(samples, 50), 55);
  const lat = summarizeLatencies(samples);
  assert.ok(lat.p95 != null && lat.p95 >= 90);
  const report = buildReport({
    httpAttempts: 100,
    httpErrors: 2,
    socketAttempts: 100,
    socketErrors: 0,
    latenciesMs: Array(100).fill(100),
  });
  assert.ok(report.combinedErrorRate <= 0.01);
  const stopOk = evaluateStopConditions(report);
  assert.equal(stopOk.stop, false);

  const stopErr = evaluateStopConditions({
    combinedErrorRate: 0.02,
    latency: { p95: 100 },
  });
  assert.equal(stopErr.stop, true);
  assert.match(stopErr.reasons.join(" "), /errorRate/);

  const stopP95 = evaluateStopConditions({
    combinedErrorRate: 0,
    latency: { p95: 2500 },
  });
  assert.equal(stopP95.stop, true);
  assert.match(stopP95.reasons.join(" "), /p95/);
});

test("Plan palier : pacing sous plafond IP 400/s", () => {
  const plan = buildTierPlan({
    tier: 1000,
    participantsLimit: 1000,
    maxVotesPerSec: 350,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.maxVotesPerSec, 350);
  assert.ok(plan.maxVotesPerSec < 400);
  assert.ok(plan.phases.some((p) => p.id === "connect_and_vote"));
  assert.ok(plan.phases.some((p) => p.id === "saturation_probe"));
  assert.ok(plan.phases.some((p) => p.id === "topup_simulated"));
  assert.equal(voteIntervalMs(350), 3);
  assert.equal(voteStartDelayMs(0, 350), 0);
  assert.ok(voteStartDelayMs(349, 350) >= 1000);
});

test("Cohérence votes + top-up simulé sans Stripe", () => {
  const c = evaluateVoteCoherence({ voteOk: 100, expectedParticipants: 100 });
  assert.equal(c.ok, true);
  const bad = evaluateVoteCoherence({ voteOk: 90, expectedParticipants: 100 });
  assert.equal(bad.ok, false);

  const top = simulateCapacityTopUp({
    participantsLimit: 100,
    liveState: "LIVE",
    isLocked: false,
    delta: 50,
  });
  assert.equal(top.ok, true);
  assert.equal(top.stripeUsed, false);
  assert.equal(top.nextLimit, 150);

  const finished = simulateCapacityTopUp({
    participantsLimit: 100,
    liveState: "FINISHED",
    delta: 50,
  });
  assert.equal(finished.ok, false);
  assert.equal(finished.code, "EVENT_FINISHED");
});

test("CLI + libs présents ; pas d’appel prod hardcodé", () => {
  const cli = readFileSync(join(here, "load-harness.mjs"), "utf8");
  const runner = readFileSync(
    join(here, "../lib/loadHarness/runner.js"),
    "utf8",
  );
  assert.match(cli, /confirm-isolated-staging/);
  assert.match(cli, /LOAD_ALLOW_RUN/);
  assert.match(runner, /voterSessionId/);
  assert.match(runner, /join_event/);
  assert.match(runner, /join_poll/);
  assert.match(runner, /LIMIT_REACHED/);
  assert.doesNotMatch(runner, /www\.avote\.app/);
  assert.doesNotMatch(cli, /sk_live_/);
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests load-harness OK");
