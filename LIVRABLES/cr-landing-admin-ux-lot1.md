# Compte rendu — Lot 1 Landing admin UI/UX

Branche : `cursor/landing-admin-ux-lot1-0432`  
Réf. audit : [audit-landing-evenement-ux.md](./audit-landing-evenement-ux.md)  
Surface : `/admin/events/[id]/landing` uniquement (`EventCustomizationEditor` `mode="landing"`).  
PR : **draft** — pas de merge.

## Objectif

Réorganiser l’éditeur landing en **4 blocs** + aperçu desktop, sans supprimer de features, sans toucher public / salle / régie / diffusion / backend / DB.

## Modifications

Fichiers :

- `frontend/app/admin/events/[eventId]/customization/page.jsx` (branche `mode="landing"`)
- `frontend/scripts/test-landing-admin-ux-lot1.mjs` (+ script npm `test:landing-admin-ux-lot1`)

### 1. Publication

- Toggle **Activer la landing événement**
- État explicite (activée / redirige vers la salle)
- Lien `/e` · Copier · Ouvrir

### 2. Personnalisation

- Couverture · titre · accroche
- Note : **Enregistrer** requis pour ces champs
- Lien **Logo & couleur → Salle live** (`/live`)

### 3. Galerie événement

- Compteur `x/30`, grille add/remove (existant)
- Badge **En ligne dès l’ajout**

### 4. Moments live

- Compteur `x/50` + miniatures (payload `landingPhotos` déjà chargé)
- **Publier une photo** (même API `POST /landing/photos` + compression client)
- Suppression + **Ouvrir la régie**
- Badge **En ligne dès l’ajout**

### Aperçu

- Desktop : colonne droite sticky (inchangé)
- Mobile : onglets **Réglages / Aperçu** (même pattern que `/live`)
- Landing off ou pas encore enregistrée activée → **empty state** (plus d’iframe `/join`)
- Reload iframe après Enregistrer / upload-suppression galeries (`previewNonce`)

### Barre sticky

- Dirty : « Publication / personnalisation non enregistrées (galeries déjà en ligne) »
- Clean : « Publication & personnalisation à jour · galeries immédiates »

## Tests

| Vérification | Résultat |
| --- | --- |
| `npm run test:landing-admin-ux-lot1` | OK (structure desktop sticky + tabs mobile + vocabulaire + aperçu off) |
| Balance accolades JSX | OK |
| QA visuelle navigateur | À faire côté utilisateur (prefs AVOTE dev rapide) |

## Hors scope (volontaire)

- Public `/e`, régie, salle live, diffusion, backend, DB
- CTA public, labels phase, FAB, soft-refresh moments (lots suivants)
- Remontée publication régie hors « Options avancées »

## À vérifier manuellement

- Desktop : 4 blocs + aperçu droite
- Mobile &lt;900px : onglets Réglages / Aperçu
- Landing off → empty state aperçu (pas la salle)
- Cover/titre → dirty → Enregistrer ; galeries → immédiat + refresh aperçu
- Publier / retirer un moment live depuis l’admin landing
