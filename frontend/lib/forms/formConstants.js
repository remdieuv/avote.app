/**
 * Formulaires Lead / Concours — constantes & contrats L0 (D1–D12).
 * Libs pures : aucune dépendance React / HTTP / schéma DB.
 */

/** Limite stricte champs par formulaire (D10). */
export const FORM_MAX_FIELDS = 5;

/** Version du contrat JSON formDefinition. */
export const FORM_DEFINITION_VERSION = 1;

/** @typedef {"contact"|"signup"|"contest"|"civic"|"custom"|"contact_legacy"} FormTemplateKey */

/** @typedef {"short_text"|"long_text"|"number"|"email"|"phone"|"single_choice"|"multiple_choice"|"consent"} FormFieldType */

/** @typedef {"firstName"|"lastName"|"phone"|"email"} FormFieldSlot */

/** @typedef {"LEAD"|"CONTEST_ENTRY"} FormPollKind */

export const FORM_FIELD_TYPES = /** @type {const} */ ([
  "short_text",
  "long_text",
  "number",
  "email",
  "phone",
  "single_choice",
  "multiple_choice",
  "consent",
]);

export const FORM_FIELD_SLOTS = /** @type {const} */ ([
  "firstName",
  "lastName",
  "phone",
  "email",
]);

export const FORM_TEMPLATE_KEYS = /** @type {const} */ ([
  "contact",
  "signup",
  "contest",
  "civic",
  "custom",
  "contact_legacy",
]);

/** Libellés UI section (D12). */
export const FORM_UI_TITLE_LEAD = "Formulaire de contact";
export const FORM_UI_TITLE_CONTEST = "Formulaire de participation";

/**
 * @param {FormPollKind | string | null | undefined} pollKind
 */
export function formUiTitleForPollKind(pollKind) {
  const k = String(pollKind || "").toUpperCase();
  if (k === "CONTEST_ENTRY") return FORM_UI_TITLE_CONTEST;
  return FORM_UI_TITLE_LEAD;
}

/** Défauts création (D8). */
export const FORM_DEFAULT_TEMPLATE_LEAD = "contact";
export const FORM_DEFAULT_TEMPLATE_CONTEST = "contest";

/**
 * @param {FormPollKind | string | null | undefined} pollKind
 * @returns {FormTemplateKey}
 */
export function defaultFormTemplateKeyForPollKind(pollKind) {
  const k = String(pollKind || "").toUpperCase();
  if (k === "CONTEST_ENTRY") return FORM_DEFAULT_TEMPLATE_CONTEST;
  return FORM_DEFAULT_TEMPLATE_LEAD;
}

/** Limites de saisie (alignées conception §4.2). */
export const FORM_LIMITS = {
  shortTextMax: 120,
  longTextMax: 2000,
  emailMax: 320,
  phoneMinLen: 6,
  phoneMaxLen: 20,
  numberPeopleMin: 1,
  numberPeopleMax: 99,
};

/**
 * Copy RGPD (D7) — constantes prêtes pour L2+ (non branchées UI en L0).
 * Aucune case précochée : le rendu devra toujours partir de `false`.
 */
export const FORM_RGPD_INFO_TEXT =
  "Les informations saisies sont destinées à l’organisateur de cet événement pour traiter votre participation ou votre demande. Elles ne sont pas affichées publiquement sur l’écran de diffusion ni dans la salle.";

export const FORM_RGPD_INFO_SHORT =
  "Vos données sont transmises à l’organisateur et restent confidentielles (hors affichage public).";

export const FORM_RGPD_MARKETING_CONSENT_LABEL =
  "J’accepte de recevoir des communications commerciales de la part de l’organisateur.";

export const FORM_RGPD_CONSENT_NEVER_PRECHECKED = true;

/**
 * Meta templates pour sélecteur admin (hors contact_legacy = backfill seul).
 * @type {{ key: FormTemplateKey; label: string; description: string; selectable: boolean }[]}
 */
export const FORM_TEMPLATE_META = [
  {
    key: "contact",
    label: "Contact",
    description: "Prénom, téléphone, email facultatif.",
    selectable: true,
  },
  {
    key: "signup",
    label: "Inscription",
    description: "Prénom, nom, email, nombre de personnes.",
    selectable: true,
  },
  {
    key: "contest",
    label: "Concours",
    description: "Prénom + email ou téléphone (règle concours).",
    selectable: true,
  },
  {
    key: "civic",
    label: "Consultation citoyenne",
    description: "Quartier, email facultatif, commentaire.",
    selectable: true,
  },
  {
    key: "custom",
    label: "Personnalisé",
    description: "Formulaire vide — ajoutez jusqu’à 5 champs.",
    selectable: true,
  },
  {
    key: "contact_legacy",
    label: "Contact (historique)",
    description: "Miroir du formulaire figé actuel (backfill uniquement).",
    selectable: false,
  },
];
