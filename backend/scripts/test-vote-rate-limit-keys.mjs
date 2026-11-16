/**
 * Clés rate-limit vote (session vs IP).
 * Exécution : node backend/scripts/test-vote-rate-limit-keys.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  voteSessionRateLimitKey,
  voteIpRateLimitKey,
} = require("../lib/voteRateLimitKeys.js");

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

test("session key préférée au IP", () => {
  const k = voteSessionRateLimitKey({
    body: { voterSessionId: "  abc-123  " },
    ip: "1.2.3.4",
  });
  assert.equal(k, "vs:abc-123");
});

test("fallback IP si pas de voterSessionId", () => {
  const k = voteSessionRateLimitKey({ body: {}, ip: "10.0.0.1" });
  assert.equal(k, "ip-fallback:10.0.0.1");
});

test("deux sessions même IP → clés distinctes", () => {
  const a = voteSessionRateLimitKey({
    body: { voterSessionId: "s1" },
    ip: "8.8.8.8",
  });
  const b = voteSessionRateLimitKey({
    body: { voterSessionId: "s2" },
    ip: "8.8.8.8",
  });
  assert.notEqual(a, b);
});

test("clé IP réseau", () => {
  assert.equal(voteIpRateLimitKey({ ip: "9.9.9.9" }), "ip:9.9.9.9");
});

test("contrat server.js : limiters session + IP, plus de clé IP seule à 5/s", () => {
  const { readFileSync } = require("node:fs");
  const { join, dirname } = require("node:path");
  const { fileURLToPath } = require("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.match(src, /voteSessionLimiter/);
  assert.match(src, /voteIpBurstLimiter/);
  assert.match(src, /voteSessionRateLimitKey/);
  assert.equal(src.includes("max: 5,\n  standardHeaders: true,\n  legacyHeaders: false,\n});"), false);
  assert.match(src, /max:\s*400/);
});

if (failed) process.exit(1);
console.log("all ok");
