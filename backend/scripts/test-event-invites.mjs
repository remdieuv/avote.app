/**
 * Lot F — invitations privées & protection souvenirs (règles métier + surface API).
 * Exécution : node scripts/test-event-invites.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  normalizeInviteCodeInput,
  generateInviteCode,
  hashInviteCode,
  verifyInviteCode,
  isInviteProtectionEnabled,
  isMediaProtectionEnabled,
  canAccessProtectedSouvenirs,
  mapInviteAccessMeta,
  mapOwnerInviteJson,
} = require("../lib/eventInvites.js");
const {
  isProtectedUrlMarker,
  toProtectedUrlMarker,
  extractCloudinaryPublicIdFromUrl,
  resolveDeliverableMediaUrl,
} = require("../lib/protectedMedia.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverSrc = readFileSync(join(__dirname, "../server.js"), "utf8");
const schemaSrc = readFileSync(join(__dirname, "../prisma/schema.prisma"), "utf8");

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

test("normalize / generate invite code", () => {
  assert.equal(normalizeInviteCodeInput(" ab12cd "), "AB12CD");
  assert.equal(normalizeInviteCodeInput("x"), null);
  const c = generateInviteCode();
  assert.equal(c.length, 8);
  assert.match(c, /^[0-9A-F]+$/);
});

test("soft-gate : inviteEnabled false → accès libre souvenirs", () => {
  assert.equal(isInviteProtectionEnabled({ inviteEnabled: false }), false);
  assert.equal(
    canAccessProtectedSouvenirs({
      event: { inviteEnabled: false, userId: "o1" },
      userId: null,
    }),
    true,
  );
});

test("inviteEnabled true → owner / grant / admin seulement", () => {
  const event = { inviteEnabled: true, userId: "owner" };
  assert.equal(
    canAccessProtectedSouvenirs({ event, userId: null }),
    false,
  );
  assert.equal(
    canAccessProtectedSouvenirs({ event, userId: "owner" }),
    true,
  );
  assert.equal(
    canAccessProtectedSouvenirs({
      event,
      userId: "guest",
      hasGuestGrant: true,
    }),
    true,
  );
  assert.equal(
    canAccessProtectedSouvenirs({
      event,
      userId: "guest",
      hasGuestGrant: false,
    }),
    false,
  );
  assert.equal(
    canAccessProtectedSouvenirs({
      event,
      userId: "x",
      isAdmin: true,
    }),
    true,
  );
});

test("mapInviteAccessMeta ne fuit pas le code", () => {
  const meta = mapInviteAccessMeta(
    {
      id: "e1",
      slug: "e-abc",
      title: "Privé",
      inviteEnabled: true,
      landingEnabled: true,
      inviteCodeHash: "SECRET",
    },
    { hasAccess: false },
  );
  assert.equal(meta.requiresCode, true);
  assert.equal(meta.invitePath, "/invite/e-abc");
  assert.equal(JSON.stringify(meta).includes("SECRET"), false);
});

test("mapOwnerInviteJson : code plaintext optionnel seulement", () => {
  const base = mapOwnerInviteJson({
    slug: "e-abc",
    inviteEnabled: true,
    inviteCodeHash: "hash",
    mediaProtectionEnabled: true,
    inviteCodeUpdatedAt: new Date("2026-11-09T10:00:00Z"),
  });
  assert.equal(base.inviteCode, undefined);
  assert.equal(base.hasInviteCode, true);
  const withPlain = mapOwnerInviteJson(
    {
      slug: "e-abc",
      inviteEnabled: true,
      inviteCodeHash: "hash",
      mediaProtectionEnabled: true,
    },
    { plaintextCode: "AABBCCDD", guestCount: 2 },
  );
  assert.equal(withPlain.inviteCode, "AABBCCDD");
  assert.equal(withPlain.guestCount, 2);
  assert.match(withPlain.warnings.activation, /live/i);
});

test("protected URL markers + extract publicId", () => {
  assert.equal(isProtectedUrlMarker("protected://avote/events/x/lc-1"), true);
  assert.equal(toProtectedUrlMarker("avote/x"), "protected://avote/x");
  const pid = extractCloudinaryPublicIdFromUrl(
    "https://res.cloudinary.com/demo/image/upload/v123/avote/events/e1/lp-abc.jpg",
  );
  assert.equal(pid, "avote/events/e1/lp-abc");
});

test("resolveDeliverableMediaUrl masque les URL publiques si protection ON", () => {
  const publicUrl = "https://res.cloudinary.com/demo/image/upload/v1/x.jpg";
  assert.equal(
    resolveDeliverableMediaUrl(
      publicUrl,
      null,
      { mediaProtectionEnabled: true },
      (u) => u,
    ),
    null,
  );
  assert.equal(
    isMediaProtectionEnabled({ mediaProtectionEnabled: false }),
    false,
  );
});

test("schema EventGuestAccess + flags Lot F", () => {
  assert.match(schemaSrc, /inviteEnabled/);
  assert.match(schemaSrc, /inviteCodeHash/);
  assert.match(schemaSrc, /mediaProtectionEnabled/);
  assert.match(schemaSrc, /model EventGuestAccess/);
  assert.match(schemaSrc, /@@unique\(\[userId, eventId\]\)/);
});

test("API surface Lot F dans server.js", () => {
  assert.match(serverSrc, /INVITE_REQUIRED/);
  assert.match(serverSrc, /\/invite\/:slug\/redeem/);
  assert.match(serverSrc, /\/events\/:eventId\/invite\/enable/);
  assert.match(serverSrc, /\/events\/:eventId\/invite\/rotate/);
  assert.match(serverSrc, /\/me\/invitations/);
  assert.match(serverSrc, /inviteRedeemLimiter/);
  assert.match(serverSrc, /migrateEventLandingMediaToProtected/);
  assert.ok(serverSrc.includes("joinPath"), "join reste exposé");
});

// async tests runner
(async () => {
  try {
    await (async () => {
      const plain = "DEADBEEF";
      const hash = await hashInviteCode(plain);
      assert.equal(await verifyInviteCode("deadbeef", hash), true);
      assert.equal(await verifyInviteCode("WRONGCOD", hash), false);
    })();
    console.log("ok — hash + verify invite code (bcrypt)");
  } catch (e) {
    failed += 1;
    console.error("FAIL — hash + verify invite code (bcrypt)");
    console.error(e);
  }

  if (failed > 0) {
    console.error(`\n${failed} test(s) en échec`);
    process.exit(1);
  }
  console.log("\nTous les tests event-invites OK");
})();
