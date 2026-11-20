# Diagnostic — Parcours nouvel utilisateur (organisateur)

**Périmètre :** lecture seule · code + copy FE · smoke HTTP léger · **aucune** PR produit / deploy / test visuel prolongé.  
**Contexte :** offre gratuite 10 participants livrée (#82+).  
**Date :** 2026-11-20 Europe/Paris.

---

## Verdict scannable

Une personne **peut** techniquement créer un compte, un événement, démarrer gratuitement et recharger. Le frein principal n’est pas la capacité produit : c’est **le guidage** — le site pousse d’abord la **démo spectateur**, puis laisse un flou **MODE TEST vs live gratuit**, puis n’explique la **recharge** que trop tard.

---

## Parcours examiné

| Étape | Constat | Frein ? |
|---|---|---|
| **1. Accueil** | Titre clair (« Faites participer votre audience en direct ») + types (sondages, quiz…). **CTA primaire = « Tester en live » → `/join/demo`** ; secondaire = « Créer un événement gratuit » → `/admin`. | **Oui** — organisateur détourné vers la démo |
| **2. Inscription** | E-mail + mdp ≥ 8, bascule Connexion/Inscription. Simple. Mode **défaut = Connexion**. Sous-titre « Accès réservé à l’administration… ». Redirect → `/admin/events`. | Moyen — ton « admin », pas d’entrée Inscription par défaut |
| **3. Premier accès** | Empty state Mes événements + CTA « Créer mon premier événement » → `/admin`. Correct, mais **aucune** mention des 10 participants gratuits / live réel. | Moyen |
| **4. Création** | Formulaire structuré (titres, questions, types). Note : « Après création : régie en **MODE TEST** (gratuit) ». Pas de « Démarrer gratuitement (10) ». | **Oui** — promesse live gratuit absente ici |
| **5. Régie** | CTA vert **« Démarrer gratuitement »** présent + hint 10 participants + packs. Aide TEST rappelle le jour J. | OK une fois arrivé — encore dense |
| **6. Participation** | Promesse « Sans application / sans inscription pour voter » ; QR + vote + résultats = cœur produit. | OK pour le public |
| **7. Recharge** | Pricing clair (6 offres, recharge). En régie : « Ajouter des participants » **après** live réel, avec compteur used/limit. | **Oui** — « quand / pourquoi » peu anticipé avant le plafond |

Sources clés : `frontend/lib/landingHero.js`, `frontend/app/page.js`, `frontend/app/login/page.jsx`, `frontend/app/admin/events/page.js`, `frontend/app/admin/page.js`, `frontend/lib/testModeActivationCopy.js`, régie `event/[eventId]/page.jsx`, `frontend/app/pricing/page.js`.

Smoke : `www.avote.app` / `/pricing` / `/login` → **200** ; copy hero + « Démarrer gratuitement » / 10 participants visibles en prod.

---

## Ce qui marche déjà

- Proposition de valeur homepage compréhensible.
- Inscription courte (2 champs).
- Empty state post-signup actionnable.
- CTA free réel en régie (post-#82).
- Pricing aligné offre gratuite + recharges.

---

## Les 3 principaux obstacles à l’adoption

Classés par importance, chacun avec une correction simple.

### 1. CTA homepage = démo spectateur, pas organisateur

Le bouton primaire « Tester en live » mène à `/join/demo` ; « Créer un événement gratuit » est secondaire. Un nouvel organisateur est détourné avant l’inscription.

**Correction :** Inverser la hiérarchie — primaire = « Créer un événement gratuit » → inscription/admin ; secondaire = « Tester en live ».

### 2. MODE TEST vendu sans promesse « live gratuit (10) »

Après création / empty state, le copy insiste sur la régie en MODE TEST, sans dire qu’on peut démarrer un live réel gratuitement. Risque de rester bloqué en test ou de croire qu’il faut payer pour démarrer.

**Correction :** Une phrase au create + empty state (et idéalement mode Inscription) : « Live réel gratuit jusqu’à 10 participants — bouton Démarrer gratuitement dans la régie. »

### 3. Recharge incomprise avant le plafond

Pricing/régie sont clairs une fois en live, mais le parcours critique n’explique pas *quand* on achète : 10 inclus, au-delà « Ajouter des participants ».

**Correction :** Anticiper dès create / régie TEST : « 10 participants inclus ; au-delà, recharge depuis la régie (Ajouter des participants). »
