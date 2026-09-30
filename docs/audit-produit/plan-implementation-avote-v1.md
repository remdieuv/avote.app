# AVOTE V1 — Plan d’implémentation (après validation UX/UI)

**Date :** 2026-09-30  
**Nature :** planification d’adaptation — **aucun développement** dans ce livrable.  
**Principe directeur :** **ADAPTER AVOTE, PAS LE RECONSTRUIRE.**  
**Base validée :**  
- `docs/audit-produit/conception-ux-ui-cible-avote-v1.md`  
- `docs/audit-produit/audit-produit-detaille.md`  
- `docs/audit-produit/audit-produit-ui-ux.md`  

**Inspection code (faits) :** `frontend/` (join, `/p`, screen, overlay, régie, landing) · `backend/server.js` · `backend/prisma/schema.prisma` · `frontend/lib/liveStateUx.js`.

**Hors périmètre de ce plan :** migrations structurelles, purge legacy (`/poll`, enums morts), templates création EVG (P16), Google auth / wordcloud / abos (P17–P18), déploiement prod, refactor « greenfield ».

---

## Légende

| Tag | Signification |
|-----|----------------|
| **UI-only** | Changement FE (layout, copy, résolution d’état déjà fournie par API/socket) |
| **FE+léger BE** | FE + petit endpoint / seed / mail — pas de nouvelle sémantique live |
| **Sécu socket (hors UX visuelle)** | Chantier F-L auth `screen:action` — **ne pas mélanger** aux lots UI |
| **Avant / Pendant / Après UX** | Timing relatif à la refonte visuelle des 4 modes |

---

# A. État actuel utile à l’implémentation

## A.1 Surfaces & fichiers (réels)

| Mode | Route | Fichier principal | Composant(s) |
|------|-------|-------------------|--------------|
| Participant hub | `/join/[slug]` | `frontend/app/join/[slug]/page.js` | `JoinLiveHub.jsx` |
| Participant vote | `/p/[slug]` | `frontend/app/p/[slug]/page.js` | `PollExperience.jsx` (~2500 L) |
| Démo référence | `/join/demo` | `frontend/app/join/demo/page.js` | `JoinDemoExperience.jsx` |
| Landing | `/e/[slug]` | `frontend/app/e/[slug]/page.jsx` | CTA → `/join` |
| Projection | `/screen/[slug]` | `frontend/app/screen/[slug]/page.js` | `ScreenProjection.jsx` + `QrAccesVoteEcran.jsx` |
| Overlay OBS | `/overlay/[eventSlug]` | `frontend/app/overlay/[eventSlug]/page.js` | `OverlayProjection.jsx` |
| Régie | `/admin/event/[eventId]` | `frontend/app/admin/event/[eventId]/page.jsx` (**~8150 L monolith**) | 3 cols desktop ; drawers mobile |
| Apparence | `/admin/events/[eventId]/live` | `.../live/page.jsx` → customization | Label UI « Salle live » |
| Page événement | `/admin/events/[eventId]/landing` | landing admin | Éditeur `/e` |
| Dashboard | `/admin/events` | `events/page.js` + `EventDashboardCard.jsx` | CTA « Ouvrir la régie » |
| États UX | — | `frontend/lib/liveStateUx.js` | Source labels + `resolveLiveUxState` |
| Backend live | — | `backend/server.js` | open/close/next/finish/show-results + Socket.IO |
| Schéma | — | `backend/prisma/schema.prisma` | enums ci-dessous |

## A.2 Architecture live réelle (à conserver)

Trois axes indépendants (déjà en prod) :

| Axe | Champ Prisma | Rôle |
|-----|--------------|------|
| Peut-on voter ? | `voteState` (`OPEN` \| `CLOSED`) | Ouverture du vote |
| Que montre la salle ? | `displayState` (`QUESTION` \| `RESULTS` \| `BLACK` \| `WAITING`) | Scène projection |
| Compat / legacy | `liveState` (`WAITING` \| `VOTING` \| `RESULTS` \| `PAUSED` \| `FINISHED`) | Dérivé via `computeLiveState` (+ `FINISHED` écrit explicitement) |

**Projection optionnelle :** `screenDisplayState` (mis à jour surtout via socket `screen:action`, **sans auth** — F-L).

**Pilotage HTTP (auth orga) :**  
`POST /polls/:id/open|close|show-results|display-question|reveal` · `POST /events/:id/next-poll|finish|question-timer|start-real` · `PATCH .../auto-reveal-settings`.

**Broadcast :** `event_live_updated` (room `event_{id}`) · `poll_updated` · `screen:update` / `screen:presence` / `screen:count`.

## A.3 Écarts opérationnels vs conception (faits code)

| Écart | Fait code | Cible conception |
|-------|-----------|------------------|
| Hop join→vote | CTA manuelle « Voter maintenant » → `/p` ; **pas** d’auto-présentation | Si VOTING → choix immédiat |
| QR défaut | Toggle régie défaut **`"join"`** (« Ma salle ») | FUN : défaut Vote direct `/p` |
| Join scène | Collapse `finished \| voting \| waiting` ; **ignore** `displayState` | Machine 6 états via `resolveLiveUxState` |
| `/p` scène | Commentaire explicite : **ne suit pas** les bascules projection ; `deriveParticipantLiveScene` | Aligner CLOSED / RESULTS / FINISHED sur la salle |
| `/p` résultats | Look résultats dès `voteState===closed` (souvent **avant** `displayState=RESULTS`) | Résultats quand la régie / salle les révèle |
| Copy join | « La régie prépare… » | Messages humains (tutoiement) |
| Régie mobile | Drawers Menu / Partage empilés — **pas** de télécommande 4 actions | Mode dédié minimal |
| Screen erreur | QR parent reste affiché | Aucun QR si introuvable |
| Overlay erreur | Panneau glass opaque (blanc perçu OBS) | Rester transparent |
| Limite participants | API `LIMIT_REACHED` / `isLocked` — **pas** de string `"FULL"` | État UI dédié (mapper le code réel) |
| Démo API | Seed slug `demo` potentiellement **désaligné** (`liveState=VOTING` vs défauts CLOSED/WAITING) | Continuité P9 |

## A.4 Ce qu’on ne reconstruit pas

- La régie monolithique (on **réordonne** hiérarchie / mobile, on ne splitte pas en micro-apps).  
- Les routes URL `event` vs `events` (dette P13 **reportée** ; l’IA UI suffit).  
- Screen vs Overlay comme deux URLs.  
- Types lead / concours / quiz / OBS / TEST→réel / activations FUN·EVENT.  
- Socket rooms et payloads existants (payloads déjà riches pour l’alignement FE).

---

# B. Contrats live communs

> **Règle :** aucun Agent ne invente d’état. Noms ci-dessous = **réels** (Prisma + `liveStateUx`).  
> Les surfaces participant doivent **consommer** `resolveLiveUxState` (ou équivalent aligné screen), pas une 3ᵉ machine locale.

## B.1 Enums Prisma (source vérité métier)

```
LiveState:     WAITING | VOTING | RESULTS | PAUSED | FINISHED
DisplayState:  QUESTION | RESULTS | BLACK | WAITING
VoteState:     OPEN | CLOSED
PollStatus:    DRAFT | SCHEDULED | ACTIVE | CLOSED | ARCHIVED
EventStatus:   DRAFT | PUBLISHED | LIVE | PAUSED | ENDED | ARCHIVED
```

**Point critique :** `CLOSED` **n’est pas** un `LiveState` Prisma. C’est un **état UX FE** (`LIVE_UX_STATE.CLOSED`) dérivé quand le vote est fermé et que les résultats ne sont pas encore affichés (`displayState !== RESULTS`).

## B.2 `computeLiveState(voteState, displayState)` (backend)

| displayState ↓ \ voteState → | OPEN | CLOSED |
|------------------------------|------|--------|
| QUESTION | `VOTING` | `WAITING` |
| RESULTS | `RESULTS` | `RESULTS` |
| BLACK | `PAUSED` | `PAUSED` |
| WAITING | `WAITING` | `WAITING` |

`FINISHED` n’est **jamais** retourné par `computeLiveState` — écrit à la fin d’événement / plus de question suivante.

## B.3 Contrat UX participant / salle (`liveStateUx`)

États UX canoniques (déjà dans le code) :

| État UX | Signification produit | Déclencheur typique (résolution cible) |
|---------|----------------------|----------------------------------------|
| **WAITING** | Attente humaine | Hors vote ouvert ; pas RESULTS/PAUSED/FINISHED |
| **VOTING** | Choix immédiat | `voteState=OPEN` + scène question / live voting |
| **CLOSED** | Confirmé, pas encore résultats salle | Vote fermé + `displayState` ≠ RESULTS |
| **RESULTS** | Barres alignées salle | `displayState=RESULTS` **ou** `liveState=RESULTS` |
| **PAUSED** | Pause courte | `displayState/screen=BLACK` **ou** `liveState=PAUSED` |
| **FINISHED** | Fin | `liveState=FINISHED` |

**États UI locaux (pas Prisma) — autorisés uniquement comme présentation :**

| Label conception | Code réel à utiliser | Notes |
|------------------|----------------------|-------|
| FULL | `LIMIT_REACHED` / `isLocked` / `limitReached` | Message « La salle est complète » — **ne pas** inventer enum `FULL` |
| OFFLINE | disconnect socket / erreur réseau FE | « Connexion interrompue » + Réessayer |
| ERROR slug | 404 GET slug / événement introuvable | Sans faux QR |
| LOADING | fetch initial | Bridging court |

## B.4 Transitions producteur (régie → broadcast)

| Action orga | HTTP | Effet états | Clients impactés |
|-------------|------|-------------|------------------|
| Ouvrir vote | `POST .../open` | OPEN + QUESTION + VOTING | join, `/p`, screen, overlay |
| Fermer vote | `POST .../close` | CLOSED ; display **inchangé** ; éventuel auto-reveal | idem |
| Révéler résultats | `POST .../show-results` | display RESULTS | idem — **clé P2** |
| Question suivante | `POST .../next-poll` | next OPEN+QUESTION+VOTING ou FINISHED | idem |
| Terminer | `POST .../finish` | FINISHED + CLOSED + WAITING | idem |
| Chrono → 0 | timer serveur | close + souvent display WAITING | idem |

## B.5 Règles d’or du contrat (non négociables pour tous les Agents)

1. **P1 :** si UX = `VOTING` et participant n’a pas voté → surface de **choix**, jamais hub « Voter maintenant » comme étape obligatoire.  
2. **P2 :** RESULTS participant **ssi** la scène salle révèle (`displayState`/`liveState` RESULTS), pas « dès que vote fermé ». CLOSED = confirmation en attendant.  
3. **Pas de nouvelle sémantique live** (pas de nouvel enum Prisma, pas de 7ᵉ liveState) sans justification écrite et validation.  
4. **Copy participant :** jamais « régie », « console », « overlay », « slug ».  
5. **Screen ≠ Overlay :** rôles conservés ; erreurs honnêtes (P8).  
6. **Payloads socket/API existants suffisent** pour P1/P2 — le bug est la **résolution FE**, pas l’absence de champs.

## B.6 Désaccords conception ↔ code (ajustements figés)

| Sujet | Conception | Code | Décision plan |
|-------|------------|------|---------------|
| CLOSED | Dans la machine live | UX FE only, pas Prisma `LiveState` | Garder CLOSED **UX** ; Agents ne créent pas d’enum Prisma |
| FULL | État nommé FULL | `LIMIT_REACHED` / `isLocked` | UI FULL **mappée** sur codes existants |
| PAUSED via régie | Pause dans machine | `BLACK` souvent via `screen:action` → `screenDisplayState` | UX pause : lire aussi `screenDisplayState` si pertinent ; **ne pas** exiger migration pause HTTP pour V1 visuelle |
| `/p` résultats précoces | Alignés salle | Résultats dès vote closed | **Corriger FE** vers display RESULTS (comportement conception) |
| Offline | OFFLINE | Pas d’état serveur | FE only |
| Routes event/events | IA unifiée | Double arborescence URL | **Labels only** ; pas d’unification URL en V1 |

---

# C. Dépendances techniques

## C.1 Dépendances communes AVANT tout Agent de feature

| # | Dépendance | Pourquoi | Livrable attendu |
|---|------------|----------|------------------|
| D0 | **Contrat figé (cette section B)** | Évite divergences Agents | Lu + checklist PR |
| D1 | **`liveStateUx.js` = source unique** | Copy + résolution | Lots participant/diffusion importent les mêmes helpers |
| D2 | **Branche de résolution join + `/p`** | Aujourd’hui collapse 3 états | Prérequis P1/P2 — lot fondation |
| D3 | **Inventaire fichiers touchés régie** | Monolithe 8150 L | Un seul propriétaire de `page.jsx` à la fois |
| D4 | **Jeux de test manuels** (EVG / conf / stream) | QA réelle | Voir §H |

**Pas de dépendance npm nouvelle** attendue pour la V1 UX.  
**Pas de migration Prisma** pour les lots UI (P1–P15 ciblés).

## C.2 UI-only vs besoin backend

| Chantier | Nature | Backend ? |
|----------|--------|-----------|
| P1 hop / auto-présentation / QR défaut FUN | **UI-only** | Non (`voteState` déjà exposé) |
| P2 align CLOSED/RESULTS | **UI-only** | Non (`displayState` déjà dans GET + socket) |
| P3–P5 régie / télécommande | **UI-only** | Non (mêmes POST) |
| P4 / P6 / P11 / P15 vocabulaire & copy | **UI-only** | Non |
| P8 screen/overlay erreurs | **UI-only** | Non |
| P12 checklist | **UI-only** (localStorage / dismiss) | Non |
| Presets Soirée/Conférence/Stream | **UI-only** (prefs UI) | Non |
| F-B limite participants | **UI-only** (+ éventuel gate join si `isLocked` déjà sur meta) | Vérifier payload GET slug ; sinon **FE+léger** |
| P7 mot de passe oublié | **FE+léger BE** (mail/token si absent) | Oui si flux recovery incomplet |
| P9 seed demo | **Ops / seed** | Ajuster seed **ou** retirer liens marketing |
| P10 / P14 marketing | **UI-only** | Non |
| **F-L `screen:action` auth** | **Sécu BE** | Oui — **piste séparée** |

## C.3 Socket auth / reconnexion — risque vs UX (timing)

| Sujet | Fait | Risque produit | Timing vs UX visuelle |
|-------|------|----------------|------------------------|
| **F-L** `screen:action` / `screen:auto_rotate` **sans auth** | Tout client connaissant `eventId` peut spoof `screenDisplayState` / updates éphémères | Spoof affichage projection — **pas** open/close vote (HTTP authé) | **APRÈS** (ou **AVANT** en chantier sécu isolé) — **jamais pendant** les lots UI régie/screen qui touchent les mêmes handlers sans besoin |
| Reconnexion FE | Sur `connect`, re-`join_event` / `join_poll` / `screen:join` | Drop = « Connexion… » ; conception demande OFFLINE + Réessayer | **Pendant** lot Participant (UX only) |
| Resync état | Refetch HTTP + prochain `event_live_updated` | Flicker si courses fetch/socket | Conserver garde-fous existants PollExperience ; ne pas « réécrire » le bus |

**Règle plan :** lot **Sécu-Socket** = Agent dédié, branche dédiée, **après** stabilisation visuelle P8/P3 (ou avant tout, mais isolé). Interdit de coupler « auth socket » et « fond transparent overlay » dans la même PR.

---

# D. Lots de développement

> Format obligatoire : objectif · périmètre · fichiers · FE/BE · deps · risques · tests · acceptation · prérequis · ne-pas-toucher · Agent autonome.

---

### LOT-0 — Fondation contrat live (résolution FE)

| Champ | Contenu |
|-------|---------|
| **Objectif** | Faire appliquer `resolveLiveUxState` / `displayState` réel sur **Join** et **`/p`** (sans hop encore) ; copy minimale humaine dans `liveStateUx` |
| **Périmètre** | Remplacer collapses `finished\|voting\|waiting` ; brancher `eventDisplayStateUi` ; CLOSED ≠ RESULTS look ; retirer meta debug `/p` (P11 partiel) |
| **Fichiers** | `frontend/lib/liveStateUx.js` · `JoinLiveHub.jsx` · `PollExperience.jsx` · éventuellement `liveStateVisual.js` |
| **FE/BE** | FE |
| **Dépendances** | D0 contrat B |
| **Risques** | Régression « résultats trop tôt » ou « plus de résultats du tout » ; flicker socket |
| **Tests** | Matrice états : open → close (sans reveal) → show-results → next → finish ; comparer `/p` vs `/screen` |
| **Acceptation** | Join et `/p` affichent CLOSED quand vote fermé sans RESULTS ; RESULTS quand salle en RESULTS ; FINISHED cohérent |
| **Prérequis** | Aucun autre lot live |
| **Ne pas toucher** | `server.js` sémantique · régie layout · overlay · seed |
| **Agent autonome** | **Oui** (petit, critique) — bloque les suivants |

---

### LOT-1 — Participant expérience continue (P1, P6, F-A, F-C, F-M)

| Champ | Contenu |
|-------|---------|
| **Objectif** | Fin du hop mental ; auto-présentation si VOTING ; copy humaine ; safe-area ; OFFLINE retry ; préavis lead/concours |
| **Périmètre** | Auto-redirect / embed choix depuis join si VOTING non voté ; QR défaut Vote direct FUN (réglage régie + default state) ; messages P-E1…P-E9 ; landing `/e` CTA « Participer » prioritaire **pendant** live |
| **Fichiers** | `JoinLiveHub.jsx` · `PollExperience.jsx` · `app/e/[slug]/page.jsx` · panneau QR dans `admin/event/.../page.jsx` (default toggle **uniquement**) · CSS safe-area |
| **FE/BE** | FE |
| **Dépendances** | **LOT-0** |
| **Risques** | Boucle redirect join↔p ; cas déjà voté ; FUN vs EVENT défaut QR |
| **Tests** | Scan QR vote ouvert → choix &lt;2 s sans CTA intermédiaire ; attente hors vote ; lead préavis |
| **Acceptation** | Parcours EVG conception §3.5 points 1–5 sans jargon |
| **Prérequis** | LOT-0 mergé |
| **Ne pas toucher** | Logique open/close serveur · Screen/Overlay layout · purge `/poll` |
| **Agent autonome** | **Oui** si LOT-0 done ; **conflit fichier** avec LOT-3/4 sur le seul default QR dans `page.jsx` → coordonner patch minimal ou laisser QR défaut au lot régie |

---

### LOT-2 — Diffusion Screen / Overlay (P8, guide stream micro-copy)

| Champ | Contenu |
|-------|---------|
| **Objectif** | Erreurs honnêtes ; micro-distinction Screen vs Overlay en régie (texte only si régie pas encore refactorée) |
| **Périmètre** | Screen : pas de QR si événement introuvable / error surface ; Overlay : erreur **transparente** (pas de glass blanc) ; copy waiting alignée `liveStateUx` |
| **Fichiers** | `ScreenProjection.jsx` · `app/screen/[slug]/page.js` · `QrAccesVoteEcran.jsx` · `OverlayProjection.jsx` |
| **FE/BE** | FE |
| **Dépendances** | LOT-0 (copy) recommandé ; **parallélisable** avec LOT-1 |
| **Risques** | Casser empty idle OBS (doit rester vide/transparent) |
| **Tests** | `/screen/bad-slug` sans QR ; `/overlay/bad-slug` fond transparent OBS ; idle waiting OK |
| **Acceptation** | Anti-patterns captures 15–16 corrigés |
| **Prérequis** | — |
| **Ne pas toucher** | Auth socket · presets métier · multi-écran B logique |
| **Agent autonome** | **Oui** |

---

### LOT-3 — Régie desktop hiérarchie (P3, P12, P15, toasts P11, presets usage)

| Champ | Contenu |
|-------|---------|
| **Objectif** | Essentiel visible : questions \| pilotage \| partage ; Avancé replié ; checklist ; presets Soirée/Conférence/Stream ; toasts FR accents |
| **Périmètre** | Rehiérarchiser UI existante **sans** supprimer capacités ; dédoublonner open/close (centre only) ; chrome admin réduit en Pilotage (F-E) ; tooltips = libellés (F-D) |
| **Fichiers** | **`admin/event/[eventId]/page.jsx`** (principal) · toasts helpers si extraits |
| **FE/BE** | FE |
| **Dépendances** | LOT-0 (pas bloquant layout) ; **mutex** avec LOT-4 |
| **Risques** | Régression actions live ; doublons involontaires ; monolithe merge hell |
| **Tests** | Desktop ≥1024 : ouvrir/fermer/suivant/terminer/chrono/reveal ; presets changent disclosure |
| **Acceptation** | Wireframe conception §4.2 respecté en esprit ; richesse conservée sous Avancé |
| **Prérequis** | Idéalement LOT-1 QR default déjà posé **ou** inclus ici |
| **Ne pas toucher** | Endpoints · Socket auth · analytics pages · landing editor |
| **Agent autonome** | **Oui, seul** sur `page.jsx` |

---

### LOT-4 — Télécommande orga mobile (P5)

| Champ | Contenu |
|-------|---------|
| **Objectif** | Viewport &lt;1024 : surface 4 actions + statut + QR ; pas clone desktop |
| **Périmètre** | Entrée « Télécommande » ; Ouvrir/Fermer · Suivant · QR · Terminer ; sheet questions ; lien « Régie complète » |
| **Fichiers** | **`admin/event/[eventId]/page.jsx`** (même monolithe) — éventuellement petit composant extrait **dans le même lot** |
| **FE/BE** | FE |
| **Dépendances** | **LOT-3 terminé** (même fichier) |
| **Risques** | Casser desktop en retouchant mobile ; drawers legacy |
| **Tests** | 390–430 px : 4 actions utilisables une main ; pas d’Écran B / presets overlay détaillés |
| **Acceptation** | Conception §5 |
| **Prérequis** | LOT-3 |
| **Ne pas toucher** | BE · participant · screen |
| **Agent autonome** | **Oui après LOT-3** ; **non parallèle** à LOT-3 |

---

### LOT-5 — Vocabulaire & IA orga (P4) + dashboard

| Champ | Contenu |
|-------|---------|
| **Objectif** | Lexique : Pilotage / Apparence de la salle / Page événement / Résultats & leads / Paramètres |
| **Périmètre** | Labels nav, dashboard CTA « Ouvrir le pilotage », tuiles régie, `/live` → libellé Apparence ; **pas** de rename de routes |
| **Fichiers** | `EventDashboardCard.jsx` · `LiveMicroIcon.jsx` · `admin/events/**` · strings dans régie (si pas déjà LOT-3) · customization headers |
| **FE/BE** | FE |
| **Dépendances** | Faible ; sync libellés avec LOT-3 |
| **Risques** | Incohérence si régie garde « Console live » |
| **Tests** | Parcours dashboard → portes ; aucun « Salle live » ambigu |
| **Acceptation** | Conception §7 |
| **Prérequis** | — |
| **Ne pas toucher** | URLs · logique live |
| **Agent autonome** | **Oui** (parallèle OK si évite gros conflit `page.jsx`) |

---

### LOT-6 — Confiance & polish hors live critique (P7, P9, P10, P14, F-H)

| Champ | Contenu |
|-------|---------|
| **Objectif** | Login recovery ; continuité démo ; marque ; footer légal ; pricing launch only |
| **Périmètre** | Lien MDP oublié ; seed `demo` cohérent **ou** déliage marketing `/p|screen|overlay/demo` ; accent unique ; footer CGU ; masquer mode full |
| **Fichiers** | `login/page.jsx` · marketing `page.js` / `pricing` · `backend/prisma/seed.js` (si seed) · liens homepage |
| **FE/BE** | FE + **seed/ops** + éventuellement BE mail recovery |
| **Dépendances** | Indépendant live ; P7 peut bloquer si mail non prêt → livrer lien + stub honnête ou flux complet |
| **Risques** | Promettre recovery sans mail ; seed qui casse prod |
| **Tests** | Login UI ; URLs démo plus 404 menteurs ; pricing FUN/EVENT only |
| **Acceptation** | P7/P9/P10/P14 conception |
| **Prérequis** | — |
| **Ne pas toucher** | Machine live · régie actions |
| **Agent autonome** | **Oui** (parallèle) |

---

### LOT-7 — Limite participants UI (F-B)

| Champ | Contenu |
|-------|---------|
| **Objectif** | État participant clair si limite / lock |
| **Périmètre** | Message dédié ; pas de faux CTA Valider ; s’appuyer sur `LIMIT_REACHED` / `isLocked` |
| **Fichiers** | `PollExperience.jsx` · `JoinLiveHub.jsx` · éventuellement affichage meta GET slug |
| **FE/BE** | FE ; BE seulement si `isLocked` absent du GET public |
| **Dépendances** | LOT-0/1 |
| **Risques** | Faux positifs lock |
| **Tests** | Event à limite basse |
| **Acceptation** | Conception P-E8 |
| **Ne pas toucher** | Formules Stripe / limites business |
| **Agent autonome** | Oui (peut fusionner dans LOT-1) |

---

### LOT-S — Sécu Socket.IO `screen:action` (F-L) — **HORS UX visuelle**

| Champ | Contenu |
|-------|---------|
| **Objectif** | Authz ownership sur `screen:action` / `screen:auto_rotate` |
| **Périmètre** | JWT/session socket ; reject anonyme ; **ne change pas** le look Screen/Overlay |
| **Fichiers** | `backend/server.js` · client régie emit (token) |
| **FE/BE** | BE + léger FE régie |
| **Dépendances** | Aucune sur lots UI ; **idéalement APRÈS** LOT-2/3 (évite double conflit handlers) **ou AVANT** tout si fenêtre sécu urgente — mais **jamais mélangé** dans une PR UI |
| **Risques** | Casser pilotage multi-écran si token mal propagé |
| **Tests** | Client non auth ne peut plus spoof ; régie légitime OK |
| **Acceptation** | F-L traité ; régression display HTTP inchangée |
| **Ne pas toucher** | Copy · layout · P8 |
| **Agent autonome** | **Oui, isolé** |

---

### Lots explicitement **hors V1 implémentation** (reportés)

| ID | Raison |
|----|--------|
| P13 unification URL `event(s)` | Dette ; IA labels suffit |
| P16 templates création | Presets régie suffisent |
| P17–P18 Google / enums / `/poll` | Ne pas exposer ; purge plus tard |
| Refactor split régie multi-fichiers massif | Hors « adapter » sauf extraction locale télécommande |

---

# E. Organisation des Agents Cloud

> Découpage **imposé par le code** (monolithe régie) — on **ne force pas** 1 Agent = 1 mode UX si ça crée des conflits merge.

## E.1 Agents recommandés

| Agent | Mission | Lots | Branche suggérée | Peut modifier | Ne peut pas modifier | Contrat | Tests porteurs | Quand démarrer | Parallèle ? |
|-------|---------|------|------------------|---------------|----------------------|---------|----------------|----------------|-------------|
| **Agent-Fondation-Live** | Résolution états Join/`/p` + copy `liveStateUx` | LOT-0 | `cursor/v1-fondation-live-…` | `liveStateUx.js`, `JoinLiveHub`, `PollExperience` | `server.js` sémantique, régie layout, overlay | §B | Matrice CLOSED/RESULTS vs screen | **Premier** après validation plan | Non (seul en tête) |
| **Agent-Participant** | Expérience continue P1/P6/F-* | LOT-1 (+ LOT-7) | `cursor/v1-participant-…` | join, `/p`, `/e` CTA, safe-area | Régie structure, socket auth | §B règles P1/P2 | Parcours EVG scan→vote | Après Fondation | Avec Diffusion & Vocabulaire |
| **Agent-Diffusion** | P8 Screen/Overlay | LOT-2 | `cursor/v1-diffusion-…` | screen, overlay, `QrAccesVoteEcran` | join hop, régie actions, socket auth | §B + P8 | Slugs invalides + idle OBS | Après Fondation (ou parallèle Participant) | **Oui** vs Participant / Vocabulaire / Confiance |
| **Agent-Régie** | Desktop + Télécommande **séquentiel** | LOT-3 puis LOT-4 | `cursor/v1-regie-…` | **`page.jsx` régie** (seul owner) | Participant, overlay error, seed | §4–5 conception + §B | Desktop + mobile 4 actions | Après Fondation ; **après** patch QR default si fait ailleurs | **Non** vs tout autre writer de `page.jsx` |
| **Agent-Vocabulaire-Orga** | P4 labels / dashboard | LOT-5 | `cursor/v1-vocab-orga-…` | dashboard, customization labels | Logique live, `page.jsx` structure | §7 lexique | Nav Mes événements | Dès Fondation OK | **Oui** (éviter strings régie si Agent-Régie actif) |
| **Agent-Confiance** | P7/P9/P10/P14/F-H | LOT-6 | `cursor/v1-confiance-…` | login, marketing, pricing, seed | Live machine | Hors live | Démo liens + pricing | Anytime | **Oui** |
| **Agent-Sécu-Socket** | F-L auth | LOT-S | `cursor/v1-secu-socket-…` | `server.js` socket + emit régie token | Layout/copy/P8 | Doc F-L séparée | Spoof vs régie OK | **Avant OU Après** UX — **pas Pendant** lots Diffusion/Régie | Isolé |

## E.2 Pourquoi pas « 1 Agent = 1 mode » strict

- **Régie desktop + télécommande** partagent `page.jsx` (~8150 L) → **un Agent-Régie**, deux lots séquentiels.  
- **Participant** touche join + `/p` + parfois default QR dans le monolithe → QR default soit dans Participant (patch chirurgical) soit dans Régie (préférable si Régie déjà owner).  
- **Diffusion** est naturellement séparée (fichiers distincts) → parallèle sain.  
- **Sécu socket** volontairement hors fan-out UX.

## E.3 Contrat partagé entre Agents (checklist PR)

Chaque PR doit coller en tête :

```
Contrat live: LiveState Prisma ≠ CLOSED UX
Résolution: resolveLiveUxState / displayState réel
Interdit: nouvel enum live ; auth socket dans PR UI ; purge OBS/leads
```

---

# F. Lots parallélisables / non parallélisables

## F.1 Parallélisables (après LOT-0)

```
                LOT-0 Fondation
                      │
        ┌─────────────┼─────────────┬──────────────┐
        ▼             ▼             ▼              ▼
     LOT-1        LOT-2         LOT-5          LOT-6
  Participant   Diffusion    Vocabulaire     Confiance
        │
        ▼
     LOT-7 (ou inclus LOT-1)
```

## F.2 Non parallélisables (mutex)

| Mutex | Lots | Raison |
|-------|------|--------|
| `page.jsx` régie | LOT-3 → LOT-4 | Même fichier |
| Fondation vs Participant | LOT-0 → LOT-1 | Même résolution d’état |
| UI Diffusion vs Sécu socket | LOT-2 ∦ LOT-S | Mêmes handlers socket côté écran/régie — risque conflit / review mixte |
| Sécu pendant refonte régie | LOT-3 ∦ LOT-S | Emit `screen:action` dans monolithe |

## F.3 Parallelisme Agents Cloud optimal

**Vague 1 :** Agent-Fondation-Live seul.  
**Vague 2 :** Agent-Participant ∥ Agent-Diffusion ∥ Agent-Vocabulaire ∥ Agent-Confiance.  
**Vague 3 :** Agent-Régie (LOT-3 puis LOT-4).  
**Vague 4 (sécu) :** Agent-Sécu-Socket seul — **Avant** vague 1 **ou Après** vague 3, jamais au milieu des PR screen/régie.

---

# G. Ordre d’exécution

Phases **adaptées au dépôt** (pas un découpage théorique Agents UX).

### Phase 0 — Gel du contrat (doc + fondation)

1. Validation humaine de **ce plan** + §B.  
2. **LOT-0** mergé (Join/`/p` suivent `displayState`).

### Phase 1 — Douleur EVG (participant + confiance projection)

3. **LOT-1** (+ LOT-7) — hop / copy / offline.  
4. **LOT-2** en parallèle — P8.  
5. QA parcours EVG téléphone + TV.

### Phase 2 — Clarté orga

6. **LOT-5** vocabulaire (peut chevaucher fin Phase 1).  
7. **LOT-3** régie desktop.  
8. **LOT-4** télécommande.

### Phase 3 — Confiance produit & démo

9. **LOT-6** (si pas déjà démarré en parallèle).

### Phase 4 — Sécu (piste séparée)

10. **LOT-S** F-L — publication indépendante, notes de breaking socket.

### Phase 5 — Stabilisation / publication V1

11. QA complète §H · freeze features live · release notes orga.

**Premier lot à lancer après validation de ce plan : `LOT-0` (Agent-Fondation-Live).**

---

# H. Stratégie de tests

## H.1 Types de tests

| Type | Usage V1 |
|------|----------|
| **Manuel scénario** (prioritaire) | EVG / conférence / streamer — preuves acceptation |
| **Checklist états** | Matrice vote × display × surfaces |
| **Responsive device** | Participant 375–430 ; télécommande &lt;1024 ; régie ≥1024 |
| **OBS / TV** | Overlay transparence ; screen plein écran |
| **Régression API** | open/close/next/finish/show-results inchangés (smoke HTTP) |
| **Socket drop** | Couper réseau participant → OFFLINE + retry |
| **Non-régression sécu** | Uniquement sur LOT-S |
| **E2E auto** | Optionnel plus tard — **ne bloque pas** V1 si manuel solide |

## H.2 Scénarios QA réelle

### EVG / soirée (FUN) — critique

1. Créer event TEST → checklist → QR **Vote direct**.  
2. 2–3 téléphones : attente humaine → ouverture vote → **choix immédiat**.  
3. Lead/concours : préavis visible.  
4. Fermer sans reveal → téléphones en **confirmation** (pas faux résultats).  
5. Reveal → téléphones **=** screen.  
6. Question suivante auto.  
7. Terminer → merci.  
8. Safe-area iPhone bas de page.

### Conférence (EVENT)

1. Screen salle + QR coin.  
2. Mode Conférence preset (avancé masqué).  
3. Chrono + auto-reveal 5 s.  
4. Alignement résultats participants / screen.  
5. Analytics/leads accessibles post-live (non régressés).

### Streamer / OBS

1. Copier overlay compact → source navigateur.  
2. Idle = transparent.  
3. Vote → panneau compact.  
4. **Slug invalide** → pas de rectangle blanc.  
5. Guide 3 gestes visible en régie (micro-copy).

### Régie / télécommande

1. Desktop : une seule zone open/close.  
2. Mobile : 4 actions sans drawers empilés confus.  
3. TEST→réel garde-fou visible.

### Hors live

1. Landing `/e` : avant = vitrine ; pendant = CTA Participer prioritaire ; après = souvenirs.  
2. Login recovery (si LOT-6).  
3. Pricing FUN/EVENT only.

## H.3 Matrice anti-régression états (obligatoire avant merge live)

Pour chaque ligne, vérifier **join · `/p` · screen · overlay** :

| voteState | displayState | UX attendue participant |
|-----------|--------------|-------------------------|
| CLOSED | WAITING | WAITING ou CLOSED selon poll actif — **pas RESULTS** |
| OPEN | QUESTION | VOTING (choix) |
| CLOSED | QUESTION | CLOSED (confirm) |
| CLOSED | RESULTS | RESULTS |
| OPEN | RESULTS | RESULTS (cas rare ; pill « en direct » screen) |
| * | BLACK / paused | PAUSED |
| — | — | FINISHED si liveState FINISHED |

---

# I. Critères d’acceptation V1

V1 UX est **acceptée** quand **tous** les points suivants sont vrais :

1. **Participant :** QR/lien → état utile immédiat ; plus de hop obligatoire join→vote si VOTING.  
2. **Sync :** CLOSED / RESULTS / FINISHED (et PAUSED) cohérents téléphone ↔ salle (même logique `displayState`).  
3. **Copy :** messages humains, tutoiement unique, pas de « régie » côté public.  
4. **Régie desktop :** 3 actions vitales évidentes ; Avancé replié ; richesse OBS/leads/concours **présente**.  
5. **Télécommande :** 4 actions + statut + QR sur smartphone orga.  
6. **Diffusion :** screen erreur sans QR menteur ; overlay erreur transparent ; Screen ≠ Overlay expliqué.  
7. **Vocabulaire orga :** Pilotage / Apparence / Page événement / Résultats & leads — plus de « Salle live » ambigu.  
8. **Landing `/e` :** CTA Participer prioritaire pendant le live.  
9. **Pas de régression** open/close/next/finish/timer/auto-reveal.  
10. **F-L** soit reporté documenté **hors** acceptation visuelle, soit livré en LOT-S **sans** casser le pilotage.  
11. **Démo :** plus de liens marketing vers screen/p/overlay demo **cassés** (seed ou unlink).  
12. **Principe :** aucune purge leads/concours/quiz/OBS ; aucune nouvelle app.

---

# J. Risques / protections anti-régression

| Risque | Impact | Protection |
|--------|--------|------------|
| Merge hell `page.jsx` | Bloque régie | **Un seul** Agent-Régie ; LOT-3→4 séquentiel |
| Double machine d’états | Désync P2 | Interdire nouveaux derive* ; centraliser `resolveLiveUxState` |
| Inventer `LiveState.CLOSED` / `FULL` | Migration inutile | Revue PR checklist §B |
| Mélanger sécu socket + UI | Régressions floues | LOT-S isolé ; labels PR `secu` vs `ux` |
| Auto-redirect join↔p boucle | Participants bloqués | Garde « déjà voté » / FINISHED / erreur |
| Résultats participant trop tard/tôt | Confiance live | Matrice §H.3 + compare screen |
| Casser idle overlay | Streamers | Test OBS transparence à chaque PR diffusion |
| Patch seed prod | Contenu démo | Préférer unlink marketing si seed risqué |
| Scope creep P13/P16/P18 | Dilue V1 | Liste « ne pas toucher » dans chaque lot |
| Chrome admin + régie | Densité | Lot-3 inclut réduction sticky (F-E) |

**Protections process :**

- PR description = lot ID + « hors sécu socket » ou « LOT-S only ».  
- Smoke manuel matrice états avant merge Phase 1.  
- Feature freeze live 48 h avant com’ V1 (process humain).

---

# K. Plan de publication

## K.1 Ordre de mise en production suggéré

| Vague release | Contenu | Feature flag ? |
|---------------|---------|----------------|
| **R0** | LOT-0 seul | Non nécessaire si matrice QA verte (comportement plus correct) |
| **R1** | LOT-1 + LOT-2 | Optionnel soft-launch FUN |
| **R2** | LOT-5 + LOT-3 | — |
| **R3** | LOT-4 télécommande | — |
| **R4** | LOT-6 confiance/démo | — |
| **R-S** | LOT-S sécu | Annonce technique orga si breaking socket clients |

Front Vercel / API Railway : lots UI = **frontend-only** → déploiement front suffit sauf LOT-6 seed/mail et LOT-S.

## K.2 Communication orga (légère)

- Changelog : « Vote plus simple sur téléphone », « Régie clarifiée », « Overlay erreur corrigée ».  
- Ne pas promettre auth socket dans le même billet que la refonte visuelle.

## K.3 Rollback

- UI-only : revert front.  
- Seed : revert seed + unlink.  
- LOT-S : revert server + front emit token ensemble.

## K.4 Critère « on communique V1 »

Acceptation §I + QA §H EVG **et** streamer au vert + pas de P0 open sur sync RESULTS.

---

## Synthèse exécutive (pour validation)

1. Adapter le produit existant ; **LOT-0** aligne Join/`/p` sur le contrat `displayState` déjà servi.  
2. `CLOSED` = UX FE ; Prisma `LiveState` sans CLOSED — **ne pas migrer**.  
3. FULL conception = `LIMIT_REACHED` / `isLocked`.  
4. Agents : Fondation → (Participant ∥ Diffusion ∥ Vocabulaire ∥ Confiance) → Régie (desktop puis télécommande) → Sécu socket isolée.  
5. Mutex dur : monolithe régie ; sécu ≠ UI.  
6. Premier lot post-validation : **LOT-0 / Agent-Fondation-Live**.  
7. P13/P16/P17/P18 hors V1 implémentation.

---

PLAN D’IMPLÉMENTATION AVOTE V1 — AUCUN DÉVELOPPEMENT EFFECTUÉ  
En attente de validation avant tout Agent de code.
