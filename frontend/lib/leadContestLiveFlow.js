/**
 * LOT-2 — Parcours Lead (CRM) & Concours (tirage).
 * Helpers purs : pas de second moteur Live.
 */

/**
 * Lead CRM = leadEnabled hors CONTEST_ENTRY.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 */
export function isLeadCrmPoll(input = {}) {
  if (input.leadEnabled !== true) return false;
  return String(input.pollType ?? "").toUpperCase() !== "CONTEST_ENTRY";
}

/**
 * @param {{ pollType?: string | null }} input
 */
export function isContestEntryPoll(input = {}) {
  return String(input.pollType ?? "").toUpperCase() === "CONTEST_ENTRY";
}

/**
 * Auto-affichage RESULTS : Sondage / Multiple / Quiz uniquement.
 * Lead et Concours : jamais d’auto-reveal.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 */
export function shouldScheduleAutoRevealForPoll(input = {}) {
  if (isContestEntryPoll(input) || isLeadCrmPoll(input)) return false;
  return true;
}

/**
 * Lead / Concours : pas d’« Afficher les résultats » dans le parcours principal.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 */
export function shouldOfferShowResultsInPrimaryPath(input = {}) {
  return shouldScheduleAutoRevealForPoll(input);
}

/**
 * Tirage concours : uniquement après fermeture des participations.
 * @param {{ voteState?: string | null }} input
 */
export function canDrawContestWinners(input = {}) {
  return String(input.voteState ?? "").toUpperCase() === "CLOSED";
}

/**
 * Form Lead/Concours : afficher si vote déclencheur et pas encore soumis.
 * Indépendant de voteOuvert (grace post-Fermer).
 * @param {{
 *   hasVotedTrigger?: boolean;
 *   leadSubmitted?: boolean;
 *   leadEnabled?: boolean | null;
 * }} input
 */
export function shouldShowLeadCaptureForm(input = {}) {
  if (input.leadEnabled !== true) return false;
  if (input.leadSubmitted === true) return false;
  return input.hasVotedTrigger === true;
}

/**
 * Nouveau Lead : seulement si le vote est encore ouvert (démarrage = vote déclencheur).
 * @param {{ voteState?: string | null; pollStatus?: string | null }} input
 */
export function canStartLeadCapture(input = {}) {
  const vs = String(input.voteState ?? "").toUpperCase();
  if (vs !== "OPEN") return false;
  const ps = String(input.pollStatus ?? "").toUpperCase();
  return ps === "" || ps === "ACTIVE";
}

/**
 * Envoi Lead autorisé côté client si form déjà ouvert (vote déclencheur).
 * Le backend vérifie le vote déclencheur, pas voteState.
 * @param {{ hasVotedTrigger?: boolean; leadSubmitted?: boolean }} input
 */
export function canSubmitLeadCapture(input = {}) {
  if (input.leadSubmitted === true) return false;
  return input.hasVotedTrigger === true;
}

/**
 * Barres / répartition publiques : jamais pour Lead CRM ni Concours.
 * @param {{
 *   pollType?: string | null;
 *   leadEnabled?: boolean | null;
 * }} input
 */
export function shouldShowPublicResponseDistribution(input = {}) {
  if (isContestEntryPoll(input) || isLeadCrmPoll(input)) return false;
  return true;
}

/**
 * Libellé public gagnant : Prénom + initiale du nom, sinon non-identifiant.
 * Ne jamais inventer une initiale à partir du seul prénom.
 * @param {{
 *   firstName?: string | null;
 *   lastName?: string | null;
 *   position?: number | null;
 * }} input
 */
export function formatPublicContestWinnerDisplayName(input = {}) {
  const first = String(input.firstName ?? "").trim();
  const last = String(input.lastName ?? "").trim();
  const pos = Math.max(1, Number(input.position) || 1);
  if (first && last) {
    const f =
      first.length === 1
        ? first.toUpperCase()
        : `${first[0].toUpperCase()}${first.slice(1)}`;
    return `${f} ${last[0].toUpperCase()}.`;
  }
  return `Gagnant ${pos}`;
}

/**
 * Payload public gagnant : jamais de coordonnées.
 * @param {{
 *   id?: string;
 *   position?: number;
 *   firstName?: string | null;
 *   lastName?: string | null;
 *   createdAt?: string | null;
 * }} winner
 */
export function toPublicContestWinnerPayload(winner = {}) {
  const position = Math.max(1, Number(winner.position) || 1);
  return {
    id: winner.id ?? null,
    position,
    displayName: formatPublicContestWinnerDisplayName({
      firstName: winner.firstName,
      lastName: winner.lastName,
      position,
    }),
    createdAt: winner.createdAt ?? null,
  };
}

/**
 * Après tirage : axes publics TIRAGE ≡ RESULTS métier.
 * @returns {{
 *   displayState: "RESULTS";
 *   screenDisplayState: "RESULTS";
 *   clearAutoRevealSchedule: true;
 * }}
 */
export function resolveContestDrawPublicDisplayPatch() {
  return {
    displayState: "RESULTS",
    screenDisplayState: "RESULTS",
    clearAutoRevealSchedule: true,
  };
}

/**
 * Clés sessionStorage draft Lead (même onglet / refresh).
 * Pas de localStorage durable pour limiter la rétention des PII.
 * @param {string} pollId
 * @param {string} voterSessionId
 */
export function leadDraftStorageKey(pollId, voterSessionId) {
  return `avote_lead_draft_v1_${String(pollId || "").trim()}_${String(voterSessionId || "").trim()}`;
}

/**
 * @param {string} pollId
 * @param {string} voterSessionId
 */
export function leadSubmittedStorageKey(pollId, voterSessionId) {
  return `avote_lead_submitted_v1_${String(pollId || "").trim()}_${String(voterSessionId || "").trim()}`;
}

/**
 * @param {unknown} raw
 * @returns {{ firstName: string; lastName: string; phone: string; email: string } | null}
 */
export function parseLeadDraft(raw) {
  if (raw == null || typeof raw !== "string" || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return {
      firstName: typeof o.firstName === "string" ? o.firstName : "",
      lastName: typeof o.lastName === "string" ? o.lastName : "",
      phone: typeof o.phone === "string" ? o.phone : "",
      email: typeof o.email === "string" ? o.email : "",
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ firstName?: string; lastName?: string; phone?: string; email?: string }} draft
 */
export function serializeLeadDraft(draft = {}) {
  return JSON.stringify({
    firstName: String(draft.firstName ?? ""),
    lastName: String(draft.lastName ?? ""),
    phone: String(draft.phone ?? ""),
    email: String(draft.email ?? ""),
  });
}

/**
 * Message /join pour les non-gagnants après tirage.
 */
export const CONTEST_PUBLIC_WINNERS_ANNOUNCE_TITLE = "Gagnant(s) du tirage";

/**
 * Message /join pour le participant tiré.
 */
export const CONTEST_WINNER_SELF_CONGRATS =
  "Félicitations, tu as gagné !";
