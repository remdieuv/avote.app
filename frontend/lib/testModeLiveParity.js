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
 * Audit lecture seule — politique données TEST / passage RÉEL.
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
    /** Pendant la répétition TEST, votes restent en base (hors rejeu 1 question). */
    votesPersistedAfterRepetition: true,
    /** Pendant la répétition TEST, leads restent consultables. */
    leadsPersistedAfterRepetition: true,
    /** Pendant la répétition TEST, gagnants restent en base. */
    contestWinnersPersistedAfterRepetition: true,
    /**
     * `POST /events/:id/start-real` : wipe votes/leads/tirages + reset Q1
     * dans la même TX que la consommation d’activation (une seule fois).
     */
    startRealClearsVotes: true,
    startRealClearsLeads: true,
    /**
     * En TEST + RESULTS, `pollToJson` bucketise les totaux publics (≥10).
     */
    publicResultsMaskedInTest: true,
    /** Exports analytics CSV refusés en TEST (403). */
    exportsBlockedInTest: true,
    /**
     * Reset global répétition : via start-real (pas d’endpoint wipe séparé).
     * Rejeu **par question** : `testModeReplayPoll.js` (MODE TEST uniquement).
     */
    resetRepetitionImplemented: true,
    arbitrationNotes: [
      "Masque RESULTS TEST (bucket /10) : fidélité vs obscurcissement — arbitrage requis.",
      "Exports bloqués en TEST : conserver tant que pricing / usage non tranché.",
      "Rejeu par question (MODE TEST) inchangé ; reset global = première activation réelle.",
      "Passage TEST→RÉEL efface les données de répétition (atomique avec le crédit).",
    ],
  };
}
