/**
 * PR #43 — Présentation ✨ L'événement enrichie + légendes photos.
 * Exécution : node frontend/scripts/test-landing-evenement-enrichi.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const backendRoot = join(root, "../backend");
const require = createRequire(import.meta.url);

const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const customization = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const feedAdmin = readFileSync(
  join(root, "components/event/LandingFeedAdminPanel.jsx"),
  "utf8",
);
const lightbox = readFileSync(
  join(root, "components/event/LandingPhotoLightbox.jsx"),
  "utf8",
);
const joinHub = readFileSync(join(root, "components/JoinLiveHub.jsx"), "utf8");
const backend = readFileSync(join(backendRoot, "server.js"), "utf8");
const schema = readFileSync(
  join(backendRoot, "prisma/schema.prisma"),
  "utf8",
);
const migration = readFileSync(
  join(
    backendRoot,
    "prisma/migrations/20261104120000_landing_evenement_enrichi/migration.sql",
  ),
  "utf8",
);
const frontHelpers = readFileSync(
  join(root, "lib/landingEventPresentation.js"),
  "utf8",
);

const {
  parseProgramTimeToMinutes,
  programSortOrderFromTimeLabel,
  sortLandingProgramItems,
  normalizeLandingCaption,
  shouldShowLandingEvenementSection,
  hasLandingComplementaryInfo,
  CAPTION_MAX,
} = require(join(backendRoot, "lib/landingEventPresentation.js"));

const { buildLandingFeedItems } = require(
  join(backendRoot, "lib/landingFeed.js"),
);

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

test("schéma + migration méta / programme / captions", () => {
  assert.match(schema, /landingEventDate/);
  assert.match(schema, /landingVenue/);
  assert.match(schema, /landingHours/);
  assert.match(schema, /model EventLandingProgramItem/);
  assert.match(schema, /caption\s+String\?/);
  assert.match(migration, /landingEventDate/);
  assert.match(migration, /EventLandingProgramItem/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "caption"/);
});

test("API : PATCH méta + captions + CRUD programme", () => {
  assert.match(backend, /landingEventDate/);
  assert.match(backend, /landing\/showcase-photos\/:photoId/);
  assert.match(backend, /landing\/photos\/:photoId/);
  assert.match(backend, /\/events\/:eventId\/landing\/program/);
  assert.match(backend, /programSortOrderFromTimeLabel/);
  assert.match(backend, /programItems,/);
  assert.match(backend, /landingEventDate: info\.landingEventDate/);
});

test("helpers : parse / tri chronologique programme", () => {
  assert.equal(parseProgramTimeToMinutes("19h30"), 19 * 60 + 30);
  assert.equal(parseProgramTimeToMinutes("9h"), 9 * 60);
  assert.equal(parseProgramTimeToMinutes("20:15"), 20 * 60 + 15);
  assert.equal(parseProgramTimeToMinutes("soir"), null);
  assert.ok(programSortOrderFromTimeLabel("soir") >= 10_000);
  const sorted = sortLandingProgramItems([
    {
      id: "b",
      timeLabel: "21h",
      title: "Dîner",
      sortOrder: programSortOrderFromTimeLabel("21h"),
      createdAt: "2026-01-01T10:00:00Z",
    },
    {
      id: "a",
      timeLabel: "19h30",
      title: "Cocktail",
      sortOrder: programSortOrderFromTimeLabel("19h30"),
      createdAt: "2026-01-01T11:00:00Z",
    },
  ]);
  assert.equal(sorted[0].id, "a");
  assert.equal(sorted[1].id, "b");
});

test("helpers : légende + visibilité blocs", () => {
  assert.equal(normalizeLandingCaption(""), null);
  assert.equal(normalizeLandingCaption("  Hello  "), "Hello");
  assert.equal(normalizeLandingCaption(null), null);
  assert.equal(normalizeLandingCaption(12), undefined);
  const long = "x".repeat(CAPTION_MAX + 20);
  assert.equal(normalizeLandingCaption(long)?.length, CAPTION_MAX);
  assert.equal(
    shouldShowLandingEvenementSection({
      landingEventDate: null,
      landingVenue: null,
      landingHours: null,
      programItems: [],
      showcasePhotos: [],
    }),
    false,
  );
  assert.equal(
    shouldShowLandingEvenementSection({
      landingVenue: "Lyon",
      programItems: [],
      showcasePhotos: [],
    }),
    true,
  );
  assert.equal(
    shouldShowLandingEvenementSection({
      programItems: [{ id: "1" }],
      showcasePhotos: [],
    }),
    true,
  );
  assert.equal(
    hasLandingComplementaryInfo({
      infoSectionTitle: "",
      infoSectionText: "",
      infoPrimaryCtaLabel: "Plan",
      infoPrimaryCtaUrl: "",
    }),
    false,
  );
  assert.equal(
    hasLandingComplementaryInfo({
      infoSectionText: "Parking gratuit",
    }),
    true,
  );
});

test("feed Moments expose caption", () => {
  const items = buildLandingFeedItems({
    event: {
      landingKeepPhotosAfter: true,
      landingKeepResultsAfter: true,
      landingKeepMessagesAfter: true,
    },
    photos: [
      {
        id: "p1",
        url: "https://x/a.jpg",
        caption: "Arrivée",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
    ],
    likeCounts: {},
    likedPhotoIds: new Set(),
    messages: [],
    closedPolls: [],
    winnersByPollId: {},
    afterLive: false,
  });
  assert.equal(items[0].photo.caption, "Arrivée");
});

test("front helpers miroir exportés", () => {
  assert.match(frontHelpers, /shouldShowLandingEvenementSection/);
  assert.match(frontHelpers, /hasLandingComplementaryInfo/);
  assert.match(frontHelpers, /sortLandingProgramItems/);
  assert.match(frontHelpers, /LANDING_CAPTION_MAX/);
});

test("admin Landing : méta + programme + légendes showcase/Moments", () => {
  assert.match(customization, /landingEventDate/);
  assert.match(customization, /landingVenue/);
  assert.match(customization, /landingHours/);
  assert.match(customization, /addProgramItem/);
  assert.match(customization, /saveShowcaseCaption/);
  assert.match(customization, /onPhotoCaptionSaved/);
  assert.match(customization, /landing\/program/);
  assert.match(feedAdmin, /Enregistrer la légende/);
  assert.match(feedAdmin, /LANDING_CAPTION_MAX/);
  assert.match(feedAdmin, /landing\/photos\//);
});

test("public /e : section ✨ + méta + programme + captions", () => {
  assert.match(page, /shouldShowLandingEvenementSection/);
  assert.match(page, /landing-evenement-section/);
  assert.match(page, /landing-evenement-meta/);
  assert.match(page, /landing-evenement-program/);
  assert.match(page, /✨ \{showcaseTitle\}/);
  assert.match(page, /ev-landing-showcase-caption/);
  assert.match(page, /hasLandingComplementaryInfo/);
  assert.match(page, /programItems/);
  // Pas de date/lieu structurés injectés dans le bloc Infos
  assert.doesNotMatch(
    page.slice(page.indexOf("Infos pratiques")),
    /landingEventDate|landingVenue|landingHours/,
  );
});

test("Fil + lightbox affichent légende ; messages/likes inchangés", () => {
  assert.match(feedUi, /landing-feed-photo-caption/);
  assert.match(feedUi, /photo\.caption/);
  assert.match(feedUi, /collectFeedLightboxPhotos/);
  assert.match(feedUi, /onToggleLike/);
  assert.match(feedUi, /type === "message"/);
  assert.match(feedUi, /type === "result"/);
  assert.match(lightbox, /ev-landing-lightbox-caption/);
  assert.match(lightbox, /caption/);
});

test("/join : Infos complémentaires seulement (pas de duplex méta)", () => {
  assert.match(joinHub, /showInfoSection/);
  assert.match(joinHub, /infoSectionTitle/);
  assert.doesNotMatch(joinHub, /landingEventDate/);
  assert.doesNotMatch(joinHub, /landingProgramItems|programItems/);
  assert.match(joinHub, /infoShowOnFinished/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-evenement-enrichi tests passed.");
