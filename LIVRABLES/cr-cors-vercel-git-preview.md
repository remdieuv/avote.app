# CR — CORS Previews Vercel `avote-app-git-*`

## Summary
Étend l’allowlist CORS Railway (PR #9) pour autoriser les aliases Preview **git branch** `avote-app-git-<branche>-remdieuvs-projects.vercel.app`, sans ouvrir `*.vercel.app` ni modifier `CLIENT_URL`.

## Changements
- `backend/lib/corsOrigins.js` — regex `AVOTE_VERCEL_GIT_PREVIEW_HOST_RE`
- `backend/scripts/test-cors-origins.mjs` — cas allow/deny git Preview
- Express + Socket.IO : déjà branchés sur `corsOriginCallback` (inchangé)

## Tests
- `npm run test:cors-origins` — OK

## Hors scope
Aucun merge `main`, aucun deploy Railway, aucun changement FE / env / Supabase.
À déployer Railway **après validation**.
