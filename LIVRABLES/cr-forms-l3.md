# CR — Formulaires Lead/Concours · Lot L3

**Date :** 2026-10-21  
**Branche :** `cursor/forms-l3-1e88` (base **L2** `cursor/forms-l2-1e88` @ `dad58c1`)  
**Périmètre :** builder admin création d’événement — 5 modèles, max 5 champs, défauts D8, contraintes Concours D2.  
**Hors scope :** Régie/Screen/Salle, L4/L5, merge, deploy, migrate prod.

Réf. : [conception-formulaires-lead-concours.md](./conception-formulaires-lead-concours.md) §11 L3.

---

## Livré

| Élément | Chemin |
| --- | --- |
| Helpers builder | `frontend/lib/forms/formBuilder.js` |
| UI builder | `frontend/components/admin/FormBuilderPanel.jsx` |
| Création `/admin` | `frontend/app/admin/page.js` — panneau sous Lead/Concours |
| Types + draft + validation | `frontend/lib/createEventForm.js` |
| API create | `backend/lib/forms/formCapture.js` + `server.js` — accepte `formDefinition` client |
| Tests | `npm run test:forms-l3` |

## Comportement

- Lead → défaut modèle **Contact** ; Concours → **Concours** (D8).
- Sélecteur 5 modèles (Contact, Inscription, Concours, Consultation citoyenne, Personnalisé).
- CRUD champs : label, type, required, options choix, ↑↓, supprimer ; max **5**.
- Validation create : Concours doit permettre prénom + email/téléphone (D2).
- Payload `polls[].formDefinition` / `formTemplateKey` ; aperçu live via `EventLivePreview` (L2).

## Tests

```bash
cd frontend && npm run test:forms-l3   # OK
npm run test:create-event-form && npm run test:forms-l2  # OK
cd backend && npm run test:forms-l1    # OK
```

## Blockers

- Empilé sur L1 (#15) + L2 (#17) non mergés ; migrate prod toujours bloquée (Railway).
- Ne pas merger/deploy L3 avant L1 (+ migrate) puis L2.

## Suite

L4 : soft lock régie + Mes leads Détail + CSV colonnes/champ.
