# Compte rendu — CORS Vercel Preview (option A)

Branche : `cursor/cors-vercel-preview-allowlist-b0d3`  
Réf. : diagnostic `docs/diagnostic-cors-vercel-preview.md` (Agent Store)

## Modifications

| Fichier | Changement |
| --- | --- |
| `backend/lib/corsOrigins.js` | Allowlist stricte (nouveau) |
| `backend/server.js` | Express + Socket.IO utilisent le même callback |
| `backend/scripts/test-cors-origins.mjs` | Tests autorisé / refusé |
| `backend/package.json` | Script `test:cors-origins` |

## Règles

**Autorisé :** `localhost:3000`, `127.0.0.1:3000`, `CLIENT_URL` (inchangé, ex. www), `https://avote-app.vercel.app`, `https://avote-<id>-remdieuvs-projects.vercel.app`

**Refusé :** autres `*.vercel.app`, HTTP sur hosts Vercel, domaines tiers, apex `avote.app` (sauf si un jour dans `CLIENT_URL`)

`CLIENT_URL` / variables Vercel / Supabase : **non modifiés**.

## Tests

```text
npm run test:cors-origins   → 19 OK
npm run test:poll-patch-guards → OK (non-régression)
node --check server.js → OK
```

## Déploiement

**Pas déployé.** Après validation : deploy Railway API uniquement (pas de merge/prod FE requis pour ce fix). Puis retester la Preview PR #8.
