
# Audit UX — Créer un événement (`/admin`)

Audit **lecture seule** (code `main` @ `6c7b3be` + comportement dérivé). Aucune modification. Attente validation avant développement.

**Périmètre technique**

| Élément | Rôle |
| --- | --- |
| `frontend/app/admin/page.js` | Formulaire unique de création (titre, description, questions, CTA) |
| `frontend/components/admin/EventLivePreview.jsx` | Aperçu mobile sticky (aside) |
| `POST /polls` (`backend/server.js`) | Création événement + polls ; statut `PUBLISHED`, live `WAITING` |
| Entrées | Nav « Créer », CTAs « + Créer un événement » → `/admin` |
| Sortie | `router.replace(/admin/event/:id)` → régie |

Production : même surface sur `www.avote.app/admin` (auth requise ; page non lisible anonymement).

Réf. liées : [audit-produit-ui-ux §8](./audit-produit-ui-ux-avote.md), [audit-largeurs-desktop-admin](./audit-largeurs-desktop-admin.md), [audit-coherence-desktop-global](./audit-coherence-desktop-global.md).

---

## 1. État des fonctionnalités existantes

### 1.1 Parcours de bout en bout

1. Orga authentifié arrive sur `/admin` (layout `AdminAuthShell`).
2. Remplit **titre** (obligatoire) + **description** optionnelle (max 2000).
3. Configure **N questions** (au moins 1, préchargée vide).
4. Pour chaque question : texte → type → options (+ champs spécifiques Lead / Concours / Quiz).
5. Valide côté client (`validerFormulaire`) puis `POST /polls` avec `polls[]` + champs legacy 1ʳᵉ question.
6. Succès → mémorisation locale (`rememberMyEvent`) → **régie** immédiatement.
7. Échec notable : `EVENT_ALREADY_ACTIVE` (un événement déjà actif).

Pas de wizard, pas d’étapes numérotées, pas de brouillon serveur, pas de checklist post-création.

### 1.2 Questions — CRUD & organisation

| Action | Présent ? | Détail |
| --- | --- | --- |
| Ajouter | Oui | Boutons haut + bas ; type défaut `SINGLE_CHOICE`, 2 options vides |
| Modifier | Oui | Édition inline dans la carte |
| Supprimer | Oui | Interdit si 1 seule question ; pas de confirmation |
| Réordonner | **Non** | Ordre = ordre d’ajout uniquement (`order` index au submit) |
| Dupliquer une question | **Non** | — |
| Replier / accordéon | **Non** | Toutes les cartes restent ouvertes |
| Auto-replier les précédentes à l’ajout | **Non** | Point 3 de la demande : **absent** |
| Scroll / focus sur la nouvelle question | **Non** | Ajout append en bas, pas de `scrollIntoView` |

### 1.3 Les cinq types

| Type UI | Stockage | Comportement création |
| --- | --- | --- |
| Choix unique | `SINGLE_CHOICE` | Options libres ≥ 2 ; indicateur radio décoratif |
| Choix multiple | `MULTIPLE_CHOICE` | Idem ; indicateur checkbox |
| Lead | API `LEAD` → Prisma `SINGLE_CHOICE` + `leadEnabled` | Options **libres** (souvent Oui/Non attendu) ; select « option déclencheuse » |
| Participation concours | `CONTEST_ENTRY` | Force options **Oui / Non** ; lot (requis FE) ; nb gagnants ; question auto-générée synchronisée avec le lot tant que non customisée |
| Quiz | `QUIZ` | Select « bonne réponse » ; `quizCorrectOrder` |

**Incohérence Lead** : le libellé dit « Oui/Non + formulaire », mais passer en Lead **ne préremplit pas** Oui/Non (contrairement au Concours). L’orga doit tout saisir à la main.

**Résumé aside** : les Quiz sont comptés dans « choix unique » (`singleQuestions = total − lead − contest − multiple`) — **sous-comptage Quiz**.

### 1.4 Configuration des réponses

- Lignes option avec indicateur + champ + « Supprimer » (min 2).
- « Ajouter une option » + **import en masse** (une ligne = une option ; doublons / vides ignorés).
- Concours : édition options **désactivée** (Oui/Non figés).
- Lead / Concours : panneau bleu « option déclencheuse ».
- Quiz : panneau « bonne réponse ».
- Pas de presets Oui/Non pour Lead, pas de drag options, pas de limite max visible côté UI.

### 1.5 Aperçu en direct (`EventLivePreview`)

- Aside « Aperçu mobile » : téléphone factice (titre, Qn, options, éventuel bloc lead).
- Onglets `Q1…Qn` si plusieurs questions.
- Lead / Concours : affiche toujours un formulaire Prénom / Téléphone / Email, libellé figé « après Oui » — **ignore** l’option déclencheuse réelle.
- Quiz : **aucune** distinction de la bonne réponse.
- `selectedIdx` initialisé une fois ; **pas de sync** quand on ajoute une question ou quand on édite la carte active.
- Props `activeQuestionIndex` non réactif après montage.
- Utile pour « voir le rendu participant » grossier ; faible valeur pour valider Lead/Quiz/parcours réel.

### 1.6 Layout desktop / mobile

- Shell `max-width: 1600px` (évolué vs ancien audit « 1200 ») ; grille form + aside ≥980px.
- Aside sticky seulement ≥1280px.
- CTA : mobile en bas du form ; desktop dans l’aside.
- Mobile : aperçu **sous** le formulaire (long scroll) ; pas d’onglets Formulaire | Aperçu.
- Types en liste radio verticale (5 lignes) — dense, surtout mobile.
- Style system-ui + gradient indigo ; cartes questions toujours déployées → scroll long dès 3–4 questions riches.

### 1.7 Perte de saisie, validations, erreurs

| Sujet | État |
| --- | --- |
| Persistance brouillon | **Aucune** (pas de `localStorage`, pas de draft API) |
| `beforeunload` | **Absent** — refresh / fermeture = perte totale |
| Validation client | Titre ; texte Q ; ≥2 options ; lot concours ; bonne réponse quiz |
| Erreurs inline | **Non** — un seul `formError` / `error` **sous** la liste (loin du champ fautif) |
| Focus / scroll vers l’erreur | **Non** |
| Double-submit | Lock `createLockRef` + `creating` |
| Confirmation suppression Q | **Non** |
| Changement de type | Concours **écrase** question + options ; autres types gardent options (risque de contenu incohérent Lead) |

### 1.8 Modèles / templates

- **Aucun** modèle de formulaire ou de question sur `/admin`.
- Raccourci voisin : **dupliquer un événement** depuis Mes événements (`POST …/duplicate`) — hors page création, utile pour « recommencer vite » mais pas pour un blank + presets.
- Schéma Prisma contient d’autres types (`YES_NO`, `RATING`, etc.) **non exposés** à la création.

---

## 2. Problèmes UX identifiés

### Gravité haute

1. **Scroll vertical non maîtrisé** — toutes les questions ouvertes ; pas d’auto-collapse à l’ajout → fatigue dès 3+ questions.
2. **Pas de sauvegarde / alerte de perte** — création longue = risque élevé de perte.
3. **Erreurs globales en bas** — l’orga ne voit pas *où* corriger ; surtout avec N questions.
4. **Lead mal outillé** — promesse Oui/Non sans préremplissage ; trigger opaque pour un non-expert.
5. **Atterrissage régie sans préparation** — création = published + jump régie ; personnalisation salle / landing ailleurs (friction déjà notée audit produit).

### Gravité moyenne

6. **Pas de réordonnancement** — corriger l’ordre = supprimer / recréer.
7. **Aperçu peu fiable** pour Lead / Quiz / question active ; onglets déconnectés du focus d’édition.
8. **Sélecteur de types** dense (5 radios texte) sans aide visuelle / progressive disclosure.
9. **Mobile** : aperçu enfoui ; CTA et aperçu concurrencent le formulaire.
10. **Résumé aside** incorrect pour Quiz ; compteurs peu actionnables.
11. **Suppression question** sans undo / confirm.
12. **Import en masse** utile mais caché / libellé « Ajouter en masse » peu explicite.

### Gravité basse

13. Styles inline + CSS emballé dans la page (~400 lignes) — dette maintenance, pas bloquant UX.
14. Indicateurs radio/checkbox décoratifs toujours « cochés » — peuvent tromper.
15. Footnote post-création correcte mais n’oriente pas vers personnalisation / QR / test.

---

## 3. Comparaison aux bons outils modernes

Références : Typeform / Tally (builder), Mentimeter / Slido / Kahoot (live Q&A), Google Forms / Microsoft Forms.

| Pratique moderne | AVOTE aujourd’hui |
| --- | --- |
| Une question focus, précédentes repliées | Toutes ouvertes |
| Modèles métier (soirée, lead, quiz) | Absents |
| Drag & drop ordre | Absent |
| Autosave / brouillon | Absent |
| Validation inline champ | Message global bas |
| Type picker cards + icônes + short copy | 5 radios texte |
| Preview syncée sur l’item édité | Preview indépendante / partiellement stale |
| Progressive disclosure (avancé replié) | Trigger Lead / import toujours au même niveau |
| « Empty → first success in &lt; 60s » | Possible mais friction Lead/Concours + scroll |

Forces à conserver : **un seul écran** (pas de wizard interminable), **5 types métier utiles**, **import en masse**, **concours guidé** (lot + question auto), **CTA sticky desktop**.

---

## 4. Propositions d’amélioration (par priorité)

### P0 — Impact fort, sans backend (FE only)

| # | Proposition | Effet |
| --- | --- | --- |
| P0.1 | **Accordéon questions** : à l’ajout, replier les précédentes ; garder ouverte la nouvelle / celle en édition | Répond au besoin #3 ; réduit le scroll |
| P0.2 | **Brouillon `localStorage`** + bannière « Reprendre » + `beforeunload` si dirty | Coupe le risque de perte |
| P0.3 | **Validation inline** (bordure + message sous le champ / carte) + scroll vers 1ʳᵉ erreur | Moins d’échecs « mystérieux » |
| P0.4 | Au passage **Lead** : préremplir Oui/Non si options vides ; trigger défaut = Oui | Aligne le libellé et simplifie |
| P0.5 | **Sync aperçu** : question ouverte = onglet preview ; indiquer bonne réponse Quiz | Rend l’aperçu utile |
| P0.6 | Mobile : onglets **Formulaire \| Aperçu** (pattern déjà fait salle live) | Espace mobile utilisable |

### P1 — Parcours plus rapide (FE only ou quasi)

| # | Proposition | Effet |
| --- | --- | --- |
| P1.1 | **Templates client** (JSON local) : « Sondage soirée », « Quiz 5 Q », « Lead + concours », « Afterwork » → préremplit le state | Gain temps sans API |
| P1.2 | **Réordonner** (↑↓ ou drag) — le payload envoie déjà `order` | Organisation sans backend |
| P1.3 | **Dupliquer une question** | Accélère les listes similaires |
| P1.4 | Type picker en **cartes compactes** + 1 ligne d’aide contextuelle | Moins de charge cognitive |
| P1.5 | Confirmer / undo soft sur suppression question | Moins d’erreurs irréversibles |
| P1.6 | Corriger compteurs résumé (+ compteur Quiz) ; CTA secondaire « Créer & personnaliser la salle » (lien post-create ou query) | Clarté + suite de parcours |

### P2 — Produit (peut toucher backend / parcours global)

| # | Proposition | Note |
| --- | --- | --- |
| P2.1 | Vrai statut **DRAFT** serveur + reprise | Contrat API |
| P2.2 | Checklist post-création (QR, salle, mode test) avant régie pleine | UX régie / onboarding |
| P2.3 | Templates serveur partagés / org | Contenu + API |
| P2.4 | Brancher personnalisation dans le flux création (étape optionnelle) | Navigation |

---

## 5. Parcours cible recommandé (plus simple / rapide)

Objectif : **événement prêt à lancer en &lt; 2 minutes** pour le cas courant (1–3 sondages), sans retirer Lead / Concours / Quiz.

```
[Entrée]
  ├─ Blank rapide          → Titre + 1 question focus
  ├─ Modèle métier         → Préremplit questions/types
  └─ (Depuis liste) Dupliquer un event existant

[Builder — une colonne focus + aperçu]
  1. Titre (description en « plus d’infos » replié)
  2. Liste questions en accordéon
       • Ouverte = édition complète
       • Fermée = résumé (type · N options · alerte si incomplet)
       • Ajouter → auto-collapse des autres + focus
  3. Types : cards ; champs avancés (trigger Lead, lot, bonne réponse) sous le type choisi
  4. Options : liste courte + « Coller une liste »
  5. Aperçu sync (desktop sticky / mobile onglet)

[Validation]
  Inline + CTA « Créer l’événement »
  → Régie avec bandeau « Prochaines étapes » (salle, QR, test) — hors scope strict création, recommandé
```

Principes : **progressive disclosure**, **une question à la fois**, **modèles pour les cas fréquents**, **zéro perte de saisie**, **aperçu = feedback immédiat**.

---

## 6. Améliorations possibles **sans modifier le backend**

Tout le P0 + P1.1–P1.6 ci-dessus. Le contrat `POST /polls` accepte déjà `title`, `description`, `polls[{ question, type, options, order, leadTriggerOrder, quizCorrectOrder, contestPrize, contestWinnerCount }]`.

Donc **aucun changement API** pour :

- collapse / reorder UI / duplicate question / templates locaux / draft local / validation UX / preview sync / Lead Oui-Non defaults / mobile tabs / copy UI.

Seuls P2.* (draft serveur, checklist produit profonde, templates cloud) nécessitent backend ou parcours hors page.

---

## 7. Fichiers concernés pour une future implémentation UI

- `frontend/app/admin/page.js` — builder principal
- `frontend/components/admin/EventLivePreview.jsx` — aperçu
- Éventuellement extraction : `CreateEventForm`, `QuestionEditorCard`, `questionTemplates.js`, `useCreateEventDraft.js`
- **Ne pas toucher** : `POST /polls`, schéma Prisma, régie — jusqu’à validation produit

---

## 8. Décisions à valider ensemble

1. Prioriser **P0.1 accordéon + auto-collapse** comme premier lot ?
2. Templates : combien / quels scénarios métier (FUN vs EVENT) ?
3. Post-création : rester en régie directe, ou intercaler une mini checklist ?
4. Lead : forcer Oui/Non ou laisser options libres avec preset optionnel ?
5. Faut-il un vrai brouillon serveur (P2) ou localStorage suffit en V1 UX ?

---

*Fin d’audit — aucune implémentation.*
