/**
 * LOT-4 / P5 — Mode Télécommande orga (viewport &lt;1024).
 * Helpers purs : quand afficher le chrome minimal + états des 4 actions.
 */

/**
 * Chrome Télécommande (T-E1) : mobile et pas « Régie complète ».
 * @param {{ desktop?: boolean; forceFullRegie?: boolean }} input
 */
export function shouldUseTelecommandeChrome(input = {}) {
  return input.desktop !== true && input.forceFullRegie !== true;
}

/**
 * Indicateur connexion socket (libellés Télécommande).
 * @param {{ connected?: boolean; reconnecting?: boolean }} input
 * @returns {{
 *   key: 'connected' | 'connecting' | 'disconnected';
 *   label: string;
 *   color: string;
 *   bg: string;
 *   border: string;
 * }}
 */
export function getTelecommandeConnectionStatus(input = {}) {
  if (input.connected === true) {
    return {
      key: "connected",
      label: "Connecté",
      color: "#166534",
      bg: "#dcfce7",
      border: "#86efac",
    };
  }
  if (input.reconnecting === true) {
    return {
      key: "connecting",
      label: "Connexion en cours",
      color: "#92400e",
      bg: "#fef3c7",
      border: "#fcd34d",
    };
  }
  return {
    key: "disconnected",
    label: "Déconnecté",
    color: "#991b1b",
    bg: "#fee2e2",
    border: "#fecaca",
  };
}

/**
 * Bouton primaire Ouvrir/Fermer (étendu aux étapes Afficher / Tirage du parcours live).
 * @param {{
 *   canOpenVote?: boolean;
 *   canCloseVote?: boolean;
 *   canShowResults?: boolean;
 *   canDraw?: boolean;
 *   openLabel?: string;
 *   closeLabel?: string;
 *   showResultsLabel?: string;
 *   drawLabel?: string;
 * }} input
 * @returns {{ action: 'open' | 'close' | 'show-results' | 'draw' | null; label: string; enabled: boolean }}
 */
export function getTelecommandeVoteToggle(input = {}) {
  if (input.canCloseVote) {
    return {
      action: "close",
      label: input.closeLabel || "Fermer le vote",
      enabled: true,
    };
  }
  if (input.canOpenVote) {
    return {
      action: "open",
      label: input.openLabel || "Ouvrir le vote",
      enabled: true,
    };
  }
  if (input.canShowResults) {
    return {
      action: "show-results",
      label: input.showResultsLabel || "Afficher les résultats",
      enabled: true,
    };
  }
  if (input.canDraw) {
    return {
      action: "draw",
      label: input.drawLabel || "Tirer au sort",
      enabled: true,
    };
  }
  return {
    action: null,
    label: "Ouvrir / Fermer le vote",
    enabled: false,
  };
}

/**
 * Action chrono Télécommande (Démarrer / Pause / Reprendre) — mêmes flags régie.
 * Mutuellement exclusifs ; pas d’Activer / Régler / Désactiver ici.
 * @param {{
 *   demarrer?: boolean;
 *   pause?: boolean;
 *   reprendre?: boolean;
 * } | null | undefined} controls
 * @returns {{
 *   action: 'demarrer' | 'pause' | 'reprendre' | null;
 *   label: string;
 *   enabled: boolean;
 * }}
 */
export function getTelecommandeChronoAction(controls = {}) {
  if (controls?.pause) {
    return { action: "pause", label: "Pause", enabled: true };
  }
  if (controls?.reprendre) {
    return { action: "reprendre", label: "Reprendre", enabled: true };
  }
  if (controls?.demarrer) {
    return { action: "demarrer", label: "Démarrer", enabled: true };
  }
  return { action: null, label: "Chrono", enabled: false };
}

/**
 * Bouton « Question suivante » (next-poll prioritaire, sinon skip).
 * @param {{
 *   canGoNext?: boolean;
 *   canSkip?: boolean;
 *   skipLabel?: string;
 *   isLastQuestion?: boolean;
 * }} input
 * @returns {{ mode: 'next' | 'skip' | null; label: string; enabled: boolean }}
 */
export function getTelecommandeNextAction(input = {}) {
  if (input.canGoNext) {
    return {
      mode: "next",
      label: "Question suivante",
      enabled: true,
    };
  }
  if (input.canSkip) {
    return {
      mode: "skip",
      label: input.skipLabel || "Question suivante",
      enabled: true,
    };
  }
  return {
    mode: null,
    label: input.isLastQuestion
      ? "Dernière question"
      : "Question suivante",
    enabled: false,
  };
}

/**
 * Double confirmation Terminer (T-E4) — même pattern que la régie.
 * @param {{
 *   confirmFn?: (message: string) => boolean;
 *   promptFn?: (message: string, defaultValue?: string) => string | null;
 * }} [io]
 * @returns {boolean}
 */
export function confirmTelecommandeFinish(io = {}) {
  const confirmFn =
    typeof io.confirmFn === "function"
      ? io.confirmFn
      : typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm.bind(window)
        : () => false;
  const promptFn =
    typeof io.promptFn === "function"
      ? io.promptFn
      : typeof window !== "undefined" && typeof window.prompt === "function"
        ? window.prompt.bind(window)
        : () => null;

  const ok = confirmFn(
    "Terminer l’événement maintenant ? Cette action clôture l’événement.",
  );
  if (!ok) return false;
  const confirmWord = promptFn(
    "Confirmation de sécurité : tapez TERMINER pour confirmer.",
    "",
  );
  return String(confirmWord || "").trim().toUpperCase() === "TERMINER";
}

/**
 * Query `full=1` → régie mobile complète.
 * @param {string | null | undefined} search
 */
export function readForceFullRegieFromSearch(search) {
  if (typeof search !== "string" || !search) return false;
  const q = search.startsWith("?") ? search.slice(1) : search;
  try {
    return new URLSearchParams(q).get("full") === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} href
 * @param {boolean} forceFull
 */
export function buildRegieModeHref(href, forceFull) {
  try {
    const url = new URL(href, "https://avote.local");
    if (forceFull) url.searchParams.set("full", "1");
    else url.searchParams.delete("full");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return forceFull ? "?full=1" : "?";
  }
}
