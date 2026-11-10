/**
 * Lot C — helpers UI Découvrir.
 * Exécution : node scripts/test-discover-ui.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DISCOVER_CATEGORY_TABS,
  discoverCategoryLabel,
  formatDiscoverStartsAt,
  normalizeDiscoverCategory,
  resolveDiscoverPrimaryCta,
  resolveDiscoverSecondaryCta,
} from "../lib/discoverUi.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

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

test("trois onglets catégorie", () => {
  assert.equal(DISCOVER_CATEGORY_TABS.length, 3);
  assert.deepEqual(
    DISCOVER_CATEGORY_TABS.map((t) => t.id),
    ["upcoming", "live", "finished"],
  );
});

test("normalizeDiscoverCategory", () => {
  assert.equal(normalizeDiscoverCategory("LIVE"), "live");
  assert.equal(normalizeDiscoverCategory("foo"), null);
});

test("labels FR", () => {
  assert.equal(discoverCategoryLabel("upcoming"), "À venir");
  assert.equal(discoverCategoryLabel("live"), "En direct");
  assert.equal(discoverCategoryLabel("finished"), "Terminé");
});

test("formatDiscoverStartsAt", () => {
  assert.equal(formatDiscoverStartsAt(null), null);
  assert.ok(formatDiscoverStartsAt("2026-12-15T18:00:00.000Z"));
});

test("CTA live → Participer via join", () => {
  const cta = resolveDiscoverPrimaryCta({
    discoverCategory: "live",
    joinPath: "/join/e-abc",
    landingPath: "/e/e-abc",
  });
  assert.deepEqual(cta, { href: "/join/e-abc", label: "Participer" });
});

test("CTA finished sans landing → null", () => {
  assert.equal(
    resolveDiscoverPrimaryCta({
      discoverCategory: "finished",
      joinPath: "/join/e-abc",
      landingPath: null,
      landingEnabled: false,
    }),
    null,
  );
});

test("CTA finished avec landing → souvenirs", () => {
  assert.deepEqual(
    resolveDiscoverPrimaryCta({
      discoverCategory: "finished",
      landingPath: "/e/e-abc",
    }),
    { href: "/e/e-abc", label: "Voir les souvenirs" },
  );
});

test("CTA upcoming préfère landing puis join", () => {
  assert.equal(
    resolveDiscoverPrimaryCta({
      discoverCategory: "upcoming",
      landingPath: "/e/e-abc",
      joinPath: "/join/e-abc",
    })?.label,
    "Voir l'événement",
  );
  assert.equal(
    resolveDiscoverPrimaryCta({
      discoverCategory: "upcoming",
      landingPath: null,
      joinPath: "/join/e-abc",
    })?.href,
    "/join/e-abc",
  );
});

test("secondary Rejoindre si landing est le CTA upcoming", () => {
  const primary = resolveDiscoverPrimaryCta({
    discoverCategory: "upcoming",
    landingPath: "/e/e-abc",
    joinPath: "/join/e-abc",
  });
  const sec = resolveDiscoverSecondaryCta(
    {
      discoverCategory: "upcoming",
      joinPath: "/join/e-abc",
      landingPath: "/e/e-abc",
    },
    primary,
  );
  assert.deepEqual(sec, { href: "/join/e-abc", label: "Rejoindre" });
});

test("page discover + nav Les événements présents", () => {
  const page = readFileSync(join(root, "app/discover/page.jsx"), "utf8");
  assert.match(page, /robots:\s*\{[\s\S]*index:\s*true/);
  assert.match(page, /DiscoverPageClient/);
  const client = readFileSync(
    join(root, "components/discover/DiscoverPageClient.jsx"),
    "utf8",
  );
  assert.match(client, /Découvrez les événements/);
  const header = readFileSync(
    join(root, "components/landing/LandingHeader.jsx"),
    "utf8",
  );
  assert.match(header, /\/discover/);
  assert.match(header, /Les événements/);
  assert.match(header, /Mes événements/);
  assert.match(header, /mobileMoreItems/);
});

test("Lot 5 — persistence URL Discover (helpers + client)", async () => {
  const {
    buildDiscoverSearchParams,
    discoverHrefFromParams,
    parseDiscoverSearchParams,
  } = await import("../lib/discoverUrlState.js");
  const parsed = parseDiscoverSearchParams(
    new URLSearchParams("category=live&city=Paris"),
  );
  assert.equal(parsed.category, "live");
  assert.equal(parsed.city, "Paris");
  assert.equal(
    discoverHrefFromParams(buildDiscoverSearchParams(parsed)),
    "/discover?category=live&city=Paris",
  );
  const client = readFileSync(
    join(root, "components/discover/DiscoverPageClient.jsx"),
    "utf8",
  );
  assert.match(client, /discoverUrlState/);
  assert.match(client, /router\.replace/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests discover-ui OK");
