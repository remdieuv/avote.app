# Compte rendu — Intégration PR #9 CORS (arrêt avant Railway)

## Isolation

PR #9 mergée seule dans `main` @ `d54bc6b` — **aucun** fichier frontend, **aucun** commit de la PR #8.  
PR #8 reste **OPEN** (non publiée).

## Fait

- Merge fast-forward `main` : `1721914` → `d54bc6b`
- Smoke `www.avote.app` : home 200, proxy auth Express 401 métier
- CORS Preview **encore refusé** (API Railway pas encore sur `d54bc6b`)

## STOP — deploy Railway

Pas de `RAILWAY_TOKEN` / IDs service+env dans l’agent ; auto-deploy off.  
Fournir les secrets ou déployer manuellement le SHA  
`d54bc6b895739c88e249cccb389540e6856ba4d8` via `serviceInstanceDeployV2`, puis re-vérifier ACAO Preview + www.

## Liens

- https://github.com/remdieuv/avote.app/pull/9 (merged)  
- https://github.com/remdieuv/avote.app/pull/8 (ouverte)
