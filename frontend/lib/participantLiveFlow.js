/**
 * LOT-1 / LOT-7 — continuum participant (Salle permanente `/join`).
 * Pure helpers : pas de second moteur d’état — consomme resolveLiveUxState / LIVE_UX_*.
 */

import {
  LIVE_UX_LOCAL,
  LIVE_UX_STATE,
  getLiveStateLabel,
} from "./liveStateUx.js";

/** Préavis lead avant choix (F-A). */
export const PARTICIPANT_LEAD_NOTICE =
  "On te demandera ton prénom et ton téléphone après ton choix.";

/** Préavis concours avant choix (F-A). */
export const PARTICIPANT_CONTEST_NOTICE =
  "Après ton choix, on te demandera tes coordonnées pour le tirage.";

/**
 * Phase Page événement `/e` pour hiérarchie CTA.
 * @typedef {'before'|'during'|'after'} EventLandingPhase
 */

/**
 * @param {{
 *   liveState?: string | null;
 *   voteState?: string | null;
 *   displayState?: string | null;
 * }} input
 * @returns {EventLandingPhase}
 */
export function resolveEventLandingPhase(input = {}) {
  const ls = String(input.liveState ?? "").toLowerCase();
  const vs = String(input.voteState ?? "").toLowerCase();
  const ds = String(input.displayState ?? "").toLowerCase();

  if (ls === "finished") return "after";

  if (
    ls === "voting" ||
    ls === "results" ||
    ls === "paused" ||
    vs === "open" ||
    ds === "question" ||
    ds === "results" ||
    ds === "black"
  ) {
    return "during";
  }

  // CLOSED UX (vote fermé, pas encore RESULTS) = encore pendant le live
  if (vs === "closed" && (ds === "question" || ls === "closed")) {
    return "during";
  }

  return "before";
}

/**
 * Salle complète : mapper codes API existants → présentation FULL (pas d’enum Prisma).
 * @param {{
 *   isLocked?: boolean | null;
 *   limitReached?: boolean | null;
 *   errorCode?: string | null;
 * }} input
 */
export function isParticipantRoomFull(input = {}) {
  if (input.isLocked === true) return true;
  if (input.limitReached === true) return true;
  const code = String(input.errorCode ?? "").toUpperCase();
  return code === "LIMIT_REACHED" || code === "EVENT_LOCKED" || code === "FULL";
}

/**
 * Afficher l’UI FULL côté participant.
 * FINISHED n’est jamais FULL : le backend peut poser `isLocked` au « Terminer »
 * (événement réel consommé) sans que ce soit une limite de capacité.
 *
 * @param {{
 *   isLocked?: boolean | null;
 *   limitReached?: boolean | null;
 *   errorCode?: string | null;
 *   uxState?: string | null;
 * }} input
 */
export function shouldShowParticipantFullUi(input = {}) {
  const ux = String(input.uxState ?? "").toUpperCase();
  if (ux === LIVE_UX_STATE.FINISHED) return false;
  return isParticipantRoomFull(input);
}

/**
 * @param {unknown} errBodyOrMessage
 * @returns {string | null} code normalisé ou null
 */
export function extractParticipantErrorCode(errBodyOrMessage) {
  if (errBodyOrMessage == null) return null;
  if (typeof errBodyOrMessage === "string") {
    const s = errBodyOrMessage.trim().toUpperCase();
    if (
      s === "LIMIT_REACHED" ||
      s === "EVENT_LOCKED" ||
      s === "FULL" ||
      s.includes("LIMIT_REACHED")
    ) {
      if (s.includes("EVENT_LOCKED")) return "EVENT_LOCKED";
      if (s.includes("LIMIT_REACHED") || s === "FULL") return "LIMIT_REACHED";
    }
    return null;
  }
  if (typeof errBodyOrMessage === "object") {
    const err = /** @type {Record<string, unknown>} */ (errBodyOrMessage);
    const code = String(err.error ?? err.code ?? "").toUpperCase();
    if (code === "LIMIT_REACHED" || code === "EVENT_LOCKED" || code === "FULL") {
      return code === "FULL" ? "LIMIT_REACHED" : code;
    }
    if (err.limitReached === true) return "LIMIT_REACHED";
    if (err.locked === true) return "EVENT_LOCKED";
  }
  return null;
}

/**
 * Libellé FULL (P-E8).
 */
export function getParticipantFullLabel() {
  return getLiveStateLabel(LIVE_UX_LOCAL.FULL);
}

/**
 * Libellé OFFLINE (P-E9).
 */
export function getParticipantOfflineLabel() {
  return getLiveStateLabel(LIVE_UX_LOCAL.OFFLINE);
}

/**
 * Surface vote/confirmation/CLOSED/RESULTS à afficher DANS la Salle `/join`
 * (pas de navigation vers `/p`).
 *
 * @param {{
 *   uxState?: string | null;
 *   isFull?: boolean;
 *   loading?: boolean;
 * }} input
 * @returns {boolean}
 */
export function shouldEmbedPollSurfaceInRoom(input = {}) {
  if (input.loading) return false;
  if (input.isFull) return false;
  const ux = String(input.uxState ?? "").toUpperCase();
  return (
    ux === LIVE_UX_STATE.VOTING ||
    ux === LIVE_UX_STATE.CLOSED ||
    ux === LIVE_UX_STATE.RESULTS
  );
}

/**
 * Le parcours Salle standard ne doit jamais auto-naviguer vers `/p`.
 * Toujours false — gardé pour tests de non-régression explicites.
 * @returns {false}
 */
export function shouldAutoNavigateJoinToPollPath() {
  return false;
}

/**
 * En Salle (`embedded`), PollExperience réutilise le socket Join — pas de 2ᵉ `io()`.
 * En standalone `/p`, Poll ouvre sa propre connexion.
 * @param {{ embedded?: boolean }} input
 */
export function shouldPollOpenOwnSocket(input = {}) {
  return input.embedded !== true;
}

/**
 * Join (un seul `io`) doit aussi `join_poll` pour recevoir `poll_updated` (votes peers).
 * @param {{ activePollId?: string | null }} input
 */
export function shouldJoinSocketJoinActivePoll(input = {}) {
  return (
    typeof input.activePollId === "string" &&
    Boolean(input.activePollId.trim())
  );
}

/**
 * Poll embedded applique un snapshot `poll_updated` relayé par Join (pas de 2ᵉ socket).
 * @param {{ embedded?: boolean; parentPollRevision?: number }} input
 */
export function shouldPollApplyParentPollSnapshot(input = {}) {
  return (
    input.embedded === true && Number(input.parentPollRevision || 0) > 0
  );
}

/** Join applique les axes live du socket avant le round-trip `fetchMeta`. */
export function shouldJoinApplySocketLiveAxesImmediately() {
  return true;
}

/**
 * Un seul bandeau OFFLINE : celui de Join en Salle ; Poll le gère seulement en `/p`.
 * @param {{ embedded?: boolean }} input
 */
export function shouldPollRenderOfflineBanner(input = {}) {
  return input.embedded !== true;
}

/**
 * Meta branding slug déjà portée par Join — inutile en embedded.
 * @param {{ embedded?: boolean }} input
 */
export function shouldPollFetchEventMetaBranding(input = {}) {
  return input.embedded !== true;
}

/**
 * Fiche résultats standalone `/p` : afficher les barres pour une question CLOSE
 * (historique salle, lien direct, événement terminé) — sans fuite avant RESULTS live.
 *
 * Ne change pas le modèle de comptage : pure condition d’affichage UI.
 *
 * @param {{
 *   embedded?: boolean;
 *   pollStatus?: string | null;
 *   liveScene?: string | null;
 *   displayState?: string | null;
 *   isPastPollLookup?: boolean;
 * }} input
 * @returns {boolean}
 */
export function shouldPollShowStandaloneArchiveResults(input = {}) {
  if (input.embedded === true) return false;
  const status = String(input.pollStatus ?? "").toUpperCase();
  if (status !== "CLOSED") return false;

  // Consultation explicite d’une question (?poll=id) = fiche résultat historique.
  if (input.isPastPollLookup === true) return true;

  const live = String(input.liveScene ?? "").toLowerCase();
  if (live === "finished") return true;

  const display = String(input.displayState ?? "").toLowerCase();
  if (display === "results") return true;

  return false;
}

/**
 * Session de vote ouverte — même règle que le `voteOuvert` historique de `/p` (prod).
 * Fallback `liveScene === voting` si eventVoteState absent (payload partiel / embed).
 *
 * @param {{
 *   voteState?: string | null;
 *   pollStatus?: string | null;
 *   liveScene?: string | null;
 * }} input
 * @returns {boolean}
 */
export function isParticipantVoteSessionOpen(input = {}) {
  const status = String(input.pollStatus ?? "").toUpperCase();
  if (status !== "ACTIVE") return false;
  const vs = String(input.voteState ?? "").toLowerCase().trim();
  if (vs === "open") return true;
  if (!vs && String(input.liveScene ?? "").toLowerCase() === "voting") {
    return true;
  }
  return false;
}

/**
 * Vote fermé côté participant (axes vote / statut poll) — indépendant de RESULTS.
 * @param {{
 *   voteState?: string | null;
 *   pollStatus?: string | null;
 * }} input
 * @returns {boolean}
 */
export function isParticipantVoteClosed(input = {}) {
  const vs = String(input.voteState ?? "").toLowerCase().trim();
  if (vs === "closed") return true;
  return String(input.pollStatus ?? "").toUpperCase() === "CLOSED";
}

/**
 * Bloc barres participant (continuité VOTING → CLOSED → RESULTS) :
 * - révélation publique RESULTS, OU
 * - fiche archive standalone `/p`, OU
 * - après mon vote : session ouverte (live) **ou** vote fermé (finaux, ne pas masquer).
 *
 * Quiz : mêmes barres qu’un sondage ; révélation bonne réponse / verdict
 * via `shouldRevealQuizAnswerToParticipant` (RESULTS uniquement).
 *
 * @param {{
 *   hasPoll?: boolean;
 *   affichageResultatsPublic?: boolean;
 *   archiveResultsStandalone?: boolean;
 *   hasVoted?: boolean;
 *   voteState?: string | null;
 *   pollStatus?: string | null;
 *   liveScene?: string | null;
 * }} input
 * @returns {boolean}
 */
export function shouldShowParticipantLiveResultsBlock(input = {}) {
  if (input.hasPoll !== true) return false;
  if (input.affichageResultatsPublic === true) return true;
  if (input.archiveResultsStandalone === true) return true;
  if (input.hasVoted !== true) return false;
  if (
    isParticipantVoteSessionOpen({
      voteState: input.voteState,
      pollStatus: input.pollStatus,
      liveScene: input.liveScene,
    })
  ) {
    return true;
  }
  // Continuité : ne jamais masquer les barres déjà visibles quand le vote ferme.
  return isParticipantVoteClosed({
    voteState: input.voteState,
    pollStatus: input.pollStatus,
  });
}

/**
 * Titre du bloc résultats Salle / embed.
 * VOTING (session ouverte) → « Résultats en direct » ;
 * CLOSED / RESULTS / archive → « Résultats finaux ».
 *
 * @param {{ voteSessionOpen?: boolean }} input
 * @returns {"Résultats en direct" | "Résultats finaux"}
 */
export function getParticipantResultsBlockTitle(input = {}) {
  return input.voteSessionOpen === true
    ? "Résultats en direct"
    : "Résultats finaux";
}

/**
 * Révélation Quiz participant : bonne réponse + verdict juste/faux.
 * Uniquement en RESULTS (pas pendant VOTING ni CLOSED).
 *
 * @param {{
 *   isQuiz?: boolean;
 *   quizRevealed?: boolean;
 *   affichageResultatsPublic?: boolean;
 * }} input
 * @returns {boolean}
 */
export function shouldRevealQuizAnswerToParticipant(input = {}) {
  return (
    input.isQuiz === true &&
    input.quizRevealed === true &&
    input.affichageResultatsPublic === true
  );
}

/**
 * Régie — action unique « Afficher les résultats » : pour un Quiz dont le vote
 * est fermé, show-results doit aussi passer `quizRevealed` (pas de 2ᵉ bouton).
 * Vote encore ouvert → projection RESULTS sans révélation (résultats en direct).
 *
 * @param {{
 *   pollType?: string | null;
 *   quizRevealed?: boolean;
 *   voteState?: string | null;
 * }} input
 * @returns {boolean}
 */
export function shouldRevealQuizWhenShowingResults(input = {}) {
  return (
    String(input.pollType ?? "").toUpperCase() === "QUIZ" &&
    input.quizRevealed !== true &&
    String(input.voteState ?? "").toLowerCase().trim() === "closed"
  );
}

/**
 * Empêche un GET `/p` silencieux périmé d’effacer `quizRevealed` / `isCorrect`
 * déjà reçus via `poll_updated` (Screen applique le socket directement ; la Salle
 * peut perdre la révélation si un fetch antérieur se termine après).
 *
 * @param {Record<string, unknown> | null | undefined} prevPoll
 * @param {Record<string, unknown> | null | undefined} nextPoll
 * @returns {Record<string, unknown> | null | undefined}
 */
export function mergePollJsonPreservingQuizReveal(prevPoll, nextPoll) {
  if (!nextPoll || typeof nextPoll !== "object") return nextPoll;
  if (!prevPoll || typeof prevPoll !== "object") return nextPoll;
  if (String(prevPoll.id || "") !== String(nextPoll.id || "")) return nextPoll;
  if (prevPoll.quizRevealed !== true || nextPoll.quizRevealed === true) {
    return nextPoll;
  }

  const prevOpts = Array.isArray(prevPoll.options) ? prevPoll.options : [];
  const correctById = new Map();
  for (const opt of prevOpts) {
    if (!opt || typeof opt !== "object") continue;
    const id = String(/** @type {{ id?: unknown }} */ (opt).id || "");
    if (!id) continue;
    if (/** @type {{ isCorrect?: unknown }} */ (opt).isCorrect === true) {
      correctById.set(id, true);
    }
  }

  const nextOpts = Array.isArray(nextPoll.options) ? nextPoll.options : [];
  const options = nextOpts.map((opt) => {
    if (!opt || typeof opt !== "object") return opt;
    const id = String(/** @type {{ id?: unknown }} */ (opt).id || "");
    if (correctById.has(id)) {
      return { ...opt, isCorrect: true };
    }
    return opt;
  });

  return {
    ...nextPoll,
    quizRevealed: true,
    options,
  };
}

/**
 * G15 — contenu de la carte FINISHED sur `/join`.
 *
 * Cause historique du triple affichage :
 * 1. eyebrow = getLiveStateLabel(FINISHED) (« Merci… »)
 * 2. titre corps = joinPres.title (même libellé)
 * 3. sous-texte = LIVE_UX_BODY_FINISHED_MERCI (encore le même)
 *
 * Contrat : un seul message visible, pas d’eyebrow, pas de body redondant.
 *
 * @returns {{
 *   showEyebrow: false;
 *   title: string;
 *   body: null;
 * }}
 */
export function resolveJoinFinishedCardContent() {
  return {
    showEyebrow: false,
    title: getLiveStateLabel(LIVE_UX_STATE.FINISHED),
    body: null,
  };
}

/**
 * Compte combien de fois le libellé FINISHED apparaîtrait dans la carte Join.
 * Utilisé pour verrouiller G15 (doit être exactement 1).
 *
 * @param {{
 *   showEyebrow?: boolean;
 *   eyebrowText?: string | null;
 *   title?: string | null;
 *   body?: string | null;
 * }} content
 * @returns {number}
 */
export function countJoinFinishedMerciMessages(content = {}) {
  const merci = getLiveStateLabel(LIVE_UX_STATE.FINISHED);
  let n = 0;
  if (content.showEyebrow === true) {
    const eyebrow = content.eyebrowText ?? null;
    if (eyebrow === merci) n += 1;
  }
  if (content.title === merci) n += 1;
  if (content.body === merci) n += 1;
  return n;
}

/**
 * Préavis lead / concours avant les choix.
 * @param {{ pollType?: string | null; leadEnabled?: boolean | null }} input
 * @returns {string | null}
 */
export function getParticipantFormNotice(input = {}) {
  const type = String(input.pollType ?? "").toUpperCase();
  if (type === "CONTEST_ENTRY") return PARTICIPANT_CONTEST_NOTICE;
  if (input.leadEnabled === true) return PARTICIPANT_LEAD_NOTICE;
  return null;
}

/**
 * Historique « questions déjà passées » pour `/join`.
 * Source exclusive : `pastPolls` API — ne jamais préfixer la question active
 * (une copie jamais lancée a pastPolls=[] même si activePollId pointe Q1 ACTIVE).
 *
 * @param {unknown} pastPolls
 * @returns {{ id: string; label: string }[]}
 */
export function resolveJoinHistoriqueQuestions(pastPolls) {
  if (!Array.isArray(pastPolls)) return [];
  return pastPolls
    .filter(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof /** @type {{ id?: unknown }} */ (x).id === "string" &&
        String(/** @type {{ id: string }} */ (x).id).trim() &&
        typeof /** @type {{ label?: unknown }} */ (x).label === "string" &&
        String(/** @type {{ label: string }} */ (x).label).trim(),
    )
    .map((x) => {
      const row = /** @type {{ id: string; label: string }} */ (x);
      return { id: row.id.trim(), label: row.label.trim() };
    });
}

/**
 * Barres / stats Salle : uniquement quand la régie a projeté RESULTS.
 * Jamais dès « j’ai voté » pendant VOTING (évite révélation prématurée).
 * @param {{ affichageResultatsPublic?: boolean }} input
 */
export function shouldShowParticipantResultStats(input = {}) {
  return input.affichageResultatsPublic === true;
}

/**
 * Instruction active « Choisis ta réponse » : seulement si vote ouvert et pas encore voté.
 * @param {{ voteOuvert?: boolean; hasVoted?: boolean }} input
 */
export function shouldShowActiveVotingInstruction(input = {}) {
  return input.voteOuvert === true && input.hasVoted !== true;
}

/**
 * Feedback Quiz après /reveal (CLOSED, pas RESULTS) — nomme la bonne réponse.
 * @param {{
 *   correctLabel?: string | null;
 *   answeredCorrectly?: boolean | null;
 *   hasVoted?: boolean;
 * }} input
 * @returns {string | null}
 */
export function formatQuizRevealParticipantFeedback(input = {}) {
  const name = String(input.correctLabel ?? "").trim();
  if (!name) return null;
  if (input.hasVoted !== true) {
    return `Bonne réponse : ${name}`;
  }
  if (input.answeredCorrectly === true) {
    return `Bonne réponse : ${name} ✅ — ton choix était correct`;
  }
  return `Mauvaise réponse ❌ — la bonne était : ${name}`;
}

/**
 * Strip supérieur Salle.
 * - VOTING après vote : `null` (strip masqué) — Merci reste dans le bloc principal.
 * - CLOSED : titre d’état (jamais Merci ; la carte CLOSED le porte).
 * @param {{
 *   hasVoted?: boolean;
 *   voteOuvert?: boolean;
 *   voteConfirmedLabel?: string;
 *   stateTitle?: string;
 * }} input
 * @returns {string | null}
 */
export function resolveParticipantTopStripLabel(input = {}) {
  // Confirmation déjà dans le bandeau / carte principale — ne pas la répéter.
  if (input.hasVoted === true && input.voteOuvert === true) {
    return null;
  }
  return input.stateTitle ?? "";
}

/**
 * Compte les surfaces Salle qui affichent la confirmation « Merci ! Ton vote… ».
 * Strip + (bandeau VOTING | titre carte CLOSED). Cible : exactement 1 après vote.
 * @param {{
 *   hasVoted?: boolean;
 *   voteOuvert?: boolean;
 *   merciPourVote?: boolean;
 *   closedWaitCardVisible?: boolean;
 *   voteConfirmedLabel?: string;
 *   stateTitle?: string;
 * }} input
 */
export function countParticipantVoteConfirmedSurfaces(input = {}) {
  const confirmed =
    input.voteConfirmedLabel ?? "Merci ! Ton vote est pris en compte";
  let n = 0;
  const strip = resolveParticipantTopStripLabel({
    hasVoted: input.hasVoted,
    voteOuvert: input.voteOuvert,
    voteConfirmedLabel: confirmed,
    stateTitle: input.stateTitle,
  });
  if (strip === confirmed) n += 1;
  if (input.merciPourVote === true && input.voteOuvert === true) n += 1;
  if (
    input.closedWaitCardVisible === true &&
    input.hasVoted === true &&
    input.voteOuvert !== true
  ) {
    n += 1;
  }
  return n;
}

/**
 * Badge option résultats Salle : Quiz révélé → « Bonne réponse » ; sinon En tête / Gagnant.
 * Sondages non-Quiz inchangés.
 * @param {{
 *   voteOuvert?: boolean;
 *   isQuiz?: boolean;
 *   quizRevealed?: boolean;
 *   isCorrect?: boolean;
 *   isWinner?: boolean;
 * }} input
 * @returns {string | null}
 */
export function getParticipantResultsOptionBadgeLabel(input = {}) {
  if (
    input.isQuiz === true &&
    input.quizRevealed === true &&
    input.isCorrect === true
  ) {
    return "Bonne réponse";
  }
  if (input.isWinner !== true) return null;
  return input.voteOuvert === true ? "En tête" : "Gagnant";
}
