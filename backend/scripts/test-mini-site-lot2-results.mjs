/**
 * Lot 2 — onglet Résultats mini-site (API, historique A, portes Lot 0).
 * Exécution : node backend/scripts/test-mini-site-lot2-results.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  MINISITE_RESULTS_SUPPORTED_TYPES,
  ADVANCED_TYPES_EXCLUDED_V1,
  isMinisiteResultsSupportedType,
  resolveHistoryGranularity,
  buildPublicResultPayload,
  fetchMinisiteResultHistory,
} = require("../lib/miniSiteResults.js");
const { miniSiteApiFields, MINI_SITE_AVAILABLE_OPTIONAL_FLAGS } = require(
  "../lib/miniSite.js",
);
const { PUBLIC_POLL_SURFACE, isPollPubliclyExposable } = require(
  "../lib/publicPollVisibility.js",
);

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma/migrations/20261127180000_vote_pollid_createdat_idx/migration.sql"),
  "utf8",
);
const server = readFileSync(join(root, "server.js"), "utf8");
const resultsLib = readFileSync(join(root, "lib/miniSiteResults.js"), "utf8");

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

test("types V1 supportés / exclus", () => {
  for (const t of MINISITE_RESULTS_SUPPORTED_TYPES) {
    assert.equal(isMinisiteResultsSupportedType(t), true);
  }
  for (const t of ADVANCED_TYPES_EXCLUDED_V1) {
    assert.equal(isMinisiteResultsSupportedType(t), false);
  }
  assert.equal(isMinisiteResultsSupportedType("open_text"), false);
});

test("granularité historique <48h = hour, sinon day", () => {
  const a = new Date("2026-11-27T10:00:00Z");
  const b = new Date("2026-11-28T09:00:00Z");
  assert.equal(resolveHistoryGranularity(a, b), "hour");
  const c = new Date("2026-11-30T10:00:00Z");
  assert.equal(resolveHistoryGranularity(a, c), "day");
});

test("payload public : MC % sur répondants, peut dépasser 100", () => {
  const poll = {
    id: "p1",
    question: "Q ?",
    type: "MULTIPLE_CHOICE",
    status: "CLOSED",
    order: 0,
    quizRevealed: false,
    updatedAt: new Date(),
    options: [
      { id: "o1", label: "A", order: 0 },
      { id: "o2", label: "B", order: 1 },
    ],
  };
  const payload = buildPublicResultPayload(
    poll,
    {
      optionVoteCounts: { o1: 8, o2: 6 },
      votersCount: 10,
      voteCount: 14,
    },
    { isTestMode: true },
  );
  assert.equal(payload.percentBase, "respondents");
  assert.equal(payload.percentMayExceed100, true);
  assert.equal(payload.options[0].percent, 80);
  assert.equal(payload.options[1].percent, 60);
  assert.equal(payload.respondents, 10);
  assert.equal(payload.answers, 14);
  assert.equal(payload.isTestMode, true);
  assert.equal(
    payload.options.reduce((s, o) => s + o.percent, 0) > 100,
    true,
  );
});

test("payload single : % sur réponses, pas d’arrondi feed", () => {
  const poll = {
    id: "p2",
    question: "Oui ?",
    type: "YES_NO",
    status: "CLOSED",
    options: [
      { id: "y", label: "Oui", order: 0 },
      { id: "n", label: "Non", order: 1 },
    ],
  };
  const payload = buildPublicResultPayload(poll, {
    optionVoteCounts: { y: 1, n: 2 },
    votersCount: 3,
    voteCount: 3,
  });
  assert.equal(payload.percentBase, "answers");
  assert.equal(payload.percentMayExceed100, false);
  assert.equal(payload.options[0].percent, 33.3);
  assert.equal(payload.options[1].percent, 66.7);
});

test("historique vide si < 2 buckets", async () => {
  const db = {
    $queryRaw: async (strings, ...values) => {
      const sql = String(strings.join("?"));
      if (sql.includes("MIN(v.\"createdAt\")")) {
        return [{ firstAt: new Date(), lastAt: new Date() }];
      }
      if (sql.includes("voterSessionId")) {
        return [{ bucketStart: new Date(), newRespondents: 2 }];
      }
      if (sql.includes("optionId")) {
        return [];
      }
      return [{ bucketStart: new Date(), newAnswers: 2 }];
    },
  };
  const hist = await fetchMinisiteResultHistory(db, "poll1", {
    optionIds: ["o1"],
    percentBase: "answers",
  });
  assert.equal(hist.hasHistory, false);
  assert.equal(hist.volume.length, 1);
});

test("historique cumulatif multi-buckets + disclaimer", async () => {
  const t0 = new Date("2026-11-27T10:00:00Z");
  const t1 = new Date("2026-11-27T11:00:00Z");
  let call = 0;
  const db = {
    $queryRaw: async () => {
      call += 1;
      if (call === 1) return [{ firstAt: t0, lastAt: t1 }];
      if (call === 2) {
        return [
          { bucketStart: t0, newRespondents: 2 },
          { bucketStart: t1, newRespondents: 1 },
        ];
      }
      if (call === 3) {
        return [
          { bucketStart: t0, newAnswers: 2 },
          { bucketStart: t1, newAnswers: 1 },
        ];
      }
      return [
        { bucketStart: t0, optionId: "o1", newAnswers: 2 },
        { bucketStart: t1, optionId: "o1", newAnswers: 1 },
      ];
    },
  };
  const hist = await fetchMinisiteResultHistory(db, "poll1", {
    optionIds: ["o1"],
    percentBase: "answers",
  });
  assert.equal(hist.hasHistory, true);
  assert.equal(hist.granularity, "hour");
  assert.equal(hist.volume.length, 2);
  assert.equal(hist.volume[1].cumulativeRespondents, 3);
  assert.equal(hist.volume[1].cumulativeAnswers, 3);
  assert.equal(hist.volume[1].periodRespondents, 1);
  assert.match(hist.disclaimer, /pas le suivi individuel|non le suivi individuel/i);
});

test("miniSiteTabResults + Journal disponibles ; Galerie/À propos non", () => {
  assert.equal(MINI_SITE_AVAILABLE_OPTIONAL_FLAGS.has("miniSiteTabResults"), true);
  assert.equal(MINI_SITE_AVAILABLE_OPTIONAL_FLAGS.has("miniSiteTabJournal"), true);
  assert.equal(MINI_SITE_AVAILABLE_OPTIONAL_FLAGS.has("miniSiteTabGallery"), false);
  const pub = miniSiteApiFields(
    { miniSiteTabResults: true, miniSiteTabJournal: true },
    { allowOptionalTabs: false },
  );
  assert.deepEqual(
    pub.tabs.map((t) => t.id),
    ["accueil", "participer", "resultats", "journal"],
  );
});

test("schéma + migration index Vote(pollId, createdAt)", () => {
  assert.match(schema, /@@index\(\[pollId,\s*createdAt\]\)/);
  assert.match(migration, /Vote_pollId_createdAt_idx/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS/);
  assert.doesNotMatch(migration, /DROP |DELETE FROM/i);
});

test("server : routes résultats + gate tab + Cache-Control no-store", () => {
  assert.match(server, /\/events\/slug\/:slug\/landing\/results/);
  assert.match(server, /\/events\/slug\/:slug\/landing\/results\/:pollId/);
  assert.match(server, /\/history/);
  assert.match(server, /MINISITE_RESULTS_DISABLED/);
  assert.match(server, /resolveMinisiteResultsAccess/);
  assert.match(server, /buildMinisiteResultsList/);
  assert.match(server, /Cache-Control.*no-store|no-store/);
  assert.match(server, /MINI_SITE_AVAILABLE_OPTIONAL_FLAGS/);
  assert.match(resultsLib, /PUBLIC_POLL_SURFACE\.MINISITE_RESULTS|SHARE_RESULT/);
  assert.match(resultsLib, /landingFeedResultPollsWhere/);
});

test("visibilités Lot 0 toujours utilisées", () => {
  assert.equal(PUBLIC_POLL_SURFACE.MINISITE_RESULTS, "minisite_results");
  assert.equal(PUBLIC_POLL_SURFACE.SHARE_RESULT, "share_result");
  assert.equal(
    isPollPubliclyExposable({
      event: { consultationMode: "LIVE" },
      poll: {
        id: "x",
        status: "ACTIVE",
        type: "SINGLE_CHOICE",
        leadEnabled: false,
        landingResultHidden: false,
      },
      surface: PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
    }),
    false,
  );
});

test("pas de snapshot historique (approche B reportée)", () => {
  assert.doesNotMatch(resultsLib, /snapshot|ResultSnapshot|approche B/i);
  assert.doesNotMatch(schema, /ResultSnapshot|HistoricalSnapshot/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 2 mini-site résultats backend OK");
