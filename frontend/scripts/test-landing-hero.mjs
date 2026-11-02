/**
 * Hero landing — copy + catégories = features réellement créables.
 * Exécution : node frontend/scripts/test-landing-hero.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HERO_FEATURE_CATEGORIES,
  HERO_SUPPORT_TEXT,
  HERO_TITLE,
  buildHeroSupportText,
} from "../lib/landingHero.js";
import { QUESTION_TYPE_META } from "../lib/createEventForm.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

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

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const CREATE_TYPES = new Set(QUESTION_TYPE_META.map((m) => m.type));

test("Titre Hero exact", () => {
  assert.equal(HERO_TITLE, "Faites participer votre audience en direct.");
});

test("Quatre catégories opérationnelles uniquement", () => {
  assert.equal(HERO_FEATURE_CATEGORIES.length, 4);
  const ids = HERO_FEATURE_CATEGORIES.map((c) => c.id);
  assert.deepEqual(ids, ["poll", "quiz", "contest", "lead"]);
  // Alignement code métier création d’événement
  assert.ok(CREATE_TYPES.has("SINGLE_CHOICE") || CREATE_TYPES.has("MULTIPLE_CHOICE"));
  assert.ok(CREATE_TYPES.has("QUIZ"));
  assert.ok(CREATE_TYPES.has("CONTEST_ENTRY"));
  assert.ok(CREATE_TYPES.has("LEAD"));
});

test("Texte support dérivé + QR", () => {
  assert.match(HERO_SUPPORT_TEXT, /Sondages/i);
  assert.match(HERO_SUPPORT_TEXT, /quiz/i);
  assert.match(HERO_SUPPORT_TEXT, /concours/i);
  assert.match(HERO_SUPPORT_TEXT, /collecte de contacts/i);
  assert.match(HERO_SUPPORT_TEXT, /QR code/i);
  assert.equal(
    HERO_SUPPORT_TEXT,
    "Sondages, quiz, concours, collecte de contacts… Un QR code suffit pour lancer l’interaction en direct.",
  );
});

test("buildHeroSupportText s’adapte si une feature absente", () => {
  const three = HERO_FEATURE_CATEGORIES.filter((c) => c.id !== "quiz");
  const text = buildHeroSupportText(three);
  assert.doesNotMatch(text, /quiz/i);
  assert.match(text, /Sondages/i);
  assert.match(text, /QR code/i);
});

test("page.js branche le Hero sur landingHero + bandeau", () => {
  const src = read("app/page.js");
  assert.match(src, /from ["']@\/lib\/landingHero["']/);
  assert.match(src, /HERO_TITLE/);
  assert.match(src, /HERO_SUPPORT_TEXT/);
  assert.match(src, /HERO_FEATURE_CATEGORIES/);
  assert.match(src, /hero-feature-strip/);
  assert.match(src, /HeroFeatureStrip/);
  assert.match(src, /href="\/join\/demo"/);
  assert.match(src, /href="\/admin"/);
  assert.doesNotMatch(
    src,
    /Faites voter\s*\n\s*votre/,
    "ancien titre « Faites voter » retiré",
  );
});

test("CTAs Hero inchangés (pas de feature métier ajoutée)", () => {
  const src = read("app/page.js");
  const heroSlice = src.slice(
    src.indexOf('id="hero"'),
    src.indexOf("landing-hero-visual"),
  );
  assert.match(heroSlice, /Tester en live/);
  assert.match(heroSlice, /Créer un événement gratuit/);
  assert.doesNotMatch(heroSlice, /pricing|stripe|abonnement/i);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing hero tests passed");
