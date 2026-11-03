/**
 * Landing hybride V1 — fil, messages, likes, rétention, bouton Partager.
 * Exécution : node frontend/scripts/test-landing-hybride-v1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const backendRoot = join(root, "../backend");
const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const regiePanel = readFileSync(
  join(root, "components/event/RegieLandingJournalPanel.jsx"),
  "utf8",
);
const customization = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const regiePage = readFileSync(
  join(root, "app/admin/event/[eventId]/page.jsx"),
  "utf8",
);
const backend = readFileSync(join(backendRoot, "server.js"), "utf8");
const schema = readFileSync(
  join(backendRoot, "prisma/schema.prisma"),
  "utf8",
);
const migration = readFileSync(
  join(
    backendRoot,
    "prisma/migrations/20261103120000_landing_hybride_v1/migration.sql",
  ),
  "utf8",
);

const require = createRequire(import.meta.url);
const {
  buildLandingFeedItems,
  isLandingFeedLeadCrm,
} = require(join(backendRoot, "lib/landingFeed.js"));

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

test("schéma + migration messages / likes / hide / keep", () => {
  assert.match(schema, /model EventLandingMessage/);
  assert.match(schema, /model EventLandingPhotoLike/);
  assert.match(schema, /landingResultHidden/);
  assert.match(schema, /landingKeepPhotosAfter/);
  assert.match(schema, /landingKeepResultsAfter/);
  assert.match(schema, /landingKeepMessagesAfter/);
  assert.match(migration, /EventLandingMessage/);
  assert.match(migration, /EventLandingPhotoLike/);
  assert.match(migration, /landingKeepPhotosAfter/);
});

test("API feed + messages + like + hide résultat", () => {
  assert.match(backend, /buildLandingFeedItems/);
  assert.match(backend, /feed,/);
  assert.match(backend, /\/landing\/messages/);
  assert.match(backend, /landing\/photos\/:photoId\/like/);
  assert.match(backend, /polls\/:pollId\/landing-result/);
  assert.match(backend, /landingKeepPhotosAfter/);
});

test("Lead CRM exclu ; Concours autorisé", () => {
  assert.equal(
    isLandingFeedLeadCrm({ type: "STANDARD", leadEnabled: true }),
    true,
  );
  assert.equal(
    isLandingFeedLeadCrm({ type: "CONTEST_ENTRY", leadEnabled: true }),
    false,
  );
  assert.equal(
    isLandingFeedLeadCrm({ type: "QUIZ", leadEnabled: false }),
    false,
  );
});

test("buildLandingFeedItems : chrono desc + keep after + hide", () => {
  const event = {
    landingKeepPhotosAfter: true,
    landingKeepResultsAfter: true,
    landingKeepMessagesAfter: true,
  };
  const items = buildLandingFeedItems({
    event,
    photos: [
      {
        id: "p1",
        url: "https://x/a.jpg",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
    ],
    likeCounts: { p1: 2 },
    likedPhotoIds: new Set(["p1"]),
    messages: [
      {
        id: "m1",
        body: "Bonjour",
        hidden: false,
        createdAt: new Date("2026-01-01T12:00:00Z"),
      },
      {
        id: "m2",
        body: "caché",
        hidden: true,
        createdAt: new Date("2026-01-01T13:00:00Z"),
      },
    ],
    closedPolls: [
      {
        id: "q1",
        question: "Q1",
        type: "STANDARD",
        leadEnabled: false,
        landingResultHidden: false,
        quizRevealed: false,
        updatedAt: new Date("2026-01-01T11:00:00Z"),
        createdAt: new Date("2026-01-01T09:00:00Z"),
        options: [{ id: "o1", label: "A" }],
        votes: [{ optionId: "o1", voterSessionId: "v1" }],
        event: { isLiveConsumed: true, displayState: "RESULTS" },
      },
      {
        id: "q2",
        question: "Lead",
        type: "STANDARD",
        leadEnabled: true,
        landingResultHidden: false,
        quizRevealed: false,
        updatedAt: new Date("2026-01-01T14:00:00Z"),
        options: [],
        votes: [],
        event: { isLiveConsumed: true, displayState: "RESULTS" },
      },
      {
        id: "q3",
        question: "Hidden",
        type: "STANDARD",
        leadEnabled: false,
        landingResultHidden: true,
        quizRevealed: false,
        updatedAt: new Date("2026-01-01T15:00:00Z"),
        options: [],
        votes: [],
        event: { isLiveConsumed: true, displayState: "RESULTS" },
      },
    ],
    winnersByPollId: {},
    afterLive: false,
  });
  assert.equal(items.length, 3);
  assert.equal(items[0].type, "message");
  assert.equal(items[1].type, "result");
  assert.equal(items[2].type, "photo");
  assert.equal(items[2].photo.likeCount, 2);
  assert.equal(items[2].photo.likedByMe, true);

  const afterHiddenPhotos = buildLandingFeedItems({
    event: { ...event, landingKeepPhotosAfter: false },
    photos: [
      {
        id: "p1",
        url: "https://x/a.jpg",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
    ],
    messages: [],
    closedPolls: [],
    afterLive: true,
  });
  assert.equal(afterHiddenPhotos.length, 0);
});

test("UI publique : LandingHybridFeed + Partager une photo + CameraIcon", () => {
  assert.match(page, /LandingHybridFeed/);
  assert.match(page, /Partager une photo/);
  assert.match(page, /CameraIcon/);
  assert.match(page, /handleTogglePhotoLike/);
  assert.match(page, /showFeedBlock/);
  assert.doesNotMatch(page, /Ajouter un moment live/);
  assert.doesNotMatch(page, /momentsEyebrow/);
  assert.match(feedUi, /Fil de l&apos;événement|Fil de l'événement/);
  assert.match(feedUi, /HeartIcon/);
  assert.match(feedUi, /CameraIcon/);
});

test("soft-refresh feed pendant et après", () => {
  assert.match(page, /phase !== "during" && phase !== "after"/);
  assert.match(page, /feed: Array\.isArray\(data\.feed\)/);
  assert.match(page, /landingKeepPhotosAfter/);
});

test("régie messages + hide résultat", () => {
  assert.match(regiePage, /RegieLandingJournalPanel/);
  assert.match(regiePage, /onToggleLandingResult/);
  assert.match(regiePage, /landing-result/);
  assert.match(regiePage, /Masquer du fil/);
  assert.match(regiePanel, /landing\/messages/);
  assert.match(regiePanel, /Masquer/);
  assert.match(regiePanel, /Supprimer/);
});

test("admin landing H5 rétention", () => {
  assert.match(customization, /landingKeepPhotosAfter/);
  assert.match(customization, /landingKeepResultsAfter/);
  assert.match(customization, /landingKeepMessagesAfter/);
  assert.match(customization, /Après l’événement|Après l'événement/);
  assert.match(customization, /Conserver les photos/);
});

test("pas de commentaires V1", () => {
  assert.doesNotMatch(schema, /EventLandingComment/);
  assert.doesNotMatch(backend, /landing\/comments/);
  assert.doesNotMatch(page, /Commentaire/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Landing hybride V1 OK");
