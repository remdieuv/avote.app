/**
 * Migration User.role — contrats fichier + non-régression schema.
 * Exécution : node backend/scripts/test-user-role-migration.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migDir = join(here, "../prisma/migrations/20261120100000_add_user_role");
const migSql = join(migDir, "migration.sql");
const schema = join(here, "../prisma/schema.prisma");
const ownershipMig = join(
  here,
  "../prisma/migrations/20260204120000_add_user_and_event_ownership/migration.sql",
);
const migrationsRoot = join(here, "../prisma/migrations");

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

test("Migration 20261120100000_add_user_role présente", () => {
  assert.equal(existsSync(migSql), true);
});

test("SQL exact : ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT USER", () => {
  const sql = readFileSync(migSql, "utf8");
  assert.match(sql, /ALTER TABLE\s+"User"/);
  assert.match(
    sql,
    /ADD COLUMN IF NOT EXISTS\s+"role"\s+TEXT\s+NOT NULL\s+DEFAULT\s+'USER'/,
  );
  assert.doesNotMatch(sql, /DROP|UPDATE\s+"User"|DELETE\s+FROM/i);
});

test("Schema Prisma inchangé : role String @default(USER)", () => {
  const s = readFileSync(schema, "utf8");
  assert.match(s, /role\s+String\s+@default\("USER"\)/);
});

test("Migration ownership initiale n’a pas role (historique)", () => {
  const sql = readFileSync(ownershipMig, "utf8");
  assert.match(sql, /CREATE TABLE "User"/);
  assert.doesNotMatch(sql, /"role"/);
});

test("Aucune autre migration historique n’ajoute role (pas de doublon)", () => {
  const dirs = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => n !== "20261120100000_add_user_role");
  for (const dir of dirs) {
    const p = join(migrationsRoot, dir, "migration.sql");
    if (!existsSync(p)) continue;
    const sql = readFileSync(p, "utf8");
    assert.doesNotMatch(
      sql,
      /ADD COLUMN.*"role"/i,
      `doublon potentiel dans ${dir}`,
    );
  }
});

if (failed) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests user-role-migration OK");
