/**
 * Métadonnées structurées Discover (ville, startsAt, thèmes, profil orga).
 * Distinctes des textes libres de la page de l’événement (venue / date affichée).
 */

/** @typedef {{
 *   city: string;
 *   startsAtLocal: string;
 *   primaryThemeId: string;
 *   secondaryThemeId: string;
 *   organizerProfileId: string;
 * }} EventStructuredInfoForm
 */

/** @returns {EventStructuredInfoForm} */
export function blankEventStructuredInfo() {
  return {
    city: "",
    startsAtLocal: "",
    primaryThemeId: "",
    secondaryThemeId: "",
    organizerProfileId: "",
  };
}

/**
 * ISO → valeur `datetime-local` (timezone locale navigateur).
 * @param {unknown} iso
 * @returns {string}
 */
export function isoToDatetimeLocal(iso) {
  if (iso == null || iso === "") return "";
  const d = iso instanceof Date ? iso : new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * `datetime-local` → ISO ou null si vide / invalide.
 * @param {unknown} local
 * @returns {string | null | undefined} undefined = invalide
 */
export function datetimeLocalToIso(local) {
  const s = String(local ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Normalise un id thème / profil (chaîne non vide ou null).
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeOptionalId(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s ? s : null;
}

/**
 * @param {EventStructuredInfoForm | null | undefined} form
 * @returns {EventStructuredInfoForm}
 */
export function normalizeStructuredInfoForm(form) {
  const blank = blankEventStructuredInfo();
  if (!form || typeof form !== "object") return blank;
  return {
    city: typeof form.city === "string" ? form.city : "",
    startsAtLocal:
      typeof form.startsAtLocal === "string" ? form.startsAtLocal : "",
    primaryThemeId:
      typeof form.primaryThemeId === "string" ? form.primaryThemeId : "",
    secondaryThemeId:
      typeof form.secondaryThemeId === "string" ? form.secondaryThemeId : "",
    organizerProfileId:
      typeof form.organizerProfileId === "string"
        ? form.organizerProfileId
        : "",
  };
}

/**
 * Payload PATCH `/events/:id/discover-meta` (tous les champs, y compris clear).
 * @param {EventStructuredInfoForm} form
 * @returns {{
 *   ok: true;
 *   body: {
 *     city: string | null;
 *     startsAt: string | null;
 *     primaryThemeId: string | null;
 *     secondaryThemeId: string | null;
 *     organizerProfileId: string | null;
 *   };
 * } | { ok: false; error: string }}
 */
export function buildDiscoverMetaPatchBody(form) {
  const f = normalizeStructuredInfoForm(form);
  const startsAt = datetimeLocalToIso(f.startsAtLocal);
  if (startsAt === undefined) {
    return { ok: false, error: "Date et heure de début invalides." };
  }
  const primary = normalizeOptionalId(f.primaryThemeId);
  const secondary = normalizeOptionalId(f.secondaryThemeId);
  if (primary && secondary && primary === secondary) {
    return {
      ok: false,
      error: "Le thème secondaire doit être distinct du thème principal.",
    };
  }
  const cityTrim = f.city.trim();
  return {
    ok: true,
    body: {
      city: cityTrim ? cityTrim : null,
      startsAt,
      primaryThemeId: primary,
      secondaryThemeId: secondary,
      organizerProfileId: normalizeOptionalId(f.organizerProfileId),
    },
  };
}

/**
 * True s’il y a au moins une méta à envoyer après création.
 * @param {EventStructuredInfoForm} form
 */
export function hasAnyStructuredInfo(form) {
  const f = normalizeStructuredInfoForm(form);
  return Boolean(
    f.city.trim() ||
      f.startsAtLocal.trim() ||
      f.primaryThemeId.trim() ||
      f.secondaryThemeId.trim() ||
      f.organizerProfileId.trim(),
  );
}

/**
 * Écarts Discover (PUBLIC + thème + startsAt + profil orga public).
 * @param {{
 *   startsAt?: unknown;
 *   startsAtLocal?: unknown;
 *   primaryThemeId?: unknown;
 *   organizerProfileId?: unknown;
 *   profiles?: Array<{ id?: string; isPublic?: boolean } | null> | null;
 * }} args
 * @returns {string[]}
 */
export function listDiscoverEligibilityGaps(args) {
  /** @type {string[]} */
  const gaps = [];
  const startsAtIso =
    args?.startsAt != null && String(args.startsAt).trim()
      ? String(args.startsAt).trim()
      : datetimeLocalToIso(args?.startsAtLocal);
  const hasStartsAt =
    typeof startsAtIso === "string" &&
    startsAtIso.length > 0 &&
    !Number.isNaN(new Date(startsAtIso).getTime());
  if (!hasStartsAt) {
    gaps.push("Une date et heure de début.");
  }

  const primary = normalizeOptionalId(args?.primaryThemeId);
  if (!primary) {
    gaps.push("Un thème principal (max. 2 thèmes, dont un principal).");
  }

  const profiles = Array.isArray(args?.profiles) ? args.profiles : [];
  const selectedId = normalizeOptionalId(args?.organizerProfileId);
  const selected = selectedId
    ? profiles.find((p) => p && String(p.id) === selectedId)
    : null;
  if (!selectedId) {
    const hasAnyPublic = profiles.some((p) => p && p.isPublic === true);
    gaps.push(
      hasAnyPublic
        ? "Rattacher un profil organisateur public à l’événement."
        : "Un profil organisateur public (Mon compte → Profils organisateurs), puis le rattacher.",
    );
  } else if (selected && selected.isPublic !== true) {
    gaps.push(
      "Le profil organisateur rattaché doit être public pour l’annuaire.",
    );
  }

  return gaps;
}

/**
 * Hydrate le formulaire depuis un événement API / liste admin.
 * @param {{
 *   city?: unknown;
 *   startsAt?: unknown;
 *   primaryThemeId?: unknown;
 *   secondaryThemeId?: unknown;
 *   organizerProfileId?: unknown;
 *   primaryTheme?: { id?: string } | null;
 *   secondaryTheme?: { id?: string } | null;
 * } | null | undefined} event
 * @returns {EventStructuredInfoForm}
 */
export function structuredInfoFromEvent(event) {
  if (!event || typeof event !== "object") return blankEventStructuredInfo();
  const primary =
    normalizeOptionalId(event.primaryThemeId) ||
    normalizeOptionalId(event.primaryTheme?.id) ||
    "";
  const secondary =
    normalizeOptionalId(event.secondaryThemeId) ||
    normalizeOptionalId(event.secondaryTheme?.id) ||
    "";
  return {
    city: typeof event.city === "string" ? event.city : "",
    startsAtLocal: isoToDatetimeLocal(event.startsAt),
    primaryThemeId: primary || "",
    secondaryThemeId: secondary || "",
    organizerProfileId: normalizeOptionalId(event.organizerProfileId) || "",
  };
}
