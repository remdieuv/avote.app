const STORAGE_KEY = "avote_my_events";

/**
 * Mémorise un événement créé sur cet appareil (id, titre, slug).
 * @param {{ id: string; title: string; slug: string }} ev
 */
export function rememberMyEvent(ev) {
  if (typeof window === "undefined") return;
  const id = String(ev.id || "").trim();
  const slug = String(ev.slug || "").trim();
  if (!id || !slug) return;

  let items = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed?.items) ? parsed.items : [];
    }
  } catch {
    items = [];
  }

  const entry = {
    id,
    title: String(ev.title || "Événement").trim() || "Événement",
    slug,
    savedAt: new Date().toISOString(),
  };

  const next = [entry, ...items.filter((x) => x && String(x.id) !== id)].slice(
    0,
    50,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: next }));
}

/** @returns {Array<{ id: string; title: string; slug: string; savedAt?: string }>} */
export function loadStoredMyEvents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.items)) return [];
    return parsed.items.filter(
      (x) => x && typeof x.id === "string" && typeof x.slug === "string",
    );
  } catch {
    return [];
  }
}
