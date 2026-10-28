---
cursor:
  subagentId: "bc-8d3a7706-162a-51dd-8d6b-05d031e3d6e3"
---

# CR — UX closed vote + Lead polish (C1–C3)

**Repo :** remdieuv/avote.app  
**Base :** `main`  
**Branche :** `cursor/ux-closed-lead-polish-d6e3`  
**PR :** [#26](https://github.com/remdieuv/avote.app/pull/26) (draft)  
**Méthode :** AVOTE rapide — code-first, tests auto ciblés, pas de browser, pas merge/deploy.

---

## Bilan scannable

| | |
| --- | --- |
| **C1** | Screen CLOSED : garder question + réponses + bandeau VOTE TERMINÉ + compteur ; décompte auto-reveal en footer (plus de scène countdown seule qui remplace Q+R) ; pas de QR participation |
| **C2** | Lead fermé : plus de « Les résultats arrivent bientôt ». Soumis → « Merci, votre réponse a bien été enregistrée. » ; sinon « Collecte terminée ». Sondage/Quiz inchangés |
| **C3** | Récap fin d’événement `/join` : masquer « Voir les résultats » pour Lead CRM ; liens conservés sondage / quiz / concours |
| **Hors scope** | Chrono, sync Régie/Screen axes, Overlay OBS, collecte/RGPD/Mes leads, merge, deploy |

---

## Détail par correction

### C1 — Screen après fermeture vote

**Avant :** avec auto-reveal pending, `ScreenAutoRevealWait` remplacait toute la composition (plus de question/réponses).

**Après :**
- `shouldRenderScreenAutoRevealWait` → `false` si `ux=CLOSED` **et** poll présent
- `ScreenQuestion` CLOSED conserve Q + options + « VOTE TERMINÉ » + compteur votes
- Décompte « Résultats dans N… » passé en footer via `autoRevealUntilIso`
- Pas de QR (« Scannez pour voter ») tant que `voteOuvert=false`
- RESULTS / Screen A·B indep. / compteur inchangés

### C2 — Message participant Lead fermées

**Avant :** strip CLOSED = « Vote fermé — les résultats arrivent bientôt » même pour Lead ; succès = « Merci, tes coordonnées… ».

**Après :**
- Helpers `getLeadClosedParticipantMessage`, `LEAD_COLLECTION_CLOSED_MESSAGE`
- `LEAD_SUBMIT_SUCCESS_MESSAGE` → « Merci, votre réponse a bien été enregistrée. »
- Lead fermé + soumis → confirmation unique (corps)
- Lead fermé + non soumis (form fermé) → « Collecte terminée »
- Lead + form encore ouvert (grâce post-Fermer) → form inchangé, pas « collecte terminée »
- Libellés CLOSED sondage/quiz **non touchés**

### C3 — Récap fin d’événement

**Nécessité backend démontrée :** `pastPolls` n’exposait que `{id,label}` → impossible de distinguer Lead côté `/join` sans métadonnées.

**Après :**
- API slug : `pastPolls[]` enrichi de `type` + `leadEnabled` (select Prisma existant, pas de migration DB)
- `shouldShowJoinHistoriqueResultsLink` : false pour Lead CRM uniquement
- Section FINISHED « Voir les résultats » masquée pour Lead ; conservée pour les autres types
- Concours : lien résultats + « Voir le résultat du tirage » inchangés
- Pas de modif pages collecte / RGPD / Mes leads

---

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `frontend/lib/diffusionUx.js` | C1 — gate auto-reveal vs CLOSED+poll |
| `frontend/components/ScreenProjection.jsx` | C1 — passe `hasPoll`/`uxState` + `autoRevealUntilIso` |
| `frontend/components/ScreenQuestion.jsx` | C1 — footer countdown, Q+R préservés |
| `frontend/lib/leadContestLiveFlow.js` | C2/C3 — messages Lead + helper lien récap |
| `frontend/components/PollExperience.jsx` | C2 — UI participant Lead fermé |
| `frontend/lib/participantLiveFlow.js` | C3 — conserve type/leadEnabled dans historique |
| `frontend/components/JoinLiveHub.jsx` | C3 — masque lien Lead |
| `backend/server.js` | C3 — pastPolls + type/leadEnabled |
| `frontend/scripts/test-*.mjs` | Non-régression C1–C3 |

---

## Tests exécutés

```text
node frontend/scripts/test-lead-contest-live-flow.mjs   OK
node frontend/scripts/test-diffusion-ux.mjs             OK
node frontend/scripts/test-participant-live-flow.mjs    OK
node frontend/scripts/test-live-ux-state.mjs            OK
```

---

## QA manuelle suggérée (utilisateur)

1. **C1** — Ouvrir vote Screen A → Fermer (auto-reveal ON) : Q+R + VOTE TERMINÉ + compteur + « Résultats dans N » en bas ; pas de QR. Afficher → RESULTS OK. Screen B indep. inchangé.
2. **C2** — Lead : voter + envoyer form → message merci réponse ; fermer sans form → « Collecte terminée » ; sondage fermé → toujours « résultats bientôt ».
3. **C3** — Terminer événement avec Lead + sondage : récap sans lien sur Lead, avec lien sur sondage.

---

## Non-objectifs confirmés

- Pas de changement chrono / sync Régie axes / Overlay
- Pas de migration Prisma / schéma DB
- PR **draft** uniquement — pas merge, pas deploy
