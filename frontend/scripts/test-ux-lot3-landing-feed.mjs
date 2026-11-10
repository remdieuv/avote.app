/**
 * Lot 3 UX — Fil / souvenirs selon phase Page de l’événement.
 * Exécution : node frontend/scripts/test-ux-lot3-landing-feed.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getLandingEvenementLead,
  getLandingFeedEmptyHint,
  getLandingFeedShareCopy,
  getLandingFeedSubtitle,
  shouldShowLandingFeedBlock,
} from "../lib/landingFeedCopy.js";
import { resolveEventLandingPhase } from "../lib/participantLiveFlow.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let failed = 0;

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

test("phases resolveEventLandingPhase : before / during / after", () => {
  assert.equal(resolveEventLandingPhase({ liveState: "waiting" }), "before");
  assert.equal(
    resolveEventLandingPhase({ liveState: "voting", voteState: "open" }),
    "during",
  );
  assert.equal(resolveEventLandingPhase({ liveState: "finished" }), "after");
});

test("empty hints adaptés + pas de « lancer le journal » avant live", () => {
  const before = getLandingFeedEmptyHint({ phase: "before", canUpload: true });
  assert.match(before, /pas encore commencé|préparer/i);
  assert.doesNotMatch(before, /lancer le journal/i);

  const during = getLandingFeedEmptyHint({ phase: "during", canUpload: false });
  assert.match(during, /en direct|vide/i);

  const after = getLandingFeedEmptyHint({ phase: "after", canUpload: false });
  assert.match(after, /souvenir/i);
});

test("CTA photo clarifié avant / pendant / après", () => {
  const before = getLandingFeedShareCopy({ phase: "before" });
  assert.match(before.label, /journal|photo/i);
  assert.match(before.title, /pas encore commencé/i);
  assert.doesNotMatch(before.label, /^Partager une photo$/);

  const during = getLandingFeedShareCopy({ phase: "during" });
  assert.equal(during.label, "Partager une photo");

  const after = getLandingFeedShareCopy({ phase: "after" });
  assert.match(after.label, /souvenir/i);
});

test("visibilité bloc Fil + distinction L'événement", () => {
  assert.equal(
    shouldShowLandingFeedBlock({ phase: "before", hasItems: false, canUpload: false }),
    false,
  );
  assert.equal(
    shouldShowLandingFeedBlock({ phase: "before", hasItems: false, canUpload: true }),
    true,
  );
  assert.equal(
    shouldShowLandingFeedBlock({ phase: "during", hasItems: false, canUpload: false }),
    true,
  );
  assert.equal(
    shouldShowLandingFeedBlock({ phase: "after", hasItems: false, canUpload: false }),
    true,
  );
  assert.match(getLandingEvenementLead({ phase: "before" }), /Infos pratiques|programme/i);
  assert.match(getLandingEvenementLead({ phase: "after" }), /fil ci-dessous|souvenirs/i);
  assert.match(getLandingFeedSubtitle({ phase: "after" }), /conservés|Souvenirs/i);
});

test("page /e branche la lib (routes/API non touchées)", () => {
  const page = read("app/e/[slug]/page.jsx");
  assert.match(page, /landingFeedCopy/);
  assert.match(page, /getLandingFeedEmptyHint/);
  assert.match(page, /getLandingFeedShareCopy/);
  assert.match(page, /shouldShowLandingFeedBlock/);
  assert.match(page, /getLandingEvenementLead/);
  assert.doesNotMatch(page, /lancer le journal/);
  assert.match(page, /\/landing\/photos|landing\/photos/);
  assert.match(page, /canUploadLandingPhoto/);
  assert.match(page, /INVITE_REQUIRED|inviteEnabled/);

  const feed = read("components/event/LandingHybridFeed.jsx");
  assert.match(feed, /subtitle/);
  assert.match(feed, /Fil de l&apos;événement|Fil de l'événement/);

  const evenement = read("components/event/LandingEvenementPresentation.jsx");
  assert.match(evenement, /Présentation/);
  assert.match(evenement, /L'événement/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll test-ux-lot3-landing-feed tests passed.");
