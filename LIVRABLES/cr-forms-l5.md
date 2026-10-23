# CR — Formulaires Lead/Concours · Lot L5

**Date :** 2026-10-21  
**Branche :** `cursor/forms-l5-1e88` (base **L4** `cursor/forms-l4-1e88`)  
**PR :** https://github.com/remdieuv/avote.app/pull/20 (draft)  
**Périmètre :** RGPD D7 bout-en-bout — info, consent commercial, preuve, max 5, garde PII ; compat legacy.  
**Hors scope :** Régie / Screen / Salle live, merge, deploy, migrate prod.

Réf. : [conception-formulaires-lead-concours.md](./conception-formulaires-lead-concours.md) §11 L5 + D7.  
Guide orga : [guide-orga-formulaires-rgpd.md](./guide-orga-formulaires-rgpd.md).

---

## Livré

| Élément | Chemin |
| --- | --- |
| Info RGPD participant | `FormRenderer` — texte complet + court |
| Toggle consent commercial | `FormBuilderPanel` + `rgpdConsent.js` / `setMarketingConsentEnabled` |
| Preuve consent | `buildConsentsProof` (FE) + `buildConsents` (BE) — version, snapshot texte, date, choix |
| Max 5 serveur | `validateClientFormDefinitionLimits` → 400 PATCH |
| Prefer answers JSON | `resolveLeadSubmitPayload` — `legacyBodyUsed` soft signal |
| Détail CRM preuve | `LeadAnswersDetail` — section RGPD |
| Garde PII | `assertNoLeadPiiInPublicPayload` ; leads `requireAuth` ; pas d’emit answers |
| Guide orga | `LIVRABLES/guide-orga-formulaires-rgpd.md` |
| Tests | `npm run test:forms-l5` (frontend + backend) |

## Comportement

- Info usage données affichée clairement sur le formulaire.
- Consent commercial : distinct, facultatif, **jamais précoché** ; compte dans les 5 champs.
- Preuve persistée : `version`, `infoTextSnapshot`, `infoAcknowledgedAt`, `marketing.{accepted,labelSnapshot,acceptedAt,choice}`, `neverPrechecked`.
- Body legacy encore accepté ; answers JSON prioritaire (retrait progressif).
- Replay TEST continue de purger les leads (`answers` + `consents`).

## Tests

```bash
cd frontend && npm run test:forms-l5   # OK
cd backend && npm run test:forms-l5    # OK
# régression L0–L4 OK
```

## Blockers

- Empilé sur L1 (#15) → L2 (#17) → L3 (#18) → L4 (#19) non mergés ; migrate Railway bloquée.
- Ne pas merger/deploy L5 avant L1 (+ migrate) puis la chaîne.

## Suite

Chaîne formulaires L0–L5 complète en draft empilée — merge/deploy uniquement après validation migrate + GO produit.
