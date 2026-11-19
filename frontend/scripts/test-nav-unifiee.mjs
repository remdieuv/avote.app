/**
 * Navigation unifiée public + connecté.
 * Exécution : node frontend/scripts/test-nav-unifiee.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PERSONAL_NAV_ITEMS,
  PUBLIC_NAV_ITEMS,
  siteNavItems,
} from "../lib/siteNav.js";

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

test("siteNavItems guest = public seulement", () => {
  const items = siteNavItems(false);
  assert.deepEqual(
    items.map((i) => i.label),
    ["Les événements", "Tarifs"],
  );
  assert.equal(PUBLIC_NAV_ITEMS.length, 2);
});

test("siteNavItems connecté = public + perso", () => {
  const items = siteNavItems(true);
  assert.deepEqual(
    items.map((i) => i.label),
    [
      "Les événements",
      "Tarifs",
      "Mes événements",
      "Mes leads",
      "Analytics",
      "Créer",
    ],
  );
  assert.equal(PERSONAL_NAV_ITEMS.length, 4);
  const hrefs = items.map((i) => i.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "pas de doublons href");
});

test("SiteHeader : nav dynamique + pas de mobileQuick", () => {
  const src = read("components/navigation/SiteHeader.jsx");
  assert.match(src, /siteNavItems\(isAuthed\)/);
  assert.match(src, /mobileQuickItem=\{null\}/);
  assert.match(src, /mobileMoreItems=\{navItems\}/);
  assert.match(src, /HeaderAuthCta/);
});

test("Landing / Admin / EventLanding branchés sur SiteHeader", () => {
  assert.match(read("components/landing/LandingHeader.jsx"), /SiteHeader/);
  assert.match(read("components/admin/AdminAccountBar.jsx"), /SiteHeader/);
  assert.match(read("components/event/EventLandingNav.jsx"), /SiteHeader/);
  assert.doesNotMatch(
    read("components/admin/AdminAccountBar.jsx"),
    /mobileQuickItem/,
  );
});

test("HeaderAuthCta : Se connecter / Mon compte infos+logout, pas d’icône profil", () => {
  const src = read("components/navigation/HeaderAuthCta.jsx");
  assert.match(src, /Se connecter/);
  assert.match(src, /Mon compte/);
  assert.match(src, /Se déconnecter/);
  assert.match(src, /\/admin\/account/);
  assert.match(src, /\/login\?next=/);
  assert.doesNotMatch(src, /UserIcon|admin-account-trigger/);
});

test("Régie non touchée", () => {
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /SiteHeader|LandingHeader|HeaderAuthCta/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — nav unifiée");
