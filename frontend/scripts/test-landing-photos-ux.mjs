/**
 * Lot UX — Fil photos compact + lightbox + nav Régie admin Landing.
 * Exécution : node frontend/scripts/test-landing-photos-ux.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const lightbox = readFileSync(
  join(root, "components/event/LandingPhotoLightbox.jsx"),
  "utf8",
);
const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const customization = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const regie = readFileSync(
  join(root, "app/admin/event/[eventId]/page.jsx"),
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

test("Fil desktop : grille 2 colonnes, mobile colonne", () => {
  assert.match(feedUi, /ev-landing-feed-list/);
  assert.match(feedUi, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(feedUi, /@media \(min-width: 768px\)/);
  assert.match(feedUi, /ev-landing-feed-item--wide/);
  assert.match(feedUi, /ev-landing-feed-item--photo/);
  // Colonne unique par défaut (mobile)
  assert.match(feedUi, /flex-direction:\s*column/);
  // Photos compactes desktop
  assert.match(feedUi, /max-height:\s*240px/);
});

test("Chrono : messages/résultats pleine largeur, photos en flux grille", () => {
  assert.match(feedUi, /type === "message"/);
  assert.match(feedUi, /type === "result"/);
  assert.match(feedUi, /type === "photo"/);
  assert.match(
    feedUi,
    /ev-landing-feed-item--wide[\s\S]*FeedMessageCard|FeedMessageCard[\s\S]*ev-landing-feed-item--wide/,
  );
  assert.match(feedUi, /grid-column:\s*1\s*\/\s*-1/);
});

test("Lightbox : composant dédié + navigation + fermetures", () => {
  assert.match(lightbox, /LandingPhotoLightbox/);
  assert.match(lightbox, /data-testid="landing-photo-lightbox"/);
  assert.match(lightbox, /Escape/);
  assert.match(lightbox, /ArrowLeft/);
  assert.match(lightbox, /ArrowRight/);
  assert.match(lightbox, /Photo précédente/);
  assert.match(lightbox, /Photo suivante/);
  assert.match(lightbox, /aria-label="Fermer"/);
  assert.match(lightbox, /onTouchStart/);
  assert.match(lightbox, /onTouchEnd/);
  assert.match(lightbox, /object-fit:\s*contain/);
  assert.match(feedUi, /LandingPhotoLightbox/);
  assert.match(feedUi, /collectFeedLightboxPhotos/);
  assert.match(feedUi, /Agrandir la photo/);
});

test("Likes / delete / orga préservés dans le fil", () => {
  assert.match(feedUi, /onToggleLike/);
  assert.match(feedUi, /likedByMe/);
  assert.match(feedUi, /onDeletePhoto/);
  assert.match(feedUi, /FeedMessageCard/);
  assert.match(feedUi, /FeedResultCard/);
  assert.match(feedUi, /HeartIcon/);
});

test("Showcase landing aussi branché à la lightbox", () => {
  assert.match(page, /LandingPhotoLightbox/);
  assert.match(page, /showcaseLightboxIndex/);
  assert.match(page, /LandingEvenementPresentation/);
  assert.match(page, /onOpenPhoto/);
});

test("Admin Landing : bouton Régie à côté Salle live / Landing", () => {
  assert.match(customization, /EditorModeSwitch/);
  assert.match(customization, /editor-universe-link--regie/);
  assert.match(customization, /data-testid="landing-admin-regie-link"/);
  assert.match(customization, />\s*Régie\s*</);
  assert.match(
    customization,
    /\/admin\/event\/\$\{encodeURIComponent\(eventId\)\}/,
  );
  assert.match(customization, /LiveMicroLabel/);
  assert.match(customization, /Landing événement|Page de l’événement|EVENT_PAGE_NAV_EMOJI/);
});

test("Régie : nav page événement (route /landing inchangée)", () => {
  assert.match(regie, /\/admin\/events\/\$\{encodeURIComponent\(eventId\)\}\/landing/);
  assert.match(regie, /Landing événement|Page de l’événement|EVENT_PAGE_NAV/);
});

test("Pas de changement API / schéma dans ce lot", () => {
  assert.doesNotMatch(feedUi, /prisma|migration/i);
  assert.doesNotMatch(lightbox, /fetch\(/);
});

test("React #310 : showcaseLightboxPhotos useMemo avant if (loading)", () => {
  const start = page.indexOf("export default function EventLandingPage");
  assert.ok(start >= 0);
  const body = page.slice(start);
  const memoIdx = body.search(/showcaseLightboxPhotos\s*=\s*useMemo/);
  const loadingIdx = body.search(/\n  if \(loading\) \{/);
  assert.ok(memoIdx >= 0 && loadingIdx >= 0);
  assert.ok(
    memoIdx < loadingIdx,
    "useMemo après if (loading) → React #310 au passage chargement→contenu",
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Landing photos UX OK");