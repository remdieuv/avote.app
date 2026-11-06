/**
 * Lot B — tests Discover (catégories, éligibilité, filtres, thèmes).
 * Exécution : node scripts/test-discover-events.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DISCOVER_THEMES } = require("../lib/discoverCatalog.js");
const {
  normalizeDiscoverCity,
  parseDiscoverStartsAt,
} = require("../lib/discoverCatalog.js");
const {
  DISCOVER_CATEGORIES,
  isDiscoverEligible,
  resolveDiscoverCategory,
  buildDiscoverEventsQuery,
  filterDiscoverRowsByCategory,
  validateEventThemes,
  mapDiscoverEventCard,
  parseDiscoverLimit,
} = require("../lib/discoverEvents.js");
const {
  isDiscoverEligible: isDiscoverEligibleVis,
} = require("../lib/eventVisibility.js");

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

test("catalogue : exactement 9 thèmes", () => {
  assert.equal(DISCOVER_THEMES.length, 9);
  const labels = DISCOVER_THEMES.map((t) => t.label);
  assert.ok(labels.includes("Musique & Festivals"));
  assert.ok(labels.includes("Gaming & Streaming"));
  assert.ok(labels.includes("Autres"));
});

test("isDiscoverEligible exige public + thème + startsAt + profil orga", () => {
  assert.equal(isDiscoverEligible({ visibility: "PUBLIC" }), false);
  assert.equal(
    isDiscoverEligible({
      visibility: "PUBLIC",
      primaryThemeId: "theme_sport",
    }),
    false,
  );
  assert.equal(
    isDiscoverEligible({
      visibility: "PRIVATE",
      primaryThemeId: "theme_sport",
      startsAt: NOW,
      organizerProfileId: "org1",
    }),
    false,
  );
  assert.equal(
    isDiscoverEligible({
      visibility: "PUBLIC",
      primaryThemeId: "theme_sport",
      startsAt: NOW,
    }),
    false,
  );
  assert.equal(
    isDiscoverEligible({
      visibility: "PUBLIC",
      primaryThemeId: "theme_sport",
      startsAt: NOW,
      organizerProfileId: "org1",
    }),
    true,
  );
  assert.equal(
    isDiscoverEligible({
      visibility: "PUBLIC",
      primaryThemeId: "theme_sport",
      startsAt: NOW,
      organizerProfileId: "org1",
      organizerProfile: { isPublic: false },
    }),
    false,
  );
  assert.equal(
    isDiscoverEligibleVis({
      visibility: "public",
      primaryThemeId: "theme_sport",
      startsAt: NOW,
      organizerProfileId: "org1",
    }),
    true,
  );
});

test("catégories : upcoming / live / finished / overdue", () => {
  assert.equal(
    resolveDiscoverCategory(
      {
        liveState: "WAITING",
        isLiveConsumed: false,
        startsAt: new Date("2026-12-01T10:00:00.000Z"),
      },
      NOW,
    ),
    "upcoming",
  );
  assert.equal(
    resolveDiscoverCategory(
      {
        liveState: "VOTING",
        isLiveConsumed: true,
        startsAt: new Date("2026-12-01T10:00:00.000Z"),
      },
      NOW,
    ),
    "live",
  );
  assert.equal(
    resolveDiscoverCategory(
      {
        liveState: "FINISHED",
        isLiveConsumed: true,
        startsAt: new Date("2026-10-01T10:00:00.000Z"),
      },
      NOW,
    ),
    "finished",
  );
  assert.equal(
    resolveDiscoverCategory(
      {
        liveState: "WAITING",
        isLiveConsumed: false,
        startsAt: new Date("2026-10-01T10:00:00.000Z"),
      },
      NOW,
    ),
    "overdue",
  );
});

test("date passée non lancée ≠ live (même si startsAt passée)", () => {
  const cat = resolveDiscoverCategory(
    {
      liveState: "WAITING",
      isLiveConsumed: false,
      startsAt: new Date("2020-01-01T00:00:00.000Z"),
    },
    NOW,
  );
  assert.equal(cat, "overdue");
  assert.notEqual(cat, "live");
  assert.notEqual(cat, "finished");
});

test("filtre listing général exclut overdue", () => {
  const rows = [
    {
      id: "1",
      liveState: "WAITING",
      isLiveConsumed: false,
      startsAt: new Date("2026-12-01T00:00:00.000Z"),
    },
    {
      id: "2",
      liveState: "WAITING",
      isLiveConsumed: false,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "3",
      liveState: "VOTING",
      isLiveConsumed: true,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ];
  const filtered = filterDiscoverRowsByCategory(rows, {
    category: null,
    excludeOverdueUnlessRequested: true,
    now: NOW,
  });
  assert.deepEqual(
    filtered.map((r) => r.id),
    ["1", "3"],
  );
  assert.equal(filtered[0].discoverCategory, "upcoming");
  assert.equal(filtered[1].discoverCategory, "live");
});

test("buildDiscoverEventsQuery refuse les privés via visibility PUBLIC", () => {
  const q = buildDiscoverEventsQuery({ now: NOW });
  assert.equal(q.ok, true);
  assert.equal(q.prismaWhere.visibility, "PUBLIC");
  assert.deepEqual(q.prismaWhere.primaryThemeId, { not: null });
  assert.deepEqual(q.prismaWhere.organizerProfileId, { not: null });
  assert.deepEqual(q.prismaWhere.organizerProfile, { isPublic: true });
});

test("buildDiscoverEventsQuery category live force isLiveConsumed", () => {
  const q = buildDiscoverEventsQuery({ category: "live", now: NOW });
  assert.equal(q.ok, true);
  assert.equal(q.prismaWhere.isLiveConsumed, true);
});

test("buildDiscoverEventsQuery category invalide", () => {
  const q = buildDiscoverEventsQuery({ category: "foo" });
  assert.equal(q.ok, false);
  assert.equal(q.code, "INVALID_CATEGORY");
});

test("validateEventThemes : max 2 distincts", () => {
  const ok = validateEventThemes({
    primaryThemeId: "theme_sport",
    secondaryThemeId: "theme_autres",
    primaryExists: true,
    secondaryExists: true,
  });
  assert.equal(ok.ok, true);

  const same = validateEventThemes({
    primaryThemeId: "theme_sport",
    secondaryThemeId: "theme_sport",
    primaryExists: true,
    secondaryExists: true,
  });
  assert.equal(same.ok, false);
  assert.equal(same.code, "THEMES_NOT_DISTINCT");
});

test("normalize city / startsAt — pas de conversion hasardeuse", () => {
  assert.equal(normalizeDiscoverCity("  Paris  "), "Paris");
  assert.equal(normalizeDiscoverCity(""), null);
  assert.equal(normalizeDiscoverCity(12), undefined);
  const d = parseDiscoverStartsAt("2026-12-24T20:00:00.000Z");
  assert.ok(d instanceof Date);
  assert.equal(parseDiscoverStartsAt("pas-une-date"), undefined);
});

test("parseDiscoverLimit borné", () => {
  assert.equal(parseDiscoverLimit(undefined), 20);
  assert.equal(parseDiscoverLimit(999), 50);
});

test("mapDiscoverEventCard ne fuit pas de champs privés", () => {
  const card = mapDiscoverEventCard({
    id: "e1",
    title: "Concert",
    slug: "e-concert",
    city: "Lyon",
    startsAt: new Date("2026-12-01T18:00:00.000Z"),
    liveState: "WAITING",
    isLiveConsumed: false,
    landingEnabled: true,
    landingCoverUrl: "https://cdn.example/cover.jpg",
    primaryTheme: {
      id: "theme_musique_festivals",
      slug: "musique-festivals",
      label: "Musique & Festivals",
    },
    secondaryTheme: null,
    discoverCategory: "upcoming",
    userId: "secret-user",
    inviteCodeHash: "nope",
  });
  assert.equal(card.visibility, "public");
  assert.equal(card.discoverCategory, "upcoming");
  assert.equal(card.userId, undefined);
  assert.equal(card.inviteCodeHash, undefined);
  assert.equal(card.primaryTheme.slug, "musique-festivals");
});

test("DISCOVER_CATEGORIES constants", () => {
  assert.equal(DISCOVER_CATEGORIES.OVERDUE, "overdue");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests discover-events OK");
