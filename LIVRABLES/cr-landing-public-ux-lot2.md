# Compte rendu — Lot 2 Landing publique UX

Branche : `cursor/landing-public-ux-lot2-d707`  
Réf. : [proposal-landing-public-ux-lot2.md](./proposal-landing-public-ux-lot2.md) · [audit-landing-evenement-ux.md](./audit-landing-evenement-ux.md)  
Surface : `/e/[slug]` (+ 1 champ GET landing)  
PR : **draft** — pas de merge.

## Objectif

Corriger frictions publiques P0/P1 (galerie mobile pendant live, labels après, CTA unique/phase, FAB vs sticky, soft-refresh moments, `infoShowOnFinished`) sans toucher régie / salle / diffusion / admin, sans feature métier nouvelle.

## Modifications

Fichiers :

- `frontend/app/e/[slug]/page.jsx`
- `backend/server.js` (GET `/events/slug/:slug/landing` → `infoShowOnFinished`)
- `frontend/scripts/test-landing-public-ux-lot2.mjs` (+ script npm `test:landing-public-ux-lot2`)

### L2-1 — Galerie événement mobile pendant live

- Un seul bloc showcase (toutes phases) : **carrousel mobile + grille desktop** (plus de grille seule invisible &lt;768 pendant le live).

### L2-2 / L2-6 / L2-9 — Libellés phase

| Phase | Showcase | Moments |
|-------|----------|---------|
| Avant | eyebrow **Galerie événement** · « L'événement » | **Moments** · Moments live (sans 🔴) |
| Pendant | idem | **En direct** · 🔴 Moments live |
| Après | **Souvenirs** · « L'événement » | **Pendant le live** · Moments live (sans 🔴) |

Plus jamais « Avant le live » / « Photos & infos ».

### L2-3 / L2-10 — Un CTA principal / phase

| Phase | Principal | Secondaire |
|-------|-----------|------------|
| Avant | Bouton milieu **Rejoindre la salle** | Footer lien texte « Accéder à la salle » |
| Pendant | Sticky mobile **Participer au live** ; hero CTA **desktop only** | Footer lien texte |
| Après | Footer bouton atténué **Revoir la salle** | — |

CTA milieu pendant (doublon desktop) retiré.

### L2-4 — FAB vs sticky

- Classe `ev-landing-upload-fab--above-sticky` : `bottom: calc(5.5rem + safe-area)` ≤767 pendant live ; `z-index` FAB 61.

### L2-5 — Soft-refresh moments

- `setInterval` 30 s uniquement phase `during` ; GET landing ; merge `photos` / `showcasePhotos` / états de phase — **pas** de reload page ni websocket.

### L2-7 — Breakpoint 768

- Sticky + masquage hero CTA pendant : `max-width: 767px` (aligné galerie).

### L2-8 — `infoShowOnFinished`

- API publique expose le bool ; bloc infos masqué si `after && !infoShowOnFinished`.

## Tests

| Vérification | Résultat |
| --- | --- |
| `npm run test:landing-public-ux-lot2` | OK (structure desktop/mobile, labels, CTA, FAB, soft-refresh, API) |
| `npm run test:landing-admin-ux-lot1` | OK (non-régression Lot 1) |
| Balance accolades JSX | OK |
| QA visuelle navigateur | À faire côté utilisateur (prefs AVOTE dev rapide) |

## Hors scope (volontaire)

- Admin `/landing`, régie, salle `/join`, Screen / Diffusion, DB schema
- Upload photo public, websocket galerie
- Refonte marketing `/e/demo`

## À vérifier manuellement

- Mobile pendant : carrousel showcase visible + sticky Participer (pas de CTA hero)
- Desktop pendant : CTA hero seul (pas sticky, pas footer plein)
- Après : labels Souvenirs / Pendant le live ; infos absentes si toggle salle off
- Orga mobile pendant : FAB au-dessus de la sticky
- Moments : nouvel upload visible ~30 s sans F5
