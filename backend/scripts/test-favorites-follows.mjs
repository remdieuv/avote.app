/**
 * Lot E — favoris événements & organisateurs suivis (règles métier + surface API).
 * Exécution : node scripts/test-favorites-follows.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const {
  canFavoriteEvent,
  canFollowProfile,
  mapFavoriteEventCard,
  mapFollowingOrganizerCard,
} = require("../lib/favoritesFollows.js");
const { mapPublicProfileJson } = require("../lib/organizerProfiles.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(join(__dirname, "../server.js"), "utf8");
const schemaSrc = readFileSync(join(__dirname, "../prisma/schema.prisma"), "utf8");

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

const NOW = new Date("2026-11-09T10:00:00.000Z");

test("canFavoriteEvent : PUBLIC uniquement", () => {
  assert.equal(canFavoriteEvent({ visibility: "PUBLIC" }), true);
  assert.equal(canFavoriteEvent({ visibility: "public" }), true);
  assert.equal(canFavoriteEvent({ visibility: "PRIVATE" }), false);
  assert.equal(canFavoriteEvent({ visibility: "private" }), false);
  assert.equal(canFavoriteEvent({}), false);
});

test("canFollowProfile : isPublic true uniquement", () => {
  assert.equal(canFollowProfile({ isPublic: true }), true);
  assert.equal(canFollowProfile({ isPublic: false }), false);
  assert.equal(canFollowProfile({}), false);
});

test("mapFavoriteEventCard exclut un événement privé", () => {
  assert.equal(
    mapFavoriteEventCard({
      id: "e1",
      title: "Privé",
      slug: "prive",
      visibility: "PRIVATE",
      startsAt: NOW,
      liveState: "waiting",
      landingEnabled: false,
      primaryTheme: null,
      secondaryTheme: null,
      organizerProfile: null,
    }),
    null,
  );
});

test("mapFavoriteEventCard expose un événement public", () => {
  const card = mapFavoriteEventCard(
    {
      id: "e2",
      title: "Public Fun",
      slug: "public-fun",
      visibility: "PUBLIC",
      city: "Lyon",
      startsAt: NOW,
      liveState: "waiting",
      isLiveConsumed: false,
      landingEnabled: true,
      landingCoverUrl: null,
      primaryThemeId: "t1",
      primaryTheme: { id: "t1", slug: "sport", label: "Sport" },
      secondaryTheme: null,
      organizerProfile: {
        id: "o1",
        slug: "studio",
        displayName: "Studio",
        type: "ORGANIZATION",
        imageUrl: null,
        isPublic: true,
      },
    },
    (u) => u ?? null,
  );
  assert.ok(card);
  assert.equal(card.id, "e2");
  assert.equal(card.favorited, true);
  assert.equal(card.title, "Public Fun");
});

test("mapFollowingOrganizerCard filtre les profils non publics", () => {
  assert.equal(
    mapFollowingOrganizerCard({
      id: "p1",
      type: "PERSONAL",
      slug: "alex",
      displayName: "Alex",
      isPublic: false,
    }),
    null,
  );
  const card = mapFollowingOrganizerCard(
    {
      id: "p2",
      type: "ORGANIZATION",
      slug: "asso",
      displayName: "Asso",
      bio: "Bio",
      imageUrl: null,
      websiteUrl: null,
      isPublic: true,
    },
    (u) => u ?? null,
  );
  assert.equal(card.profilePath, "/organizers/asso");
  assert.equal(card.isFollowing, true);
  assert.equal(card.ownerUserId, undefined);
});

test("mapPublicProfileJson active Suivre (Lot E)", () => {
  const pub = mapPublicProfileJson(
    {
      id: "p3",
      type: "ORGANIZATION",
      slug: "nord",
      displayName: "Nord",
      bio: null,
      imageUrl: null,
      websiteUrl: null,
      isPublic: true,
      ownerUserId: "secret",
      createdAt: NOW,
      updatedAt: NOW,
    },
    (u) => u ?? null,
  );
  assert.equal(pub.followAvailable, true);
  assert.equal(pub.canFollow, true);
});

test("schema : EventFavorite + OrganizerFollow uniques", () => {
  assert.match(schemaSrc, /model EventFavorite/);
  assert.match(schemaSrc, /@@unique\(\[userId, eventId\]\)/);
  assert.match(schemaSrc, /model OrganizerFollow/);
  assert.match(schemaSrc, /@@unique\(\[userId, organizerProfileId\]\)/);
});

test("API surface Lot E présente dans server.js", () => {
  assert.match(serverSrc, /app\.post\("\/events\/:eventId\/favorite", requireAuth/);
  assert.match(serverSrc, /app\.delete\("\/events\/:eventId\/favorite", requireAuth/);
  assert.match(serverSrc, /app\.post\("\/organizers\/:slugOrId\/follow", requireAuth/);
  assert.match(serverSrc, /app\.delete\("\/organizers\/:slugOrId\/follow", requireAuth/);
  assert.match(serverSrc, /app\.get\("\/me\/favorites", requireAuth/);
  assert.match(serverSrc, /app\.get\("\/me\/following", requireAuth/);
  assert.match(serverSrc, /app\.get\("\/discover\/events", optionalAuth/);
  assert.match(serverSrc, /EVENT_NOT_FAVORITABLE/);
  assert.match(serverSrc, /ORGANIZER_NOT_FOLLOWABLE/);
  assert.ok(
    serverSrc.includes('visibility: EVENT_VISIBILITY.PUBLIC') &&
      serverSrc.includes("/me/favorites"),
    "favoris listés filtrés PUBLIC",
  );
  assert.ok(
    serverSrc.includes("organizerProfile: { isPublic: true }") &&
      serverSrc.includes("/me/following"),
    "suivis listés filtrés isPublic",
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests favorites-follows OK");
