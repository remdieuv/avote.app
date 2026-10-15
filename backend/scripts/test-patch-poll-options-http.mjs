/**
 * E2E HTTP : PATCH /polls/:id 3→4 options + relecture + rename + retrait.
 * Exécution : node backend/scripts/test-patch-poll-options-http.mjs
 *
 * Prérequis : backend sur PORT (défaut 4000), user seed@avote.local.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const API = (process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
const EMAIL = process.env.SEED_OWNER_EMAIL || "seed@avote.local";
const PASSWORD =
  process.env.SEED_OWNER_PASSWORD ||
  process.env.DEV_LEGACY_PASSWORD ||
  "seedpassword";

const prisma = new PrismaClient();
let failed = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

/**
 * @param {string} path
 * @param {{ method?: string; body?: unknown; cookie?: string }} [opts]
 */
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  const body = await res.json().catch(() => ({}));
  return { res, body, setCookie };
}

function cookieFromSetCookie(setCookie) {
  return setCookie.map((c) => String(c).split(";")[0]).join("; ");
}

await test("HTTP PATCH options : 3→4, rename, retrait (vrai serveur + DB)", async () => {
  const health = await fetch(`${API}/auth/me`).catch(() => null);
  if (!health) {
    throw new Error(
      `Backend injoignable sur ${API}. Redémarrez : cd backend && node server.js`,
    );
  }

  let login = await api("/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  if (!login.res.ok) {
    login = await api("/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: "devpassword" },
    });
  }
  if (!login.res.ok) {
    login = await api("/auth/login", {
      method: "POST",
      body: { email: EMAIL, password: "seedpassword" },
    });
  }
  assert.equal(
    login.res.ok,
    true,
    `login failed: ${JSON.stringify(login.body)} — vérifiez SEED_OWNER_PASSWORD`,
  );
  const cookie = cookieFromSetCookie(login.setCookie);
  const token =
    typeof login.body?.token === "string" ? login.body.token : "";
  assert.ok(cookie || token, "cookie/token session manquant");

  const user = await prisma.user.findFirst({
    where: { email: EMAIL },
    select: { id: true },
  });
  assert.ok(user);

  const ev = await prisma.event.create({
    data: {
      title: "e2e-patch-opts",
      slug: `e2e-patch-opts-${Date.now()}`,
      userId: user.id,
      isLiveConsumed: false,
      isLocked: false,
      status: "DRAFT",
      liveState: "WAITING",
      voteState: "CLOSED",
      displayState: "WAITING",
      polls: {
        create: {
          title: "Q2",
          question: "Vous découvrez Avote aujourd'hui ?",
          type: "SINGLE_CHOICE",
          status: "CLOSED",
          order: 1,
          options: {
            create: [
              { label: "Oui, première fois", order: 0 },
              { label: "J'ai déjà entendu parler", order: 1 },
              { label: "Je connais bien", order: 2 },
            ],
          },
        },
      },
    },
    include: { polls: true },
  });
  const pollId = ev.polls[0].id;

  const labels4 = [
    "Oui, première fois",
    "J'ai déjà entendu parler",
    "Je connais bien",
    "Je ne sais pas",
  ];
  const auth = { cookie, token };
  const patch4 = await api(`/polls/${pollId}`, {
    method: "PATCH",
    ...auth,
    body: {
      question: "Vous découvrez Avote aujourd'hui ?",
      options: labels4,
    },
  });
  assert.equal(
    patch4.res.status,
    200,
    `PATCH 3→4 status ${patch4.res.status}: ${JSON.stringify(patch4.body)}`,
  );
  assert.ok(Array.isArray(patch4.body.options));
  assert.equal(patch4.body.options.length, 4);
  assert.deepEqual(
    patch4.body.options.map((o) => o.label),
    labels4,
  );

  const db4 = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
  });
  assert.equal(db4.length, 4);
  assert.deepEqual(
    db4.map((o) => o.label),
    labels4,
  );

  const renamed = ["Oui", "Déjà entendu", "Je connais bien", "Je ne sais pas"];
  const patchRename = await api(`/polls/${pollId}`, {
    method: "PATCH",
    ...auth,
    body: { question: "Vous découvrez Avote aujourd'hui ?", options: renamed },
  });
  assert.equal(patchRename.res.status, 200);
  assert.deepEqual(
    patchRename.body.options.map((o) => o.label),
    renamed,
  );

  const removed = ["Oui", "Je connais bien"];
  const patchRemove = await api(`/polls/${pollId}`, {
    method: "PATCH",
    ...auth,
    body: { question: "Vous découvrez Avote aujourd'hui ?", options: removed },
  });
  assert.equal(patchRemove.res.status, 200);
  assert.deepEqual(
    patchRemove.body.options.map((o) => o.label),
    removed,
  );
  const dbEnd = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
  });
  assert.deepEqual(
    dbEnd.map((o) => o.label),
    removed,
  );

  await prisma.event.delete({ where: { id: ev.id } });
});

await test("applyPollOptionsPatch unit : relecture DB", async () => {
  const {
    applyPollOptionsPatch,
    resolvePatchOptionsRequest,
  } = require("../lib/applyPollOptionsPatch.js");
  const resolved = resolvePatchOptionsRequest(
    { options: ["A", "B", "C", "D"] },
    "SINGLE_CHOICE",
  );
  assert.equal(resolved.requested, true);
  assert.equal(resolved.invalidShape, false);

  const user = await prisma.user.findFirst({ select: { id: true } });
  const ev = await prisma.event.create({
    data: {
      title: "unit-apply-opts",
      slug: `unit-apply-opts-${Date.now()}`,
      userId: user.id,
      isLiveConsumed: false,
      isLocked: false,
      status: "DRAFT",
      liveState: "WAITING",
      voteState: "CLOSED",
      displayState: "WAITING",
      polls: {
        create: {
          title: "Q",
          question: "Q?",
          type: "MULTIPLE_CHOICE",
          status: "CLOSED",
          order: 0,
          options: {
            create: [
              { label: "A", order: 0 },
              { label: "B", order: 1 },
              { label: "C", order: 2 },
            ],
          },
        },
      },
    },
    include: { polls: true },
  });
  const pollId = ev.polls[0].id;
  const applied = await applyPollOptionsPatch(prisma, {
    pollId,
    labelsRaw: ["A", "B", "C", "D"],
    isQuiz: false,
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.options.length, 4);
  await prisma.event.delete({ where: { id: ev.id } });
});

await prisma.$disconnect();

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — patch poll options HTTP e2e");
