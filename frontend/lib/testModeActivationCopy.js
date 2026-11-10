/**
 * Lot 1 UX — libellés MODE TEST vs activations (live réel).
 * Aucune règle commerciale : copy uniquement.
 */

/** @typedef {{ title: string; body: string; ctaLabel: string }} ActivationExplainBlock */

export const TEST_MODE_BADGE_LABEL = "MODE TEST";

export const REAL_MODE_BADGE_LABEL = "MODE RÉEL";

/** Régie — 0 activation : ne pas laisser croire que le vote est bloqué. */
export const REGIE_NO_ACTIVATION_STATUS =
  "MODE TEST gratuit — vote et régie OK";

export const REGIE_NO_ACTIVATION_HINT =
  "Une activation est requise uniquement pour passer en live réel.";

export const REGIE_PRICING_CTA_LABEL = "Voir les formules";

export const REGIE_START_REAL_CTA_LABEL = "Passer en live réel";

export const REGIE_START_REAL_MODAL_INTRO =
  "Le MODE TEST reste gratuit. Une activation sera consommée uniquement pour passer en live réel (audience comptée, données de répétition effacées).";

/** Compte — bloc activations à 0. */
export const ACCOUNT_NO_ACTIVATION_TITLE =
  "0 activation — vous pouvez tester gratuitement";

export const ACCOUNT_NO_ACTIVATION_BODY =
  "Créez un événement et animez-le en MODE TEST sans activation. Une activation (FUN ou EVENT) est nécessaire seulement pour passer en live réel.";

export const ACCOUNT_HAS_ACTIVATIONS_TITLE = "Vos activations par formule";

export const ACCOUNT_ACTIVATIONS_INTRO =
  "Les activations servent au live réel. Le MODE TEST (répétition) reste disponible sans activation.";

/** Erreurs API start-real — formulation non anxiogène. */
export const ERR_NO_EVENT_CREDIT =
  "Le live réel nécessite une activation. Vous pouvez continuer à tester gratuitement en MODE TEST.";

export const ERR_NO_ACTIVATION_AVAILABLE =
  "Pas d’activation pour cette formule. Choisissez une autre formule, ou continuez en MODE TEST.";

export const ERR_EVENT_ALREADY_CONSUMED =
  "Le mode réel est déjà activé pour cet événement.";

/**
 * @param {string | null | undefined} message
 * @returns {boolean}
 */
export function isActivationShortageError(message) {
  const s = String(message || "");
  if (!s) return false;
  return (
    s.includes(ERR_NO_EVENT_CREDIT) ||
    s.includes(ERR_NO_ACTIVATION_AVAILABLE) ||
    s.includes("Aucune activation disponible") ||
    s.includes("n’avez plus d’activation disponible") ||
    s.includes("n'avez plus d'activation disponible") ||
    s.includes("nécessite une activation")
  );
}

/**
 * @param {string | null | undefined} code
 * @returns {string | null}
 */
export function messageForStartRealErrorCode(code) {
  const c = String(code || "").trim();
  if (c === "NO_EVENT_CREDIT") return ERR_NO_EVENT_CREDIT;
  if (c === "NO_ACTIVATION_AVAILABLE") return ERR_NO_ACTIVATION_AVAILABLE;
  if (c === "EVENT_ALREADY_CONSUMED") return ERR_EVENT_ALREADY_CONSUMED;
  return null;
}

/**
 * @param {{ hasActivation?: boolean | null }} [args]
 * @returns {ActivationExplainBlock}
 */
export function getAccountActivationExplain(args = {}) {
  if (args.hasActivation === true) {
    return {
      title: ACCOUNT_HAS_ACTIVATIONS_TITLE,
      body: ACCOUNT_ACTIVATIONS_INTRO,
      ctaLabel: "Voir les tarifs",
    };
  }
  return {
    title: ACCOUNT_NO_ACTIVATION_TITLE,
    body: ACCOUNT_NO_ACTIVATION_BODY,
    ctaLabel: "Voir les formules",
  };
}

/**
 * Pastille d’aide sous le badge MODE TEST (régie).
 * @returns {string}
 */
export function getRegieTestModeHelpLine() {
  return "Répétition gratuite : ouvrez le vote, testez QR et résultats. Passez en live réel seulement le jour J.";
}
