/**
 * Lot 0 — visibilité publique centralisée (landing / mini-site).
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

function baseClosedPoll(overrides = {}) {
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

test("module exporte surfaces et helpers", () => {
  assert.equal(PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT, "landing_feed_result");
  assert.equal(PUBLIC_POLL_SURFACE.MINISITE_RESULTS, "minisite_results");
  assert.equal(PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT, "journal_auto_result");
  assert.equal(PUBLIC_POLL_SURFACE.SHARE_RESULT, "share_result");
  assert.equal(PUBLIC_POLL_SURFACE.PUBLIC_COUNTERS, "public_counters");
  assert.equal(typeof isPollPubliclyExposable, "function");
  assert.equal(typeof filterPollsForPublicSurface, "function");
});

test("SS : CLOSED sélectionnée → visible landing", () => {
  const ok = isPollPubliclyExposable({
    event: {
      consultationMode: "SELF_SERVICE",
      selfServiceSelectedPollIds: ["poll-1", "other"],
    },
    poll: baseClosedPoll(),
    surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
  });
  assert.equal(ok, true);
});

test("SS : CLOSED masquée (hors sélection) → invisible malgré votes", () => {
  const ok = isPollPubliclyExposable({
    event: {
      consultationMode: "SELF_SERVICE",
      selfServiceSelectedPollIds: ["other-only"],
    },
    poll: baseClosedPoll({ id: "poll-hidden" }),
    surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
  });
  assert.equal(ok, false);
});

test("SS : précédemment visible puis masquée → invisible", () => {
  const poll = baseClosedPoll({ id: "was-visible" });
  assert.equal(
    isPollPubliclyExposable({
      event: {
        consultationMode: "self_service",
        selfServiceSelectedPollIds: ["was-visible"],
      },
      poll,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: {
        consultationMode: "self_service",
        selfServiceSelectedPollIds: [],
      },
      poll,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
});

test("landingResultHidden → invisible (Live et SS)", () => {
  const poll = baseClosedPoll({ landingResultHidden: true });
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll,
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: {
        consultationMode: "SELF_SERVICE",
        selfServiceSelectedPollIds: ["poll-1"],
      },
      poll,
      surface: PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
    }),
    false,
  );
});

test("DRAFT / SCHEDULED / ARCHIVED → jamais exposables", () => {
  for (const status of ["DRAFT", "SCHEDULED", "ARCHIVED"]) {
    assert.equal(
      isPollPubliclyExposable({
        event: { consultationMode: "LIVE" },
        poll: baseClosedPoll({ status }),
        surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
      }),
      false,
      status,
    );
  }
});

test("Live : CLOSED non hidden → résultat autorisé", () => {
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: baseClosedPoll(),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
});

test("Lead CRM exclu ; Concours non exclu par leadEnabled seul", () => {
  assert.equal(
    isPublicLeadCrmExcluded({
      type: "SINGLE_CHOICE",
      leadEnabled: true,
    }),
    true,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: baseClosedPoll({ leadEnabled: true, type: "SINGLE_CHOICE" }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    false,
  );
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: baseClosedPoll({
        type: "CONTEST_ENTRY",
        leadEnabled: true,
      }),
      surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    }),
    true,
  );
});

test("filterPollsForPublicSurface retire les interdits", () => {
  const event = {
    consultationMode: "SELF_SERVICE",
    selfServiceSelectedPollIds: ["keep"],
  };
  const filtered = filterPollsForPublicSurface({
    event,
    surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
    polls: [
      baseClosedPoll({ id: "keep" }),
      baseClosedPoll({ id: "drop-ss" }),
      baseClosedPoll({ id: "drop-hidden", landingResultHidden: true }),
      baseClosedPoll({ id: "drop-draft", status: "DRAFT" }),
    ],
  });
  assert.deepEqual(
    filtered.map((p) => p.id),
    ["keep"],
  );
});

test("buildLandingFeedItems : SS masquée absente du JSON fil", () => {
  const event = {
    consultationMode: "SELF_SERVICE",
    selfServiceSelectedPollIds: ["visible"],
    landingKeepPhotosAfter: true,
    landingKeepResultsAfter: true,
    landingKeepMessagesAfter: true,
  };
  const items = buildLandingFeedItems({
    event,
    photos: [],
    messages: [],
    closedPolls: [
      baseClosedPoll({ id: "visible", question: "OK" }),
      baseClosedPoll({
        id: "masked",
        question: "SECRET",
        votes: [{ optionId: "o1", voterSessionId: "leak" }],
      }),
    ],
    winnersByPollId: {},
    afterLive: false,
  });
  const results = items.filter((i) => i.type === "result");
  assert.equal(results.length, 1);
  assert.equal(results[0].result.pollId, "visible");
  const blob = JSON.stringify(items);
  assert.equal(blob.includes("SECRET"), false);
  assert.equal(blob.includes("masked"), false);
  assert.equal(blob.includes("leak"), false);
  assert.equal(blob.includes("voterSessionId"), false);
});

test("buildLandingFeedItems : Live conserve résultat autorisé", () => {
  const items = buildLandingFeedItems({
    event: {
      consultationMode: "LIVE",
      landingKeepResultsAfter: true,
    },
    photos: [],
    messages: [],
    closedPolls: [baseClosedPoll({ id: "live-closed", question: "Live Q" })],
    afterLive: false,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "result");
  assert.equal(items[0].result.pollId, "live-closed");
  assert.equal(items[0].result.votersCount, 2);
});

test("surfaces futures minisite/journal/share/counters branchées", () => {
  const event = {
    consultationMode: "SELF_SERVICE",
    selfServiceSelectedPollIds: ["poll-1"],
  };
  const poll = baseClosedPoll();
  for (const surface of [
    PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
    PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT,
    PUBLIC_POLL_SURFACE.SHARE_RESULT,
    PUBLIC_POLL_SURFACE.PUBLIC_COUNTERS,
  ]) {
    assert.equal(
      isPollPubliclyExposable({ event, poll, surface }),
      true,
      surface,
    );
  }
  assert.equal(
    isPollPubliclyExposable({
      event: { ...event, selfServiceSelectedPollIds: [] },
      poll,
      surface: PUBLIC_POLL_SURFACE.SHARE_RESULT,
    }),
    false,
  );
});

test("API landing : filtre avant feed + soft-refresh inchangé", () => {
  const server = readFileSync(serverJs, "utf8");
  assert.match(server, /filterPollsForPublicSurface/);
  assert.match(server, /PUBLIC_POLL_SURFACE\.LANDING_FEED_RESULT/);
  assert.match(server, /closedPollsRaw/);
  assert.match(server, /publicPollVisibility/);

  const feedSrc = readFileSync(landingFeedJs, "utf8");
  assert.match(feedSrc, /isPollPubliclyExposable/);
  assert.match(feedSrc, /LANDING_FEED_RESULT/);

  const visSrc = readFileSync(visibilityJs, "utf8");
  assert.match(visSrc, /isSelfServicePubliclyVisiblePoll/);
  assert.match(visSrc, /landingResultHidden/);

  const page = readFileSync(pageLanding, "utf8");
  assert.match(page, /SOFT_MS/);
  assert.match(page, /\/events\/slug\/.*\/landing/);
  assert.match(page, /feed: Array\.isArray\(data\.feed\)/);
});

test("pas de touche régie dans le lot (fichiers absents du diff logique)", () => {
  const server = readFileSync(serverJs, "utf8");
  // Le correctif landing reste sur la route slug/landing uniquement pour le filtre.
  const landingIdx = server.indexOf('app.get("/events/slug/:slug/landing"');
  assert.ok(landingIdx > 0);
  const snippet = server.slice(landingIdx, landingIdx + 8000);
  assert.match(snippet, /filterPollsForPublicSurface/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests public-poll-visibility OK");
