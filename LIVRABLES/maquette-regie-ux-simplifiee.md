---
cursor:
  subagentId: "bc-5ce81493-ab3e-59b2-953c-bca82557cfaf"
---

# AVOTE — Maquette UX régie simplifiée (conception uniquement)

**Statut :** prête à valider — **aucun code modifié**  
**Références :** conception V1.1 (`conception-cible-parcours-live-regie-v1.md` §2) · cible UX V1 (`conception-ux-ui-cible-avote-v1.md` §4) · état code LOT 3–5  
**Dossier livrables :** `LIVRABLES/` (racine du dépôt)  
**Visuel :** `LIVRABLES/maquette-regie-ux-simplifiee.jpg` · HTML interactable `LIVRABLES/maquette-regie-ux-simplifiee.html`

---

## 1. Audit express — ce qui surcharge aujourd’hui

| Zone | État actuel (post LOT 3–5) | Friction |
|------|----------------------------|----------|
| **Gauche** | Playlist numérotée + pastilles OK ; encore dense (stats, liens annexes) | Navigation correcte, chrome trop présent |
| **Centre** | 3 cartes côte à côte : Participation (Ouvrir+Fermer+Afficher) · Progression (Suivante+Terminer) · Chrono complet | **Plusieurs boutons Live visibles** → pas « une seule action » |
| **CTA** | Helper `getRegiePrimaryLiveAction` existe, mais l’UI affiche encore les autres (désactivés / secondaires) | Charge cognitive |
| **Chrono** | Carte entière toujours égale aux actions Live | Trop gros pour un usage occasionnel |
| **Consultation** | Bannière ambre + détail options + Rejouer TEST | Utile, mais concurrence visuelle avec le pilotage |
| **Droite** | QR + Overlay presets + liens + landing + galerie | Partage OK mais empilé |
| **Avancé** | Projection repliée (LOT 3) | À conserver, plus loin du parcours |
| **Statuts** | Libellés métier (Prête / En cours…) + lignes Vote · Antenne | Encore trop de « double lecture » |

**Invariant déjà correct (à conserver) :** sélection playlist ≠ antenne ; commandes Live ciblent **uniquement** `activePollId`.

---

## 2. Proposition — layout cible

### 2.1 Vue d’ensemble (desktop ≥1024)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AVOTE   Soirée EVG — Paris          [MODE TEST]  24 connectés        Compte │
├────────────────┬─────────────────────────────────────┬───────────────────────┤
│ QUESTIONS      │  PILOTAGE                           │  PARTAGE              │
│                │                                     │                       │
│ 1 ● En cours   │  Question 1/4 · Sondage             │   ┌─────────┐         │
│   Destination… │  Quelle est votre destination… ?    │   │   QR    │         │
│                │                                     │   └─────────┘         │
│ 2 ○ Prête      │  18 votes                           │   Rejoindre la salle  │
│   Capitale…    │                                     │   [ Copier le lien ]  │
│                │         ┌───────────────────┐       │                       │
│ 3 ○ Prête      │         │  FERMER LE VOTE   │       │  Ouvrir l’écran salle │
│   Contact…     │         │   (CTA unique)    │       │  Ouvrir Overlay OBS   │
│                │         └───────────────────┘       │                       │
│ 4 ○ Prête      │                                     │  ▸ Options avancées   │
│   Tirage…      │  Chrono  01:42  [⏸]   ▸ Régler      │                       │
│                │                                     │                       │
│ + Ajouter      │  · Question suivante (discret)      │                       │
│                │  · Terminer l’événement (discret)   │                       │
└────────────────┴─────────────────────────────────────┴───────────────────────┘
```

### 2.2 Zones

| Zone | Rôle | Contenu visible | Interdit |
|------|------|-----------------|----------|
| **Gauche — Questions** | Naviguer / consulter | N°, titre court, type, pastille statut, badge « À l’antenne », ⋯ Modifier | Tout bouton Live |
| **Centre — Pilotage** | Animer le direct | Question antenne, étape, compteur, **1 CTA primaire**, chrono compact | Liste d’actions parallèles |
| **Droite — Partage** | Diffuser | QR gros, lien salle, Screen, Overlay | Actions de vote |

---

## 3. Une seule action principale

### 3.1 Règle d’affichage

À tout moment, **un seul bouton primaire** (plein, grand, centré).  
Les autres actions Live du moment sont **absentes** (pas grisées en pile).

| Étape | Sondage / Quiz | Lead | Concours |
|-------|----------------|------|----------|
| Préparé | **Ouvrir le vote** | **Ouvrir le vote** | **Ouvrir le vote** |
| Ouvert | **Fermer le vote** | **Fermer le vote** | **Fermer le vote** |
| Fermé | **Afficher les résultats** | **Question suivante** | **Tirer au sort** |
| Résultats / Tirage | **Question suivante** | **Question suivante** | **Question suivante** (ou re-tirer si quota) |
| Dernière | **Terminer l’événement** | idem | idem |

**Secondaires toujours discrets** (texte / outline bas) : Terminer l’événement ; en TEST : Rejouer la question (hors CTA primaire).

### 3.2 Simplification vs V1.1 / code actuel

| Sujet | V1.1 / code | Proposition maquette | Type |
|-------|-------------|----------------------|------|
| CTA unique | Mapping §2.6 + highlight partiel | **Un seul bouton visible** | **Simplification UX** (règle métier inchangée) |
| Chrono | Carte égale aux actions | Ligne compacte + « Régler » replié | **Simplification** |
| Auto-révélation | Carte Vote | Sous Options avancées (Pilotage) | **Simplification** |
| Rouvrir après Fermer | Conservé (`Rouvrir le vote`) | **Hors parcours principal** → ⋯ / Options (métier reopen sans wipe inchangé) | **Simplification parcours** — arbitrage produit déjà ouvert LOT 5 |
| 3 cartes centre | Participation / Progression / Chrono | **Un bloc unique** question + CTA | **Simplification** |
| Droite | Presets Overlay toujours visibles | Presets sous Options avancées | **Simplification** |
| Statuts techniques | Partiellement retirés | Un seul libellé d’étape (« Vote ouvert ») | **Simplification** |
| Consultation ≠ antenne | LOT 3–5 | Conservé + CTA **Retour au direct** | **Renforcement** (déjà V1.1) |
| Types Sondage/Quiz/Lead/Concours | §3 V1.1 | Conservé | — |
| Projection avancée | Repliée | Conservée (Noir, A/B, forçage, rotate) | — |

---

## 4. Antenne vs consultation (anti-erreur)

```
Clic playlist (≠ antenne)
    → mode CONSULTATION
    → centre = lecture seule (titre, votes, options)
    → CTA Live MASQUÉS
    → bandeau : « Vous consultez Q3 — le direct reste sur Q1 »
    → bouton primaire de ce mode : [ Retour au direct ]

Retour au direct
    → recentre sur la question antenne
    → CTA Live réapparaissent
```

**Garantie :** aucune commande Live (open/close/show/next/draw) n’est cliquable hors antenne.  
**Suivante / Ouvrir** agissent toujours sur `activePollId`, jamais sur la sélection consultée.

---

## 5. Chrono & secondaires

**Visible par défaut :** `Chrono  01:42  [⏸]` (si timer actif ou durée déjà définie).  
**Replié « Régler » :** durée · Lancer · Pause · Réinitialiser.  
**Options avancées (Pilotage ou bas de page) :** auto-révélation · Rejouer TEST · Rouvrir (si conservé) · Projection (Noir, A/B, forçage, rotate) · exports QR.

---

## 6. Parcours organisateur (court)

1. Ouvre **Pilotage** depuis le dashboard.  
2. Scanne / partage le **QR** (droite) ; ouvre l’écran salle si besoin.  
3. Vérifie la **question 1** à l’antenne (pastille gauche).  
4. Clique le seul gros bouton **Ouvrir le vote**.  
5. Suit le compteur ; ferme avec **Fermer le vote**.  
6. Selon le type : **Afficher** / **Tirer** / **Suivante**.  
7. Enchaîne jusqu’à **Terminer l’événement**.  
8. Optionnel : clic sur une ancienne question pour **consulter** → **Retour au direct**.

Temps mental cible : « je lis le gros bouton, je clique ».

---

## 7. Wireframes d’états (centre)

### Préparé — Sondage
```
Question 1/4 · Sondage
Quelle est votre destination préférée ?
0 vote

        [  OUVRIR LE VOTE  ]

Chrono  02:00  ▸ Régler
```

### Ouvert
```
Étape · Vote ouvert · 18 votes

        [  FERMER LE VOTE  ]

Chrono  01:42  [⏸]
```

### Fermé — Sondage / Quiz
```
Étape · Vote fermé · 24 votes

     [  AFFICHER LES RÉSULTATS  ]
```

### Fermé — Lead
```
Étape · Collecte fermée · 12 leads

        [  QUESTION SUIVANTE  ]
```

### Fermé — Concours
```
Étape · Tirage · 40 inscrits

        [  TIRER AU SORT  ]
```

### Consultation
```
⚠ Vous consultez la question 3 — le direct reste sur la question 1

[  RETOUR AU DIRECT  ]     (seul CTA de ce mode)

(détail lecture seule)
```

---

## 8. Points à valider avant développement

1. **CTA unique strict** (les autres absents) vs highlight parmi une pile — **recommandation maquette : strict**.  
2. **Rouvrir** : garder en Options avancées, ou supprimer du parcours (forcer Afficher → Suivante) ?  
3. **Chrono** : ligne compacte OK ?  
4. **Auto-révélation** : OK sous Options avancées ?  
5. **Droite** : presets Overlay sous Options OK ?  
6. **MODE TEST** : bandeau haut suffisant + Rejouer en Options ?

---

## 9. Hors scope (rappel)

- Aucune implémentation  
- Pas de merge / deploy  
- Télécommande mobile : hors cette maquette (reste V1 §5)  
- Attente **validation explicite** avant tout développement

**FIN DE MISSION — MAQUETTE PRÊTE À VALIDER.**
