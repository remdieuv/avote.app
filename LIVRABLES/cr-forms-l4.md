# CR — Formulaires Lead/Concours · Lot L4

**Date :** 2026-10-21  
**Branche :** `cursor/forms-l4-1e88` (base **L3** `cursor/forms-l3-1e88`)  
**PR :** https://github.com/remdieuv/avote.app/pull/19 (draft)  
**Périmètre :** soft lock D4 ; Mes leads Détail ; CSV 1 col/champ (D6/D9) ; historique `contact_legacy`.  
**Hors scope :** Régie / Screen / Salle live, L5, merge, deploy, migrate prod.

Réf. : [conception-formulaires-lead-concours.md](./conception-formulaires-lead-concours.md) §11 L4 + D4/D6/D9.

---

## Livré

| Élément | Chemin |
| --- | --- |
| Soft lock API | `backend/lib/forms/formCapture.js` — `evaluateFormDefinitionSoftLock` ; `PATCH /polls/:id` + `formDefinition` |
| Leads API | `GET /me/leads`, `/events/:id/leads` — `formDefinition`, `answersDisplay` (labels) |
| CSV helpers | `frontend/lib/forms/leadsCrm.js` — `buildLeadsCsv` (union champs, préfixe O4) |
| Détail UI | `frontend/components/admin/LeadAnswersDetail.jsx` |
| Mes leads / event | `frontend/app/admin/leads/page.jsx`, `…/event/[eventId]/leads/page.jsx` |
| Builder soft lock props | `FormBuilderPanel` — `usedFieldIds` (pas branché Régie) |
| Tests | `npm run test:forms-l4` (frontend + backend) |

## Comportement

- Liste Mes leads inchangée (Prénom / Tél / E-mail) ; **Détail** → toutes réponses label→valeur.
- CSV : métadonnées + **1 colonne par champ** (libellés, pas ids) ; multi-polls → `Q{n} — Label`.
- Soft lock : après réponses, delete / change type / remove option utilisée / reset template → **409** ; rename / reorder / add OK.
- Polls sans `formDefinition` → `contact_legacy` pour display / CSV.

## Tests

```bash
cd frontend && npm run test:forms-l4   # OK
cd backend && npm run test:forms-l4    # OK
npm run test:forms-l3 && npm run test:forms-l1  # OK (régression)
```

## Blockers

- Empilé sur L1 (#15) + L2 (#17) + L3 (#18) non mergés ; migrate Railway toujours bloquée.
- Ne pas merger/deploy L4 avant L1 (+ migrate) → L2 → L3.

## Suite

L5 : preuve consentement bout-en-bout ; docs orga ; retrait progressif legacy body.
