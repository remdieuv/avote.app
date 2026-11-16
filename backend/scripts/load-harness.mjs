#!/usr/bin/env node
/**
 * Harness de charge AVOTE (HTTP + Socket.IO).
 *
 * Usage :
 *   node scripts/load-harness.mjs plan --tier 100
 *   node scripts/load-harness.mjs guard --api-url https://staging.example.com
 *   node scripts/load-harness.mjs run --tier 10 --api-url … --event-id … --poll-id … --option-id … \
 *        --confirm-isolated-staging
 *
 * Run réseau exige LOAD_ALLOW_RUN=1 + --confirm-isolated-staging.
 * Les domaines de production AVOTE sont toujours refusés.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const harness = require("../lib/loadHarness");

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = { _: [] };
  /** @type {string[]} */
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--confirm-isolated-staging") {
      out.confirmIsolated = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
      continue;
    }
    positionals.push(a);
  }
  out._ = positionals;
  return out;
}

function printHelp() {
  console.log(`AVOTE load harness

Commands:
  plan     Affiche le plan d'un palier (pas de réseau)
  guard    Vérifie qu'une URL n'est pas de la production
  run      Exécute un palier (staging isolé uniquement)

Options run:
  --tier 10|100|250|500|1000
  --api-url URL
  --event-id ID
  --poll-id ID
  --option-id ID
  --participants-limit N   (optionnel, pour sonde saturation)
  --confirm-isolated-staging
  Env: LOAD_ALLOW_RUN=1  LOAD_CONFIRM_ISOLATED=1  LOAD_API_URL=…

Ne jamais pointer la production. Voir docs/LOAD_HARNESS.md.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = String(args._[0] || "help");

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  if (cmd === "plan") {
    const tier = args.tier || args._[1] || "10";
    const plan = harness.buildTierPlan({
      tier,
      participantsLimit: args["participants-limit"],
      sharedIp: true,
    });
    console.log(JSON.stringify(plan, null, 2));
    if (!plan.ok) process.exitCode = 1;
    return;
  }

  if (cmd === "guard") {
    const apiUrl = args["api-url"] || process.env.LOAD_API_URL || "";
    const r = harness.assertLoadTargetAllowed(apiUrl);
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exitCode = 1;
    return;
  }

  if (cmd === "run") {
    const apiUrl =
      args["api-url"] || process.env.LOAD_API_URL || "";
    const result = await harness.runLoadTier({
      apiUrl,
      allowRun: process.env.LOAD_ALLOW_RUN,
      confirmIsolated:
        args.confirmIsolated || process.env.LOAD_CONFIRM_ISOLATED,
      tier: args.tier || "10",
      eventId: args["event-id"] || process.env.LOAD_EVENT_ID,
      pollId: args["poll-id"] || process.env.LOAD_POLL_ID,
      optionId: args["option-id"] || process.env.LOAD_OPTION_ID,
      participantsLimit:
        args["participants-limit"] || process.env.LOAD_PARTICIPANTS_LIMIT,
      maxVotesPerSec: args["max-votes-per-sec"],
      tierTimeoutMs: args["tier-timeout-ms"],
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  console.error(`Commande inconnue : ${cmd}`);
  printHelp();
  process.exitCode = 1;
}

const isDirect =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirect) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
