---
cursor:
  subagentId: "bc-f035468b-0eae-5592-a0ff-afec41fc6088"
---

# AVOTE — Rapport produit détaillé complet

**Date :** 2026-09-30  
**Nature :** document produit / UX exhaustif — **aucun développement**.  
**Base de travail validée :** `docs/audit-produit-ui-ux-avote.md`  
**Enrichissements :** `docs/audit-ux-avote-production.md`, `docs/etat-des-lieux-avote-v1.md` (tech ; panne DB 500 **obsolète** pour la prod actuelle), notes `internal/audit-produit-ux-admin-organizer.md`, `internal/audit-ux-participant-public.md`, captures `media/audit-ux-screenshots/`.

### Légende des tags d’observation

| Tag | Signification |
|-----|----------------|
| **[PROD]** | Observé en navigation réelle sur `https://www.avote.app` |
| **[CODE]** | Issu du code / UI JSX / libs (session authentifiée prod **non** ouverte) |
| **[HYPOTHÈSE]** | Inférence plausible à confirmer en usage réel (ex. ressenti EVG, socket charge) |

**Règle régie / dashboard auth :** tout ce qui touche la zone organisateur authentifiée est **[CODE]** sauf mention contraire d’une source prod.

### Contexte ops (fourni, non re-diagnostiqué)

Prod UP : Front Vercel, API Express Railway, Postgres Supabase Healthy ; auth/admin OK ; EVG réel déjà animé (participants surtout smartphone, parfois « un peu compliqué »). Instantané « DB 500 » de l’état des lieux technique = **obsolète** pour la prod actuelle.

### Preuves / limites

| Surface | Vérifié comment | Statut |
|---------|-----------------|--------|
| Marketing `/`, `/pricing`, `/login` | Prod navigateur + HTTP 200 | **[PROD]** |
| Démo participant `/join/demo` | Prod desktop + mobile ~375–390 px | **[PROD]** (offline, sans API) |
| Landing démo `/e/demo` | Prod | **[PROD]** (démo locale) |
| `/screen/demo`, `/overlay/demo`, `/p/demo` | Prod HTTP + UI | **[PROD]** pages HTML OK ; API slug `demo` absente (404 métier) → états erreur / attente |
| Régie / dashboard / création / compte | Code JSX + structure UI | **[CODE]** — session auth prod non ouverte |
| Socket live multi-écrans réel | — | Non mesuré |
| Stripe checkout réel | — | Non exécuté |

**Captures :** `media/audit-ux-screenshots/` (01–20). Voir §14 inventaire.

---

## 1. Vision synthétique du produit actuel

AVOTE est une **plateforme de vote interactif en direct** pour animer une audience (soirée / EVG, conférence, formation, stream). L’organisateur crée un événement multi-questions, pilote depuis une **régie**, projette sur **écran salle** et/ou **overlay OBS**, et les participants votent sur **smartphone via QR / lien**, sans application ni compte votant.

**Promesse perçue (marketing + démo) [PROD] :** « Un QR code. Quelques secondes pour répondre. Résultats affichés instantanément. » — claire, crédible, déjà validée en conditions réelles (EVG).

**Réalité produit [CODE] :** MVP **avancé** — régie dense (~8150 L), 5 types opérationnels (choix unique/multiple, lead, concours, quiz), mode test vs réel + activations FUN/EVENT, landing événement, analytics/leads, multi-écrans + presets overlay. La richesse est surtout côté **organisateur / streamer** ; le participant est censé rester simple, mais le parcours live réel introduit des **états d’attente et une double surface join→vote**.

**Positionnement perçu :** outil d’**animation live** (pas un LMS, pas un formulaire, pas un Twitch natif). Dualité FUN (soirées) / EVENT (pro + projection/OBS) structurante, mais vocabulaire parfois B2B (« Lead », « Régie », « Overlay ») pour un usage EVG.

---

## 2. Cartographie de toutes les interfaces

### 2.1 Marketing & conversion

| Route | Rôle | Priorité usage | Preuve |
|-------|------|----------------|--------|
| `/` | Landing longue, preuve visuelle vote + résultats | Découverte | **[PROD]** captures 01–05, 19–20 |
| `/pricing` | FUN 19 € / EVENT 49 € (mode launch) ; grille full Starter/Pro/Premium si env | Achat | **[PROD]** capture 06 ; mode full **[CODE]** |
| `/login` | Connexion / inscription organisateur | Accès orga | **[PROD]** capture 07 |
| `/success` | Post-Stripe | Confirmation | **[CODE]** |

### 2.2 Organisateur (auth requise — UI lue code)

| Route | Rôle | Preuve |
|-------|------|--------|
| `/admin` | Création événement + questions | **[CODE]** |
| `/admin/events` | Dashboard « Mes événements » | **[CODE]** |
| `/admin/event/[id]` | **Régie live** (console monolithique) | **[CODE]** |
| `/admin/event/[id]/analytics` · `/leads` | Stats / leads d’un event | **[CODE]** |
| `/admin/events/[id]/live` | **Personnalisation salle** (pas la régie) | **[CODE]** |
| `/admin/events/[id]/landing` · `/customization` | Landing + éditeur partagé | **[CODE]** |
| `/admin/analytics` · `/admin/leads` · `/admin/account` | Compte transversal | **[CODE]** |
| `/admin-internal/*` | Admin plateforme AVOTE | **[CODE]** |

### 2.3 Participant / public

| Route | Rôle | Preuve |
|-------|------|--------|
| `/join/[slug]` | Hub « salle » live (attente / vote / résultats / pause / fin) | **[CODE]** ; erreur slug **[PROD]** capture 18 |
| `/join/demo` | Démo offline participant | **[PROD]** captures 08–12 |
| `/p/[slug]` | Page de vote (lead / concours / quiz) | **[CODE]** ; `/p/demo` erreur **[PROD]** capture 17 |
| `/poll/[id]` | Legacy vote par id | **[CODE]** |
| `/e/[slug]` | Landing événement (vitrine avant/pendant/après) | **[PROD]** `/e/demo` captures 13–14 |
| `/screen/[slug]` | Projection salle | **[CODE]** ; `/screen/demo` **[PROD]** capture 15 |
| `/overlay/[eventSlug]` | Overlay transparent OBS/stream | **[CODE]** ; `/overlay/demo` **[PROD]** capture 16 |
| `/report/account/[token]` | Rapport compte partagé | **[CODE]** |

### 2.4 Architecture d’interfaces (résumé)

```
Marketing ──► Login ──► Dashboard events ──► Création
                              │
                              ├─ Régie (pilotage)
                              ├─ Salle live (look & feel join)
                              ├─ Landing (éditeur /e)
                              └─ Analytics / Leads / Compte
Participants: QR → join (± e) → p
Audience: screen | overlay
```

### 2.5 Structure régie desktop [CODE]

Breakpoint ≥1024 : **3 colonnes**.

1. **Gauche** — Titre event · stats · tuiles « Salle live » / « Landing » · liste questions (`PollCard`) · « + Ajouter une question » · auto-reveal.  
2. **Centre** — Bandeau « Console live » (sombre) · cartes **Vote · Progression · Chrono** · réponses live · projection écran · concours si applicable.  
3. **Droite** — QR · presets overlay OBS · liens · photo landing.

### 2.6 Structure régie mobile [CODE]

&lt;1024 : drawers Menu / Voir ma salle / sheet Réponses / accordion Partage. Header admin « Plus » ≤640. Pas de FAB / bottom-nav dédiée hors ces patterns.

---

## 3. Cartographie des parcours utilisateurs

### 3.1 Parcours orga — Découverte → démo → création (P parcours marketing)

1. `/` → CTA « Tester en live » → `/join/demo` (vote simulé) **[PROD]**  
2. ou « Créer un événement gratuit » → `/admin` (redirige login si besoin) **[PROD]** / **[CODE]**  
3. `/pricing` → Activer FUN/EVENT → Stripe → `/success` **[PROD]** (checkout non exécuté)  

**Friction :** CTAs multiples (« Tester en live », « Voir une démo », « Créer un événement gratuit / mon événement ») ; header CTA bleu vs violet page. **[PROD]**

### 3.2 Parcours orga — Préparation [CODE]

1. Créer (`/admin`) → atterrissage **direct régie**  
2. Optionnel : Salle live (couleurs/logo) · Landing · QR exports  
3. Mode TEST par défaut → « Passer en live réel » (consomme activation)  

**Friction :** on arrive en régie dense avant d’avoir forcément configuré la salle / compris TEST vs réel.

### 3.3 Parcours participant — Live salle (EVG / conférence)

1. Orga ouvre régie + `/screen` **[CODE]**  
2. Participants scannent QR → `/join` → « Voter maintenant » → `/p` → valider **[CODE]**  
3. Orga ferme vote / révèle / question suivante **[CODE]**  

**Friction majeure :** **2 écrans** (hub + vote) + périodes d’attente où le téléphone ne « suit » pas forcément la projection. **[CODE]** + ressenti EVG **[HYPOTHÈSE]** étayée par le retour terrain « un peu compliqué ».

### 3.4 Parcours streamer — Live Twitch / OBS [CODE]

1. Orga copie preset overlay → source navigateur OBS  
2. Chat/QR viewer → join/p  
3. Régie pilote vote + display overlay (souvent vide en attente = correct pour OBS)  

**Friction :** presets nombreux ; overlay en erreur slug montre fond blanc **[PROD]** ; dualité screen vs overlay à expliquer.

### 3.5 Parcours après coup [CODE]

Analytics event/compte · leads CSV · landing souvenirs · partage rapport tokenisé.

### 3.6 Flux participant type (synthèse)

```
QR / lien → [/e optionnel] → /join/[slug] → CTA « Voter maintenant » → /p/[slug]
Démo : QR / lien → /join/demo (vote + résultats sur UNE page, sans /p)
```

---

## 4. Catalogue exhaustif des problèmes P1–P18

Chaque item : écran/route · utilisateur · problème · recommandation · tag(s).

---

### P1 — Réduire le hop join→vote

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/join/[slug]` → `/p/[slug]` ; QR « Ma salle » vs « Vote direct » |
| **Utilisateur** | Participant mobile (EVG / soirée) |
| **Problème observé** | Deux étapes pour voter : hub puis page vote. En EVG, chaque tap perdu = gens qui regardent ailleurs. La démo `/join/demo` court-circuite ce hop (1 page) → écart d’attente. |
| **Recommandation** | QR défaut « Vote direct » (`/p`) pour FUN ; ou auto-redirect `/p` depuis join si vote ouvert ; option régie déjà présente à promouvoir. |
| **Priorité / effort** | BLOQUANT ressenti EVG · QW |
| **Tags** | **[CODE]** (parcours join→p, toggle QR) · **[PROD]** (démo 1 page trop flatteuse) · **[HYPOTHÈSE]** (lien causal exact avec ressenti EVG terrain) |

---

### P2 — Aligner feedback `/p` avec résultats salle

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/p/[slug]` vs `/screen/[slug]` / display régie |
| **Utilisateur** | Participant |
| **Problème observé** | Commentaire / règle produit explicite : `/p` **ne suit pas** `displayState` — scène = vote open → voting, sinon waiting (sauf finished). Téléphone en « attente » pendant que l’écran montre résultats → « ça marche pas ». |
| **Recommandation** | Aligner au moins RESULTS / CLOSED côté `/p` ou feedback join cohérent avec la projection. |
| **Priorité / effort** | BLOQUANT confiance · CS léger |
| **Tags** | **[CODE]** · **[HYPOTHÈSE]** (fréquence du ressenti en live réel) |

---

### P3 — Hiérarchie régie Essentiel vs Avancé + presets usage

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/admin/event/[id]` |
| **Utilisateur** | Organisateur desktop / streamer |
| **Problème observé** | Densité extrême : triple colonne + header admin sticky + toasts + badges TEST/FUN/socket. Actions dupliquées (cartes Vote centrales **et** PollCard). Auto-rotate **et** auto-reveal. Pour EVG fun : trop d’options ; pour streamer : manquent des presets de show. |
| **Recommandation** | Zones Essentiel / Projection / Partage / Avancé + presets Soirée / Conférence / Stream. Conserver la richesse, imposer la hiérarchie. |
| **Priorité / effort** | IMPORTANT pilotage · CS |
| **Tags** | **[CODE]** |

---

### P4 — Renommer / relabel « Salle live » vs régie vs join

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/admin/events/[id]/live` · dashboard · régie · `/join` |
| **Utilisateur** | Organisateur |
| **Problème observé** | `/live` = personnalisation salle, **pas** la régie. Labels qui se chevauchent : Salle live / Ma salle / Ouvrir la salle / Entrée participant / Vote direct. Singulier `event` = régie ; pluriel `events` = liste + editors. |
| **Recommandation** | Renommer UI « Salle live » → « Apparence de la salle » ; label `/live` explicite ; clarifier nav dashboard. |
| **Priorité / effort** | IMPORTANT · QW |
| **Tags** | **[CODE]** |

---

### P5 — Mini-régie mobile 4 actions

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Régie &lt;1024 px |
| **Utilisateur** | Organisateur smartphone |
| **Problème observé** | Adaptation existe (Menu / Pilotage / sheets / Partage) — pas un clone desktop. Mais empilement Menu + Pilotage + sheets + header compte = lourd pour « je tiens le micro et mon téléphone ». |
| **Recommandation** | Régie mobile minimale distincte : 3–4 actions + état vote + QR. |
| **Priorité / effort** | IMPORTANT · CS |
| **Tags** | **[CODE]** · **[HYPOTHÈSE]** (confort réel device authentifié non vérifié) |

---

### P6 — Copy attentes participant plus humaines

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/join/[slug]` états WAITING / PAUSED |
| **Utilisateur** | Participant |
| **Problème observé** | Copy « La régie prépare la suite du live » — opaque pour un invité de mariage / EVG. |
| **Recommandation** | Messages plus humains / progressifs (« Ça va bientôt commencer », etc.). |
| **Priorité / effort** | IMPORTANT · QW |
| **Tags** | **[CODE]** |

---

### P7 — Mot de passe oublié

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/login` |
| **Utilisateur** | Organisateur |
| **Problème observé** | Pas de lien « Mot de passe oublié ? » visible. |
| **Recommandation** | Ajouter recovery (même flux mail minimal). |
| **Priorité / effort** | IMPORTANT compte · QW / CS mail |
| **Tags** | **[PROD]** |

---

### P8 — Empty/error overlay transparent ; screen erreur sans QR faux

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/overlay/[slug]` · `/screen/[slug]` |
| **Utilisateur** | Streamer / prospect / orga projection |
| **Problème observé** | `/overlay/demo` : erreur + **fond blanc** (mauvais pour OBS). `/screen/demo` : « Événement introuvable » **avec QR encore affiché** (contradiction). |
| **Recommandation** | Overlay erreur rester transparent ; screen erreur sans QR menteur ; différencier erreur vs attente. |
| **Priorité / effort** | IMPORTANT démo/OBS · QW |
| **Tags** | **[PROD]** (demo) · **[CODE]** (overlay transparent en usage nominal) |

---

### P9 — Seed ou retirer `/p|screen|overlay/demo` API

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/p/demo`, `/screen/demo`, `/overlay/demo` vs `/join/demo`, `/e/demo` |
| **Utilisateur** | Prospect |
| **Problème observé** | Seed `demo` API absent en prod alors que démos offline join/e existent. Continuité démo cassée pour screen/p/overlay. |
| **Recommandation** | Seed événement demo en prod **ou** retirer / ne plus lier ces URLs côté marketing. |
| **Priorité / effort** | AMÉLIORATION · QW ops |
| **Tags** | **[PROD]** |

---

### P10 — Unifier accent marque bleu / violet

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Marketing `/` · header · join/vote · login |
| **Utilisateur** | Tous |
| **Problème observé** | Marketing violet `#7c3aed` ; header CTA et produit bleu `#2563eb` ; dissonance observée. |
| **Recommandation** | Unifier accent primary marketing ↔ produit. |
| **Priorité / effort** | AMÉLIORATION · QW |
| **Tags** | **[PROD]** · **[CODE]** |

---

### P11 — Toasts FR + tutoiement + hide meta `/p`

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Régie toasts · `/p` · copy participant |
| **Utilisateur** | Orga + participant |
| **Problème observé** | Toasts ASCII (« Vote ferme », « Sync live connectee ») **[CODE]** ; tutoiement erreurs (« Sélectionne… », « ton vote ») vs vouvoiement succès **[CODE]** ; meta « Créé le / Lien public / Page votant » sur `/p` **[CODE]** / badge observé **[PROD]** sur `/p/demo`. |
| **Recommandation** | Accents FR ; harmoniser tutoiement ; retirer meta debug `/p`. |
| **Priorité / effort** | AMÉLIORATION · QW |
| **Tags** | **[CODE]** · **[PROD]** (badge page votant erreur demo) |

---

### P12 — Checklist pré-live post-création

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Post `/admin` → régie |
| **Utilisateur** | Organisateur FUN / EVG |
| **Problème observé** | Atterrissage immédiat en régie sans checklist « prêt pour le live » (QR testé ? salle look ? mode réel ? écran ouvert ?). |
| **Recommandation** | Checklist pré-live légère après création. |
| **Priorité / effort** | IMPORTANT FUN · CS léger |
| **Tags** | **[CODE]** |

---

### P13 — Unifier routes `event` / `events`

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/admin/event/…` vs `/admin/events/…` |
| **Utilisateur** | Organisateur (nav) |
| **Problème observé** | Double arborescence opaque ; dette UX documentée. |
| **Recommandation** | Unifier IA routes admin (Pilotage / Apparence / Landing / Résultats). |
| **Priorité / effort** | AMÉLIORATION dette · CS |
| **Tags** | **[CODE]** |

---

### P14 — Footer légal + contraste eyebrow

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/` · `/pricing` · site marketing |
| **Utilisateur** | Prospect / leads (consent) |
| **Problème observé** | Eyebrow « VOTE INTERACTIF EN DIRECT » trop pâle **[PROD]** ; footer CGU / confidentialité absent **[PROD]**. |
| **Recommandation** | Contraste eyebrow ; liens footer légaux. |
| **Priorité / effort** | AMÉLIORATION · QW |
| **Tags** | **[PROD]** |

---

### P15 — Masquer Écran B / auto-rotate derrière Avancé

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Régie — `BlocProjectionEcran` |
| **Utilisateur** | Organisateur (surtout FUN) |
| **Problème observé** | Multi-écran B et rotation auto puissants mais rares EVG ; ajoutent à la densité. |
| **Recommandation** | Replier derrière « Options avancées ». |
| **Priorité / effort** | AMÉLIORATION · QW |
| **Tags** | **[CODE]** |

---

### P16 — Templates EVG / Stream

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Création / presets |
| **Utilisateur** | Orga FUN / streamer |
| **Problème observé** | Time-to-live élevé pour un EVG express ; pas de template 1-clic ni « Pack stream » guidé. |
| **Recommandation** | Templates EVG / Stream (acquisition). |
| **Priorité / effort** | PLUS TARD · CS |
| **Tags** | **[CODE]** (absence) · **[HYPOTHÈSE]** (impact conversion) |

---

### P17 — Google auth / wordcloud / abos

| Champ | Contenu |
|-------|---------|
| **Écran / route** | Auth · schéma PollType · pricing mode `full` |
| **Utilisateur** | Orga / prospect |
| **Problème observé** | Auth Google stub 501 **[CODE]** ; enums YES_NO, RATING, RANKING, OPEN_TEXT, WORD_CLOUD non branchés **[CODE]** ; abonnements pricing full factices **[CODE]**. |
| **Recommandation** | Ne pas exposer ; roadmap claire ou purge. Pas manquant pour MVP core. |
| **Priorité / effort** | PLUS TARD · CS |
| **Tags** | **[CODE]** |

---

### P18 — Purge `/poll/[id]` + enums morts

| Champ | Contenu |
|-------|---------|
| **Écran / route** | `/poll/[id]` · schéma |
| **Utilisateur** | Dette produit / liens legacy |
| **Problème observé** | Dual `/p` vs `/poll` ; types morts dans schéma. |
| **Recommandation** | Redirect → `/p` ou déprécier ; purger enums ou roadmap. |
| **Priorité / effort** | PLUS TARD nettoyage · QW/CS |
| **Tags** | **[CODE]** |

---

### Autres frictions étayées (hors ID P1–P18, déjà dans les sources)

| ID local | Friction | Route / zone | User | Reco | Tag |
|----------|----------|--------------|------|------|-----|
| F-A | Lead / concours formulaire surprise post-choix | `/p` | Participant | Prévenir avant vote | **[CODE]** |
| F-B | Limite participants sans UI votant dédiée | Join / Poll | Participant | Message clair côté votant | **[CODE]** |
| F-C | Peu de `env(safe-area)` join/poll | Join / Poll | Participant iPhone | Safe-area bas de page | **[CODE]** |
| F-D | Tooltips régie obsolètes vs boutons | Régie | Orga | Aligner libellés | **[CODE]** |
| F-E | Header admin sticky **sur** régie (double sticky) | Régie | Orga | Réduire chrome | **[CODE]** |
| F-F | Duplication event **sans** photos landing | Dashboard | Orga | Avertir ou cloner photos | **[CODE]** |
| F-G | Statuts DRAFT/PAUSED non branchés — tout naît PUBLISHED | Création | Orga | Clarifier ou brancher | **[CODE]** |
| F-H | Pricing mode `full` fantôme si exposé | `/pricing` | Prospect | Aligner launch only | **[CODE]** |
| F-I | Nav marketing sans doc/FAQ/aide | `/` | Prospect | Page aide ou FAQ | **[PROD]** |
| F-J | Preuve sociale absente | `/` | Prospect | Témoignages / chiffres | **[PROD]** |
| F-K | Tabs pricing sans filtrage dynamique | `/pricing` | Prospect | Filtrer ou clarifier | **[PROD]** |
| F-L | `screen:action` sans auth | Socket | Sécurité | Auth actions écran | **[CODE]** (dette tech connue) |
| F-M | Socket / réseau salle drop | Join | Participant | UX retry | **[HYPOTHÈSE]** non mesuré |
| F-N | Galerie `/e/demo` non cliquable | `/e/demo` | Prospect | Interaction démo | **[PROD]** |
| F-O | « Rejouer la démo » vs « Voter à nouveau » | `/join/demo` | Prospect | Libellé plus clair | **[PROD]** |

---

## 5. Analyse détaillée — Participant mobile

**Référentiel :** téléphone en main, bruyant, une main, scan QR, pas de formation.

### 5.1 Observé en prod — `/join/demo` [PROD]

Captures : `09-join-demo-mobile-iphone.webp`, `10-join-demo-mobile-selected.webp`, `11-join-demo-mobile-results.webp`.

- Tap targets OK, CTA pleine largeur, options radio confortables, résultats animés clairs.  
- Message « sans compte ni installation » bien tenu.  
- QR de test affiché desktop, masqué mobile (logique).  
- Après vote : « Merci ! Vote pris en compte. » + barres % + badge « Votre choix » + « Rejouer la démo ».  
- La démo **court-circuite** le hub live réel : vote + résultats sur **une** page — donc **trop flatteuse** vs live EVG.

### 5.2 Live réel — états et copy [CODE]

Source d’états : `liveStateUx.js`.

| État UX | Titre | Corps join typique |
|---------|-------|-------------------|
| WAITING | Préparez-vous à répondre | « La régie prépare la suite du live. » |
| VOTING | Choisissez votre réponse | CTA « Voter maintenant » → `/p` |
| CLOSED | Votre réponse est prise en compte | Attente résultats |
| RESULTS | Résultats en direct | « Consulter les résultats » |
| PAUSED | Pause en cours | « La reprise du direct est imminente. » |
| FINISHED | Événement terminé | « Merci d’avoir participé. » |

Sur `/p` : vote open → voting ; sinon waiting (sauf finished) — **ne suit pas** display projection.

### 5.3 Frictions participant mobile (tableau enrichi)

| Où | Friction | Pourquoi ça compte | Corriger ? | Tag |
|----|----------|--------------------|------------|-----|
| QR → `/join` → CTA → `/p` | **Deux étapes** | Tap perdu en EVG | Oui — QW vote direct / auto `/p` | **[CODE]** |
| `/join` WAITING/PAUSED | Copy « régie » | Opaque invité mariage | Oui — copy humaine | **[CODE]** |
| `/p` ≠ projection | Ignore `displayState` | « Ça marche pas » | Oui — aligner RESULTS/CLOSED | **[CODE]** |
| Tutoiement / vouvoiement | Incohérence ton | Sentiment amateur | QW | **[CODE]** |
| Lead / concours post-choix | Formulaire surprise | Abandon | Prévenir avant | **[CODE]** |
| Limite participants | Pas d’UI votant | Bloqué sans explication | Important | **[CODE]** |
| Meta Créé le / Lien public | Bruit | Distrait | Hide | **[CODE]** |
| `/e` puis `/join` | Deux portes | Landing partagée comme QR vote | Clarifier CTA | **[CODE]** |
| Safe-area / notch | Peu de safe-area | Bas iPhone | Amélioration | **[CODE]** |
| Socket / réseau | Non mesuré | « Connexion au live… » bloquant | Ops + retry | **[HYPOTHÈSE]** |

### 5.4 Responsive & patterns [CODE] + homepage mobile [PROD]

- CTA join/poll `min-height: 50px` ≤640 px ; cartes glass ~36–42 rem.  
- Police system-ui stack sur salle/vote.  
- Homepage 390 px **[PROD]** captures 19–20 : hero lisible, CTAs pleine largeur, mockup OK, nav horizontale sans hamburger (risque troncature mineur).  

### 5.5 Verdict participant mobile

La **cible** est bonne (gros boutons, hub unique, pas de compte). Le ressenti EVG « compliqué » vient surtout du **parcours live multi-états + double page**, pas d’un design mobile raté sur la démo. **[PROD]** + **[CODE]** + **[HYPOTHÈSE]** ressenti terrain.

---

## 6. Analyse détaillée — Régie desktop

**Non vérifié en session authentifiée prod.** Analyse **[CODE]** : `app/admin/event/[eventId]/page.jsx` (~8150 L) + notes internes orga.

### 6.1 Intention

Console de **pilotage serein en direct** : vote, progression, chrono, projection, partage QR/OBS, aperçu salle.

### 6.2 Contrôles essentiels présents [CODE]

Ouvrir/Fermer vote · Question suivante · Terminer · chrono · auto-révélation 3/5/10 s · multi-écran (principal + B) · modes projection · presets overlay · QR exports · concours · photo landing · ajout question live.

### 6.3 Vocabulaire exact (extraits) [CODE]

- « Console live », « Régie live », « Pilotage du direct »  
- Vote ouvert / fermé · « Révélation automatique des résultats »  
- Projection : Standard, Grande salle (QR XXL), QR plein écran, Résultats focus, Écran B  
- Overlay : Stream compact (« Parfait pour Twitch / OBS »), Sans QR, Minimal, QR seul…  
- Partage : « Ma salle » ↔ « Vote direct »  
- Toasts : « Vote ferme », « Sync live connectee », « Evenement termine »

### 6.4 Pilotage serein ? — matrice

| Problème | Impact live | Priorité | Tag |
|----------|-------------|----------|-----|
| Densité extrême (3 cols + header sticky + toasts + badges) | Charge cognitive sous pression | BLOQUANT UX régie | **[CODE]** |
| Actions dupliquées (Vote + PollCard) | Hésitation « lequel ? » | IMPORTANT | **[CODE]** |
| Auto-rotate **et** auto-reveal | Automatismes qui se marchent dessus | IMPORTANT | **[CODE]** |
| Tooltips vs boutons obsolètes | Doute | AMÉLIORATION | **[CODE]** |
| Toasts ASCII | Sentiment brouillon | QUICK WIN | **[CODE]** |
| `/live` = perso salle, pas régie | Navigation trompeuse | IMPORTANT | **[CODE]** |
| Mode TEST vs réel | Risque live « faux » résultats | IMPORTANT | **[CODE]** |

### 6.5 Dashboard & création (contexte régie) [CODE]

- Dashboard « Mes événements » : CTA primaire « Ouvrir la régie » ; secondaires salle / écran / landing ; config « Salle live » / Landing / Leads / Stats.  
- Création : 5 types, preview sticky, succès → `router.replace` régie directe.  

### 6.6 Verdict régie desktop

Desktop-first **légitime** ; richesse OK **si** hiérarchie « 3 actions vitales » ressort. Aujourd’hui le pilote doit **apprendre** la console. Pour EVG fun : trop d’options visibles ; pour streamer/conférence : manquent plutôt des **presets de show** que des boutons en moins.

---

## 7. Analyse — Organisateur mobile

**[CODE]** breakpoints régie &lt;1024 → drawers Menu / Voir ma salle / sheet Réponses / accordion Partage. Header admin « Plus » ≤640.

| Attendu smartphone orga | État |
|-------------------------|------|
| Ouvrir / fermer vote | Possible via Pilotage |
| Question suivante / Terminer | Présent |
| Voir QR / lien | Accordion Partage |
| Voir aperçu salle | Drawer |
| Config profonde (landing, couleurs, analytics) | Accessible mais pénible |

**Verdict :** ce n’est **pas** un clone desktop — bonne intention. Manque une **régie mobile minimale** (3–4 actions + état vote + QR) distincte de la console desktop. **Non vérifié** sur device réel authentifié → confort live = **[HYPOTHÈSE]** au-delà de la structure code.

---

## 8. Analyse — Screen / Overlay / OBS

### 8.1 `/screen/[slug]` — projection salle

**[CODE]** Plein écran, branding room, QR coin (masqué en question / results_focus). Modes `pm=` : Standard, Grande salle QR XXL, QR plein écran, Résultats focus. États UX partagés (`liveStateUx`) — cohérents avec join.

**[PROD]** `/screen/demo` (capture `15-screen-demo-waiting-state.webp`) : fond sombre · « Préparez-vous à répondre » · « Événement introuvable. » · **QR encore affiché** vers `/join/demo` — contradiction visuelle.

### 8.2 `/overlay/[eventSlug]` — OBS

**[CODE]** Fond transparent, variants compact/standard/large/minimal, positions, `only=qr`. Attente → **panneau vide** (comportement OBS correct). Presets régie bien nommés.

**[PROD]** `/overlay/demo` (capture `16-overlay-demo-error-white-bg.webp`) : erreur → **fond blanc**.

### 8.3 Comparatif salle vs OBS [CODE]

| | Salle `/screen` | OBS `/overlay` |
|---|-----------------|----------------|
| Fond | Plein viewport, branding | Transparent |
| QR | Coin fixe + QR dans question | Dans panneau / `only=qr` |
| Waiting | Titre UX grand | Souvent rien (empty) |
| Contrôle | `pm`, `sid` | `mode`, `variant`, `position`, `theme` |

### 8.4 Frictions Screen / Overlay

| Où | User | Friction | Corriger ? | Tag |
|----|------|----------|------------|-----|
| Screen vs overlay | Streamer | Deux URLs, rôles proches mal expliqués hors régie | Oui — micro-guide | **[CODE]** |
| Multi-écran A/B | Orga salle | Puissant mais rare EVG | Garder avancé, replier | **[CODE]** |
| `screen:action` sans auth | Sécurité | Risque spoof display | Chantier sécu | **[CODE]** |
| Seed `demo` absent | Prospect | Screen/overlay/p non « live » | Ops contenu démo | **[PROD]** |
| Overlay erreur blanc | Streamer | Casse vérif transparence | Empty transparent | **[PROD]** |
| Screen erreur + QR | Prospect / orga | Message contradictoire | Masquer QR si introuvable | **[PROD]** |

### 8.5 Twitch / stream — forces & faiblesses [CODE]

**Forces :** overlay dédié ; presets nommés Twitch/OBS ; variants sans QR / QR seul / compact ; corners.

**Faiblesses :** pas de parcours guidé « Je streame » 3 étapes ; erreur fond blanc **[PROD]** ; régie mélange salle physique et stream sans mode stream ; pricing overlay surtout EVENT ; pas d’intégration chat Twitch (non bloquant MVP).

**Reco pragmatique :** preset « Pack stream » (overlay compact + QR seul + régie allégée) &gt; nouvelles features Twitch API.

---

## 9. Fonctions existantes à conserver

Classification issue de l’audit produit validé + inventaire tech (implémentation code).

| Fonction | Classe | Pourquoi conserver |
|----------|--------|-------------------|
| Création event + questions choix | Essentielle | Cœur produit |
| Régie open/close vote, next, finish | Essentielle | Live prouvé EVG |
| Join + vote mobile + résultats | Essentielle | Promesse sans app |
| QR / lien participant | Essentielle | Entrée audience |
| `/screen` projection | Essentielle EVENT / utile FUN TV | Séparation salle |
| Mode TEST vs réel + activations FUN/EVENT | Essentielle business | Garde-fou + monétisation |
| Timer question | Utile | Timing scène |
| Auto-révélation | Utile | Confort régie |
| Customization salle (logo/couleurs) | Utile EVENT | Différenciation |
| Overlay OBS + presets | Avancée / essentielle stream | Architecture saine |
| Multi-écran B | Avancée | Cas pro rares |
| Lead capture + export | Utile pro | Promesse EVENT |
| Concours + tirage | Utile FUN | Différenciant soirée |
| Quiz + reveal | Utile | Gamification |
| Landing `/e` + galerie | Utile marketing event | Avant/pendant/après |
| Analytics + CSV + share token | Utile EVENT | Après-coup |
| Ajout question live | Utile | Flexibilité direct |
| Dupliquer event | Utile (partielle sans photos) | Time-to-next |
| Admin-internal | Essentielle ops AVOTE | Exploitation |

**Principe :** hiérarchie + progressivité (presets, disclosure), **pas** purge des capacités live déjà vendues (OBS, leads, concours, quiz).

### Points forts à conserver absolument

1. Promesse sans app / sans compte votant. **[PROD]**  
2. Démo `/join/demo` immédiate. **[PROD]**  
3. États live centralisés (`liveStateUx`). **[CODE]**  
4. Régie complète capable d’un vrai direct. **[CODE]** + preuve EVG terrain  
5. Séparation screen (salle) / overlay (OBS). **[CODE]**  
6. Types lead / concours / quiz. **[CODE]**  
7. FUN / EVENT compréhensibles en mode launch. **[PROD]**  
8. Mode TEST avant réel. **[CODE]**  
9. CTA marketing « Faites voter votre audience en direct ». **[PROD]**  
10. Responsive participant démo comme référence visuelle vote. **[PROD]**  

---

## 10. Fonctions difficiles à découvrir

Toutes **[CODE]** (surfaces régie / admin non vues en session prod) :

- Presets overlay (rail droit / accordion mobile).  
- Toggle QR « Ma salle » vs « Vote direct ».  
- Modes projection `pm` / Écran B.  
- Auto-révélation + délais.  
- Rotation automatique.  
- Exports QR HD / PDF / SVG / miroir textile.  
- Lien rapport compte readonly.  
- Ajouter question en live.  
- Différence `/admin/events/[id]/live` vs régie.  
- Start réel / consommation activation (présent mais stressant).  
- Photo landing depuis régie.  

---

## 11. Incohérences de navigation et vocabulaire

### 11.1 Navigation

| Incohérence | Détail | Tag |
|-------------|--------|-----|
| Routes `event` vs `events` | Régie/ops au singulier ; liste + editors au pluriel | **[CODE]** |
| `/live` ≠ live régie | Personnalisation salle | **[CODE]** |
| Démo simple vs live riche | 1 page démo vs 2 pages live | **[PROD]** + **[CODE]** |
| Hop orga dashboard→régie→perso ailleurs | Personnalisation hors flux création | **[CODE]** |
| CTAs marketing multiples | Tester / Voir démo / Créer gratuit / mon événement | **[PROD]** |
| Header admin sticky sur régie | Double sticky | **[CODE]** |
| Nav marketing minimale | Seulement Tarifs + Créer ; pas FAQ/aide | **[PROD]** |

### 11.2 Vocabulaire

| Zone | Termes concurrents | Tag |
|------|-------------------|-----|
| Entrée participant | salle / join / Ma salle / Salle live / Ouvrir la salle / Entrée participant / Vote direct | **[CODE]** |
| Pilotage | Console live / Régie live / Pilotage du direct / Ouvrir la régie | **[CODE]** |
| Offre | FUN / EVENT vs Soirées privées / Événements pro | **[PROD]** |
| Types | Lead / Concours (B2B) pour public EVG | **[PROD]** + **[CODE]** |
| Projection | Projection écran / Affichage en salle / Overlay stream | **[CODE]** |
| Ton participant | Tutoiement erreurs / vouvoiement succès | **[CODE]** |
| Analytics | Filtres EN (Single, Contest…) | **[CODE]** |
| Couleur marque | Violet marketing / bleu produit | **[PROD]** |

### 11.3 `/e` vs `/join` [CODE]

| | `/e/[slug]` | `/join/[slug]` |
|---|-------------|----------------|
| Rôle | Vitrine avant/pendant/après | Salle live interactive |
| CTA | Participer / Rejoindre la salle live → join | Voter maintenant → `/p` |
| Si landing off | Redirect → join | — |

Séparation claire vitrine / salle, au prix d’un hop supplémentaire vers le vote.

---

## 12. Quick wins

Liste consolidée (effort QW) — chaque item étayé.

| # | Quick win | Lien P / F | Tag |
|---|-----------|------------|-----|
| 1 | QR défaut « Vote direct » FUN / promouvoir option régie | P1 | **[CODE]** |
| 2 | Auto-open `/p` depuis join si vote ouvert | P1 | **[CODE]** |
| 3 | Copy attentes participant plus humaines | P6 | **[CODE]** |
| 4 | Renommer « Salle live » → « Apparence de la salle » | P4 | **[CODE]** |
| 5 | Masquer Écran B / auto-rotate derrière Avancé | P15 | **[CODE]** |
| 6 | Harmoniser tutoiement ; retirer meta debug `/p` | P11 | **[CODE]** |
| 7 | Toasts régie accents FR | P11 | **[CODE]** |
| 8 | Contraste eyebrow homepage ; CTA header aligné | P10, P14 | **[PROD]** |
| 9 | Lien « Mot de passe oublié » | P7 | **[PROD]** |
| 10 | Empty states screen/overlay : pas de QR menteur ; overlay erreur transparent | P8 | **[PROD]** |
| 11 | Footer CGU / confidentialité | P14 | **[PROD]** |
| 12 | Seed demo API ou retirer liens screen/p/overlay demo | P9 | **[PROD]** |

---

## 13. Chantiers structurels

Sans plan de sprints — chantiers produit/UX identifiés.

| # | Chantier | Lien P | Tag |
|---|----------|--------|-----|
| 1 | Architecture UX régie : Essentiel / Projection / Partage / Avancé + presets Soirée / Conférence / Stream | P3 | **[CODE]** |
| 2 | Mini-régie mobile 4 actions | P5 | **[CODE]** |
| 3 | Parcours participant unique pendant VOTING (join = waiting room hors vote) | P1, P2 | **[CODE]** |
| 4 | Alignement téléphone ↔ écran (au moins RESULTS/CLOSED) | P2 | **[CODE]** |
| 5 | Checklist pré-live + templates FUN | P12, P16 | **[CODE]** |
| 6 | Unifier routes admin `event(s)` | P13 | **[CODE]** |
| 7 | Alignement pricing unique (pas de mode full fantôme) | F-H, P17 | **[CODE]** |
| 8 | Guidage OBS 3 étapes / Pack stream | §8.5 | **[CODE]** |
| 9 | Message limite participants côté votant | F-B | **[CODE]** |
| 10 | Auth actions socket écran | F-L | **[CODE]** |
| 11 | Recovery MDP (si flux mail complet) | P7 | **[PROD]** / **[CODE]** |
| 12 | Nettoyage legacy `/poll` + enums + Google stub | P17, P18 | **[CODE]** |

**Ordre de reprise produit suggéré (sans ops L0) — issu de l’audit validé :**

1. Participant live (P1, P2, P6) — répond au retour EVG.  
2. Clarté orga (P4, P12, P15) — moins d’erreurs de porte.  
3. Régie respirable (P3, P5) — chantiers.  
4. Confiance & polish (P7–P11, P14).  
5. Dette structurelle (P13, P17–P18) quand le live est serein.

---

## 14. Architecture UX cible proposée

### 14.1 Quatre modes d’usage

| Mode | Device | Principe | Surfaces principales |
|------|--------|----------|----------------------|
| **A — Participant** | Mobile-first | 1 job : répondre vite | QR → vote ; hub seulement hors vote |
| **B — Régie / streamer** | Desktop-first | Pilotage serein : Vote / Suivant / Écran | Régie dense OK, progressive disclosure |
| **C — Orga smartphone** | Mobile contrôle | 4 actions + statut + QR | Mini-régie ≠ clone |
| **D — Écran public** | TV / OBS | Lecture seule visuelle | `/screen` salle · `/overlay` stream |

### 14.2 Information architecture cible (orga)

```
Mes événements
 └─ [Event]
      ├─ Pilotage          (/régie)     ← défaut post-création
      ├─ Apparence salle   (ex-/live)
      ├─ Page événement    (landing)
      ├─ Résultats & leads
      └─ Paramètres (limites, formule, danger zone)
```

### 14.3 Parcours live cible participant

```
Scan → si vote ouvert : écran choix immédiat
     → sinon : « Ça va bientôt commencer » (copy humaine)
     → après vote : confirmation → résultats quand la salle les montre
```

### 14.4 Régie cible (desktop)

1. **Bandeau statut** unique (TEST/Réel, vote ouvert/fermé, n participants).  
2. **Colonne actions** : Ouvrir/Fermer · Suivant · Terminer · Chrono.  
3. **Colonne questions.**  
4. **Tiroir Partage** : QR · Screen · Overlay (presets).  
5. **Avancé** replié : Écran B, auto-rotate, exports exotiques.

### 14.5 Matrice effort mental (actuel → cible)

| Persona | Charge mentale aujourd’hui | Cible |
|---------|---------------------------|-------|
| Participant | Moyenne (états + 2 pages) | Faible |
| Orga EVG desktop | Haute (régie) | Moyenne avec presets |
| Orga smartphone | Haute | Faible (mini-régie) |
| Streamer OBS | Moyenne-haute | Moyenne |

---

## 15. Proposition de vision cible AVOTE V1

*Vision produit / UX / positionnement — **pas** un backlog de lots ni un plan de sprints.*

### 15.1 Positionnement

AVOTE V1 est l’outil d’**animation d’audience en direct** le plus simple à lancer pour une soirée, et assez puissant pour une conférence ou un stream — sans forcer le participant à installer quoi que ce soit.

- **FUN** : soirées, EVG/EVJF, mariages — time-to-live minimal, QR vote direct, mini contrôle téléphone.  
- **EVENT** : conférences, formations, pro — projection salle, branding, analytics, leads, overlay OBS.  
- Ce n’est **pas** un LMS, un Google Form, ni une feature Twitch native : c’est une **régie de vote live** avec surfaces d’audience (téléphone + écran).

### 15.2 Promesse V1 (une phrase)

> Un QR. Une réponse en quelques secondes. Des résultats que toute la salle (ou le stream) voit au même moment — organisateur serein, participant sans friction.

### 15.3 Expérience participant V1

- **Un job** : répondre.  
- Si le vote est ouvert, le téléphone **montre le choix immédiatement** (plus de hop inutile).  
- Hors vote : message humain d’attente, pas de jargon « régie ».  
- Après vote : confirmation claire, puis **alignement** avec ce que voit la salle (au moins résultats).  
- Toujours : sans compte, sans app, gros taps, copy cohérente (un seul ton).

### 15.4 Expérience organisateur V1

- **Desktop** : régie complète mais **respirable** — trois actions vitales toujours visibles ; le reste en Partage / Avancé ; presets Soirée / Conférence / Stream.  
- **Mobile** : contrôle express (ouvrir/fermer, suivant, QR, statut) — pas un clone de la console.  
- **Préparation** : checklist courte « prêt pour le live » après création ; vocabulaire unique (Pilotage / Apparence / Page événement).  
- **TEST → réel** : garde-fou visible et rassurant, pas anxiogène.

### 15.5 Expérience écran / stream V1

- **Screen** = salle physique (plein écran, branding, QR contextuel).  
- **Overlay** = OBS (toujours transparent, y compris en erreur).  
- Pack stream guidé en 3 gestes : copier URL → coller OBS → vérifier transparence.  
- Multi-écran B et modes rares : disponibles, non imposés.

### 15.6 Offre & confiance V1

- Une seule vérité tarifaire : **FUN / EVENT** launch (pas de grille fantôme).  
- Footer légal, recovery compte, contraste et marque unifiés.  
- Continuité démo : ce que le prospect teste sur téléphone doit **ressembler** au live réel (sans mentir sur la complexité restant côté orga).

### 15.7 Ce que V1 refuse explicitement

- Purger leads, concours, quiz, OBS « pour simplifier ».  
- Transformer AVOTE en suite SaaS généraliste (abos multi-plans, wordcloud, OAuth Google) avant que le live participant + régie soient sereins.  
- Faire de la démo marketing une expérience **plus simple** que le produit réel sans rapprocher le live de cette simplicité.

### 15.8 Critère de succès produit (qualitatif)

Un organisateur EVG non technique ouvre la régie, partage un QR, ouvre un vote, et les invités votent **sans demander d’aide** ; le pilote n’hésite pas entre deux boutons « fermer le vote » ; le streamer vérifie son overlay sans fond blanc d’erreur.

---

## 16. Inventaire des preuves visuelles

Chemin de base : `media/audit-ux-screenshots/`

| Fichier | Contenu |
|---------|---------|
| `01-homepage-desktop-hero.webp` | Hero proposition de valeur |
| `02-homepage-desktop-features.webp` | Résultats temps réel |
| `03-homepage-desktop-how-it-works.webp` | Comment ça marche |
| `04-homepage-desktop-event-page.webp` | Page événementielle |
| `05-homepage-desktop-vote-types.webp` | Types de votes |
| `06-pricing-desktop.webp` | FUN vs EVENT |
| `07-login-desktop.webp` | Connexion admin |
| `08`–`12` | `/join/demo` desktop + mobile vote/résultats |
| `13`–`14` | `/e/demo` hero + galerie |
| `15-screen-demo-waiting-state.webp` | Screen demo erreur + QR |
| `16-overlay-demo-error-white-bg.webp` | Overlay demo fond blanc |
| `17-p-demo-vote-page-error.webp` | Page votant demo erreur |
| `18-join-invalid-slug-error.webp` | Slug invalide |
| `19`–`20` | Homepage mobile 390 px |

---

## 17. Synthèse exécutive

1. Produit **crédible et déjà prouvé** en EVG réel ; promesse « sans app » solide. **[PROD]** + terrain  
2. Participant **démo** excellent ; participant **live** compliqué surtout à cause du **double hop join→vote** et de la **désync téléphone/projection**. **[PROD]** / **[CODE]**  
3. Régie desktop **complète mais surchargée** — richesse à conserver, hiérarchie à imposer. **[CODE]**  
4. Orga mobile : adaptation existe, **pas** encore un contrôle express dédié. **[CODE]**  
5. Screen / overlay : bonne séparation salle vs OBS ; empty states démo à soigner. **[CODE]** / **[PROD]**  
6. Vocabulaire **salle / live / régie / landing** = dette UX n°1 organisateur. **[CODE]**  
7. FUN/EVENT launch = offre claire ; mode full/abos = ne pas laisser fuiter. **[PROD]** / **[CODE]**  
8. Manques pragmatiques : recovery MDP, checklist pré-live, alignement résultats mobile, mini-régie.  
9. Ne pas purger leads/concours/quiz/OBS — **progressivité** plutôt que simplification destructrice.  
10. Admin authentifié **non audité en session prod** ; conclusions régie = **[CODE]**.

### Sources

- Principal validé : `docs/audit-produit-ui-ux-avote.md`  
- Notes prod : `docs/audit-ux-avote-production.md`  
- Tech (DB 500 obsolète) : `docs/etat-des-lieux-avote-v1.md`  
- Internes : `internal/audit-produit-ux-admin-organizer.md`, `internal/audit-ux-participant-public.md`  
- Médias : `media/audit-ux-screenshots/`

---

RAPPORT PRODUIT DÉTAILLÉ COMPLET — AUCUN DÉVELOPPEMENT EFFECTUÉ
