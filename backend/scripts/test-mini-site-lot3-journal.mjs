/**
 * Lot 3 — Journal mini-site (API, auto fiables, portes Lot 0).
 * Exécution : node backend/scripts/test-mini-site-lot3-journal.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  JOURNAL_TITLE_MAX,
  JOURNAL_BODY_MAX,
  mapPublicJournalNews,
  loadJournalAutoItems,
  buildMinisiteJournal,
  isJournalSupportedPollType,
} = require("../lib/miniSiteJournal.js");
const { miniSiteApiFields, MINI_SITE_AVAILABLE_OPTIONAL_FLAGS } = require(
  "../lib/miniSite.js",
);
const { PUBLIC_POLL_SURFACE, isPollPubliclyExposable } = require(
  "../lib/publicPollVisibility.js",
);
const { landingResultCardFromPoll } = require("../lib/landingFeed.js");

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma/migrations/20261128120000_minisite_lot3_journal/migration.sql"),
  "utf8",
);
const server = readFileSync(join(root, "server.js"), "utf8");
const journalLib = readFileSync(join(root, "lib/miniSiteJournal.js"), "utf8");

let failed = 0;
/** @param {string} name @param {() => void | Promise<void>} fn */
function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`ok — ${name}`);
    })
    .catch((e) => {
      failed += 1;
      console.error(`FAIL — ${name}`);
      console.error(e);
    });
}

await test("schéma + migration additive title/imageUrl", () => {
  assert.match(schema, /model EventLandingMessage/);
  assert.match(schema, /title\s+String\?/);
  assert.match(schema, /imageUrl\s+String\?/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "title"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "imageUrl"/);
  assert.doesNotMatch(migration, /DROP |DELETE FROM/i);
});

await test("onglet Journal disponible après Résultats", () => {
  assert.equal(MINI_SITE_AVAILABLE_OPTIONAL_FLAGS.has("miniSiteTabJournal"), true);
  const pub = miniSiteApiFields(
    { miniSiteTabResults: true, miniSiteTabJournal: true },
    { allowOptionalTabs: false },
  );
  assert.deepEqual(
    pub.tabs.map((t) => t.id),
    ["accueil", "participer", "resultats", "journal"],
  );
  assert.equal(JOURNAL_TITLE_MAX, 120);
  assert.equal(JOURNAL_BODY_MAX, 500);
});

await test("mapPublicJournalNews : titre défaut + image", () => {
  const n = mapPublicJournalNews({
    id: "m1",
    body: "Hello",
    createdAt: new Date("2026-11-28T10:00:00Z"),
  });
  assert.equal(n.title, "Actualité");
  assert.equal(n.body, "Hello");
  assert.equal(n.imageUrl, null);
  const withTitle = mapPublicJournalNews(
    {
      id: "m2",
      title: "  Titre  ",
      body: "x",
      imageUrl: "protected://abc",
      createdAt: new Date("2026-11-28T11:00:00Z"),
    },
    { resolveMediaUrl: (u) => (u === "protected://abc" ? "https://cdn/x" : u) },
  );
  assert.equal(withTitle.title, "Titre");
  assert.equal(withTitle.imageUrl, "https://cdn/x");
});

await test("auto : question publique + résultat ; pas de doublon", async () => {
  const created = new Date("2026-11-27T10:00:00Z");
  const updated = new Date("2026-11-28T12:00:00Z");
  const poll = {
    id: "p1",
    title: "T",
    question: "Qui vient ?",
    type: "SINGLE_CHOICE",
    status: "CLOSED",
    leadEnabled: false,
    landingResultHidden: false,
    quizRevealed: false,
    createdAt: created,
    updatedAt: updated,
    options: [
      { id: "o1", label: "A", order: 0, isCorrect: false },
      { id: "o2", label: "B", order: 1, isCorrect: false },
    ],
    votes: [
      { optionId: "o1", voterSessionId: "v1" },
      { optionId: "o2", voterSessionId: "v2" },
    ],
  };
  const db = {
    poll: {
      findMany: async () => [poll],
    },
  };
  const event = {
    id: "e1",
    consultationMode: "LIVE",
    isLiveConsumed: true,
    liveState: "finished",
  };
  const items = await loadJournalAutoItems(db, event);
  assert.equal(items.filter((i) => i.type === "auto_question").length, 1);
  assert.equal(items.filter((i) => i.type === "auto_result").length, 1);
  assert.equal(items[0].type === "auto_result" || items[1].type === "auto_result", true);
  const resultItem = items.find((i) => i.type === "auto_result");
  assert.ok(resultItem?.result);
  assert.equal(typeof resultItem.result.options[0].percent, "number");
});

await test("auto : poll masqué / hors sélection SS non exposé", async () => {
  const poll = {
    id: "hidden1",
    question: "Secret ?",
    type: "YES_NO",
    status: "CLOSED",
    leadEnabled: false,
    landingResultHidden: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [
      { id: "y", label: "Oui", order: 0 },
      { id: "n", label: "Non", order: 1 },
    ],
    votes: [],
  };
  const db = { poll: { findMany: async () => [poll] } };
  const event = { id: "e2", consultationMode: "LIVE" };
  const items = await loadJournalAutoItems(db, event);
  assert.equal(
    items.filter((i) => i.type === "auto_result").length,
    0,
  );
  assert.equal(
    isPollPubliclyExposable({
      event,
      poll,
      surface: PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT,
    }),
    false,
  );
});

await test("buildMinisiteJournal : chrono récente → ancienne + limit", async () => {
  const db = {
    eventLandingMessage: {
      findMany: async () => [
        {
          id: "m-old",
          title: "Old",
          body: "ancien",
          imageUrl: null,
          createdAt: new Date("2026-11-20T10:00:00Z"),
        },
        {
          id: "m-new",
          title: "New",
          body: "récent",
          imageUrl: null,
          createdAt: new Date("2026-11-28T10:00:00Z"),
        },
      ],
    },
    poll: { findMany: async () => [] },
  };
  const built = await buildMinisiteJournal(
    db,
    { id: "e", isLiveConsumed: true },
    { slug: "demo", limit: 1 },
  );
  assert.equal(built.items.length, 1);
  assert.equal(built.items[0].news?.title, "New");
  assert.equal(built.totalCount, 2);
});

await test("pas d’ouverture/clôture inventées ; types supportés", () => {
  assert.doesNotMatch(journalLib, /participation_opened|participation_closed|auto_open|auto_close/);
  assert.equal(isJournalSupportedPollType("SINGLE_CHOICE"), true);
  assert.equal(isJournalSupportedPollType("OPEN_TEXT"), false);
});

await test("feed % réel (pas maxVotes)", () => {
  const card = landingResultCardFromPoll({
    id: "p",
    question: "Q ?",
    type: "YES_NO",
    quizRevealed: false,
    options: [
      { id: "y", label: "Oui" },
      { id: "n", label: "Non" },
    ],
    votes: [
      { optionId: "y", voterSessionId: "a" },
      { optionId: "n", voterSessionId: "b" },
      { optionId: "n", voterSessionId: "c" },
    ],
  });
  assert.equal(card.options[0].percent, 33.3);
  assert.equal(card.options[1].percent, 66.7);
  assert.equal(card.percentBase, "answers");
});

await test("server : route journal + messages title/imageUrl + gate", () => {
  assert.match(server, /\/events\/slug\/:slug\/landing\/journal/);
  assert.match(server, /MINISITE_JOURNAL_DISABLED/);
  assert.match(server, /resolveMinisiteJournalAccess/);
  assert.match(server, /buildMinisiteJournal/);
  assert.match(server, /journalPreview/);
  assert.match(server, /landing\/messages\/upload-image/);
  assert.match(server, /normalizeJournalTitleInput|JOURNAL_TITLE_MAX/);
  assert.match(server, /miniSiteTabJournal/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 3 mini-site Journal backend OK");
