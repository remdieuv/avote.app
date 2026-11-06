/**
 * Lot D — profils organisateurs (normalisation, publicité, éligibilité Discover).
 * Exécution : node scripts/test-organizer-profiles.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  PROFILE_TYPES,
  parseProfileType,
  normalizeDisplayName,
  normalizeBio,
  normalizeWebsiteUrl,
  normalizeIsPublic,
  slugifyDisplayName,
  isProfilePubliclyVisible,
  mapOwnerProfileJson,
  mapPublicProfileJson,
  mapDiscoverOrganizerCard,
} = require("../lib/organizerProfiles.js");
const {
  isDiscoverEligible: isDiscoverEligibleVis,
} = require("../lib/eventVisibility.js");
const { isDiscoverEligible } = require("../lib/discoverEvents.js");

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

const NOW = new Date("2026-11-06T12:00:00.000Z");

test("parseProfileType : personal / organization (+ FR)", () => {
  assert.equal(parseProfileType("personal"), PROFILE_TYPES.PERSONAL);
  assert.equal(parseProfileType("PARTICULIER"), PROFILE_TYPES.PERSONAL);
  assert.equal(parseProfileType("organization"), PROFILE_TYPES.ORGANIZATION);
  assert.equal(parseProfileType("organisation"), PROFILE_TYPES.ORGANIZATION);
  assert.equal(parseProfileType("org"), PROFILE_TYPES.ORGANIZATION);
  assert.equal(parseProfileType("email"), null);
  assert.equal(parseProfileType(1), null);
});

test("normalizeDisplayName refuse e-mail collé et vide", () => {
  assert.equal(normalizeDisplayName("Studio Nord"), "Studio Nord");
  assert.equal(normalizeDisplayName("  Alex   M.  "), "Alex M.");
  assert.equal(normalizeDisplayName(""), null);
  assert.equal(normalizeDisplayName("user@avote.app"), undefined);
  assert.equal(normalizeDisplayName(12), undefined);
});

test("normalizeBio / websiteUrl / isPublic", () => {
  assert.equal(normalizeBio(null), null);
  assert.equal(normalizeBio("  hello  "), "hello");
  assert.equal(normalizeWebsiteUrl("https://exemple.fr/"), "https://exemple.fr/");
  assert.equal(normalizeWebsiteUrl("ftp://x"), undefined);
  assert.equal(normalizeWebsiteUrl("exemple.fr"), undefined);
  assert.equal(normalizeIsPublic(true), true);
  assert.equal(normalizeIsPublic("yes"), undefined);
});

test("slugifyDisplayName ne dérive pas d’un e-mail", () => {
  assert.equal(slugifyDisplayName("Studio Nord"), "studio-nord");
  assert.equal(slugifyDisplayName("Café & Co"), "cafe-co");
  // Même si un e-mail passait (bloqué en amont), le slug n’est pas un e-mail brut.
  assert.notEqual(slugifyDisplayName("a@b.c"), "a@b.c");
});

test("profil non public → hors page / carte Discover", () => {
  const privatePersonal = {
    id: "p1",
    type: "PERSONAL",
    slug: "alex-m",
    displayName: "Alex M.",
    bio: "Bio",
    imageUrl: null,
    websiteUrl: null,
    isPublic: false,
    ownerUserId: "u-secret",
  };
  assert.equal(isProfilePubliclyVisible(privatePersonal), false);
  assert.equal(mapDiscoverOrganizerCard(privatePersonal), null);

  const pub = { ...privatePersonal, isPublic: true };
  assert.equal(isProfilePubliclyVisible(pub), true);
  const card = mapDiscoverOrganizerCard(pub, (u) => u ?? null);
  assert.equal(card.slug, "alex-m");
  assert.equal(card.profilePath, "/organizers/alex-m");
  assert.equal(card.ownerUserId, undefined);
});

test("mapPublicProfileJson : pas d’e-mail / ownerUserId + stub Suivre", () => {
  const profile = {
    id: "p2",
    type: "ORGANIZATION",
    slug: "asso-verte",
    displayName: "Asso Verte",
    bio: "Présentation",
    imageUrl: "/uploads/logo.png",
    websiteUrl: "https://asso.example",
    isPublic: true,
    ownerUserId: "u-secret",
    createdAt: NOW,
    updatedAt: NOW,
  };
  const pub = mapPublicProfileJson(profile, (u) =>
    u && u.startsWith("/") ? `https://cdn.example${u}` : u,
  );
  assert.equal(pub.displayName, "Asso Verte");
  assert.equal(pub.websiteUrl, "https://asso.example");
  assert.equal(pub.followAvailable, false);
  assert.equal(pub.canFollow, true);
  assert.equal(pub.ownerUserId, undefined);
  assert.equal(pub.email, undefined);

  const owner = mapOwnerProfileJson(profile, (u) => u ?? null);
  assert.equal(owner.isPublic, true);
  assert.equal(owner.type, "organization");
});

test("Discover exige profil organisateur (id + public si joint)", () => {
  const base = {
    visibility: "PUBLIC",
    primaryThemeId: "theme_sport",
    startsAt: NOW,
  };
  assert.equal(isDiscoverEligible(base), false);
  assert.equal(isDiscoverEligibleVis(base), false);

  assert.equal(
    isDiscoverEligible({ ...base, organizerProfileId: "org1" }),
    true,
  );
  assert.equal(
    isDiscoverEligible({
      ...base,
      organizerProfileId: "org1",
      organizerProfile: { isPublic: false },
    }),
    false,
  );
  assert.equal(
    isDiscoverEligible({
      ...base,
      organizerProfileId: "org1",
      organizerProfile: { isPublic: true },
    }),
    true,
  );
});

test("événement privé reste hors Discover même avec profil", () => {
  assert.equal(
    isDiscoverEligible({
      visibility: "PRIVATE",
      primaryThemeId: "theme_sport",
      startsAt: NOW,
      organizerProfileId: "org1",
      organizerProfile: { isPublic: true },
    }),
    false,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests organizer-profiles OK");
