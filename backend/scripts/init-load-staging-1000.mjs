#!/usr/bin/env node
/**
 * One-shot : crée l’événement charge load-1000 sur Railway load-staging.
 *
 * Usage (dans le conteneur API load-staging, après deploy de cette branche) :
 *   LOAD_STAGING_INIT=1 node scripts/init-load-staging-1000.mjs --confirm-load-staging
 *
 * Gardes :
 *   - LOAD_STAGING_INIT=1 + --confirm-load-staging
 *   - RAILWAY_ENVIRONMENT_NAME=load-staging si défini
 *   - commentaire DB = avote-railway-load-staging
 *   - refus collisions id/email/slug
 *
 * Ne modifie PAS le démarrage `node server.js`. Pas de route HTTP.
 * Retrait prévu : supprimer ce fichier + lib/loadStagingInit.js après les tests.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { prisma } = require("../lib/prisma");
const { runLoadStaging1000Init } = require("../lib/loadStagingInit");

function parseArgs(argv) {
  /** @type {Record<string, boolean>} */
  const out = { confirmLoadStaging: false };
  for (const a of argv) {
    if (a === "--confirm-load-staging") out.confirmLoadStaging = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runLoadStaging1000Init(prisma, {
    allowInit: process.env.LOAD_STAGING_INIT,
    confirmLoadStaging:
      args.confirmLoadStaging || process.env.LOAD_STAGING_CONFIRM,
    railwayEnvironmentName:
      process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

const isDirect =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirect) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore */
      }
    });
}
