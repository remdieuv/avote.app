# Compte rendu — Intégration PR #9 CORS (arrêt avant Railway)

## Isolation

PR #9 mergée seule — tip `main` = `098f764` (CORS `d54bc6b` + ce CR Markdown).  
**Aucun** fichier frontend, **aucun** commit de la PR #8. PR #8 reste **OPEN**.

## Fait

- Merge fast-forward CORS puis doc : `1721914` → `d54bc6b` → `098f764`
- Smoke `www.avote.app` : home 200, proxy auth Express 401 métier
- CORS Preview **encore refusé** (API Railway pas encore redéployée)

## STOP — deploy Railway

Pas de `RAILWAY_TOKEN` / IDs service+env dans l’agent ; auto-deploy off.  
Déployer manuellement `098f764` (ou `d54bc6b`) via `serviceInstanceDeployV2`, puis re-vérifier ACAO Preview + www.

## Liens

- https://github.com/remdieuv/avote.app/pull/9 (merged)  
- https://github.com/remdieuv/avote.app/pull/8 (ouverte)
