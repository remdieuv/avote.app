---
cursor:
  subagentId: "bc-85611f7b-d757-5ef3-9ea2-2fe3765ad54f"
---

# CR — Railway × Prisma migrate (fiabilisation)

| | |
|--|--|
| **Date** | 2026-10-21 |
| **Repo** | `remdieuv/avote.app` @ `main` `3b5460c` |
| **Périmètre** | Audit + corrections code minimales — **pas** de merge, migrate prod, ni deploy |
| **PR draft** | https://github.com/remdieuv/avote.app/pull/16 (à confirmer après ouverture) · branche `cursor/railway-prisma-migrate-d54f` |

---

## Verdict

# **Corrections** — mécanisme Pre-deploy **adapté**, pas encore **suffisant** tel que figé dans le repo

Le chemin validé (Pre-deploy Railway → `prisma migrate deploy` → start API) couvre les objectifs 2 et 5 **si** la commande est **appliquée** dans l’UI service. Elle n’était **pas** versionnée ; le repo n’avait ni script prod dédié ni `DIRECT_URL` documenté ; `prisma` était en `devDependencies` seulement.

| Objectif | État |
|----------|------|
| 1. Garder l’infra actuelle | **OK** — pas de nouveau service / Dockerfile / IaC lourde |
| 2. Migrate **avant** nouveau backend | **OK si** Pre-deploy UI actif (entre build et start) |
| 3. Expand/contract pendant deploy | **OK** pour migrations oct. + L1 (#15) : additif / nullability / backfill, **pas** de DROP data |
| 4. Pas de wipe auto | **OK** — `migrate deploy` uniquement ; **jamais** `migrate reset` / `db push` en prod |
| 5. Échec deploy si migrate échoue | **OK si** commande **sans** `\|\| true` ; exit ≠ 0 → deploy annulé, ancien reste |
| 6. Moins de manip manuelle Supabase | **OK** une fois Pre-deploy fiable — plus de SQL Editor / one-off récurrents |

---

## Constat (état `main` avant PR)

| Élément | Présent ? | Note |
|---------|-----------|------|
| `railway.toml` / Dockerfile / Procfile | **Non** | Build Nixpacks/Railpack ; Root = `backend/` (docs ops) |
| Script `start` | `node server.js` | **Ne** migrate **pas** (correct) |
| `db:migrate` | `prisma migrate dev` | Dev only — dangereux si confondu avec prod |
| `db:migrate:deploy` | **Absent** → **ajouté** PR | |
| `postinstall` | `prisma generate` | Build only |
| `prisma` CLI | était `devDependencies` → **dependencies** PR | Pre-deploy a besoin du binaire |
| `directUrl` / `DIRECT_URL` | schéma oui ; `.env.example` non → **doc** PR | |
| Pre-deploy Railway | UI (docs Live V1) : `npx prisma migrate deploy` · timeout `300` | **Hors git** — à confirmer **appliqué** (pas seulement stagé) |

Pas de `|| true` recommandé nulle part dans les procédures — à conserver.

---

## Corrections livrées (PR draft)

1. Script `npm run db:migrate:deploy` → `prisma migrate deploy`
2. `prisma` déplacé en `dependencies` (+ lockfile)
3. `DIRECT_URL` documenté dans `backend/.env.example`

**Hors PR (ops UI, 1 contrôle) :** Settings service API → Pre-deploy = `npm run db:migrate:deploy` (ou garder `npx prisma migrate deploy`) · timeout `300` · **Alt+Deploy** si stagé · **pas** de `|| true`.  
`railway.toml` **non** ajouté (Config-as-Code Railway déprécié, cutoff 2026-12-01).

---

## Impact #15 (Forms L1) — ordre GO

Migration `20261020160000_forms_l1_form_definition` = **expand-only** (compatible ancienne API pendant le overlap).  
**Ordre recommandé :** (1) merger cette PR fiabilisation → (2) confirmer Pre-deploy UI → (3) backup Supabase → (4) GO merge #15 → (5) deploy Railway (migrate auto avant start) + Vercel.  
Si Pre-deploy **incertain** : `migrate deploy` one-off **avant** merge #15 (procédure one-off existante), puis merge/deploy.

**Non fait :** merge #15 · migrate prod · deploy.
