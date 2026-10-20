# CR — Formulaires Lead/Concours · Lot L1

**Date :** 2026-10-20  
**Branche :** `cursor/forms-l1-1e88`  
**Base :** `main` post-merge L0 @ `3b5460c`  
**Périmètre :** migration **additive** (fichiers repo) + dual-write API + tests.  
**Hors scope :** exécution migration **production**, L2–L5, UI renderer/builder, deploy, merge L1.

Réf. : [conception-formulaires-lead-concours.md](./conception-formulaires-lead-concours.md) §11 L1 · D1–D12.

---

## Étape A — Merge L0 (fait)

| Élément | Valeur |
| --- | --- |
| PR | https://github.com/remdieuv/avote.app/pull/14 |
| Checks | Vercel **pass**, Preview Comments **pass** |
| Draft → ready | oui |
| Merge | **MERGED** (merge commit) |
| Tip `main` | **`3b5460cb50c9fc6caa0e61e6470477a1e2a31436`** (`3b5460c`) |

---

## Livré L1

| Élément | Chemin |
| --- | --- |
| Schema Prisma | `backend/prisma/schema.prisma` — `Poll.formDefinition/formTemplateKey/formSchemaVersion` ; `LeadCapture.answers/schemaVersion/consents` ; nullability `firstName`/`phone` (LeadCapture) ; `ContestDrawWinner.phone` nullable |
| Migration SQL | `backend/prisma/migrations/20261020160000_forms_l1_form_definition/migration.sql` (ADD COLUMN + DROP NOT NULL + backfill `contact_legacy` + answers) |
| Dual-write | `backend/lib/forms/formCapture.js` + branchement `POST /polls/:id/leads` |
| Création polls | défauts D8 (`contact` / `contest`) sur create multi / legacy / live / duplicate |
| `pollToJson` | expose `formDefinition`, `formTemplateKey`, `formSchemaVersion` |
| GET leads | `answers`, `consents`, `schemaVersion`, `lastName` |
| Tests | `backend/scripts/test-forms-l1-form-capture.mjs` · `npm run test:forms-l1` |

---

## Migration — précautions

- **Additive only** : pas de `DROP TABLE` / `DELETE`.
- Backfill polls `leadEnabled` → **`contact_legacy`** (pas le nouveau `contest`) pour ne pas changer les Concours déjà live.
- Backfill `answers` depuis colonnes existantes (idempotent si `answers IS NULL`).
- **Non exécutée en production** par cet agent. À appliquer plus tard via procédure Railway/Supabase habituelle après go Rémi.
- Locale / CI : `prisma migrate deploy` (ou staging) quand une DB de test est disponible.

---

## Compatibilité runtime

- Client actuel (body `firstName` + `phone`) → toujours accepté via dual-write sur définition legacy / contact.
- Body `answers` → supporté (prépare L2).
- Concours **nouveaux** (`formTemplateKey=contest`) : email **ou** téléphone (D2) ; `phone` peut être `null`.
- Concours **existants** (après migrate) : restent sur `contact_legacy` (tél. requis à la saisie).

---

## Tests exécutés

```bash
cd backend && npm run test:forms-l1   # OK — forms L1 formCapture
cd frontend && npm run test:forms-l0 # OK
cd frontend && npm run test:lead-contest # OK
```

---

## Suite

1. Review PR L1 (draft) — **ne pas merger** sans go.
2. Après merge L1 + migrate staging/prod (go séparé) → **L2** FormRenderer participant.
