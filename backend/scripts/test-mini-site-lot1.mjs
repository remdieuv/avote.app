/**
 * Lot 1 — socle mini-site (Accueil / Participer).
 * Exécution : node backend/scripts/test-mini-site-lot1.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  MINI_SITE_TABS,
  miniSiteApiFields,
  resolveMiniSitePublicStatus,
  pickLatestPublicNews,
} = require("../lib/miniSite.js");
const { PUBLIC_POLL_SURFACE } = require("../lib/publicPollVisibility.js");

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma/migrations/20261127120000_minisite_lot1_socle/migration.sql"),
  "utf8",
);
const server = readFileSync(join(root, "server.js"), "utf8");
const visibility = readFileSync(
  join(root, "lib/publicPollVisibility.js"),
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

test("schéma + migration additive mini-site", () => {
  assert.match(schema, /miniSiteShowKeyStats\s+Boolean\s+@default\(true\)/);
  assert.match(schema, /miniSiteTabResults\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /miniSiteTabJournal\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /miniSiteTabGallery\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /miniSiteTabAbout\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /landingEnabled\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "miniSiteShowKeyStats"/);
  assert.match(migration, /ALTER COLUMN "landingEnabled" SET DEFAULT true/);
  assert.match(
    migration,
    /UPDATE "Event" SET "landingEnabled" = true WHERE "landingEnabled" IS DISTINCT FROM true/,
  );
  assert.doesNotMatch(migration, /DROP COLUMN|DELETE FROM "Event"/i);
});

test("onglets fixes dans l’ordre Accueil → À propos", () => {
  assert.deepEqual(
    MINI_SITE_TABS.map((t) => t.id),
    ["accueil", "participer", "resultats", "journal", "galerie", "a-propos"],
  );
  assert.equal(MINI_SITE_TABS[0].required, true);
  assert.equal(MINI_SITE_TABS[1].required, true);
});

test("API publique : Accueil/Participer + Résultats si activé (pas de Lots 3–5)", () => {
  const fields = miniSiteApiFields(
    {
      miniSiteShowKeyStats: true,
      miniSiteTabResults: true,
      miniSiteTabJournal: true,
      miniSiteTabGallery: true,
      miniSiteTabAbout: true,
    },
    { allowOptionalTabs: false },
  );
  assert.deepEqual(
    fields.tabs.map((t) => t.id),
    ["accueil", "participer", "resultats"],
  );
  assert.equal(fields.tabs.every((t) => t.enabled === true), true);
  assert.equal(fields.miniSiteTabResults, true);
  assert.equal(fields.miniSiteShowKeyStats, true);
  const off = miniSiteApiFields(
    { miniSiteTabResults: false, miniSiteTabJournal: true },
    { allowOptionalTabs: false },
  );
  assert.deepEqual(
    off.tabs.map((t) => t.id),
    ["accueil", "participer"],
  );
});

test("admin peut lire les flags persistés sans les activer au public", () => {
  const fields = miniSiteApiFields(
    { miniSiteTabResults: true, miniSiteShowKeyStats: false },
    { allowOptionalTabs: true },
  );
  assert.equal(fields.miniSiteTabResults, true);
  assert.equal(fields.miniSiteShowKeyStats, false);
  assert.equal(
    fields.tabs.find((t) => t.id === "resultats")?.enabled,
    true,
  );
});

test("statut Live : attente / actif / terminé — pas de Live systématique en SS", () => {
  const waiting = resolveMiniSitePublicStatus({
    consultationMode: "LIVE",
    liveState: "waiting",
    voteState: "closed",
  });
  assert.equal(waiting.statusKey, "live_waiting");
  assert.match(waiting.statusLabel, /attente/i);
  assert.doesNotMatch(waiting.statusLabel, /Live en cours/i);

  const active = resolveMiniSitePublicStatus({
    consultationMode: "LIVE",
    liveState: "voting",
    voteState: "open",
  });
  assert.equal(active.statusKey, "live_active");
  assert.equal(active.participationOpen, true);

  const finished = resolveMiniSitePublicStatus({
    consultationMode: "LIVE",
    liveState: "finished",
    isLocked: true,
  });
  assert.equal(finished.statusKey, "finished");
  assert.equal(finished.participationOpen, false);
});

test("Libre-service : ouvert / pause — libellés adaptés", () => {
  const open = resolveMiniSitePublicStatus({
    consultationMode: "SELF_SERVICE",
    selfServiceOpen: true,
  });
  assert.equal(open.statusKey, "ss_open");
  assert.match(open.statusLabel, /ouverte/i);
  assert.doesNotMatch(open.statusLabel, /Live/i);
  assert.doesNotMatch(open.ctaLabel, /Participer au live/i);

  const paused = resolveMiniSitePublicStatus({
    consultationMode: "SELF_SERVICE",
    selfServiceOpen: false,
  });
  assert.equal(paused.statusKey, "ss_paused");
  assert.match(paused.statusLabel, /pause/i);
});

test("capacité pleine ≠ terminé", () => {
  const full = resolveMiniSitePublicStatus({
    consultationMode: "LIVE",
    liveState: "waiting",
    participantsUsed: 100,
    participantsLimit: 100,
    limitReached: true,
  });
  assert.equal(full.statusKey, "capacity_full");
  assert.notEqual(full.statusKey, "finished");
  assert.match(full.statusHint || "", /pas une clôture définitive/i);
});

test("pickLatestPublicNews ignore messages masqués", () => {
  assert.equal(
    pickLatestPublicNews([
      { id: "1", body: "caché", hidden: true },
      { id: "2", body: "  Hello  ", hidden: false },
    ])?.id,
    "2",
  );
  assert.equal(pickLatestPublicNews([{ id: "1", body: "   ", hidden: false }]), null);
});

test("server : auto-enable + reject onglets non développés + stats", () => {
  assert.match(server, /miniSiteApiFields/);
  assert.match(server, /fetchMiniSitePublicStats/);
  assert.match(server, /resolveMiniSitePublicStatus/);
  assert.match(server, /participatePath/);
  assert.match(server, /MINISITE_TAB_NOT_AVAILABLE/);
  assert.match(server, /miniSiteShowKeyStats/);
  // Création / duplication : landingEnabled true
  assert.match(server, /landingEnabled:\s*true/);
});

test("réutilise publicPollVisibility (Lot 0)", () => {
  assert.equal(PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT, "landing_feed_result");
  assert.match(visibility, /filterPollsForPublicSurface/);
  const mini = readFileSync(join(root, "lib/miniSite.js"), "utf8");
  assert.match(mini, /landingFeedResultPollsWhere/);
  assert.match(mini, /filterPollsForPublicSurface/);
  assert.match(mini, /PUBLIC_POLL_SURFACE\.LANDING_FEED_RESULT/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 1 mini-site backend OK");
