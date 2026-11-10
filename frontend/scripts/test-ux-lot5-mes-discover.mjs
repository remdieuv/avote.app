/**
 * Lot 5 UX — Mes événements + Découvrir (URL, Terminés, sections, souvenirs, privé).
 * Exécution : node scripts/test-ux-lot5-mes-discover.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_STATUS_FILTERS,
  filterEventsByStatus,
} from "../lib/adminEventsFilters.js";
import {
  buildDiscoverSearchParams,
  discoverHrefFromParams,
  parseDiscoverSearchParams,
} from "../lib/discoverUrlState.js";
import { DISCOVER_CATEGORY_TABS } from "../lib/discoverUi.js";
import { getMesEventsSectionHelp } from "../lib/mesEventsSectionCopy.js";
import {
  buildMesEventsSearchParams,
  MES_EVENTS_FINISHED_FILTER_HINT,
  mesEventsHrefFromParams,
  normalizeMesEventsSection,
  parseMesEventsSearchParams,
} from "../lib/mesEventsUrlState.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

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

test("Discover : catégories À venir / En direct / Terminés", () => {
  assert.deepEqual(
    DISCOVER_CATEGORY_TABS.map((t) => t.id),
    ["upcoming", "live", "finished"],
  );
  assert.equal(
    DISCOVER_CATEGORY_TABS.find((t) => t.id === "finished")?.label,
    "Terminés",
  );
});

test("Discover URL : parse / build / href", () => {
  const sp = new URLSearchParams(
    "category=finished&q=soir%C3%A9e&city=Lyon&theme=sport",
  );
  const parsed = parseDiscoverSearchParams(sp);
  assert.deepEqual(parsed, {
    category: "finished",
    q: "soirée",
    city: "Lyon",
    theme: "sport",
  });
  const built = buildDiscoverSearchParams(parsed);
  assert.equal(built.get("category"), "finished");
  assert.equal(built.get("q"), "soirée");
  assert.equal(built.get("city"), "Lyon");
  assert.equal(built.get("theme"), "sport");
  assert.equal(
    discoverHrefFromParams(built),
    "/discover?category=finished&q=soir%C3%A9e&city=Lyon&theme=sport",
  );
  assert.equal(
    parseDiscoverSearchParams(new URLSearchParams("category=nope")).category,
    "upcoming",
  );
});

test("DiscoverPageClient : sync URL + onglet Terminés", () => {
  const src = readFileSync(
    join(root, "components/discover/DiscoverPageClient.jsx"),
    "utf8",
  );
  assert.match(src, /parseDiscoverSearchParams/);
  assert.match(src, /buildDiscoverSearchParams/);
  assert.match(src, /router\.replace\(href/);
  assert.match(src, /useSearchParams/);
  assert.match(src, /Terminés — souvenirs/);
  assert.match(src, /page de l’événement/);
  assert.doesNotMatch(src, /Landing apparaîtront/);
});

test("DiscoverEventCard : date / ville / thème / organisateur", () => {
  const src = readFileSync(
    join(root, "components/discover/DiscoverEventCard.jsx"),
    "utf8",
  );
  assert.match(src, /formatDiscoverStartsAt/);
  assert.match(src, /event\?\.city/);
  assert.match(src, /primaryTheme\?\.label/);
  assert.match(src, /organizer\.displayName/);
  assert.match(src, /Souvenirs indisponibles/);
  assert.match(src, /resolveDiscoverPrimaryCta/);
});

test("Mes événements URL : section / status Terminés", () => {
  assert.equal(normalizeMesEventsSection("favorites"), "favorites");
  assert.equal(normalizeMesEventsSection("x"), "organized");
  const parsed = parseMesEventsSearchParams(
    new URLSearchParams("section=invitations&status=finished&q=demo&sort=recent"),
  );
  assert.deepEqual(parsed, {
    section: "invitations",
    status: "finished",
    q: "demo",
    sort: "recent",
  });
  const href = mesEventsHrefFromParams(buildMesEventsSearchParams(parsed));
  assert.match(href, /section=invitations/);
  assert.match(href, /status=finished/);
  assert.match(href, /q=demo/);
  assert.match(href, /sort=recent/);
  assert.ok(EVENT_STATUS_FILTERS.some((o) => o.value === "finished" && o.label === "Terminés"));
  assert.match(MES_EVENTS_FINISHED_FILTER_HINT, /Terminés/);
});

test("filtre statut Terminés via getEventUxState key", () => {
  const list = [
    { id: "1", liveState: "finished", title: "A" },
    { id: "2", liveState: "voting", title: "B" },
  ];
  const onlyFinished = filterEventsByStatus(list, "finished");
  assert.equal(onlyFinished.length, 1);
  assert.equal(onlyFinished[0].id, "1");
});

test("Mes événements page : sections distinctes + URL + invitations live", () => {
  const src = readFileSync(join(root, "app/admin/events/page.js"), "utf8");
  assert.match(src, /parseMesEventsSearchParams/);
  assert.match(src, /buildMesEventsSearchParams/);
  assert.match(src, /getMesEventsSectionHelp/);
  assert.match(src, /MES_EVENTS_FINISHED_FILTER_HINT/);
  assert.match(src, /data-avote-mes-section/);
  assert.match(src, /\/me\/invitations/);
  assert.match(src, /Voir les souvenirs/);
  assert.doesNotMatch(src, /Invitations bientôt disponibles/);
  const helpFav = getMesEventsSectionHelp("favorites");
  const helpInv = getMesEventsSectionHelp("invitations");
  const helpOrg = getMesEventsSectionHelp("organized");
  assert.match(helpFav.body, /Distincts/);
  assert.match(helpInv.body, /souvenirs/);
  assert.match(helpOrg.body, /Terminés/);
});

test("AdminEventsToolbar : Terminés identifiable", () => {
  const src = readFileSync(
    join(root, "components/admin/AdminEventsToolbar.jsx"),
    "utf8",
  );
  assert.match(src, /finishedActive/);
  assert.match(src, /finishedFilterHint/);
  assert.match(src, /data-avote-status-filter/);
  assert.match(src, /finishedActive \? " · Terminés"/);
  assert.match(src, /Statut : Terminés/);
});

test("EventDashboardCard : terminé → souvenirs + régie", () => {
  const src = readFileSync(
    join(root, "components/admin/EventDashboardCard.jsx"),
    "utf8",
  );
  assert.match(src, /Ouvrir la régie/);
  assert.match(src, /Voir les souvenirs/);
  assert.match(src, /ux\.key === "finished"/);
  assert.match(src, /EVENT_PAGE_VIEW_CTA/);
});

test("API Discover : privés exclus (pas de nouvelle règle FE)", () => {
  const src = readFileSync(
    join(repoRoot, "backend/lib/discoverEvents.js"),
    "utf8",
  );
  assert.match(src, /isEventPublic\(event\?\.visibility\)/);
  assert.match(src, /Les privés ne sont jamais inclus/);
  const client = readFileSync(
    join(root, "components/discover/DiscoverPageClient.jsx"),
    "utf8",
  );
  assert.doesNotMatch(client, /visibility\s*===\s*["']private["']/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests ux-lot5-mes-discover OK");
