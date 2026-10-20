# CR — Formulaires Lead/Concours · Lot L0

**Date :** 2026-10-20  
**Branche :** `cursor/forms-l0-1e88`  
**Base :** `main` @ `24c59d3`  
**Périmètre :** fondations pures (contrats JSON, 5 modèles, validations D1–D12, copy RGPD, tests).  
**Hors scope (respecté) :** migration Prisma, routes API, UI admin/participant, L1–L5, deploy, merge.

Réf. conception : [conception-formulaires-lead-concours.md](./conception-formulaires-lead-concours.md) §11 L0.

---

## Livré

| Élément | Chemin |
| --- | --- |
| Constantes / copy RGPD / D10–D12 | `frontend/lib/forms/formConstants.js` |
| Presets D1 + `contact_legacy` + validate définition + soft lock D4 | `frontend/lib/forms/formTemplates.js` |
| Validation answers, projection slots, CSV/labels, consents, legacy→answers | `frontend/lib/forms/formValidation.js` |
| Barrel | `frontend/lib/forms/index.js` |
| Tests | `frontend/scripts/test-forms-l0.mjs` |
| Script npm | `frontend/package.json` → `test:forms-l0` |

**Non modifié :** `schema.prisma`, `backend/server.js`, parcours Lead/Concours runtime existants.

---

## Contrats (résumé)

- `formDefinition` : `{ version, templateKey, title, fields[], rules }`
- Champs : `id`, `type`, `label`, `required`, `order`, `options[]`, `slot?`
- Types : `short_text | long_text | number | email | phone | single_choice | multiple_choice | consent`
- `answers` : `{ [fieldId]: scalar | string[] }` (choix = **ids** stables)
- `consents` : preuve D7 (`infoAcknowledgedAt`, `marketing?`, `neverPrechecked: true`)
- Max **5** champs ; titres UI D12 ; défauts D8 (`contact` / `contest`)

---

## Tests

```bash
cd frontend && npm run test:forms-l0
```

Résultat : **OK — forms L0** (24 assertions / cas couverts : templates D1, D2 concours email-only, soft lock D4, civic sans prénom, CSV labels, RGPD, legacy mapping, isolation clone).

---

## Suite recommandée

1. Review / QA libs (pas de QA navigateur nécessaire pour L0).
2. **Ne pas merger** sans go Rémi.
3. Après merge L0 → **L1** : migration additive + backfill `contact_legacy` + dual-write `POST /leads` (doc §11).
