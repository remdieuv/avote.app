/**
 * Lot E — surface UI favoris / suivis / Mes événements.
 * Exécution : node scripts/test-favorites-follows-ui.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

test("DiscoverEventCard : bouton cœur favori", () => {
  const src = readFileSync(
    join(root, "components/discover/DiscoverEventCard.jsx"),
    "utf8",
  );
  assert.match(src, /onToggleFavorite/);
  assert.match(src, /Ajouter aux favoris/);
  assert.match(src, /Retirer des favoris/);
  assert.match(src, /HeartIcon/);
  assert.match(src, /aria-pressed/);
});

test("DiscoverPageClient : login au moment de l’ajout uniquement", () => {
  const src = readFileSync(
    join(root, "components/discover/DiscoverPageClient.jsx"),
    "utf8",
  );
  assert.match(src, /\/events\/\$\{encodeURIComponent\(eventId\)\}\/favorite/);
  assert.match(src, /\/login\?next=/);
  assert.match(src, /LOGIN_NEXT = "\/discover"/);
  assert.doesNotMatch(src, /router\.push\("\/login"\);\s*\n\s*return;\s*\n\s*\}/);
});

test("page organisateur : Suivre / Ne plus suivre", () => {
  const src = readFileSync(join(root, "app/organizers/[slug]/page.jsx"), "utf8");
  assert.match(src, /Ne plus suivre/);
  assert.match(src, /Suivre/);
  assert.doesNotMatch(src, /Suivre \(bientôt\)/);
  assert.match(src, /data-avote-follow-ready="true"/);
  assert.match(src, /\/organizers\/\$\{encodeURIComponent\(slug\)\}\/follow/);
});

test("Mes événements : Organisés / Favoris / Invitations", () => {
  const src = readFileSync(join(root, "app/admin/events/page.js"), "utf8");
  assert.match(src, /Organisés/);
  assert.match(src, /Favoris/);
  assert.match(src, /Invitations/);
  assert.match(src, /\/me\/favorites/);
  assert.match(src, /\/me\/invitations/);
  assert.match(src, /Voir les souvenirs/);
  assert.doesNotMatch(src, /Invitations bientôt disponibles/);
  assert.doesNotMatch(src, /Abonnements/);
});

test("Mon compte → Organisateurs suivis", () => {
  const account = readFileSync(join(root, "app/admin/account/page.jsx"), "utf8");
  assert.match(account, /Organisateurs suivis/);
  assert.match(account, /\/admin\/following/);
  assert.doesNotMatch(account, /Abonnements/);

  const following = readFileSync(
    join(root, "app/admin/following/page.jsx"),
    "utf8",
  );
  assert.match(following, /Organisateurs suivis/);
  assert.match(following, /\/me\/following/);
  assert.match(following, /Aucun organisateur suivi/);
  assert.doesNotMatch(following, /Abonnements/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests favorites-follows-ui OK");
