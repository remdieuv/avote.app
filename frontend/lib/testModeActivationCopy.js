/**
 * Lot 1 UX — libellés MODE TEST vs activations (live réel).
 * Aucune règle commerciale : copy uniquement.
 */

/** @typedef {{ title: string; body: string; ctaLabel: string }} ActivationExplainBlock */

export const TEST_MODE_BADGE_LABEL = "MODE TEST";

export const REAL_MODE_BADGE_LABEL = "MODE RÉEL";

/** Régie — 0 activation : ne pas laisser croire que le vote est bloqué. */
export const REGIE_NO_ACTIVATION_STATUS =
  "MODE TEST — vote et régie OK";

export const REGIE_NO_ACTIVATION_HINT =
  "Démarrez gratuitement (10 participants) ou achetez un pack pour plus de capacité. Recharge possible ensuite.";

export const REGIE_PRICING_CTA_LABEL = "Voir les packs";

export const REGIE_START_REAL_CTA_LABEL = "Passer en live réel";

export const REGIE_START_REAL_FREE_CTA_LABEL = "Démarrer gratuitement";

export const REGIE_START_REAL_MODAL_INTRO =
  "Le MODE TEST reste gratuit. Vous pouvez démarrer un live réel gratuit (10 participants) sans carte, ou consommer un pack pour une capacité plus élevée. Un événement gratuit peut être rechargé à tout moment.";

/** Compte — bloc activations à 0. */
export const ACCOUNT_NO_ACTIVATION_TITLE =
  "0 pack — démarrez gratuitement";

export const ACCOUNT_NO_ACTIVATION_BODY =
  "Créez autant d’événements que vous voulez. Le MODE TEST est illimité ; le live réel gratuit offre 10 participants sans carte bancaire. Les packs augmentent la capacité ; les recharges s’additionnent.";

export const ACCOUNT_HAS_ACTIVATIONS_TITLE = "Vos packs participants";

export const ACCOUNT_ACTIVATIONS_INTRO =
  "Les packs servent au live réel. Vous pouvez aussi démarrer gratuitement (10 participants) sans consommer de pack. Les recharges utilisent les mêmes packs.";

/** Erreurs API start-real — formulation non anxiogène. */
export const ERR_NO_EVENT_CREDIT =
  "Pas de pack pour cette capacité. Démarrez gratuitement (10 participants), choisissez un autre pack, ou continuez en MODE TEST.";

export const ERR_NO_ACTIVATION_AVAILABLE =
  "Pas de pack disponible pour cette capacité. Démarrez gratuitement (10 participants), choisissez un autre pack, ou continuez en MODE TEST.";

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
    ctaLabel: "Voir les packs",
  };
}

/**
 * Pastille d’aide sous le badge MODE TEST (régie).
 * @returns {string}
 */
export function getRegieTestModeHelpLine() {
  return "Répétition gratuite : ouvrez le vote, testez QR et résultats. Le jour J, démarrez gratuitement (10 participants) ou avec un pack — recharge possible ensuite.";
}
