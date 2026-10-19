# CR — Cohérence desktop globale AVOTE

## Summary
Harmonise les largeurs desktop : **site public 1200**, **toutes les pages admin shellées à 1600** (y compris Créer et Compte), header admin aligné, régie / participant / diffusion inchangés. Base empilée sur PR #8 + #10.

## Changements
- Tokens `adminLayout.js` (cadre unique 1600) et `marketingLayout.js` (1200)
- Shells `AdminContentShell`, `MarketingContentShell` (plus de rail 1200)
- Marketing : `/`, `/pricing`, `/success`, rapport, landings `/e` + démo → 1200 ; `LandingHeader` aligné
- Admin : création + compte en **1600** (grilles élargies) ; leads événement ; hub customization ; admin interne
- Inchangés : régie plein écran, join/poll/screen/overlay, UX Salle live (#8), dual-pane (#10)

## Tests
- `npm run test:admin-widths`
- `npm run test:marketing-widths`
- `npm run test:regie-desktop`
- `next build`

## Hors scope
Aucun merge main / déploiement production / Railway / Supabase.
