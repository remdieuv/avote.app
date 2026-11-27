/**
 * Lot 0 / 0b — visibilité publique centralisée (landing / mini-site).
 * Exécution : node backend/scripts/test-public-poll-visibility.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  PUBLIC_POLL_SURFACE,
  isPublicLeadCrmExcluded,
  isPollPubliclyExposable,
  filterPollsForPublicSurface,
  landingFeedResultPollsWhere,
} = require("../lib/publicPollVisibility.js");
const { buildLandingFeedItems } = require("../lib/landingFeed.js");

const here = dirname(fileURLToPath(import.meta.url));
const serverJs = join(here, "../server.js");
const landingFeedJs = join(here, "../lib/landingFeed.js");
const visibilityJs = join(here, "../lib/publicPollVisibility.js");
const pageLanding = join(here, "../../frontend/app/e/[slug]/page.jsx");

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

function basePoll(overrides = {}) {
  return {
    id: "poll-1",
    status: "CLOSED",
    type: "SINGLE_CHOICE",
    leadEnabled: false,
    landingResultHidden: false,
    question: "Q",
    quizRevealed: false,
    updatedAt: new Date("2026-01-02T12:00:00Z"),
    createdAt: new Date("2026-01-01T12:00:00Z"),
    options: [
      { id: "o1", label: "Oui" },
      { id: "o2", label: "Non" },
    ],
    votes: [
      { optionId: "o1", voterSessionId: "s1" },
      { optionId: "o2", voterSessionId: "s2" },
    ],
    event: { isLiveConsumed: true, displayState: "RESULTS" },
    ...overrides,
  };
}

const ssEvent = (selected, extra = {}) => ({
  consultationMode: "SELF_SERVICE",
  selfServiceSelectedPollIds: selected,
  selfServiceOpen: false,
  landingKeepResultsAfter: true,
  ...extra,
});

test("module exporte surfaces et helpers", () => {
  assert.equal(PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT, "landing_feed_result");
  assert.equal(typeof landingFeedResultPollsWhere, "function");
});

test("SS : ACTIVE sélectionnée → visible (consultation ouverte ou pause)", () => {
  const poll = basePoll({ status: "ACTIVE", id: "sel" });
  for (const selfServiceOpen of [true, false]) {
    assert.equal(
      isPollPubliclyExposable({
        event: ssEvent(["sel"], { selfServiceOpen }),
        poll,
        surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
      }),
      true,
      `selfServiceOpen=${selfServiceOpen}`,
    );
  }
});

test("SS : CLOSED sélectionnée → visible", () => {
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent(["poll-1"]),
      poll: basePoll({ status: "CLOSED" }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
});

test("SS : non sélectionnée (ACTIVE ou CLOSED) → invisible", () => {
  for (const status of ["ACTIVE", "CLOSED"]) {
    assert.equal(
      isPollPubliclyExposable({
        event: ssEvent(["other"]),
        poll: basePoll({ id: "hidden", status }),
        surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
      }),
      false,
      status,
    );
  }
});

test("SS : masquage puis réactivation avec votes", () => {
  const poll = basePoll({ id: "voted", status: "ACTIVE" });
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent(["voted"]),
      poll,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent([]),
      poll,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent(["voted"]),
      poll,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
});

test("landingResultHidden → invisible (Live et SS ACTIVE)", () => {
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: basePoll({ landingResultHidden: true }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent(["poll-1"]),
      poll: basePoll({ status: "ACTIVE", landingResultHidden: true }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
});

test("Lead CRM exclu ; Concours autorisé", () => {
  assert.equal(
    isPublicLeadCrmExcluded({ type: "SINGLE_CHOICE", leadEnabled: true }),
    true,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent(["poll-1"]),
      poll: basePoll({ status: "ACTIVE", leadEnabled: true }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: basePoll({ type: "CONTEST_ENTRY", leadEnabled: true }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
});

test("Live : CLOSED autorisée ; ACTIVE exclue du fil", () => {
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: basePoll({ status: "CLOSED" }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: basePoll({ status: "ACTIVE" }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
});

test("DRAFT / SCHEDULED / ARCHIVED → jamais exposables", () => {
  for (const status of ["DRAFT", "SCHEDULED", "ARCHIVED"]) {
    assert.equal(
      isPollPubliclyExposable({
        event: ssEvent(["poll-1"]),
        poll: basePoll({ status }),
        surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
      }),
      false,
      status,
    );
  }
});

test("landingFeedResultPollsWhere : Live CLOSED ; SS sélection ACTIVE|CLOSED", () => {
  assert.deepEqual(
    landingFeedResultPollsWhere({
      id: "evt1",
      consultationMode: "LIVE",
    }),
    { eventId: "evt1", status: "CLOSED" },
  );
  assert.deepEqual(
    landingFeedResultPollsWhere({
      id: "evt1",
      consultationMode: "SELF_SERVICE",
      selfServiceSelectedPollIds: ["a", "b"],
    }),
    {
      eventId: "evt1",
      status: { in: ["CLOSED", "ACTIVE"] },
      id: { in: ["a", "b"] },
    },
  );
  const empty = landingFeedResultPollsWhere({
    id: "evt1",
    consultationMode: "SELF_SERVICE",
    selfServiceSelectedPollIds: [],
  });
  assert.deepEqual(empty.id, { in: [] });
});

test("buildLandingFeedItems : SS ACTIVE sélectionnée présente ; masquée absente", () => {
  const event = ssEvent(["visible"], {
    landingKeepPhotosAfter: true,
    landingKeepMessagesAfter: true,
  });
  const items = buildLandingFeedItems({
    event,
    photos: [],
    messages: [],
    closedPolls: [
      basePoll({ id: "visible", status: "ACTIVE", question: "OK-ACTIVE" }),
      basePoll({
        id: "masked",
        status: "CLOSED",
        question: "SECRET",
        votes: [{ optionId: "o1", voterSessionId: "leak" }],
      }),
      basePoll({ id: "live-style", status: "ACTIVE", question: "Also-sel" }),
    ],
    winnersByPollId: {},
    afterLive: false,
  });
  // live-style not in selected → excluded; only "visible"
  const results = items.filter((i) => i.type === "result");
  assert.equal(results.length, 1);
  assert.equal(results[0].result.pollId, "visible");
  const blob = JSON.stringify(items);
  assert.equal(blob.includes("SECRET"), false);
  assert.equal(blob.includes("masked"), false);
  assert.equal(blob.includes("leak"), false);
  assert.equal(blob.includes("voterSessionId"), false);
});

test("buildLandingFeedItems : Live ACTIVE absente ; CLOSED présente", () => {
  const items = buildLandingFeedItems({
    event: {
      consultationMode: "LIVE",
      landingKeepResultsAfter: true,
    },
    photos: [],
    messages: [],
    closedPolls: [
      basePoll({ id: "active-live", status: "ACTIVE", question: "Antenne" }),
      basePoll({ id: "closed-live", status: "CLOSED", question: "Fermée" }),
    ],
    afterLive: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].result.pollId, "closed-live");
});

test("Bascule sémantique Live → SS → Live (filtre)", () => {
  const pollClosed = basePoll({ id: "q1", status: "CLOSED" });
  const pollActive = basePoll({ id: "q1", status: "ACTIVE" });
  // Live : CLOSED OK
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: pollClosed,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
  // SS sélectionnée ACTIVE (après bascule) OK
  assert.equal(
    isPollPubliclyExposable({
      event: ssEvent(["q1"]),
      poll: pollActive,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
  // Retour Live avec ACTIVE (antenne) → hors fil
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: pollActive,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
  // Retour Live CLOSED → OK
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: pollClosed,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
});

test("filterPollsForPublicSurface SS mixte", () => {
  const filtered = filterPollsForPublicSurface({
    event: ssEvent(["keep-a", "keep-c"]),
    surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    polls: [
      basePoll({ id: "keep-a", status: "ACTIVE" }),
      basePoll({ id: "drop", status: "CLOSED" }),
      basePoll({ id: "keep-c", status: "CLOSED" }),
      basePoll({ id: "hidden-manual", status: "ACTIVE", landingResultHidden: true }),
    ],
  });
  assert.deepEqual(
    filtered.map((p) => p.id).sort(),
    ["keep-a", "keep-c"],
  );
});

test("API landing : where dynamique + soft-refresh ; pas selfServiceOpen dans filtre", () => {
  const server = readFileSync(serverJs, "utf8");
  assert.match(server, /landingFeedResultPollsWhere/);
  assert.match(server, /resultPollsRaw/);
  assert.match(server, /filterPollsForPublicSurface/);

  const visSrc = readFileSync(visibilityJs, "utf8");
  assert.match(visSrc, /SELF_SERVICE/);
  assert.match(visSrc, /status !== "CLOSED" && status !== "ACTIVE"/);
  assert.match(visSrc, /normalizeSelfServiceSelectedPollIds/);
  assert.doesNotMatch(
    visSrc,
    /event\.selfServiceOpen|Boolean\(\s*event\?\.selfServiceOpen/,
    "selfServiceOpen ne doit pas gouverner l’exposition des résultats",
  );

  const feedSrc = readFileSync(landingFeedJs, "utf8");
  assert.match(feedSrc, /isPollPubliclyExposable/);
  assert.doesNotMatch(feedSrc, /status !== "CLOSED"/);

  const page = readFileSync(pageLanding, "utf8");
  assert.match(page, /SOFT_MS|30_000/);
  assert.match(page, /setInterval\(softRefresh/);
  assert.match(page, /\/events\/slug\/.*\/landing/);
});

test("surfaces futures minisite/journal/share branchées SS ACTIVE", () => {
  const event = ssEvent(["poll-1"]);
  const poll = basePoll({ status: "ACTIVE" });
  for (const surface of [
    PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
    PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT,
    PUBLIC_POLL_SURFACE.SHARE_RESULT,
  ]) {
    assert.equal(
      isPollPubliclyExposable({ event, poll, surface }),
      true,
      surface,
    );
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests public-poll-visibility OK");
