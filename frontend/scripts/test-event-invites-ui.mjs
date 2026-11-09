/**
 * Lot F — surface UI invitations / protection souvenirs.
 * Exécution : node scripts/test-event-invites-ui.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
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

test("page /invite/[slug]", () => {
  const src = readFileSync(join(root, "app/invite/[slug]/page.jsx"), "utf8");
  assert.match(src, /Code d’accès/);
  assert.match(src, /\/invite\/\$\{encodeURIComponent\(slug\)\}\/redeem/);
  assert.match(src, /aucun code requis pour voter/i);
  assert.match(src, /login\?next=/);
});

test("EventInvitesPanel : avertissement + rotate", () => {
  const src = readFileSync(
    join(root, "components/admin/EventInvitesPanel.jsx"),
    "utf8",
  );
  assert.match(src, /Invitations et confidentialité/);
  assert.match(src, /confirm: true/);
  assert.match(src, /Renouveler le code/);
  assert.match(src, /invite\/enable/);
});

test("Landing admin intègre le panneau", () => {
  const src = readFileSync(
    join(root, "app/admin/events/[eventId]/customization/page.jsx"),
    "utf8",
  );
  assert.match(src, /EventInvitesPanel/);
});

test("Mes événements → Invitations branché sur /me/invitations", () => {
  const src = readFileSync(join(root, "app/admin/events/page.js"), "utf8");
  assert.match(src, /\/me\/invitations/);
  assert.match(src, /Aucune invitation pour le moment/);
  assert.doesNotMatch(src, /Invitations bientôt disponibles/);
});

test("Landing /e redirige vers /invite si INVITE_REQUIRED", () => {
  const src = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
  assert.match(src, /INVITE_REQUIRED/);
  assert.match(src, /\/invite\//);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests event-invites-ui OK");
