# Harness de charge AVOTE (étape 3)

Mesure progressive jusqu’à **1 000** participants synthétiques (HTTP vote + Socket.IO).  
**Aucun run sur la production** — domaines AVOTE prod bloqués dans le code.

## Périmètre

| Inclus | Exclu |
|---|---|
| Paliers 10 / 100 / 250 / 500 / 1000 | Charge contre `www.avote.app` / Railway prod |
| Latences vote p50 / p95 / p99 | Contournement rate-limit |
| Erreurs HTTP & Socket.IO | Paiement Stripe réel |
| Connexions simultanées (peak) | Modification des features AVOTE |
| Cohérence des votes réussis | Merge/deploy auto |
| Saturation (`LIMIT_REACHED`) | |
| IP partagée (1 IP runner) | |
| Top-up **simulé** (`planCapacityTopUp`) | |

## Prérequis staging isolé

1. Environnement **non prod** (Railway staging ou API locale) + DB jetable.
2. Événement dédié charge en **mode réel**, vote **ouvert**, une option connue.
3. `participantsLimit` ≥ palier (ou pack start-real adapté).
4. Variables :

```bash
export LOAD_API_URL="https://VOTRE-STAGING.example.com"   # jamais prod
export LOAD_EVENT_ID="…"
export LOAD_POLL_ID="…"
export LOAD_OPTION_ID="…"
export LOAD_PARTICIPANTS_LIMIT="1000"   # optionnel, sonde saturation
export LOAD_ALLOW_RUN=1
export LOAD_CONFIRM_ISOLATED=1
```

5. Dépendance client socket (dev) :

```bash
cd backend && npm install
# socket.io-client est en devDependency
```

## Commandes

```bash
# Plan (hors réseau)
node scripts/load-harness.mjs plan --tier 100

# Garde prod
node scripts/load-harness.mjs guard --api-url "$LOAD_API_URL"

# Tests unitaires harness (CI / PR)
node scripts/test-load-harness.mjs

# Run palier (staging uniquement)
node scripts/load-harness.mjs run --tier 10 \
  --api-url "$LOAD_API_URL" \
  --event-id "$LOAD_EVENT_ID" \
  --poll-id "$LOAD_POLL_ID" \
  --option-id "$LOAD_OPTION_ID" \
  --participants-limit "$LOAD_PARTICIPANTS_LIMIT" \
  --confirm-isolated-staging
```

Arrêt auto si **erreurs > 1 %** ou **p95 vote > 2 s**, ou timeout palier (5 min).

Pacing votes ≈ **350/s** (&lt; plafond IP 400/s) — le harness **ne désactive pas** les limiteurs.

## Progression recommandée

1. Valider staging + `guard` OK  
2. `run --tier 10`  
3. 100 → 250 → 500 → 1000 (stop si abort)  
4. Entre paliers : nouvel event ou reset votes jetables  

## Top-up

- **Simulé** (toujours dans le rapport run) : `topupSimulated` via `planCapacityTopUp`, `stripeUsed: false`.  
- **Live staging** : utiliser Stripe **test** / UI régie sur l’événement jetable, puis relancer un palier — hors Stripe live.

## Résultats attendus (exemple)

```json
{
  "ok": true,
  "report": {
    "latency": { "p50": 80, "p95": 250, "p99": 400 },
    "combinedErrorRate": 0,
    "voteOk": 100,
    "peakConnections": 100,
    "pollUpdatedSeen": 12
  },
  "coherence": { "ok": true },
  "topupSimulated": { "ok": true, "nextLimit": 150, "stripeUsed": false }
}
```

Ne pas conclure « prod = 1000 » sans staging vert sur tous les paliers + marge.
