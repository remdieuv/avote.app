/**
 * Persistance options PATCH — 3→4, rename, retrait (Prisma).
 * Exécution : node backend/scripts/test-replace-poll-options.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { replacePollOptions } = require("../lib/replacePollOptions.js");

const here = dirname(fileURLToPath(import.meta.url));
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

await test("3 → 4 réponses persistées puis relecture", async () => {
  const user = await prisma.user.findFirst({ select: { id: true } });
  assert.ok(user, "user requis");
  const ev = await prisma.event.create({
    data: {
      title: "test-replace-opts",
      slug: `test-replace-opts-${Date.now()}`,
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
          question: "Vous découvrez Avote aujourd'hui ?",
          type: "SINGLE_CHOICE",
          status: "CLOSED",
          order: 0,
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
    include: {
      polls: { include: { options: { orderBy: { order: "asc" } } } },
    },
  });
  const pollId = ev.polls[0].id;
  assert.equal(ev.polls[0].options.length, 3);

  const labels4 = [
    "Oui, première fois",
    "J'ai déjà entendu parler",
    "Je connais bien",
    "Je ne sais pas",
  ];
  await prisma.$transaction(async (tx) =>
    replacePollOptions(tx, { pollId, labels: labels4, isQuiz: false }),
  );
  const afterAdd = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
  });
  assert.deepEqual(
    afterAdd.map((o) => o.label),
    labels4,
  );

  const renamed = ["Oui", "Déjà entendu", "Je connais bien"];
  await prisma.$transaction(async (tx) =>
    replacePollOptions(tx, { pollId, labels: renamed, isQuiz: false }),
  );
  const afterRename = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
  });
  assert.deepEqual(
    afterRename.map((o) => o.label),
    renamed,
  );

  const removed = ["Oui", "Je connais bien"];
  await prisma.$transaction(async (tx) =>
    replacePollOptions(tx, { pollId, labels: removed, isQuiz: false }),
  );
  const afterRemove = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
  });
  assert.deepEqual(
    afterRemove.map((o) => o.label),
    removed,
  );

  await prisma.event.delete({ where: { id: ev.id } });
});

await test("server.js appelle replacePollOptions (pas createMany)", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  const patchIdx = src.indexOf('app.patch("/polls/:pollId"');
  assert.ok(patchIdx > 0);
  const slice = src.slice(patchIdx, patchIdx + 6500);
  assert.ok(slice.includes("replacePollOptions"));
  assert.equal(slice.includes("createMany"), false);
});

await prisma.$disconnect();

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — replace poll options persistence");
