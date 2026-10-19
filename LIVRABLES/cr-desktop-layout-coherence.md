# CR — Cohérence desktop globale AVOTE

## Summary
Harmonise les largeurs desktop : **site public 1200**, **admin cadre/header 1600**, formulaires en **rail 1200** à l’intérieur du cadre (sans décalage header), régie / participant / diffusion inchangés. Base empilée sur PR #8 + #10.

## Changements
- Tokens `adminLayout.js` (cadre 1600 + `adminFormRailStyle` 1200) et `marketingLayout.js` (1200)
- Shells `AdminContentShell` / `AdminFormRail`, `MarketingContentShell`
- Marketing : `/`, `/pricing`, `/success`, rapport partagé, landings `/e` + démo → 1200 ; `LandingHeader` aligné
- Admin : création + compte en cadre 1600 + rail 1200 ; leads événement (header + padding) ; hub customization 1600 ; admin interne 1600
- Inchangés : régie plein écran, join/poll/screen/overlay, UX Salle live (#8), dual-pane 1600 (#10)

## Tests
- `npm run test:admin-widths`
- `npm run test:marketing-widths`
- `npm run test:regie-desktop`
- `next build`

## Hors scope
Aucun merge main / déploiement production / Railway / Supabase.
