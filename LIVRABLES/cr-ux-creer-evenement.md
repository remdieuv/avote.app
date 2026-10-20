# Compte rendu — Refonte UX Créer un événement

Branche : `cursor/ux-creer-evenement-fbab`  
PR : https://github.com/remdieuv/avote.app/pull/13  
Preview : https://avote-app-git-cursor-ux-creer-evenement-fbab-remdieuvs-projects.vercel.app/admin  
Réf. audit : [audit-ux-creer-evenement.md](./audit-ux-creer-evenement.md)

## Modifications

| Fichier | Rôle |
| --- | --- |
| `frontend/lib/createEventForm.js` | Helpers : types, Lead Oui/Non, validation inline, brouillon localStorage, duplicate, reorder, résumé |
| `frontend/app/admin/page.js` | Builder UX (9 points) |
| `frontend/components/admin/EventLivePreview.jsx` | Sync question ouverte + tags Lead/Quiz |
| `frontend/scripts/test-create-event-form.mjs` | Tests unitaires + smoke patterns |
| `frontend/package.json` | Script `test:create-event-form` |

### Les 9 améliorations

1. **Questions repliables** — une seule ouverte ; ajout → collapse des autres + focus nouvelle.
2. **Brouillon auto** — `localStorage` (`avote_create_event_draft_v1`), bannière reprise / repartir de zéro, clear après création OK, `beforeunload` si dirty.
3. **Validation inline** — erreurs par champ ; ouverture + scroll vers la question fautive.
4. **Lead** — Oui/Non si options vides, déclencheur = Oui (index 0) ; options custom conservées.
5. **Aperçu sync** — suit `openQuestionId` ; tags « Déclencheur » / « Bonne réponse » + libellé formulaire lead dynamique.
6. **Mobile** — onglets Formulaire / Aperçu (&lt;980px) ; desktop inchangé (grille + sticky ≥1280).
7. **Dupliquer** — copie profonde, nouvel id.
8. **Réordonner** — boutons ↑ / ↓ (mobile inclus).
9. **Types** — cartes avec label + courte aide (`QUESTION_TYPE_META`).

### Conservé

- 5 types, import en masse, concours guidé, payload `POST /polls`, redirection régie, shell **1600px**.

### Hors scope / limites

- Pas de templates métier (non validés dans les 9 points).
- Pas de drag-and-drop (↑↓ uniquement).
- Brouillon local uniquement (pas de draft serveur).
- Aperçu = simulation mobile, pas la salle live réelle.

## Tests

| Vérification | Résultat |
| --- | --- |
| `npm run test:create-event-form` | OK |
| `node scripts/test-admin-desktop-widths.mjs` | OK |
| `npm run build` (Next 16.2.1) | OK |

## À valider manuellement (Preview Vercel)

- Accordéon + ajout / dupliquer / ↑↓
- Reprise brouillon après refresh + « Repartir de zéro »
- Submit invalide → erreurs inline + scroll
- Type Lead → Oui/Non préremplis
- Aperçu suit la question ouverte ; tags Quiz/Lead
- Onglets mobile Formulaire / Aperçu
- Création réelle → régie + brouillon effacé
