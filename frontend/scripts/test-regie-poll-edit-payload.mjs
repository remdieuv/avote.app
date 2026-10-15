/**
 * Payload Modifier — scénario 3→4 réponses + rename + retrait.
 * Exécution : node frontend/scripts/test-regie-poll-edit-payload.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPollEditOptionsPersisted,
  buildRegiePollEditPayload,
} from "../lib/regiePollEditPayload.js";

const here = dirname(fileURLToPath(import.meta.url));
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

const basePoll = {
  id: "p1",
  type: "SINGLE_CHOICE",
  leadEnabled: false,
  voteCount: 0,
  quizRevealed: false,
  options: [
    { id: "a", label: "Oui, première fois", order: 0 },
    { id: "b", label: "J'ai déjà entendu parler", order: 1 },
    { id: "c", label: "Je connais bien", order: 2 },
  ],
};

test("3 réponses → ajout 4e → payload options à 4", () => {
  const built = buildRegiePollEditPayload({
    poll: basePoll,
    isLocked: false,
    isLiveConsumed: false,
    question: "Vous découvrez Avote aujourd'hui ?",
    optionLabels: [
      "Oui, première fois",
      "J'ai déjà entendu parler",
      "Je connais bien",
      "Je ne sais pas",
    ],
  });
  assert.equal(built.ok, true);
  assert.ok(Array.isArray(built.payload?.options));
  assert.deepEqual(built.payload.options, [
    "Oui, première fois",
    "J'ai déjà entendu parler",
    "Je connais bien",
    "Je ne sais pas",
  ]);
});

test("Ligne vide refusée (pas de drop silencieux)", () => {
  const built = buildRegiePollEditPayload({
    poll: basePoll,
    isLocked: false,
    isLiveConsumed: false,
    question: "Vous découvrez Avote aujourd'hui ?",
    optionLabels: [
      "Oui, première fois",
      "J'ai déjà entendu parler",
      "Je connais bien",
      "  ",
    ],
  });
  assert.equal(built.ok, false);
  assert.match(String(built.error), /vide/i);
});

test("Modification libellé + retrait → 2 options", () => {
  const built = buildRegiePollEditPayload({
    poll: basePoll,
    isLocked: false,
    isLiveConsumed: false,
    question: "Vous découvrez Avote aujourd'hui ?",
    optionLabels: ["Oui", "Je connais très bien"],
  });
  assert.equal(built.ok, true);
  assert.deepEqual(built.payload.options, ["Oui", "Je connais très bien"]);
});

test("TEST + votes : options absentes du payload", () => {
  const built = buildRegiePollEditPayload({
    poll: { ...basePoll, voteCount: 2 },
    isLocked: false,
    isLiveConsumed: false,
    question: "Vous découvrez Avote aujourd'hui ?",
    optionLabels: [
      "Oui, première fois",
      "J'ai déjà entendu parler",
      "Je connais bien",
      "Je ne sais pas",
    ],
  });
  assert.equal(built.ok, true);
  assert.equal(built.payload.options, undefined);
  assert.equal(built.guard.canEditOptions, false);
});

test("assertPollEditOptionsPersisted : relecture 4 labels", () => {
  const sent = [
    "Oui, première fois",
    "J'ai déjà entendu parler",
    "Je connais bien",
    "Je ne sais pas",
  ];
  const ok = assertPollEditOptionsPersisted(
    {
      options: sent.map((label, order) => ({ id: `n${order}`, label, order })),
    },
    sent,
  );
  assert.equal(ok.ok, true);
  const bad = assertPollEditOptionsPersisted(
    {
      options: sent.slice(0, 3).map((label, order) => ({
        id: `n${order}`,
        label,
        order,
      })),
    },
    sent,
  );
  assert.equal(bad.ok, false);
});

test("page.jsx utilise buildRegiePollEditPayload + assert persisté", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("buildRegiePollEditPayload"));
  assert.ok(src.includes("assertPollEditOptionsPersisted"));
  assert.ok(src.includes("editModalError"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie poll edit payload 3→4");
