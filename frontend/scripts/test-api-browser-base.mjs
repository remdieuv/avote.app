/**
 * Solution C — base URL navigateur centralisée (dev direct vs prod /api/backend).
 * Exécution : node frontend/scripts/test-api-browser-base.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configUrl = pathToFileURL(path.join(__dirname, "../lib/config.js")).href;

const ENV_KEYS = [
  "NEXT_PUBLIC_API_BROWSER_BASE",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_SOCKET_URL",
];

/** @type {{ name: string; run: () => Promise<void> }[]} */
const cases = [];

function test(name, run) {
  cases.push({ name, run });
}

/**
 * Applique env, importe config, exécute fn, restaure env.
 * @param {Record<string, string | undefined>} envPatch
 * @param {(mod: typeof import("../lib/config.js")) => void | Promise<void>} fn
 */
async function withConfig(envPatch, fn) {
  /** @type {Record<string, string | undefined>} */
  const saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    if (Object.prototype.hasOwnProperty.call(envPatch, k)) {
      if (envPatch[k] === undefined) delete process.env[k];
      else process.env[k] = envPatch[k];
    }
  }
  try {
    const mod = await import(`${configUrl}?t=${Date.now()}-${Math.random()}`);
    await fn(mod);
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("prod / défaut navigateur : /api/backend", async () => {
  await withConfig(
    {
      NEXT_PUBLIC_API_BROWSER_BASE: undefined,
      NEXT_PUBLIC_API_URL: "https://api.example.com",
    },
    (mod) => {
      globalThis.window = {};
      try {
        assert.equal(mod.apiBaseBrowser(), "/api/backend");
        assert.equal(mod.isBrowserApiDirectToBackend(), false);
      } finally {
        delete globalThis.window;
      }
    },
  );
});

test("dev local : NEXT_PUBLIC_API_BROWSER_BASE → Express direct", async () => {
  await withConfig(
    {
      NEXT_PUBLIC_API_BROWSER_BASE: "http://localhost:4000",
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    },
    (mod) => {
      globalThis.window = {};
      try {
        assert.equal(mod.apiBaseBrowser(), "http://localhost:4000");
        assert.equal(mod.isBrowserApiDirectToBackend(), true);
        assert.equal(mod.apiBaseBrowser().includes("/api/backend"), false);
      } finally {
        delete globalThis.window;
      }
    },
  );
});

test("SSR aussi honore NEXT_PUBLIC_API_BROWSER_BASE", async () => {
  await withConfig(
    {
      NEXT_PUBLIC_API_BROWSER_BASE: "http://localhost:4000",
      NEXT_PUBLIC_API_URL: "https://api.example.com",
    },
    (mod) => {
      const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
      const prev = globalThis.window;
      delete globalThis.window;
      try {
        assert.equal(mod.apiBaseBrowser(), "http://localhost:4000");
      } finally {
        if (hadWindow) globalThis.window = prev;
      }
    },
  );
});

test("trailing slash strip", async () => {
  await withConfig(
    { NEXT_PUBLIC_API_BROWSER_BASE: "http://localhost:4000/" },
    (mod) => {
      assert.equal(mod.apiBaseBrowser(), "http://localhost:4000");
    },
  );
});

test("participant / Socket sur API_URL absolue (hors RH)", async () => {
  await withConfig(
    {
      NEXT_PUBLIC_API_BROWSER_BASE: "http://localhost:4000",
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
      NEXT_PUBLIC_SOCKET_URL: undefined,
    },
    (mod) => {
      assert.equal(mod.API_URL, "http://localhost:4000");
      assert.equal(mod.SOCKET_URL, "http://localhost:4000");
    },
  );
});

test("adminFetch force credentials include", async () => {
  await withConfig(
    { NEXT_PUBLIC_API_BROWSER_BASE: "http://localhost:4000" },
    async (mod) => {
      let seen;
      const orig = globalThis.fetch;
      globalThis.fetch = async (_input, init) => {
        seen = init;
        return new Response("{}", { status: 200 });
      };
      try {
        await mod.adminFetch("http://localhost:4000/auth/me", { method: "GET" });
        assert.equal(seen?.credentials, "include");
      } finally {
        globalThis.fetch = orig;
      }
    },
  );
});

test("pas de littéral /api/backend hors config / RH", async () => {
  const root = path.join(__dirname, "..");
  /** @type {string[]} */
  const offenders = [];

  function walk(dir, rel = "") {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next") continue;
      const full = path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = statSync(full);
      if (st.isDirectory()) {
        if (r === "app/api/backend" || r.startsWith("app/api/backend/")) continue;
        if (r === "scripts") continue;
        walk(full, r);
        continue;
      }
      if (!/\.(js|jsx|mjs|ts|tsx)$/.test(name)) continue;
      if (r === "lib/config.js" || r === "next.config.mjs") continue;
      if (r.startsWith("app/api/backend/")) continue;
      const text = readFileSync(full, "utf8");
      if (/['"`]\/api\/backend/.test(text)) offenders.push(r);
    }
  }
  walk(root);
  assert.deepEqual(
    offenders,
    [],
    `Hardcode /api/backend : ${offenders.join(", ")}`,
  );
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
console.log(`\n${cases.length} tests api-browser-base OK`);
