/**
 * Détection sondage « notation / échelle » pour l’écran résultats.
 * @param {unknown} label
 * @returns {number | null}
 */
export function parseLabelNumerique(label) {
  const t = String(label ?? "")
    .trim()
    .replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Options triées par `order`, valeur numérique par label (ou indice + 1 si non parsable).
 * @param {Array<Record<string, unknown>>} options
 */
export function optionsNotationOrdonnees(options) {
  const list = [...(options || [])].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
  );
  return list.map((opt, i) => {
    const parsed = parseLabelNumerique(opt.label);
    const valeur = parsed !== null ? parsed : i + 1;
    return { opt, valeur, index: i };
  });
}

/**
 * Grille type 1…N : au moins 3 options, entiers consécutifs sur les labels.
 */
export function estGrilleNumeriqueConsecutive(options) {
  const ord = optionsNotationOrdonnees(options);
  if (ord.length < 3) return false;
  const nums = ord.map(({ opt }) => parseLabelNumerique(opt.label));
  if (nums.some((n) => n === null || !Number.isInteger(n))) return false;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min < 1 || max > 30) return false;
  if (nums.length !== max - min + 1) return false;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== min + i) return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown> | null | undefined} poll
 */
export function estPollNotation(poll) {
  const t = String(poll?.type ?? "").toUpperCase();
  if (t === "RATING") return true;
  return estGrilleNumeriqueConsecutive(poll?.options ?? []);
}
