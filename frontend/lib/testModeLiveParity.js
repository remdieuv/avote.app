/**
 * LOT-4 — Parité MODE TEST / MODE RÉEL (chrono + politique données).
 * Helpers purs : pas de forçage 30 s ; pas de reset inventé.
 *
 * Aligné conception V1.1 §5 : TEST = répétition fidèle au RÉEL.
 */

/**
 * Patch timer appliqué à l’ouverture d’un poll (`POST /polls/:id/open`
 * et `launchNow` création live).
 *
 * LOT-4 : ni TEST ni RÉEL ne démarrent automatiquement un chrono —
 * la durée reste celle lancée explicitement via question-timer.
 *
 * @param {{ isTestMode?: boolean }} [_input]
 * @returns {Record<string, never>}
 */
export function buildQuestionTimerPatchOnPollOpen(_input = {}) {
  return {};
}

/**
 * L’API question-timer (start / pause / reset) est autorisée en TEST et en RÉEL.
 * @param {{ isLiveConsumed?: boolean | null }} [_input]
 */
export function isQuestionTimerApiAllowed(_input = {}) {
  return true;
}

/**
 * Durée effective du chrono à l’ouverture : toujours null (pas d’auto-start).
 * Conservé pour les tests de non-régression du forçage 30 s.
 * @param {{ isTestMode?: boolean; configuredTotalSec?: number | null }} [_input]
 * @returns {number | null}
 */
export function resolveOpenPollTimerTotalSec(_input = {}) {
  return null;
}

/**
 * Audit lecture seule — politique données TEST actuelle (pas d’implémentation reset).
 * @returns {{
 *   votesPersistedAfterRepetition: boolean;
 *   leadsPersistedAfterRepetition: boolean;
 *   contestWinnersPersistedAfterRepetition: boolean;
 *   startRealClearsVotes: boolean;
 *   startRealClearsLeads: boolean;
 *   publicResultsMaskedInTest: boolean;
 *   exportsBlockedInTest: boolean;
 *   resetRepetitionImplemented: boolean;
 *   arbitrationNotes: string[];
 * }}
 */
export function getTestModeDataPolicyAudit() {
  return {
    /** Votes / réponses restent en base après une répétition (pas de wipe). */
    votesPersistedAfterRepetition: true,
    /** Leads CRM restent consultables après répétition. */
    leadsPersistedAfterRepetition: true,
    /** Gagnants concours restent en base. */
    contestWinnersPersistedAfterRepetition: true,
    /**
     * `POST /events/:id/start-real` bascule `isLiveConsumed` uniquement —
     * ne supprime ni votes, ni leads, ni gagnants.
     */
    startRealClearsVotes: false,
    startRealClearsLeads: false,
    /**
     * En TEST + RESULTS, `pollToJson` bucketise les totaux publics (≥10).
     * Divergence connue vs RÉEL — arbitrage produit avant suppression.
     */
    publicResultsMaskedInTest: true,
    /** Exports analytics CSV refusés en TEST (403). */
    exportsBlockedInTest: true,
    /**
     * Conception §5.3 : « Réinitialiser la répétition » = concept uniquement.
     * Périmètre effacé/conservé non spécifié → non implémenté.
     */
    resetRepetitionImplemented: false,
    arbitrationNotes: [
      "Masque RESULTS TEST (bucket /10) : fidélité vs obscurcissement — arbitrage requis.",
      "Exports bloqués en TEST : conserver tant que pricing / usage non tranché.",
      "Reset répétition : ne pas implémenter avant spécification métier des données effacées.",
      "Passage TEST→RÉEL conserve les données de répétition (risque de mélange stats) — arbitrage si wipe souhaité.",
    ],
  };
}
