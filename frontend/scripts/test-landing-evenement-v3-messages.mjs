/**
 * V3 « ✨ L'événement » — message organisateur + remerciements.
 * Exécution : node frontend/scripts/test-landing-evenement-v3-messages.mjs
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
const evenement = readFileSync(
  join(root, "components/event/LandingEvenementPresentation.jsx"),
  "utf8",
);
const customization = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const backend = readFileSync(join(backendRoot, "server.js"), "utf8");
const schema = readFileSync(join(backendRoot, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    backendRoot,
    "prisma/migrations/20261105120000_landing_evenement_v3_messages/migration.sql",
  ),
  "utf8",
);

const {
  shouldShowLandingEvenementSection,
  normalizeLandingMessagePhotoIds,
  splitLandingMessageParagraphs,
  MESSAGE_PHOTOS_MAX,
} = require(join(backendRoot, "lib/landingEventPresentation.js"));

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

test("schéma + migration messages V3", () => {
  assert.match(schema, /landingIntroTitle/);
  assert.match(schema, /landingIntroBody/);
  assert.match(schema, /landingIntroPhotoIds\s+Json\?/);
  assert.match(schema, /landingThanksTitle/);
  assert.match(schema, /landingThanksBody/);
  assert.match(schema, /landingThanksPhotoIds\s+Json\?/);
  assert.match(migration, /landingIntroBody/);
  assert.match(migration, /landingThanksPhotoIds/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS/);
});

test("API PATCH + landing GET exposent intro/thanks", () => {
  assert.match(backend, /landingIntroBody/);
  assert.match(backend, /landingThanksBody/);
  assert.match(backend, /landingIntroPhotos/);
  assert.match(backend, /landingThanksPhotos/);
  assert.match(backend, /normalizeLandingMessagePhotoIds/);
  assert.match(backend, /resolveLandingMessagePhotos/);
});

test("helpers : photo ids + paragraphs + visibilité", () => {
  assert.deepEqual(
    normalizeLandingMessagePhotoIds(["a", "b", "a"], new Set(["a", "b"])),
    ["a", "b"],
  );
  assert.equal(normalizeLandingMessagePhotoIds([], null), null);
  assert.equal(normalizeLandingMessagePhotoIds(null), null);
  const many = Array.from({ length: MESSAGE_PHOTOS_MAX + 3 }, (_, i) => `id${i}`);
  assert.equal(
    normalizeLandingMessagePhotoIds(many, new Set(many))?.length,
    MESSAGE_PHOTOS_MAX,
  );
  assert.deepEqual(splitLandingMessageParagraphs("A\n\nB\n\n\nC"), [
    "A",
    "B",
    "C",
  ]);
  assert.equal(
    shouldShowLandingEvenementSection({
      landingIntroBody: "Hello",
      afterLive: false,
    }),
    true,
  );
  assert.equal(
    shouldShowLandingEvenementSection({
      landingThanksBody: "Merci",
      afterLive: false,
    }),
    false,
  );
  assert.equal(
    shouldShowLandingEvenementSection({
      landingThanksBody: "Merci",
      afterLive: true,
    }),
    true,
  );
});

test("UI publique : intro + thanks gated afterLive ; Fil intact", () => {
  assert.match(evenement, /landing-evenement-intro/);
  assert.match(evenement, /landing-evenement-thanks/);
  assert.match(evenement, /Message de l'organisateur/);
  assert.match(evenement, /Merci à tous/);
  assert.match(evenement, /afterLive && Boolean/);
  assert.match(page, /introBody=\{landingIntroBody\}/);
  assert.match(page, /thanksBody=\{landingThanksBody\}/);
  assert.match(page, /LandingHybridFeed/);
  assert.doesNotMatch(evenement, /LandingHybridFeed|onToggleLike/);
  assert.match(feedUi, /Fil de l&apos;événement|Fil de l'événement/);
});

test("admin Landing : éditeurs messages + sélection photos galerie", () => {
  assert.match(customization, /landingIntroBody/);
  assert.match(customization, /landingThanksBody/);
  assert.match(customization, /landingIntroPhotoIds/);
  assert.match(customization, /toggleMessagePhoto/);
  assert.match(customization, /Message de l&apos;organisateur/);
  assert.match(customization, /Message de remerciement/);
  assert.match(customization, /LANDING_MESSAGE_BODY_MAX/);
});

test("pas de limite fixe photos messages / réutilise showcase", () => {
  assert.match(evenement, /ev-evenement-story-media--/);
  assert.doesNotMatch(evenement, /slice\(0,\s*2\)|exactly 2 photos/i);
  assert.match(backend, /eventLandingShowcasePhoto/);
  assert.match(customization, /toggleMessagePhoto\("intro"/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-evenement-v3-messages tests passed.");
