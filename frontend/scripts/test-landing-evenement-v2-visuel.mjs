/**
 * V2 visuelle « ✨ L'événement » — maquette validée (cartes méta / programme / galerie).
 * Exécution : node frontend/scripts/test-landing-evenement-v2-visuel.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const evenement = readFileSync(
  join(root, "components/event/LandingEvenementPresentation.jsx"),
  "utf8",
);
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const backend = readFileSync(join(root, "../backend/server.js"), "utf8");
const schema = readFileSync(
  join(root, "../backend/prisma/schema.prisma"),
  "utf8",
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

test("composant V2 branché sur /e sans refonte Fil", () => {
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /LandingHybridFeed/);
  assert.match(feedUi, /Fil de l&apos;événement|Fil de l'événement/);
  assert.doesNotMatch(evenement, /LandingHybridFeed|onToggleLike/);
});

test("méta : 3 cartes icônées + masquage absents", () => {
  assert.match(evenement, /landing-evenement-meta/);
  assert.match(evenement, /ev-evenement-meta-card/);
  assert.match(evenement, /label="Date"/);
  assert.match(evenement, /label="Lieu"/);
  assert.match(evenement, /label="Horaires"/);
  assert.match(evenement, /IconCalendar|function IconCalendar/);
  assert.match(evenement, /IconPin|function IconPin/);
  assert.match(evenement, /IconClock|function IconClock/);
  assert.match(evenement, /if \(!value\) return null/);
});

test("programme : carte + chronologie verticale", () => {
  assert.match(evenement, /landing-evenement-program/);
  assert.match(evenement, /ev-evenement-timeline/);
  assert.match(evenement, /ev-evenement-timeline-dot/);
  assert.match(evenement, /ev-evenement-time-pill/);
  assert.match(evenement, /Programme/);
});

test("galerie : carte dédiée, captions, lightbox, pas de limite", () => {
  assert.match(evenement, /landing-evenement-gallery/);
  assert.match(evenement, /Galerie de l&apos;événement/);
  assert.match(evenement, /ev-evenement-gallery-grid/);
  assert.match(evenement, /ev-evenement-gallery-caption/);
  assert.match(evenement, /onOpenPhoto/);
  assert.match(evenement, /Agrandir la photo/);
  assert.doesNotMatch(evenement, /LANDING_SHOWCASE_MAX|slice\(0,\s*\d+\)/);
  assert.match(page, /LandingPhotoLightbox/);
});

test("responsive : split desktop, stack mobile", () => {
  assert.match(evenement, /ev-evenement-body--split/);
  assert.match(evenement, /@media \(min-width: 900px\)/);
  assert.match(evenement, /grid-template-columns: 1fr/);
  assert.match(evenement, /@media \(max-width: 479px\)/);
});

test("pas de nouvelle API / migration / champs", () => {
  assert.doesNotMatch(evenement, /fetch\(|adminFetch|prisma/);
  // Ce lot ne touche pas schema/server (hors page front)
  assert.match(schema, /landingEventDate/);
  assert.match(backend, /landingEventDate/);
});

test("page /e : hooks lightbox avant early returns (anti #310)", () => {
  const start = page.indexOf("export default function EventLandingPage");
  const body = page.slice(start);
  const memoIdx = body.search(/showcaseLightboxPhotos\s*=\s*useMemo/);
  const loadingIdx = body.search(/\n  if \(loading\) \{/);
  assert.ok(memoIdx >= 0 && loadingIdx >= 0);
  assert.ok(memoIdx < loadingIdx);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-evenement-v2-visuel tests passed.");
