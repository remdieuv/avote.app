# CR — Formulaires Lead/Concours · Lot L2

**Date :** 2026-10-21  
**Branche :** `cursor/forms-l2-1e88` (base **L1** `cursor/forms-l1-1e88` @ `369b95c`)  
**Périmètre :** renderer participant + aperçu création ; validation D2/D3/D5/D10 ; `contact_legacy` fallback.  
**Hors scope :** builder admin (L3), Régie/Screen/Salle (D11), merge, deploy, migrate prod.

Réf. : [conception-formulaires-lead-concours.md](./conception-formulaires-lead-concours.md) §11 L2.

---

## Livré

| Élément | Chemin |
| --- | --- |
| `FormRenderer` | `frontend/components/forms/FormRenderer.jsx` |
| Resolve def / drafts answers | `frontend/lib/forms/resolveParticipantForm.js` |
| Participant | `PollExperience.jsx` — form dynamique, submit `answers` + dual-write legacy, draft session v2 |
| Aperçu admin | `EventLivePreview.jsx` — champs selon preset D8 (Lead=`contact`, Concours=`contest`) |
| Tests | `npm run test:forms-l2` |

## Comportement

- Définition = `poll.formDefinition` sinon `formTemplateKey` sinon **`contact_legacy`**.
- Lead : formulaire facultatif après déclencheur (D3) ; abandon OK.
- Concours : validation prénom + email **OU** téléphone (D2) quand définition `contest`.
- Titres D12 ; info RGPD courte (D7 copy) ; consent jamais précoché si champ présent.
- Max 5 champs affichés (D10).

## Tests

```bash
cd frontend && npm run test:forms-l2   # OK
npm run test:forms-l0 && npm run test:create-event-form && npm run test:lead-contest  # OK
cd backend && npm run test:forms-l1    # OK (régression L1)
```

## Blockers / dépendances

- **L1 non mergé / migrate prod non faite** (Railway panne) : le FE L2 envoie `answers` ; l’API L1 dual-write est sur la branche L1. Déployer L2 **sans** L1 API+schema → risque d’échec soumission. PR L2 empilée sur L1 — merge/deploy dans l’ordre L1 puis L2.
- Pas de QA navigateur (méthode AVOTE) — smoke local utilisateur recommandé après merge.

## Suite

Après go : merge L1 (+ migrate) → merge L2 → **L3** builder admin.
