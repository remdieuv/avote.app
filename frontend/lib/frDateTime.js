/**
 * Affichage / saisie FR pour `datetime-local` (YYYY-MM-DDTHH:mm).
 * Ne change pas la représentation stockée côté API (ISO via eventDiscoverMeta).
 */

/**
 * @param {unknown} local
 * @returns {{ dateFr: string; timeFr: string } | null}
 */
export function splitDatetimeLocalFr(local) {
  const s = String(local ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  return {
    dateFr: `${m[3]}/${m[2]}/${m[1]}`,
    timeFr: `${m[4]}:${m[5]}`,
  };
}

/**
 * @param {unknown} local
 * @returns {string}
 */
export function formatDatetimeLocalFr(local) {
  const parts = splitDatetimeLocalFr(local);
  if (!parts) return "";
  return `${parts.dateFr} ${parts.timeFr}`;
}

/**
 * @param {unknown} dateFr jj/mm/aaaa
 * @returns {{ y: number; m: number; d: number } | null}
 */
export function parseFrDateParts(dateFr) {
  const s = String(dateFr ?? "").trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
    return null;
  }
  const probe = new Date(y, mo - 1, d);
  if (
    probe.getFullYear() !== y ||
    probe.getMonth() !== mo - 1 ||
    probe.getDate() !== d
  ) {
    return null;
  }
  return { y, m: mo, d };
}

/**
 * @param {unknown} timeFr HH:mm (24 h)
 * @returns {{ h: number; min: number } | null}
 */
export function parseFrTimeParts(timeFr) {
  const s = String(timeFr ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, min };
}

/**
 * @param {unknown} dateFr
 * @param {unknown} timeFr
 * @returns {string | null | undefined}
 *   string = datetime-local valide · null = champs vides · undefined = invalide
 */
export function frDateTimeToDatetimeLocal(dateFr, timeFr) {
  const dRaw = String(dateFr ?? "").trim();
  const tRaw = String(timeFr ?? "").trim();
  if (!dRaw && !tRaw) return null;
  if (!dRaw || !tRaw) return undefined;
  const d = parseFrDateParts(dRaw);
  const t = parseFrTimeParts(tRaw);
  if (!d || !t) return undefined;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.y}-${pad(d.m)}-${pad(d.d)}T${pad(t.h)}:${pad(t.min)}`;
}
