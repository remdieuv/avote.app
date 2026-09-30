# AVOTE — Audit produit UI / UX / ergonomie

**Date :** 2026-09-30  
**Périmètre :** produit tel qu’un utilisateur le rencontre (UI, UX, parcours, cohérence, modes d’usage) — **aucun développement**.  
**Sources :** dépôt `/workspace` (routes, composants, libellés) · production publique `https://www.avote.app` (navigation réelle) · docs techniques existants (`etat-des-lieux-avote-v1.md`, `diagnostic-connexion-prod.md`, `rapport-reprise-audit.md`) lus sans réécriture.  
**Contexte ops actuel (fourni, non re-diagnostiqué ici) :** prod UP (Front Vercel, API Express Railway, Postgres Supabase Healthy) ; auth/admin OK ; EVG réel déjà animé (participants surtout smartphone, parfois « un peu compliqué ») ; instantané « DB 500 » **obsolète** pour la prod actuelle ; L0 DB retiré.

### Preuves / limites de vérification

| Surface | Vérifié comment | Statut |
|---------|-----------------|--------|
| Marketing `/`, `/pricing`, `/login` | Prod navigateur + HTTP 200 | Observé |
| Démo participant `/join/demo` | Prod desktop + mobile ~375–390 px | Observé (offline, sans API) |
| Landing démo `/e/demo` | Prod | Observé (démo locale) |
| `/screen/demo`, `/overlay/demo`, `/p/demo` | Prod HTTP + UI | Pages HTML OK ; **API slug `demo` absente** (404 métier, pas 500) → états d’erreur / attente, pas un live réel |
| Régie / dashboard / création / compte | Code JSX + structure UI | **Non vérifié en session authentifiée prod** (pas de credentials) |
| Socket live multi-écrans réel | — | Non mesuré runtime |
| Stripe checkout réel | — | Non exécuté |

Captures d’appui : `media/audit-ux-screenshots/` (homepage, pricing, login, join/demo, e/demo, screen/overlay/p erreurs, mobile 390 px). Notes techniques détaillées internes : `internal/audit-produit-ux-admin-organizer.md`, `internal/audit-ux-participant-public.md`.

---

## 1. Vision synthétique du produit actuel

AVOTE est une **plateforme de vote interactif en direct** pour animer une audience (soirée / EVG, conférence, formation, stream). L’organisateur crée un événement multi-questions, pilote depuis une **régie**, projette sur **écran salle** et/ou **overlay OBS**, et les participants votent sur **smartphone via QR / lien**, sans application ni compte votant.

**Promesse perçue (marketing + démo) :** « Un QR code. Quelques secondes pour répondre. Résultats affichés instantanément. » — claire, crédible, déjà validée en conditions réelles.

**Réalité produit (code + surfaces) :** MVP **avancé** — régie dense, 5 types opérationnels (choix unique/multiple, lead, concours, quiz), mode test vs réel + activations FUN/EVENT, landing événement, analytics/leads, multi-écrans + presets overlay. La richesse est surtout côté **organisateur / streamer** ; le participant est censé rester simple, mais le parcours live réel introduit des **états d’attente et une double surface join→vote** qui expliquent bien un ressenti EVG « un peu compliqué » sur téléphone.

**Positionnement perçu :** outil d’**animation live** (pas un LMS, pas un formulaire, pas un Twitch natif). Dualité FUN (soirées) / EVENT (pro + projection/OBS) structurante, mais vocabulaire parfois B2B (« Lead », « Régie », « Overlay ») pour un usage EVG.

---

## 2. Cartographie des interfaces

### Marketing & conversion

| Route | Rôle | Priorité usage |
|-------|------|----------------|
| `/` | Landing longue, preuve visuelle vote + résultats | Découverte |
| `/pricing` | FUN 19 € / EVENT 49 € (mode launch) ; grille full Starter/Pro/Premium si env | Achat |
| `/login` | Connexion / inscription organisateur | Accès orga |
| `/success` | Post-Stripe | Confirmation |

### Organisateur (auth requise — UI lue code ; session prod non ouverte)

| Route | Rôle |
|-------|------|
| `/admin` | Création événement + questions |
| `/admin/events` | Dashboard « Mes événements » |
| `/admin/event/[id]` | **Régie live** (console monolithique) |
| `/admin/event/[id]/analytics` · `/leads` | Stats / leads d’un event |
| `/admin/events/[id]/live` | **Personnalisation salle** (pas la régie) |
| `/admin/events/[id]/landing` · `/customization` | Landing + éditeur partagé |
| `/admin/analytics` · `/admin/leads` · `/admin/account` | Compte transversal |
| `/admin-internal/*` | Admin plateforme AVOTE |

### Participant / public

| Route | Rôle |
|-------|------|
| `/join/[slug]` | Hub « salle » live (états attente / vote / résultats / pause / fin) |
| `/join/demo` | Démo offline participant |
| `/p/[slug]` | Page de vote (et lead / concours / quiz) |
| `/poll/[id]` | Legacy vote par id |
| `/e/[slug]` | Landing événement (vitrine avant/pendant/après) |
| `/screen/[slug]` | Projection salle |
| `/overlay/[eventSlug]` | Overlay transparent OBS/stream |
| `/report/account/[token]` | Rapport compte partagé |

### Architecture d’interfaces (résumé)

```
Marketing ──► Login ──► Dashboard events ──► Création
                              │
                              ├─ Régie (pilotage)
                              ├─ Salle live (look & feel join)
                              ├─ Landing (éditor /e)
                              └─ Analytics / Leads / Compte
Participants: QR → join (± e) → p
Audience: screen | overlay
```

---

## 3. Cartographie des parcours utilisateurs

### P1 — Découverte → démo → création

1. `/` → CTA « Tester en live » → `/join/demo` (vote simulé)  
2. ou « Créer un événement gratuit » → `/admin` (redirige login si besoin)  
3. `/pricing` → Activer FUN/EVENT → Stripe → `/success`  
**Friction :** CTAs multiples (« Tester en live », « Voir une démo », « Créer un événement gratuit / mon événement ») ; header CTA bleu vs violet page.

### P2 — Préparation organisateur (code)

1. Créer (`/admin`) → atterrissage **direct régie**  
2. Optionnel : Salle live (couleurs/logo) · Landing · QR exports  
3. Mode TEST par défaut → « Passer en live réel » (consomme activation)  
**Friction :** on arrive en régie dense avant d’avoir forcément configuré la salle / compris TEST vs réel.

### P3 — Live salle (EVG / conférence)

1. Orga ouvre régie + `/screen`  
2. Participants scannent QR → `/join` → « Voter maintenant » → `/p` → valider  
3. Orga ferme vote / révèle / question suivante  
**Friction majeure participant :** **2 écrans** (hub + vote) + périodes d’attente où le téléphone ne « suit » pas forcément ce que montre la projection.

### P4 — Live stream / Twitch

1. Orga copie preset overlay → source navigateur OBS  
2. Chat/QR viewer → join/p  
3. Régie pilote vote + display overlay (souvent vide en attente = correct pour OBS)  
**Friction :** presets nombreux ; overlay en erreur slug montre fond blanc (mauvais pour OBS) ; dualité screen vs overlay à expliquer.

### P5 — Après coup

Analytics event/compte · leads CSV · landing souvenirs · partage rapport tokenisé.

---

## 4. Audit participant mobile (MOBILE-FIRST)

**Référentiel :** téléphone en main, bruyant, une main, scan QR, pas de formation.

### Observé en prod (`/join/demo`)

- Tap targets OK, CTA pleine largeur, options radio confortables, résultats animés clairs.  
- Message « sans compte ni installation » bien tenu.  
- La démo **court-circuite** le hub live réel : vote + résultats sur **une** page — donc **trop flatteuse** vs live EVG.

### Live réel (code + logique) — frictions EVG plausibles

| Où | Friction | Pourquoi ça compte | Corriger ? |
|----|----------|--------------------|------------|
| QR → `/join` → CTA → `/p` | **Deux étapes** pour voter | En EVG, chaque tap perdu = gens qui regardent ailleurs | **Oui** — quick win : QR « Vote direct » `/p` en défaut soirée, ou auto-redirect si vote ouvert |
| `/join` états WAITING/PAUSED | Copy « La régie prépare la suite du live » | Opaque pour un invité de mariage | **Oui** — messages plus humains / progressifs |
| `/p` ≠ projection | Commentaire code explicite : `/p` ne suit pas `displayState` | Téléphone en « attente » pendant que l’écran montre résultats → « ça marche pas » | **Oui** — aligner au moins RESULTS / CLOSED côté `/p` ou feedback join |
| Tutoiement erreurs (« Sélectionne… », « ton vote ») vs vouvoiement succès | Incohérence ton | Détail mais produit « amateur » | Quick win |
| Lead / concours post-choix | Formulaire surprise | Friction + abandon | Utile métier : **prévenir** avant vote |
| Limite participants | Pas d’UI dédiée votant | Bloqué sans explication claire | Important |
| Meta « Créé le / Lien public / Page votant » sur `/p` | Bruit | Distrait | Quick win hide |
| `/e` puis `/join` | Deux portes d’entrée | Si landing partagée à tort comme QR vote | Clarifier CTA landing |
| Safe-area / notch | Peu de `env(safe-area)` join/poll | Bas de page iPhone | Amélioration |
| Socket / réseau salle | Non mesuré ici | Drop = « Connexion au live… » bloquant | Ops + UX retry |

**Verdict participant mobile :** la **cible** est bonne (gros boutons, hub unique, pas de compte). Le ressenti EVG « compliqué » vient surtout du **parcours live multi-états + double page**, pas d’un design mobile raté sur la démo.

---

## 5. Audit régie desktop (DESKTOP-FIRST)

**Non vérifié en session authentifiée prod.** Analyse basée sur `app/admin/event/[eventId]/page.jsx` (~8150 L) + composants liés.

### Intention

Console de **pilotage serein en direct** : vote, progression, chrono, projection, partage QR/OBS, aperçu salle.

### Structure observée (code)

- Desktop ≥1024 : **3 colonnes** (questions / console / partage), console sombre « Console live », cartes Vote · Progression · Chrono.  
- Contrôles essentiels présents et nommés : Ouvrir/Fermer vote, Question suivante, Terminer, chrono, auto-révélation 3/5/10 s, multi-écran (principal + B), modes projection, presets overlay, QR exports, concours, photo landing.

### Question centrale — pilotage serein ?

**Partiellement.** La régie a la richesse nécessaire à un live pro, mais :

| Problème | Impact live | Priorité |
|----------|-------------|----------|
| Densité extrême (triple colonne + header admin sticky + toasts + badges TEST/FUN/socket) | Charge cognitive sous pression | BLOQUANT UX régie |
| Actions dupliquées (cartes Vote centrales **et** actions sur `PollCard`) | Hésitation « lequel ? » | IMPORTANT |
| Auto-rotate **et** auto-reveal | Automatismes qui se marchent dessus | IMPORTANT |
| Tooltips / anciens libellés vs boutons (« Afficher les résultats… » vs « Projeter les résultats finaux ») | Doute | AMÉLIORATION |
| Toasts ASCII (« Vote ferme », « Sync live connectee ») | Sentiment brouillon | QUICK WIN |
| `/live` = perso salle, pas régie | Navigation trompeuse | IMPORTANT |
| Mode TEST vs réel + « Passer en live réel » | Risque de live « faux » résultats | IMPORTANT (garde-fou clair) |

**Verdict :** desktop-first **légitime** ; richesse OK **si** hiérarchie « 3 actions vitales » ressort. Aujourd’hui le pilote doit **apprendre** la console. Pour un EVG fun, trop d’options visibles ; pour un streamer/conférence, manquent plutôt des **presets de show** (soirée vs conférence vs Twitch) que des boutons en moins.

---

## 6. Audit organisateur mobile (contrôle utile ≠ clone régie)

**Code :** breakpoints régie &lt;1024 → drawers Menu / Voir ma salle / sheet Réponses / accordion Partage. Header admin « Plus » ≤640.

| Attendu smartphone orga | État |
|-------------------------|------|
| Ouvrir / fermer vote | Possible via Pilotage | 
| Question suivante / Terminer | Présent |
| Voir QR / lien | Accordion Partage |
| Voir aperçu salle | Drawer |
| Config profonde (landing, couleurs, analytics) | Accessible mais pénible |

**Verdict :** ce n’est **pas** un clone desktop — bonne intention. Mais empilement **Menu + Pilotage + sheets + header compte** = encore lourd pour « je tiens le micro et mon téléphone ». Manque une **régie mobile minimale** (3–4 actions + état vote + QR) distincte de la console desktop.

**Non vérifié** sur device réel authentifié.

---

## 7. Audit écran / overlay / OBS

### `/screen/[slug]` — projection salle

- Plein écran, branding room, QR coin (masqué en question / results_focus).  
- Modes `pm=` : Standard, Grande salle QR XXL, QR plein écran, Résultats focus.  
- États UX partagés (`liveStateUx`) — cohérents avec join.  
**Prod `/screen/demo` :** événement seed absent → message d’erreur **avec QR encore affiché** (contradiction visuelle observée).

### `/overlay/[eventSlug]` — OBS

- Fond transparent, variants compact/standard/large/minimal, positions, `only=qr`.  
- Attente → **panneau vide** (comportement OBS correct).  
- Presets régie bien nommés (« Parfait pour Twitch / OBS », etc.).  
**Prod `/overlay/demo` :** erreur → **fond blanc** (mauvais pour vérifier le chroma / transparence).

### Frictions

| Où | User | Friction | Corriger ? |
|----|------|----------|------------|
| Screen vs overlay | Streamer | Deux URLs, rôles proches mal expliqués hors régie | Oui — micro-guide dans régie |
| Multi-écran A/B | Orga salle | Puissant mais rare EVG | Garder avancé, replier |
| `screen:action` sans auth (dette tech connue) | Sécurité | Hors UI mais risque spoof display | Chantier sécu |
| Seed `demo` absent prod | Démo marketing | Screen/overlay/p demo non « live » | Ops contenu démo |

---

## 8. Audit création et préparation d’événement

**Code `/admin` :** titre, description, questions (5 types), options, concours lot/gagnants, aperçu sticky, CTA → régie.

**Points forts :** types métier utiles dès la création ; preview ; pas de wizard interminable.

**Frictions :**

1. Atterrissage **immédiat en régie** sans checklist « prêt pour le live » (QR testé ? salle look ? mode réel ? écran ouvert ?).  
2. Personnalisation salle / landing = **autre arborescence** `/admin/events/...`.  
3. Duplication event **sans** photos landing (dette connue) → orga croit avoir tout cloné.  
4. Statuts DRAFT/PAUSED schéma **non branchés** — tout naît PUBLISHED.  
5. Pricing / activations séparés du flux création — OK, mais TEST vs réel peu mis en scène à la création.

---

## 9. Audit UI global

### Cohérence visuelle

| Zone | Accent | Fond | Police |
|------|--------|------|--------|
| Marketing | Violet `#7c3aed` | Gradient slate → blanc → lavande | system-ui (+ Geist vars HTML) |
| Header CTA | **Bleu** `#2563eb` | — | — |
| Join / vote / démo | Bleu event / indigo démo | Gradients room | system-ui stack |
| Régie | Console sombre + UI claire | Dense | system-ui |
| Landing `/e` | Accent event / dark hero | Très différent marketing | system-ui |

**Constat :** pas un design system unique — **deux familles** (violet marketing vs bleu produit). Acceptable MVP, mais le header bleu sur landing violette crée une dissonance observée en prod.

### UI — reco justifiées (pas « pour faire moderne »)

1. **Unifier accent primary** marketing ↔ produit (confiance + marque).  
2. **Contraste** eyebrow « VOTE INTERACTIF EN DIRECT » trop pâle (observé prod).  
3. Régie : **réduire chrome** (emojis tuiles, micro-labels, badges multiples) pour hiérarchiser Vote / Suivant / Écran.  
4. États d’erreur publics : message cohérent « Événement introuvable » — bien ; éviter QR trompeur sur screen erreur.  
5. Footer légal absent (CGU / confidentialité) — confiance + lead consent.

---

## 10. Audit UX global

### Frictions transverses

1. **Vocabulaire multiple pour la même chose :** salle / join / Ma salle / Salle live / Ouvrir la salle / Entrée participant / Vote direct.  
2. **`/live` ≠ live régie.**  
3. **Démo trop simple vs live réel trop riche** → écart d’attente.  
4. **FUN / EVENT** clairs en pricing launch, mais mode `full` (Starter/Pro/Premium + abos factices) = dette message si jamais exposé.  
5. **Pas de « mot de passe oublié »** visible login (observé).  
6. Participant : hop join→p ; orga : hop dashboard→régie→personnalisation ailleurs.

### Matrice effort mental

| Persona | Charge mentale aujourd’hui | Cible |
|---------|---------------------------|-------|
| Participant | Moyenne (états + 2 pages) | Faible |
| Orga EVG desktop | Haute (régie) | Moyenne avec presets |
| Orga smartphone | Haute | Faible (mini-régie) |
| Streamer OBS | Moyenne-haute (presets OK, concepts screen/overlay) | Moyenne |

---

## 11. Audit fonctionnel

Classification : **essentielle / utile / avancée / secondaire / legacy / difficile à découvrir / partielle / incohérente**.

| Fonction | Classe |
|----------|--------|
| Création event + questions choix | Essentielle |
| Régie open/close vote, next, finish | Essentielle |
| Join + vote mobile + résultats | Essentielle |
| QR / lien participant | Essentielle |
| `/screen` projection | Essentielle (EVENT / pro) ; utile FUN si TV |
| Mode TEST vs réel + activations FUN/EVENT | Essentielle business |
| Timer question | Utile |
| Auto-révélation | Utile |
| Customization salle (logo/couleurs) | Utile EVENT ; secondaire FUN rapide |
| Overlay OBS + presets | Avancée / essentielle stream |
| Multi-écran B | Avancée |
| Lead capture + export | Utile pro |
| Concours + tirage | Utile FUN/soirée |
| Quiz + reveal | Utile |
| Landing `/e` + galerie | Utile marketing event ; secondaire EVG express |
| Analytics v1/v2 + CSV + share token | Utile EVENT |
| Ajout question live | Utile |
| Dupliquer event | Utile (partielle sans photos) |
| `/poll/[id]` | Legacy |
| Auth Google 501 | Legacy / non branché |
| PollTypes YES_NO, RATING, RANKING, OPEN_TEXT, WORD_CLOUD | Legacy schéma / non branché |
| Pricing mode full + abos | Incohérente / partielle |
| Rotation auto écran | Avancée / difficile à découvrir |
| Export QR miroir textile / SVG | Avancée niche |
| Admin-internal | Essentielle ops AVOTE |
| Photo landing depuis régie | Secondaire / difficile à découvrir |

**Principe simplification :** hiérarchie + progressivité (presets, disclosure), **pas** purge des capacités live déjà vendues (OBS, leads, concours).

---

## 12. Analyse spécifique Twitch / OBS / stream

**Forces :** overlay dédié transparent ; presets nommés Twitch/OBS dans la régie ; variants sans QR / QR seul / compact ; position corners.

**Faiblesses produit :**

1. Pas de **parcours guidé** « Je streame » (copier URL + coller OBS + tester fond transparent).  
2. Erreur overlay → fond blanc (casse la vérif OBS).  
3. Régie mélange salle physique et stream sans **mode stream** (masquer Écran B / grande salle QR XXL).  
4. Pricing : overlay listé surtout côté EVENT — OK business, à assumer clairement pour créateurs Twitch FUN.  
5. Chat Twitch ≠ join Avote : pas d’intégration native (pas un manque bloquant MVP).

**Reco pragmatique :** un preset « Pack stream » (overlay compact + QR seul + régie allégée) &gt; nouvelles features Twitch API.

---

## 13. Incohérences et dette UX

1. Routes `event` (régie) vs `events` (liste/editors).  
2. Label **Salle live** = customization ; **salle** = `/join`.  
3. Violet marketing / bleu app.  
4. Tutoiement / vouvoiement participant.  
5. Toasts FR sans accents / mix EN filtres analytics (Single, Contest…).  
6. Démo join ≠ parcours live (1 page vs 2).  
7. Seed `demo` API absent en prod alors que `/join/demo` et `/e/demo` existent.  
8. Pricing launch vs full.  
9. Tooltips régie obsolètes.  
10. Meta debug-ish sur page votant.  
11. Header admin toujours sticky **sur** régie (double sticky).  
12. Consent lead sans pages légales visibles footer.

---

## 14. Fonctions difficiles à découvrir

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

---

## 15. Fonctions éventuellement inutiles / legacy

| Item | Recommandation produit |
|------|------------------------|
| `/poll/[id]` | Redirect → `/p` ou déprécier |
| Enums PollType non branchés | Ne pas exposer ; purger ou roadmap claire |
| Auth Google stub | Retirer de la promesse ou brancher |
| Abonnements pricing full factices | Ne pas afficher |
| Premium 5 000 non checkout | Ne pas afficher |
| Scripts `apply-control-salle.js` | Hors produit utilisateur |
| Écran B pour majorité FUN | Masquer derrière « Options avancées » |
| Meta « Créé le » votant | Retirer |

**Ne pas supprimer sans alternative :** overlay, leads, concours, quiz, analytics — déjà dans la promesse EVENT / cas d’usage.

---

## 16. Fonctions réellement manquantes

| Manque | User | Pourquoi |
|--------|------|----------|
| Mot de passe oublié | Orga | Support / abandon login |
| Checklist pré-live | Orga | Réduit stress EVG |
| Mini-régie mobile 4 actions | Orga téléphone | Contrôle utile |
| Alignement téléphone ↔ écran (au moins résultats) | Participant | Confiance live |
| Message limite participants côté votant | Participant | Transparence |
| Guidage OBS 3 étapes | Streamer | Adoption overlay |
| Footer CGU / confidentialité | Tous / leads | Confiance + conformité perçue |
| Preuve sociale marketing | Prospect | Conversion (secondaire produit live) |
| Événement démo seed en prod (screen/p) | Prospect | Continuité démo |
| (Optionnel) Template EVG 1-clic | Orga FUN | Time-to-live |

Pas manquant pour MVP core : OAuth Google, wordcloud, abonnements.

---

## 17. Points forts à conserver absolument

1. **Promesse sans app / sans compte votant.**  
2. **Démo `/join/demo` immédiate** (excellent onboarding ressenti).  
3. **États live centralisés** (`liveStateUx`) — base saine de cohérence.  
4. **Régie complète** capable d’un vrai direct (déjà prouvé EVG).  
5. **Séparation screen (salle) / overlay (OBS)** — bonne architecture.  
6. **Types lead / concours / quiz** différenciants.  
7. **FUN / EVENT** compréhensibles en mode launch (cibles + prix).  
8. **Mode TEST** avant réel — bon garde-fou business s’il est bien expliqué.  
9. **CTA marketing clairs** « Faites voter votre audience en direct ».  
10. **Responsive participant** (tap, largeur, résultats) sur démo — à préserver comme référence visuelle vote.

---

## 18. Frictions prioritaires

1. **Double étape join → vote** en live mobile (EVG).  
2. **Désync perçue** téléphone / projection (`/p` ignore display).  
3. **Régie surdensifiée** pour un pilote non technique.  
4. **Confusion Salle live `/live` vs régie vs `/join`.**  
5. **Écart démo simple / live complexe.**  
6. **Organisateur mobile** sans mode « contrôle express ».  
7. **Messages d’attente** trop « régie » pour invités.  
8. **Accent / marque** violet vs bleu.  
9. **Login sans recovery MDP.**  
10. **Overlay erreur fond blanc** + seed demo API manquant.

Chaque item : impact user réel &gt; préférence esthétique.

---

## 19. Opportunités d’amélioration

### Quick wins

- QR défaut « Vote direct » pour FUN / option régie déjà présente à promouvoir.  
- Auto-open `/p` depuis join si vote ouvert.  
- Harmoniser tutoiement ; retirer meta debug `/p`.  
- Contraste eyebrow homepage ; CTA header aligné violet ou inversement.  
- Toasts régie accents FR.  
- Lien « Mot de passe oublié » (même flux mail minimal).  
- Empty states screen/overlay sans QR menteur ; overlay erreur rester transparent.  
- Renommer UI « Salle live » → « Apparence de la salle » ; `/live` label explicite.

### Chantiers structurants

- **IA architecture UX régie** : zones Essentiel / Projection / Partage / Avancé + presets Soirée / Conférence / Stream.  
- **Mini-régie mobile.**  
- **Unifier routes admin** `event(s)`.  
- **Parcours participant unique** pendant VOTING (join devient waiting room seulement hors vote).  
- **Checklist pré-live** + templates FUN.  
- Alignement pricing unique (pas de mode full fantôme).

---

## 20. Proposition d’une architecture UX cible

### Quatre modes d’usage (matrice)

| Mode | Device | Principe | Surfaces principales |
|------|--------|----------|----------------------|
| **A — Participant** | Mobile-first | 1 job : répondre vite | QR → vote ; hub seulement hors vote |
| **B — Régie / streamer** | Desktop-first | Pilotage serein : Vote / Suivant / Écran | Régie dense OK, progressive disclosure |
| **C — Orga smartphone** | Mobile contrôle | 4 actions + statut + QR | Mini-régie ≠ clone |
| **D — Écran public** | TV / OBS | Lecture seule visuelle | `/screen` salle · `/overlay` stream |

### Information architecture cible (orga)

```
Mes événements
 └─ [Event]
      ├─ Pilotage          (/régie)     ← défaut post-création
      ├─ Apparence salle   (ex-/live)
      ├─ Page événement    (landing)
      ├─ Résultats & leads
      └─ Paramètres (limites, formule, danger zone)
```

### Parcours live cible participant

```
Scan → si vote ouvert : écran choix immédiat
     → sinon : « Ça va bientôt commencer » (copy humaine)
     → après vote : confirmation → résultats quand la salle les montre
```

### Régie cible (desktop)

1. **Bandeau statut** unique (TEST/Réel, vote ouvert/fermé, n participants).  
2. **Colonne actions** : Ouvrir/Fermer · Suivant · Terminer · Chrono.  
3. **Colonne questions.**  
4. **Tiroir Partage** : QR · Screen · Overlay (presets).  
5. **Avancé** replié : Écran B, auto-rotate, exports exotiques.

---

## 21. Priorisation

Légende : **BLOQUANT** (gêne live / confiance) · **IMPORTANT** · **AMÉLIORATION** · **PLUS TARD** ; effort **QW** (quick win) vs **CS** (chantier structurel).

| ID | Item | Priorité | Effort | Où / qui / friction |
|----|------|----------|--------|---------------------|
| P1 | Réduire hop join→vote (auto `/p` si ouvert ; QR vote direct par défaut FUN) | BLOQUANT ressenti EVG | QW | Participant mobile — taps + confusion |
| P2 | Aligner feedback `/p` avec résultats salle (au moins CLOSED/RESULTS) | BLOQUANT confiance | CS léger | Participant — « mon tel ne suit pas » |
| P3 | Hiérarchie régie Essentiel vs Avancé + presets usage | IMPORTANT pilotage | CS | Orga desktop — densite |
| P4 | Renommer / relabel « Salle live » vs régie vs join ; clarifier nav | IMPORTANT | QW | Orga — mauvaise porte |
| P5 | Mini-régie mobile 4 actions | IMPORTANT | CS | Orga smartphone |
| P6 | Copy attentes participant plus humaines | IMPORTANT | QW | Participant |
| P7 | Mot de passe oublié | IMPORTANT compte | QW/CS mail | Orga login |
| P8 | Empty/error overlay transparent ; screen erreur sans QR faux | IMPORTANT démo/OBS | QW | Streamer / prospect |
| P9 | Seed ou retirer `/p|screen|overlay/demo` API | AMÉLIORATION | QW ops | Prospect |
| P10 | Unifier accent marque bleu/violet | AMÉLIORATION | QW | Tous |
| P11 | Toasts FR + tutoiement + hide meta `/p` | AMÉLIORATION | QW | Polish |
| P12 | Checklist pré-live post-création | IMPORTANT FUN | CS léger | Orga préparation |
| P13 | Unifier routes `event`/`events` | AMÉLIORATION dette | CS | Orga nav |
| P14 | Footer légal + contraste eyebrow | AMÉLIORATION | QW | Confiance |
| P15 | Masquer Écran B / auto-rotate derrière Avancé | AMÉLIORATION | QW | Régie |
| P16 | Templates EVG / Stream | PLUS TARD | CS | Acquisition |
| P17 | Google auth / wordcloud / abos | PLUS TARD | CS | Roadmap |
| P18 | Purge `/poll/[id]` + enums morts | PLUS TARD nettoyage | QW/CS | Dette |

### Ordre de reprise produit suggéré (sans ops L0)

1. **Participant live** (P1, P2, P6) — répond au retour EVG.  
2. **Clarté orga** (P4, P12, P15) — moins d’erreurs de porte.  
3. **Régie respirable** (P3, P5) — chantiers.  
4. **Confiance & polish** (P7–P11, P14).  
5. **Dette structurelle** (P13, P17–P18) quand le live est serein.

---

## Synthèse exécutive (10 bullets)

1. Produit **crédible et déjà prouvé** en EVG réel ; promesse « sans app » solide.  
2. Participant **démo** excellent ; participant **live** compliqué surtout à cause du **double hop join→vote** et de la **désync téléphone/projection**.  
3. Régie desktop **complète mais surchargée** — richesse à conserver, hiérarchie à imposer.  
4. Orga mobile : adaptation existe, **pas** encore un contrôle express dédié.  
5. Screen / overlay : bonne séparation salle vs OBS ; presets utiles ; empty states démo à soigner.  
6. Vocabulaire **salle / live / régie / landing** = dette UX n°1 organisateur.  
7. FUN/EVENT launch = offre claire ; mode full/abos = ne pas laisser fuiter.  
8. Manques pragmatiques : recovery MDP, checklist pré-live, alignement résultats mobile, mini-régie.  
9. Ne pas purger leads/concours/quiz/OBS — **progressivité** plutôt que simplification destructrice.  
10. Admin authentifié **non audité en session prod** ici ; conclusions régie = code + logique UI.

Preuves visuelles : `media/audit-ux-screenshots/`. Complément observation prod : `docs/audit-ux-avote-production.md` (notes de navigation).

---

AUDIT PRODUIT AVOTE TERMINÉ — AUCUN DÉVELOPPEMENT EFFECTUÉ
