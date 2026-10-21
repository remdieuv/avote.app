# CR — Formulaires Lead/Concours · Lot L6

**Date :** 2026-10-21  
**Branche :** `cursor/forms-l6-1e88` (base **L5** `cursor/forms-l5-1e88`)  
**Périmètre :** parité Régie ↔ Créer un événement — `FormBuilderPanel`, soft lock, consent L5.  
**Hors scope :** merge, deploy, migrate prod ; pas de refonte Screen / Salle.

Réf. : audit-regie-parite-questions-formulaires.md (store docs).

---

## Livré

| Élément | Chemin |
| --- | --- |
| API live | `POST /events/:id/polls/live` — `formCreateDataForPollType(…, client)` |
| Ajout Régie | `AjouterQuestionLiveModal` + `FormBuilderPanel` (défauts D8 + modèles / consent) |
| Edit payload | `buildRegiePollEditPayload` — `formDefinition` / `formTemplateKey` + validation L3 |
| Edit UI | `event/[eventId]/page.jsx` — builder + `usedFieldIds` depuis `/leads` |
| Helpers | `frontend/lib/forms/formUsage.js` — `regieFormPollKind`, `collectUsedFormIdsFromLeadRows` |
| Tests | `npm run test:forms-l6` |

## Comportement

- Lead/Concours en Régie : mêmes modèles / max 5 / consent commercial (composant L3–L5 réutilisé).
- Soft lock D4 : champs utilisés (leads) → suppression / type bloqués UI + 409 API.
- Votes / options : guards Régie inchangés ; form soft-editable si événement non verrouillé.
- Screen / Salle : non touchés ; pas d’emit PII.

## Tests

```bash
cd frontend && npm run test:forms-l6   # OK
npm run test:regie-poll-edit-payload && npm run test:regie-poll-edit-guards  # OK
npm run test:forms-l5 && npm run test:forms-l3  # OK
```

## Blockers

- Empilé sur L1–L5 (#15→#20) non mergés ; migrate Railway toujours bloquée.
- Ne pas merger/deploy L6 avant L1 (+ migrate) puis la chaîne.
