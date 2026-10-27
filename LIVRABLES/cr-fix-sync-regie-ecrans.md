---
cursor:
  subagentId: "bc-ca8fccc3-a2f4-5ae2-80dc-6272af139507"
---

# CR — Fix sync Régie / Screen (C1–C3)

**Date :** 2026-10-27  
**Base :** `main` @ `c63c407`  
**Branche :** `cursor/fix-sync-regie-ecrans-9507`  
**Audit :** [audit-sync-regie-ecrans-complet.md](./audit-sync-regie-ecrans-complet.md)  
**Hors scope :** Overlay OBS (A4) · merge · deploy

## Corrections

| Lot | Anomalie | Changement |
| --- | --- | --- |
| **C1/A1** | Post-Fermer → Screen Waiting QR | `ScreenProjection` : `ds===waiting` **seulement si** `ux !== CLOSED` ; fall-through → `ScreenQuestion` CLOSED |
| **C2/A2** | « PROCHAINE… » sur dernière Q | `isWaitingBetweenQuestions` : `current > 1 && current < total` ; CLOSED dernière + event actif → `VOTE TERMINÉ — EN ATTENTE DE L'ORGANISATEUR` |
| **C3/A3** | Régie « En attente » + « Collecte fermée » | `getRegieLiveBannerLabel` : attente d’ouverture / vote ouvert / vote\|collecte fermé(e) ; label « À l’écran » post-Fermer ≠ QR |

**Principe conservé :** fermeture question ≠ fin événement (`FINISHED` inchangé).

## Fichiers

- `frontend/components/ScreenProjection.jsx`, `ScreenQuestion.jsx`
- `frontend/lib/liveStateUx.js`, `diffusionUx.js`
- `frontend/lib/regieDesktopLayout.js`, `regieProjectionLabels.js`
- `frontend/app/admin/event/[eventId]/page.jsx`
- Tests : `test-diffusion-ux`, `test-live-ux-state`, `test-regie-desktop-layout`, `test-regie-projection-labels`

## Tests auto (OK)

```text
node scripts/test-live-ux-state.mjs
node scripts/test-diffusion-ux.mjs
node scripts/test-regie-desktop-layout.mjs
node scripts/test-regie-projection-labels.mjs
node scripts/test-lead-contest-live-flow.mjs
node scripts/test-participant-live-flow.mjs
node scripts/test-lot5-qa-regressions.mjs
node scripts/test-screen-b-follow-mode.mjs
```

Couverture : 1Q + multi ; 1ʳᵉ/inter/dernière ; Lead/Concours/sondage ; G13 CLOSED ; PRÉPARÉ ≠ CLOSED ; Screen B ; participant.

## QA locale utilisateur

1. Lead 1/1 → Fermer → Screen **CLOSED** ≠ « bientôt commencer » ; Terminer → MERCI.  
2. 2Q (sondage→Lead) → Fermer Q2 → **pas** « PROCHAINE… » ; bandeau « Collecte fermée » ; label organisateur.  
3. Sondage autoReveal OFF → Fermer → CLOSED → Afficher → RESULTS.  
4. Suivante milieu → Waiting « PROCHAINE… » OK ; dernière PRÉPARÉ → pas « PROCHAINE… ».  
5. Screen B sync = A.
