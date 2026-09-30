---
cursor:
  subagentId: "bc-421dd48c-8455-5b5e-bffe-51999f9c2000"
---

# AVOTE V1 — Conception UX/UI cible

**Date :** 2026-09-30  
**Nature :** conception produit / UX / UI cible — **aucun développement**.  
**Base validée :** `docs/audit-produit-detaille-complet.md` (P1–P18 + vision §14–15)  
**Sources d’appui :** `docs/audit-produit-ui-ux-avote.md`, `docs/audit-ux-avote-production.md`, `docs/etat-des-lieux-avote-v1.md`, captures `media/audit-ux-screenshots/`.

### Légende réutilisation

| Tag | Signification |
|-----|----------------|
| **[EXISTANT]** | Capacité / surface / pattern déjà en place ; conserver tel quel ou quasi. |
| **[À ADAPTER]** | Existe ; changer hiérarchie, copy, flux, défauts ou états — sans inventer un produit parallèle. |
| **[NOUVEAU LÉGER]** | Ajout minimal (écran, état, libellé, checklist, mode d’affichage) pour combler une friction ; pas de nouvelle app. |

---

## 1. Principes de conception V1 + maximisation réutilisation

### 1.1 Principes non négociables

1. **Quatre modes, quatre jobs** — Participant (répondre) · Régie desktop (piloter) · Télécommande orga (contrôler en déplacement) · Diffusion (montrer). Ne pas mélanger ces jobs dans une seule UI.
2. **Réutiliser avant d’ajouter** — Conserver régie, join/vote, screen, overlay, types (choix / lead / concours / quiz), TEST→réel, FUN/EVENT, QR, landing `/e`, analytics/leads. La cible corrige les frictions, elle ne purge pas.
3. **Expérience continue côté participant** — Après QR/lien, le téléphone présente **automatiquement** l’action pertinente. Aucune notion de « régie », de navigation technique, ni de hop inutile pendant un vote ouvert.
4. **Richesse régie, hiérarchie claire** — Desktop reste puissant ; l’essentiel (ouvrir/fermer, suivant, chrono, question active, votes, résultats, diffusion) est toujours visible ; l’avancé est disponible sans surcharger.
5. **Télécommande ≠ clone régie** — Smartphone orga = 3–4 actions + statut + QR, pas la console 3 colonnes.
6. **Diffusion indépendante du pilotage** — Screen / Overlay / OBS montrent ce que le public voit ; leurs états ne dépendent pas du chrome régie.
7. **Un vocabulaire orga** — Pilotage · Apparence de la salle · Page événement · Résultats & leads · Partage · Avancé.
8. **Un ton participant** — Tutoiement unique, copy humaine, pas de jargon (« régie », « console », meta debug).
9. **Alignement téléphone ↔ salle** — Au minimum CLOSED / RESULTS / FINISHED cohérents avec la projection.
10. **Démo = promesse tenue** — La simplicité de `/join/demo` (captures 08–12) devient la **référence** du live réel, pas un court-circuit flatteur.

### 1.2 Ce que V1 refuse

- Inventer une nouvelle application ou une suite SaaS avant que le live soit serein.
- Purger leads / concours / quiz / OBS « pour simplifier ».
- Transformer la régie mobile en clone desktop.
- Exposer Google auth stub, abos fantômes, wordcloud / enums morts comme features V1.
- Créer des lots / sprints dans ce document (hors périmètre).

### 1.3 Cartographie des 4 modes (rappel cible)

| Mode | Device | Job unique | Surfaces réutilisées |
|------|--------|------------|----------------------|
| **Participant** | Smartphone | Répondre sans friction | `/join`, `/p`, (optionnel `/e`) **[EXISTANT]** unifiés en expérience continue **[À ADAPTER]** |
| **Régie** | Desktop | Piloter le live | `/admin/event/[id]` **[EXISTANT]** rehiérarchisé **[À ADAPTER]** |
| **Télécommande orga** | Smartphone | Contrôler en déplacement | Adaptation mobile régie **[EXISTANT]** → mode dédié minimal **[À ADAPTER]** / **[NOUVEAU LÉGER]** |
| **Diffusion** | TV / OBS | Montrer au public | `/screen`, `/overlay` **[EXISTANT]** états erreur/attente **[À ADAPTER]** |

---

## 2. Matrice P1–P18 → résolu / reporté

Chaque problème de l’audit détaillé est traité : **Résolu** = la conception cible le couvre explicitement ; **Reporté** = volontairement hors V1 UX cible, avec justification.

| ID | Problème | Décision | Comment la conception traite |
|----|----------|----------|------------------------------|
| **P1** | Hop join→vote | **Résolu** | Expérience continue : si vote ouvert → écran choix immédiat (auto-présentation). QR défaut « Vote direct » FUN. Join hors vote = file d’attente humaine. §3 |
| **P2** | `/p` ≠ display salle | **Résolu** | États participant alignés sur `displayState` / scène live au moins pour CLOSED, RESULTS, FINISHED (et PAUSED). §3.4–3.5 |
| **P3** | Densité régie | **Résolu** | Layout Essentiel / Question active / Pilotage / Partage / Avancé + presets usage. §4 |
| **P4** | « Salle live » vs régie | **Résolu** | Vocabulaire cible : Pilotage · Apparence de la salle · Page événement. §7 |
| **P5** | Mini-régie mobile | **Résolu** | Mode Télécommande distinct (4 actions + statut + QR). §5 |
| **P6** | Copy « régie » participant | **Résolu** | Messages humains (« Ça va bientôt commencer », etc.). §3.4 |
| **P7** | Mot de passe oublié | **Résolu** (conception) | Lien « Mot de passe oublié ? » sur `/login` + flux recovery minimal décrit. **Hors 4 modes live** mais inclus en synthèse surfaces. §8 |
| **P8** | Overlay blanc / screen QR menteur | **Résolu** | États erreur diffusion : overlay transparent ; screen sans QR si introuvable. §6 |
| **P9** | Seed `/p|screen|overlay/demo` | **Résolu** (conception produit) | Continuité démo : soit seed API `demo`, soit ne plus lier ces URLs. Décision produit : **aligner** sur join/e démo. §6.5 · §8 |
| **P10** | Accent bleu/violet | **Résolu** (conception) | Accent primary unique (marque) marketing ↔ produit. §8 |
| **P11** | Toasts ASCII / tutoiement / meta `/p` | **Résolu** | Toasts FR accents ; tutoiement unique participant ; meta debug retirée. §3 · §4 · §8 |
| **P12** | Checklist pré-live | **Résolu** | Checklist légère post-création / accès Pilotage (pas un wizard lourd). §4.7 · §7 |
| **P13** | Routes `event` / `events` | **Résolu** (IA) | IA orga unifiée Pilotage / Apparence / Page / Résultats — indépendamment du chemin URL technique. Unification URL = **reportée en dette technique** si besoin, l’UX n’expose plus la dualité. §7 |
| **P14** | Footer légal + eyebrow | **Résolu** (conception) | Contraste eyebrow ; footer CGU / confidentialité. §8 |
| **P15** | Écran B / auto-rotate | **Résolu** | Repliés sous Avancé en régie. §4 |
| **P16** | Templates EVG / Stream | **Reporté** | Utile acquisition / time-to-live, pas bloquant pour corriger le live actuel. Presets **Soirée / Conférence / Stream** en régie **[NOUVEAU LÉGER]** couvrent une partie ; templates création 1-clic = post-V1. |
| **P17** | Google auth / wordcloud / abos | **Reporté** | Ne pas exposer ; hors promesse V1. Masquer stubs / grille fantôme. §1.2 · §8 |
| **P18** | Purge `/poll` + enums morts | **Reporté** | Dette nettoyage ; UX cible n’utilise que `/p` + types opérationnels. Redirect legacy optionnel plus tard. |

### Frictions F-A…F-O (hors P) — traitement conception

| ID | Décision | Traitement cible |
|----|----------|------------------|
| F-A Lead/concours surprise | **Résolu** | Avant choix : mention « On te demandera tes coordonnées » / « pour participer au tirage ». |
| F-B Limite participants | **Résolu** | État dédié participant : message clair + pas de faux CTA vote. |
| F-C Safe-area | **Résolu** | Padding bas safe-area sur expérience participant. |
| F-D Tooltips obsolètes | **Résolu** | Libellés boutons = tooltips en régie. |
| F-E Double sticky header | **Résolu** | Chrome admin réduit en mode Pilotage live. |
| F-F Duplication photos | **Reporté** | Hors parcours live V1 ; avertir au moment duplication (préparation). |
| F-G DRAFT/PAUSED | **Reporté** (brancher) / **Résolu** (copy) | Ne pas exposer statuts morts ; tout événement « prêt à piloter » reste clair via TEST/Réel. |
| F-H Pricing full | **Résolu** | Une vérité tarifaire FUN/EVENT launch. |
| F-I FAQ marketing | **Reporté** | Hors 4 modes ; utile plus tard. |
| F-J Preuve sociale | **Reporté** | Marketing, hors live. |
| F-K Tabs pricing | **Résolu** (conception) | Aligné launch only. |
| F-L Auth socket screen | **Reporté** | Dette sécu technique, hors conception UX visuelle. |
| F-M Socket drop | **Résolu** (UX) | État « Connexion… » + retry humain côté participant. |
| F-N Galerie démo | **Reporté** | Marketing démo. |
| F-O « Rejouer la démo » | **Résolu** | Libellé démo distinct du live (« Rejouer la démo » OK ; live = pas « voter à nouveau » si 1 vote). |

---

## 3. Mode Participant — smartphone prioritaire

**Référence visuelle existante :** captures `09`–`11` (`/join/demo`) — gros taps, CTA pleine largeur, résultats clairs. Le live cible doit **ressemblir** à cette continuité sur **une** expérience, sans jargon.

### 3.1 Parcours cible (du scan à la fin)

```
Scan QR / ouverture lien
        │
        ▼
[Chargement court] ──erreur slug──► Écran « Lien invalide » (sans faux QR)
        │
        ▼
Événement trouvé
        │
        ├─ Landing /e partagée ? ──► CTA unique « Rejoindre » → même expérience live
        │                            (pas de 2e porte ambiguë)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  EXPÉRIENCE CONTINUE (une surface mentale)               │
│  Le téléphone choisit l’écran selon l’état live :        │
│                                                          │
│  WAITING / PAUSED  → Attente humaine                     │
│  VOTING (pas voté) → Choix immédiat (options + Valider)  │
│  VOTING (déjà voté)/ CLOSED → Confirmation / attente     │
│  RESULTS           → Résultats (alignés salle)           │
│  FINISHED          → Fin + merci                         │
│  FULL (limite)     → Complet                             │
│  OFFLINE           → Connexion + Réessayer               │
└──────────────────────────────────────────────────────────┘
        │
        ▼ (orga ouvre question suivante)
Retour automatique à Attente ou Choix — sans navigation manuelle
```

**Règle d’or P1 :** si `VOTING` et participant n’a pas encore voté → **jamais** d’écran intermédiaire « Voter maintenant ». L’écran de choix **est** l’action.

**QR cible :**
- FUN / soirée : défaut **Vote / rejoindre live** → entre directement dans l’expérience continue **[À ADAPTER]** (aujourd’hui toggle « Ma salle » / « Vote direct » **[EXISTANT]**).
- Landing `/e` : reste vitrine ; CTA principal mène à la même expérience, pas à un hub technique.

### 3.2 Écrans nécessaires

| ID | Écran | Rôle | Tag |
|----|-------|------|-----|
| P-E0 | Chargement | Bridging scan → état | **[EXISTANT]** |
| P-E1 | Attente (WAITING) | Tenir l’attention hors vote | **[À ADAPTER]** copy |
| P-E2 | Pause (PAUSED) | Expliquer interruption courte | **[À ADAPTER]** copy |
| P-E3 | Choix / vote (VOTING) | Répondre (choix, quiz, lead, concours) | **[EXISTANT]** `/p` + patterns démo **[À ADAPTER]** fusion hop |
| P-E4 | Confirmation (CLOSED / voté) | Rassurer « c’est pris en compte » | **[EXISTANT]** **[À ADAPTER]** alignement |
| P-E5 | Résultats (RESULTS) | Voir ce que la salle voit | **[À ADAPTER]** suivre display |
| P-E6 | Fin (FINISHED) | Clôturer poliment | **[EXISTANT]** **[À ADAPTER]** copy |
| P-E7 | Événement introuvable | Erreur slug | **[EXISTANT]** capture 18 |
| P-E8 | Salle complète | Limite participants | **[NOUVEAU LÉGER]** |
| P-E9 | Hors connexion | Retry réseau | **[NOUVEAU LÉGER]** / **[À ADAPTER]** |

*Note d’architecture UX :* les routes `/join` et `/p` peuvent rester **[EXISTANT]** sous le capot ; l’utilisateur ne doit plus vivre deux « apps ». Auto-présentation = redirect / embed / même shell — décision d’implémentation hors scope ; le comportement cible est une **seule expérience**.

### 3.3 Détail écran par écran

#### P-E1 — Attente

| Champ | Contenu cible |
|-------|----------------|
| **Contenu** | Nom événement (discret) · Titre : « Ça va bientôt commencer » · Corps : « Garde cet écran ouvert — la question s’affichera toute seule. » · Optionnel : logo salle **[EXISTANT]** customization |
| **Actions principales** | Aucune (pas de faux CTA vote) |
| **Secondaires** | Aucune (pas de liens régie / meta) |
| **États** | Attente standard · Longue attente (>N s) : « Encore un instant… » |
| **Transitions** | → P-E3 si VOTING · → P-E2 si PAUSED · → P-E6 si FINISHED · → P-E9 si drop |

#### P-E2 — Pause

| Champ | Contenu cible |
|-------|----------------|
| **Contenu** | « Petite pause » · « On reprend dans un instant. » |
| **Actions** | Aucune |
| **Transitions** | → P-E1 / P-E3 / P-E5 selon reprise orga |

#### P-E3 — Choix / vote (cœur)

| Champ | Contenu cible |
|-------|----------------|
| **Contenu** | Question · Options (radio / multi) · Chrono si actif **[EXISTANT]** · Pour lead/concours : **préavis** avant ou au-dessus (« On te demandera ton prénom / email pour… ») **[À ADAPTER]** F-A · Quiz : pas de spoiler bonne réponse |
| **Actions principales** | Sélection · **Valider** (CTA pleine largeur, min ~50 px) |
| **Secondaires** | Aucune meta « Créé le / Lien public / Page votant » **[À ADAPTER]** P11 |
| **États** | Idle · Option sélectionnée · Envoi en cours · Erreur validation (« Choisis une réponse ») tutoiement · Succès → P-E4 |
| **Réf. visuelle** | Captures 09–10 |

#### P-E4 — Confirmation / attente résultats

| Champ | Contenu cible |
|-------|----------------|
| **Contenu** | « Merci ! Ton vote est pris en compte. » · « Les résultats s’afficheront ici quand ce sera le moment. » |
| **Actions** | Aucune obligatoire |
| **États** | Confirmé (vote fermé ou ouvert mais déjà voté) |
| **Transitions** | → P-E5 quand RESULTS (aligné salle) **[À ADAPTER]** P2 · → P-E3 question suivante (nouveau vote) · → P-E6 FINISHED |

#### P-E5 — Résultats

| Champ | Contenu cible |
|-------|----------------|
| **Contenu** | Titre « Résultats » · Barres % · Badge « Ton choix » si applicable · Quiz : révélation bonne réponse si prévue |
| **Actions** | Aucune (lecture) |
| **Transitions** | → P-E1 / P-E3 question suivante · → P-E6 fin |
| **Réf.** | Capture 11 + alignement `/screen` |

#### P-E6 — Fin

| Champ | Contenu cible |
|-------|----------------|
| **Contenu** | « Merci d’avoir participé ! » · Nom événement optionnel · Pas de CTA orga |
| **Actions secondaires** | Si landing souvenirs activée : lien discret « Voir la page de l’événement » → `/e` **[EXISTANT]** |

#### P-E7 / P-E8 / P-E9

- **P-E7 :** « Ce lien ne correspond à aucun événement. » — pas de QR vers une autre démo mensongère.
- **P-E8 :** « La salle est complète. » — pas de bouton Valider.
- **P-E9 :** « Connexion interrompue. » + **Réessayer**.

### 3.4 États possibles & transitions (machine cible)

```
         ┌────────────┐
         │  LOADING   │
         └─────┬──────┘
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
  ERROR     FULL      LIVE_OK
 (P-E7)    (P-E8)        │
                         ▼
              ┌─────────────────────┐
         ┌───►│ WAITING (P-E1)      │◄──┐
         │    └──────────┬──────────┘   │
         │               │ vote open    │ next Q / close results
         │               ▼              │
         │    ┌─────────────────────┐   │
         │    │ VOTING (P-E3)       │───┤ déjà voté ──► CLOSED (P-E4)
         │    └──────────┬──────────┘   │
         │               │ submit       │
         │               ▼              │
         │    ┌─────────────────────┐   │
         ├────│ CLOSED (P-E4)       │───┤
         │    └──────────┬──────────┘   │
         │               │ reveal       │
         │               ▼              │
         │    ┌─────────────────────┐   │
         ├────│ RESULTS (P-E5)      │───┘
         │    └──────────┬──────────┘
         │               │ finish
         │               ▼
         │    ┌─────────────────────┐
         │    │ FINISHED (P-E6)     │
         │    └─────────────────────┘
         │
         └── PAUSED (P-E2) peut couper depuis WAITING/VOTING/CLOSED/RESULTS
             OFFLINE (P-E9) peut survenir depuis tout état LIVE_OK
```

**Règle P2 :** la résolution d’état participant utilise la **même logique de scène** que `/screen` (WAITING / VOTING / CLOSED / RESULTS / PAUSED / FINISHED via `liveStateUx` **[EXISTANT]**), y compris quand le vote est fermé mais les résultats pas encore révélés → P-E4, pas un faux « en attente générique » pendant que l’écran salle montre déjà RESULTS.

### 3.5 Du scan QR à la fin — scénario détaillé (EVG type)

1. Invité scanne le QR affiché (screen ou papier) → URL expérience live.
2. **&lt; 2 s** : chargement ; branding salle si configuré.
3. Orga n’a pas encore ouvert le vote → **P-E1** « Ça va bientôt commencer ».
4. Orga ouvre le vote → téléphone bascule **seul** vers **P-E3** (question + options). Aucun tap « Voter maintenant ».
5. Invité sélectionne, valide → **P-E4** confirmation immédiate.
6. Orga ferme / révèle → **P-E5** résultats en même temps que la TV salle.
7. Orga passe à la question suivante → retour **P-E1** puis **P-E3** auto.
8. Concours : sur P-E3, mention du formulaire ; après choix, champs prénom/contact ; puis P-E4.
9. Orga termine l’événement → **P-E6**.
10. Toute la soirée : **zéro** mention « régie », **zéro** meta technique, safe-area respectée.

### 3.6 Éléments réutilisés vs changements

| Réutilisé **[EXISTANT]** | Changements **[À ADAPTER]** / **[NOUVEAU LÉGER]** |
|--------------------------|-----------------------------------------------------|
| États `liveStateUx`, JoinLiveHub, PollExperience, customization salle, types vote, session votant, démo comme référence visuelle | Suppression hop mental join→vote ; copy humaine ; alignement RESULTS ; hide meta ; préavis lead/concours ; états FULL / OFFLINE UX ; QR défaut vote direct FUN ; tutoiement unique |

---

## 4. Mode Régie desktop — complète et puissante

**Surface :** `/admin/event/[id]` **[EXISTANT]** — conserver la richesse ; imposer la hiérarchie (P3).

### 4.1 Parcours cible organisateur (préparation → live → après)

```
Dashboard « Mes événements »
    → Créer / Ouvrir Pilotage
    → Checklist pré-live (légère, dismissible)
    → Pilotage live (layout ci-dessous)
    → (optionnel) Apparence · Page événement · Partage diffusion
    → Terminer événement
    → Résultats & leads
```

### 4.2 Wireframe textuel — organisation générale de l’écran

Breakpoint ≥1024. Chrome admin **réduit** en Pilotage (F-E) : pas de double sticky concurrent.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [AVOTE]  EventTitle          BANDEAU STATUT UNIQUE                          │
│                              [TEST|RÉEL] [Vote OUVERT|FERMÉ] [n connectés]  │
│                              [Socket OK]     [Checklist ▾] [Compte]         │
├──────────────┬──────────────────────────────┬───────────────────────────────┤
│ GAUCHE       │ CENTRE — PILOTAGE DIRECT     │ DROITE — CONTEXTE & PARTAGE   │
│ Questions    │                              │                               │
│              │  ┌─ Question active ───────┐ │  QR participant (gros)        │
│  Q1 ●        │  │ Intitulé                │ │  Copier lien                  │
│  Q2 ◉ ACTIVE │  │ Type · Timer            │ │                               │
│  Q3 ○        │  └─────────────────────────┘ │  Diffusion                    │
│  + Ajouter   │                              │  · Ouvrir Écran salle         │
│              │  ┌─ Actions vitales ───────┐ │  · Ouvrir Overlay OBS         │
│              │  │ [Ouvrir/Fermer vote]    │ │  · Preset overlay ▾           │
│              │  │ [Question suivante]     │ │                               │
│              │  │ [Terminer]              │ │  Aperçu mini salle (option)   │
│              │  │ Chrono [▶/⏸] [durée]   │ │                               │
│              │  └─────────────────────────┘ │  ─────────────                │
│              │                              │  Avancé ▸ (replié)            │
│              │  ┌─ Votes live ────────────┐ │   Écran B, auto-rotate,       │
│              │  │ Compteurs / liste       │ │   exports QR exotiques,       │
│              │  │ Progression             │ │   multi-modes pm=…            │
│              │  └─────────────────────────┘ │                               │
│              │                              │                               │
│              │  ┌─ Résultats / Révélation─┐ │                               │
│              │  │ Aperçu barres           │ │                               │
│              │  │ Auto-révélation 3/5/10s │ │                               │
│              │  │ (concours: tirage)      │ │                               │
│              │  └─────────────────────────┘ │                               │
└──────────────┴──────────────────────────────┴───────────────────────────────┘
```

### 4.3 Hiérarchie des informations (priorité visuelle)

| Rang | Zone | Toujours visible ? |
|------|------|--------------------|
| 1 | Bandeau statut (TEST/Réel, vote, n) | Oui |
| 2 | Actions vitales (Ouvrir/Fermer, Suivant, Terminer, Chrono) | Oui — centre |
| 3 | Question active (intitulé + type) | Oui |
| 4 | Votes live / progression | Oui |
| 5 | Résultats / révélation | Oui si pertinent à l’état |
| 6 | Liste questions (nav) | Oui — gauche |
| 7 | QR + liens diffusion Screen/Overlay | Oui — droite, compact |
| 8 | Presets overlay / modes projection | Accessible 1 clic, pas tout déployé |
| 9 | Avancé (Écran B, auto-rotate, exports) | Replié **[À ADAPTER]** P15 |
| 10 | Photo landing, perso profonde | Via nav Apparence / Page — pas dans le flux vital |

### 4.4 Zone pilotage direct — actions

| Action | Priorité | Comportement cible |
|--------|----------|-------------------|
| Ouvrir / Fermer le vote | Principale | Un seul contrôle clair (plus de doublon ambigu Vote vs PollCard pour la même action) **[À ADAPTER]** |
| Question suivante | Principale | Ferme si besoin + active suivante + participants passent en attente/choix auto |
| Terminer l’événement | Principale (confirm) | → FINISHED partout |
| Chrono | Principale secondaire | Start/pause/durée **[EXISTANT]** |
| Auto-révélation | Secondaire utile | Délais 3/5/10 s **[EXISTANT]** — label clair, distinct de « auto-rotate » |
| Tirage concours | Contextuelle | Visible seulement si type concours **[EXISTANT]** |
| Ajouter question live | Secondaire | Modal existant **[EXISTANT]** |

**Règle anti-duplication :** les `PollCard` à gauche servent à **sélectionner / voir l’état** de la question ; les commandes open/close/next sont **uniquement** au centre (tooltips = libellés boutons, F-D).

### 4.5 Contenu centre — question active, votes, résultats, timer, diffusion

- **Question active :** intitulé, type (Sondage / Quiz / Lead / Concours — labels orga ; côté participant on évite « Lead » brut si possible via copy question).
- **Votes :** compteur live + détail réponses **[EXISTANT]**.
- **Résultats :** aperçu barres aligné sur ce que verra `/screen` **[EXISTANT]**.
- **Timer :** visible à côté des actions vitales.
- **Diffusion (accès Screen / Overlay / OBS) :**
  - Bouton **Ouvrir l’écran salle** → `/screen/[slug]` nouvel onglet.
  - Bouton **Ouvrir / copier Overlay OBS** → URL overlay + preset actif.
  - Micro-texte : « Écran = salle / TV · Overlay = fond transparent OBS ».
  - Presets stream nommés **[EXISTANT]** conservés, groupés.

### 4.6 Navigation questions

- Liste gauche : état par pastille (à venir / active / fermée / résultats).
- Clic = focus question (préparer) ; **ne lance pas** le vote sans action centrale.
- « + Ajouter une question » en bas de liste **[EXISTANT]**.

### 4.7 Fonctions avancées & checklist

**Avancé (replié) :** Écran B, rotation auto, modes `pm` rares, exports QR HD/PDF/SVG/miroir, options multi-écran.

**Checklist pré-live [NOUVEAU LÉGER] P12** (bandeau dismissible ou panneau) :
1. □ Au moins 1 question  
2. □ QR / lien testé sur un téléphone  
3. □ Mode TEST compris → passer en réel quand prêt  
4. □ Écran salle ou overlay ouvert (si besoin)  
5. □ Apparence OK (logo/couleurs) — lien vers Apparence  

**Presets usage [NOUVEAU LÉGER]** (chips, pas templates création P16) :  
- **Soirée** — QR vote direct, auto-reveal on, avancé masqué  
- **Conférence** — screen standard, QR coin  
- **Stream** — overlay compact + guide 3 gestes  

### 4.8 Écrans / états régie

| État régie | Ce que le centre montre | Actions mises en avant |
|------------|-------------------------|------------------------|
| Pré-live / waiting | Question sélectionnée, vote fermé | Ouvrir le vote |
| Vote ouvert | Compteurs qui montent, chrono | Fermer le vote |
| Vote fermé | Confirmation comptage | Révéler / Suivant |
| Résultats affichés | Barres + sync diffusion | Suivant / Terminer |
| Pause | Bannière pause | Reprendre |
| Terminé | Récap court + lien Résultats & leads | Quitter vers analytics |

### 4.9 Transitions

Alignées sur la machine live partagée (§3.4) : chaque action centrale met à jour participant + screen + overlay. Toasts : français correct (« Vote fermé », « Sync live connectée ») **[À ADAPTER]** P11.

### 4.10 Réutilisé vs changements

| **[EXISTANT]** | **[À ADAPTER]** | **[NOUVEAU LÉGER]** |
|----------------|-----------------|---------------------|
| Triple colonne, open/close/next, chrono, auto-reveal, QR, presets overlay, concours, ajout live, TEST/réel, stats | Hiérarchie Essentiel/Avancé ; dédoublonnage actions ; chrome réduit ; labels ; toasts FR ; P15 repli | Checklist ; chips presets Soirée/Conférence/Stream ; micro-guide Screen vs Overlay |

---

## 5. Mode Télécommande organisateur — smartphone

**Pas un clone régie.** Device : une main, souvent debout, micro en main (P5).

### 5.1 Parcours cible

```
Orga ouvre l’événement sur téléphone
  → si viewport <1024 : entrée directe « Télécommande »
  → (lien discret « Régie complète » pour oversight rare)
  → pendant le live : 4 actions + statut
  → fin → retour liste / résultats
```

### 5.2 Écrans nécessaires

| ID | Écran | Rôle | Tag |
|----|-------|------|-----|
| T-E1 | Télécommande live | Contrôle express | **[À ADAPTER]** drawers actuels → surface dédiée |
| T-E2 | Sheet QR / lien | Montrer / partager en 1 tap | **[EXISTANT]** Partage |
| T-E3 | Sheet question (liste courte) | Changer de question | **[À ADAPTER]** |
| T-E4 | Confirm Terminer | Éviter tap accidentel | **[EXISTANT]** pattern confirm |
| T-E5 | Accès « Plus » | Apparence, landing, analytics — hors live | **[EXISTANT]** nav admin |

### 5.3 T-E1 — Contenu & actions

```
┌─────────────────────┐
│ Titre event (1 ligne)│
│ [TEST] Vote OUVERT  │
│ 42 connectés        │
├─────────────────────┤
│ Question en cours   │
│ « Qui… ? »          │
├─────────────────────┤
│ [ OUVRIR / FERMER ] │  ← primaire plein largeur
│ [ QUESTION SUIVANTE ]│
│ [ Afficher QR ]      │
│ [ Terminer… ]        │  ← secondaire / danger soft
├─────────────────────┤
│ Chrono compact      │
│ Votes : 28          │
└─────────────────────┘
```

| Type | Actions |
|------|---------|
| **Principales** | Ouvrir/Fermer vote · Question suivante · Afficher QR |
| **Secondaires** | Terminer (confirm) · Liste questions (sheet) · Lien « Régie complète » (desktop intent) |
| **Exclus de la télécommande** | Écran B, auto-rotate, presets overlay détaillés, édition landing, analytics complets |

### 5.4 États & transitions

Mêmes états live que la régie (WAITING / VOTING / CLOSED / RESULTS / PAUSED / FINISHED). Le libellé du bouton primaire bascule : « Ouvrir le vote » ↔ « Fermer le vote ». Feedback toast court FR.

### 5.5 Réutilisé vs changements

Réutilise les endpoints / actions live **[EXISTANT]** et l’intention mobile non-clone **[EXISTANT]**. Change la **présentation** : une colonne, 4 actions, pas Menu+Pilotage+sheets empilés **[À ADAPTER]**. Option « Régie complète » pour power users **[NOUVEAU LÉGER]** (lien, pas une 2e app).

---

## 6. Mode Diffusion — Screen / Overlay / OBS

**Principe :** ce que le **public** voit. Indépendant du chrome Pilotage / Télécommande. États dérivés de la même scène live.

### 6.1 Surfaces

| Surface | Rôle | Device | Tag |
|---------|------|--------|-----|
| `/screen/[slug]` | Projection salle / TV | Grand écran | **[EXISTANT]** |
| `/overlay/[eventSlug]` | Incrustation OBS / stream | Navigateur source OBS | **[EXISTANT]** |
| Modes `pm` / variants overlay | Variantes cadrage | — | **[EXISTANT]** ; rares → Avancé régie |

### 6.2 Parcours cible diffusion

```
Orga (régie ou télécommande) ouvre Screen et/ou Overlay
  → Source affiche selon état live
  → Pas de contrôles « organisateur » sur ces surfaces (lecture)
  → Erreur slug / API : états honnêtes (P8)
```

### 6.3 Écrans / états Screen

| État | Contenu | QR ? | Tag |
|------|---------|------|-----|
| WAITING | Titre humain (« Ça va bientôt commencer ») + branding | Oui (coin), sauf mode focus résultats | **[À ADAPTER]** copy |
| VOTING / QUESTION | Question + options projetées + QR contextuel selon mode | Selon `pm` **[EXISTANT]** | |
| CLOSED | Message court « Vote clos » / attente révélation | Optionnel | |
| RESULTS | Barres / focus résultats | Masqué en results_focus **[EXISTANT]** | |
| PAUSED | Fond sombre / pause | Non prioritaire | |
| FINISHED | Merci / fin | Non | |
| **ERROR** introuvable | Message seul — **aucun QR** | **Non** | **[À ADAPTER]** P8 ; capture 15 = anti-pattern |
| LOADING | Neutre | Non | |

### 6.4 Écrans / états Overlay OBS

| État | Contenu | Fond | Tag |
|------|---------|------|-----|
| WAITING / idle | Panneau vide ou minimal selon preset | **Transparent** | **[EXISTANT]** nominal |
| VOTING | Question compacte / QR selon preset | Transparent | **[EXISTANT]** |
| RESULTS | Barres compactes | Transparent | **[EXISTANT]** |
| **ERROR** | Aucun panneau blanc ; reste transparent (+ log console orga éventuel) | **Transparent** | **[À ADAPTER]** P8 ; capture 16 = anti-pattern |

### 6.5 Guide stream (micro-copy régie, pas nouvel écran app)

3 gestes **[NOUVEAU LÉGER]** :
1. Copier l’URL overlay (preset Stream compact).  
2. Coller en source Navigateur OBS.  
3. Vérifier la transparence (fond damier OBS, pas de rectangle blanc).

### 6.6 Continuité démo (P9)

**Décision conception :** les URLs `/screen/demo`, `/overlay/demo`, `/p/demo` doivent soit servir un événement demo seedé (comme l’esprit join/e), soit ne plus être liées depuis le marketing. L’état actuel (HTML OK, API 404) est **inacceptable** pour la confiance prospect.

### 6.7 Réutilisé vs changements

Conserver séparation Screen vs Overlay **[EXISTANT]** (force produit). Adapter empty/error **[À ADAPTER]**. Ne pas fusionner les deux URLs. Multi-écran B reste avancé **[EXISTANT]** + **[À ADAPTER]** disclosure.

---

## 7. Vocabulaire & IA navigation organisateur cible

### 7.1 Lexique unique

| À utiliser (UI) | Ne plus utiliser / éviter | Remplace |
|-----------------|---------------------------|----------|
| **Pilotage** | Console live, Régie live (OK en doc interne), Pilotage du direct (trop long) | Un terme nav |
| **Apparence de la salle** | Salle live (ambigu) | `/live` perso |
| **Page événement** | Landing (OK en secondaire) | Éditeur `/e` |
| **Résultats & leads** | Analytics seul | Stats + leads |
| **Écran salle** | Projection écran (synonyme OK en tip) | `/screen` |
| **Overlay stream** | — | `/overlay` |
| **Lien participant** / **QR** | Ma salle / Entrée participant / Vote direct en jargon nu | Deux options clarifiées : « Lien expérience » (défaut) |
| **Mode test** / **Mode réel** | — | Conservés **[EXISTANT]** |
| **Télécommande** | Régie mobile | Mode §5 |

Côté **participant** : jamais « régie », « console », « overlay », « slug ».

### 7.2 IA navigation orga cible

```
Mes événements                          [EXISTANT]
 └─ [Nom de l’événement]
      ├─ Pilotage          ← défaut post-création / CTA dashboard
      ├─ Apparence de la salle
      ├─ Page événement
      ├─ Résultats & leads
      └─ Paramètres        (formule, limites, zone sensible)
Compte · Aide éventuelle (hors V1 live)
```

Les chemins URL `event` vs `events` **[EXISTANT]** peuvent rester techniquement ; l’UI **n’expose plus** la dualité (P13 résolu en IA). Renommage de routes = dette optionnelle reportée.

### 7.3 Dashboard

CTA primaire : **Ouvrir le pilotage**. Secondaires : Apparence · Écran salle · Page événement. Plus de label « Salle live » pour la perso.

---

## 8. Synthèse des changements vs existant (par surface)

| Surface | Tag dominant | Changements ciblés |
|---------|--------------|-------------------|
| Expérience participant live | **[À ADAPTER]** | Continuité auto-état ; fin du hop ; copy ; alignement RESULTS ; hide meta ; safe-area ; FULL/OFFLINE |
| Démo `/join/demo` | **[EXISTANT]** | Référence à préserver ; libellés clairs |
| Régie desktop | **[À ADAPTER]** | Hiérarchie ; dédoublonnage ; Avancé replié ; toasts FR ; chrome |
| Télécommande | **[À ADAPTER]** + **[NOUVEAU LÉGER]** | Surface 4 actions |
| Screen | **[À ADAPTER]** | Copy ; erreur sans QR |
| Overlay | **[À ADAPTER]** | Erreur transparente |
| QR / partage | **[À ADAPTER]** | Défaut expérience directe FUN |
| Apparence (`/live`) | **[À ADAPTER]** | Renommage UI seulement |
| Landing `/e` | **[EXISTANT]** | CTA vers même expérience live |
| Login | **[NOUVEAU LÉGER]** | Mot de passe oublié (P7) |
| Marketing | **[À ADAPTER]** | Accent unique ; eyebrow ; footer légal ; pas de liens demo cassés |
| Pricing | **[À ADAPTER]** | Launch FUN/EVENT only (masquer full) |
| Legacy `/poll`, enums, Google stub | **Reporté** | Ne pas exposer |
| Templates création EVG | **Reporté** P16 | Presets régie suffisent en V1 conception live |
| Socket auth screen | **Reporté** F-L | Technique |

---

## 9. Vision UX V1 cohérente (sans lots)

AVOTE V1, tel que conçu ici, est **le même produit** que celui déjà prouvé en EVG — recentré sur quatre modes nets :

1. Le **participant** vit une expérience téléphone **continue et humaine**, calquée sur la qualité de la démo (captures 09–11), alignée sur ce que la salle voit.  
2. La **régie desktop** reste la console complète du direct, mais **l’essentiel respire** et l’avancé ne pollue plus le geste vital.  
3. La **télécommande** permet de tenir le live debout, sans apprendre 80 contrôles.  
4. La **diffusion** Screen/Overlay montre le spectacle ; les erreurs ne mentent plus (pas de QR fantôme, pas de blanc OBS).

Le vocabulaire orga est unique ; FUN et EVENT partagent le même cœur live ; on ne construit pas une autre application. Les problèmes P1–P15 et P7–P12/P14 sont **résolus par cette conception** ; P16–P18 (et une partie F marketing/sécu) sont **volontairement reportés**.

**Critère de validation suivant (hors ce document) :** revue écran par écran / parcours par parcours des §3–6 — sans développement tant que la conception n’est pas validée.

---

### Références captures utiles

| Besoin conception | Capture |
|-------------------|---------|
| Cible visuelle vote mobile | `09`–`11` |
| Anti-pattern screen erreur + QR | `15` |
| Anti-pattern overlay blanc | `16` |
| Erreur `/p` demo | `17` |
| Erreur join slug | `18` |

---

CONCEPTION UX/UI CIBLE AVOTE V1 TERMINÉE — AUCUN DÉVELOPPEMENT EFFECTUÉ
