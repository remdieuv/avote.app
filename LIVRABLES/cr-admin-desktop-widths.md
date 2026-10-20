# CR — Largeurs desktop admin (~1600 px)

## Summary
Élargit le shell **workspace** des pages organisateur dual-pane / données à **1600 px**, aligne le header admin, sans toucher à la régie ni aux formulaires simples.

## Changements
- Token partagé `frontend/lib/adminLayout.js` (`workspace` 1600 / `standard` 1200 / `formNarrow` 640)
- Header admin → 1600 (`AdminAccountBar` + prop `contentMaxWidth` sur `AppHeaderShell`)
- Pages élargies : Salle live / Landing (customization, base PR #8), Mes événements, Leads ×2, Analytics ×2
- Inchangés : création `/admin` (1200), compte (1200 + form MDP 640), régie (plein viewport)
- Mobile / tablette : breakpoints inchangés

## Tests
- `npm run test:admin-widths` — OK
- `npm run test:regie-desktop` — OK
- `eslint` fichiers touchés — warnings préexistants (`<img>`, setState-in-effect header)
- `next build` — à confirmer sur CI / local

## Base
Branche empilée sur `cursor/ux-salle-live-simplify-b0d3` (PR #8) pour compatibilité Salle live.

## Hors scope
Aucun merge main / déploiement production.
