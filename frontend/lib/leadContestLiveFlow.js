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

/** Confirmation unique après envoi du formulaire Lead / Concours. */
export const LEAD_SUBMIT_SUCCESS_MESSAGE =
  "Merci, tes coordonnées ont bien été enregistrées.";

/** Concours — avant tirage (participant / Screen CLOSED). */
export const CONTEST_AWAITING_DRAW_LABEL = "Tirage au sort à venir";

/** Concours — après tirage (participant / Overlay / régie). */
export const CONTEST_DRAW_DONE_LABEL = "Tirage terminé";

/**
 * Carte CLOSED « résultats bientôt » : jamais pour Lead CRM.
 * Concours : oui, avec libellé tirage (pas « résultats »).
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 */
export function shouldShowClosedAwaitingResultsCard(input = {}) {
  if (isLeadCrmPoll(input)) return false;
  return true;
}

/**
 * Libellé d’attente CLOSED (remplace « Les résultats arrivent bientôt »).
 * Lead : `null` (pas de mention de résultats).
 * Concours : « Tirage au sort à venir ».
 * Autres : `null` → garder le libellé générique appelant.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 * @returns {string | null}
 */
export function getLeadContestClosedAwaitingLabel(input = {}) {
  if (isContestEntryPoll(input)) return CONTEST_AWAITING_DRAW_LABEL;
  if (isLeadCrmPoll(input)) return null;
  return null;
}

/**
 * Titre phase Concours (participant / Overlay RESULTS).
 * @param {{ hasWinners?: boolean }} [input]
 */
export function getContestParticipantPhaseLabel(input = {}) {
  if (input.hasWinners === true) return CONTEST_DRAW_DONE_LABEL;
  return CONTEST_AWAITING_DRAW_LABEL;
}

/**
 * Libellé régie « À l’écran » quand display = RESULTS.
 * Concours → tirage/gagnants ; Lead → collecte ; sinon barres.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} [context]
 */
export function getRegieResultsProjectionLabel(context = {}) {
  if (isContestEntryPoll(context)) return `${CONTEST_DRAW_DONE_LABEL} (gagnants)`;
  if (isLeadCrmPoll(context)) return "Collecte";
  return null;
}

/** Statuts gagnant concours (alignés Prisma ContestWinnerStatus). */
export const CONTEST_WINNER_STATUS_ACTIVE = "ACTIVE";
export const CONTEST_WINNER_STATUS_REPLACED = "REPLACED";

/**
 * @param {unknown} raw
 * @returns {"ACTIVE" | "REPLACED"}
 */
export function normalizeContestWinnerStatus(raw) {
  const s = String(raw ?? CONTEST_WINNER_STATUS_ACTIVE).toUpperCase();
  return s === CONTEST_WINNER_STATUS_REPLACED
    ? CONTEST_WINNER_STATUS_REPLACED
    : CONTEST_WINNER_STATUS_ACTIVE;
}

/**
 * Gagnants actifs uniquement (affichage public / félicitations).
 * @param {Array<{ status?: string | null }> | null | undefined} winners
 */
export function filterActiveContestWinners(winners) {
  const list = Array.isArray(winners) ? winners : [];
  return list.filter(
    (w) =>
      normalizeContestWinnerStatus(w?.status) === CONTEST_WINNER_STATUS_ACTIVE,
  );
}

/**
 * Régie : proposer « Remplacer un gagnant » s’il existe au moins un actif.
 * @param {{ winners?: Array<{ status?: string | null }> | null }} [input]
 */
export function canOfferContestWinnerReplace(input = {}) {
  return filterActiveContestWinners(input.winners).length > 0;
}

/**
 * Après remplacement : actifs ne dépassent jamais le quota.
 * @param {{ activeCount?: number; quota?: number }} input
 */
export function activeContestWinnersWithinQuota(input = {}) {
  const active = Math.max(0, Number(input.activeCount) || 0);
  const quota = Math.max(1, Number(input.quota) || 1);
  return active <= quota;
}

/**
 * Payload public post-filtre : jamais de coordonnées ; statut REPLACED exclu.
 * @param {{
 *   winners?: Array<{
 *     id?: string;
 *     status?: string | null;
 *     firstName?: string | null;
 *     lastName?: string | null;
 *     position?: number | null;
 *     phone?: string | null;
 *     email?: string | null;
 *     createdAt?: string | null;
 *   }>;
 *   voterSessionId?: string | null;
 * }} input
 */
export function buildPublicContestStatusFromWinners(input = {}) {
  const active = filterActiveContestWinners(input.winners).map((w, idx) => {
    const position = Math.max(1, Number(w.position) || idx + 1);
    return {
      id: w.id ?? null,
      position,
      displayName: formatPublicContestWinnerDisplayName({
        firstName: w.firstName,
        lastName: w.lastName,
        position,
      }),
      createdAt: w.createdAt ?? null,
    };
  });
  const voter = String(input.voterSessionId ?? "").trim();
  const isCurrentVoterWinner =
    !!voter &&
    filterActiveContestWinners(input.winners).some(
      (w) => String(/** @type {{ voterSessionId?: string }} */ (w).voterSessionId || "") === voter,
    );
  return {
    totalWinners: active.length,
    isCurrentVoterWinner,
    winners: active,
  };
}
