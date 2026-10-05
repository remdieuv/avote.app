/**
 * Proxy /api/backend — retry EADDRINUSE uniquement.
 * Exécution : node frontend/scripts/test-backend-proxy-upstream.mjs
 */
import assert from "node:assert/strict";
import {
  fetchUpstreamWithEaddrRetry,
  isEaddrInUseCause,
} from "../lib/backendProxyUpstream.js";

/** @type {{ name: string; run: () => void | Promise<void> }[]} */
const cases = [];

function test(name, run) {
  cases.push({ name, run });
}

test("isEaddrInUseCause détecte code direct et nested cause", () => {
  assert.equal(isEaddrInUseCause({ code: "EADDRINUSE" }), true);
  assert.equal(
    isEaddrInUseCause({
      message: "fetch failed",
      cause: { code: "EADDRINUSE", syscall: "connect" },
    }),
    true,
  );
  assert.equal(isEaddrInUseCause({ code: "ECONNREFUSED" }), false);
  assert.equal(isEaddrInUseCause({ cause: { code: "ECONNRESET" } }), false);
  assert.equal(isEaddrInUseCause(null), false);
});

test("premier fetch EADDRINUSE → second essai (1 retry)", async () => {
  let calls = 0;
  /** @type {string[]} */
  const connections = [];
  const fetchImpl = async (_url, init) => {
    calls += 1;
    connections.push(new Headers(init?.headers).get("connection") || "");
    if (calls === 1) {
      const err = new TypeError("fetch failed");
      err.cause = Object.assign(new Error("connect EADDRINUSE"), {
        code: "EADDRINUSE",
        syscall: "connect",
        address: "127.0.0.1",
        port: 4000,
      });
      throw err;
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const res = await fetchUpstreamWithEaddrRetry(
    "http://127.0.0.1:4000/auth/me",
    { method: "GET", headers: { cookie: "t=1" } },
    { fetchImpl },
  );
  assert.equal(calls, 2);
  assert.equal(res.status, 200);
  assert.deepEqual(connections, ["close", "close"]);
  assert.equal(await res.json().then((b) => b.ok), true);
});

test("autre erreur réseau → pas de retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    const err = new TypeError("fetch failed");
    err.cause = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    });
    throw err;
  };
  await assert.rejects(
    () =>
      fetchUpstreamWithEaddrRetry("http://127.0.0.1:4000/x", {}, { fetchImpl }),
    (e) => isEaddrInUseCause(e) === false && e?.cause?.code === "ECONNREFUSED",
  );
  assert.equal(calls, 1);
});

test("réponse Express 500 → pas de retry (pas de throw)", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
  };
  const res = await fetchUpstreamWithEaddrRetry(
    "http://127.0.0.1:4000/events/1",
    { method: "GET" },
    { fetchImpl },
  );
  assert.equal(calls, 1);
  assert.equal(res.status, 500);
});

test("réponse Express 401 → pas de retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
    });
  };
  const res = await fetchUpstreamWithEaddrRetry(
    "http://127.0.0.1:4000/auth/me",
    {},
    { fetchImpl },
  );
  assert.equal(calls, 1);
  assert.equal(res.status, 401);
});

test("EADDRINUSE deux fois → échoue après le retry unique", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    const err = new TypeError("fetch failed");
    err.cause = { code: "EADDRINUSE" };
    throw err;
  };
  await assert.rejects(
    () =>
      fetchUpstreamWithEaddrRetry("http://127.0.0.1:4000/x", {}, { fetchImpl }),
    (e) => isEaddrInUseCause(e),
  );
  assert.equal(calls, 2);
});

let failed = 0;
for (const c of cases) {
  try {
    await c.run();
    console.log(`ok — ${c.name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${c.name}`);
    console.error(e);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\n${cases.length} tests backend-proxy-upstream OK`);
