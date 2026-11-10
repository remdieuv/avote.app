"use client";

import { useEffect, useMemo, useState } from "react";
import { EventStructuredInfoFields } from "@/components/admin/EventStructuredInfoFields";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  buildDiscoverMetaPatchBody,
  listDiscoverEligibilityGaps,
  structuredInfoFromEvent,
} from "@/lib/eventDiscoverMeta";
import { isPublicVisibility } from "@/lib/eventVisibility";

/**
 * Section compacte « Informations de l’événement » (Mes événements).
 * Événements terminés : toujours modifiables. Réutilise PATCH discover-meta.
 *
 * @param {{
 *   event: Record<string, unknown>;
 *   disabled?: boolean;
 *   onUpdated?: (eventId: string, patch: Record<string, unknown>) => void;
 * }} props
 */
export function EventStructuredInfoPanel({
  event,
  disabled = false,
  onUpdated,
}) {
  const eventId = typeof event?.id === "string" ? event.id : "";
  const [themes, setThemes] = useState(
    /** @type {Array<{ id: string; slug?: string; label?: string }>} */ ([]),
  );
  const [profiles, setProfiles] = useState(
    /** @type {Array<{ id: string; displayName?: string; type?: string; isPublic?: boolean }>} */ (
      []
    ),
  );
  const [form, setForm] = useState(() => structuredInfoFromEvent(event));
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(structuredInfoFromEvent(event)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    const next = structuredInfoFromEvent(event);
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [
    event?.id,
    event?.city,
    event?.startsAt,
    event?.primaryThemeId,
    event?.secondaryThemeId,
    event?.organizerProfileId,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [themesRes, profilesRes] = await Promise.all([
          adminFetch(`${apiBaseBrowser()}/discover/themes`, {
            cache: "no-store",
          }),
          adminFetch(`${apiBaseBrowser()}/me/profiles`, { cache: "no-store" }),
        ]);
        const themesBody = await themesRes.json().catch(() => ({}));
        const profilesBody = await profilesRes.json().catch(() => ({}));
        if (cancelled) return;
        const themeList = Array.isArray(themesBody?.themes)
          ? themesBody.themes
          : Array.isArray(themesBody)
            ? themesBody
            : [];
        setThemes(
          themeList.map((t) => ({
            id: String(t.id),
            slug: t.slug,
            label: t.label,
          })),
        );
        setProfiles(
          Array.isArray(profilesBody?.profiles) ? profilesBody.profiles : [],
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(form) !== baseline;
  const isPublic = isPublicVisibility(event?.visibility);
  const gaps = useMemo(
    () =>
      listDiscoverEligibilityGaps({
        startsAtLocal: form.startsAtLocal,
        primaryThemeId: form.primaryThemeId,
        organizerProfileId: form.organizerProfileId,
        profiles,
      }),
    [form, profiles],
  );

  async function save() {
    if (!eventId || busy) return;
    const built = buildDiscoverMetaPatchBody(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setBusy(true);
    setError("");
    setSavedMsg("");
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/discover-meta`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(built.body),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || body?.message || `Erreur ${res.status}`);
      }
      const patch = {
        city: body.city ?? built.body.city,
        startsAt: body.startsAt ?? built.body.startsAt,
        primaryThemeId:
          body.primaryTheme?.id ?? built.body.primaryThemeId ?? null,
        secondaryThemeId:
          body.secondaryTheme?.id ?? built.body.secondaryThemeId ?? null,
        organizerProfileId:
          body.organizerProfile?.id ?? built.body.organizerProfileId ?? null,
        discoverEligible:
          typeof body.discoverEligible === "boolean"
            ? body.discoverEligible
            : undefined,
      };
      const hydrated = structuredInfoFromEvent({ ...event, ...patch });
      setForm(hydrated);
      setBaseline(JSON.stringify(hydrated));
      onUpdated?.(eventId, patch);
      setSavedMsg("Informations enregistrées.");
      window.setTimeout(() => setSavedMsg(""), 2200);
    } catch (e) {
      setError(e?.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        margin: "0 0 0.85rem",
        padding: "0.7rem 0.75rem 0.75rem",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.35rem",
          marginBottom: "0.45rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "0.78rem",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#475569",
          }}
        >
          Informations de l’événement
        </h3>
        {isPublic && gaps.length === 0 ? (
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534" }}>
            Éligible annuaire
          </span>
        ) : null}
      </div>

      <EventStructuredInfoFields
        value={form}
        onChange={setForm}
        themes={themes}
        profiles={profiles}
        disabled={disabled || busy}
        idPrefix={`ev-meta-${eventId || "x"}`}
        compact
      />

      {isPublic && gaps.length > 0 ? (
        <div
          style={{
            marginTop: "0.55rem",
            padding: "0.45rem 0.55rem",
            borderRadius: "8px",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            background: "rgba(255, 251, 235, 0.85)",
            fontSize: "0.74rem",
            color: "#92400e",
          }}
        >
          <p style={{ margin: "0 0 0.25rem", fontWeight: 750 }}>
            Pour apparaître dans « Les événements », il manque :
          </p>
          <ul style={{ margin: 0, paddingLeft: "1rem" }}>
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        style={{
          marginTop: "0.6rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.45rem",
        }}
      >
        <button
          type="button"
          disabled={disabled || busy || !dirty}
          onClick={() => void save()}
          style={{
            padding: "0.4rem 0.75rem",
            fontSize: "0.8rem",
            fontWeight: 750,
            borderRadius: "8px",
            border: "none",
            background: disabled || busy || !dirty ? "#94a3b8" : "#1d4ed8",
            color: "#fff",
            cursor: disabled || busy || !dirty ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {savedMsg ? (
          <span style={{ fontSize: "0.76rem", color: "#166534", fontWeight: 650 }}>
            {savedMsg}
          </span>
        ) : null}
        {error ? (
          <span style={{ fontSize: "0.76rem", color: "#b91c1c", fontWeight: 700 }}>
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
