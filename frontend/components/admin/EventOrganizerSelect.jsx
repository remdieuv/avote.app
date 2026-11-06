"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * Lot D — rattacher un événement à un profil organisateur du compte.
 *
 * @param {{
 *   eventId: string;
 *   organizerProfileId?: string | null;
 *   disabled?: boolean;
 *   onUpdated?: (profileId: string | null) => void;
 * }} props
 */
export function EventOrganizerSelect({
  eventId,
  organizerProfileId = null,
  disabled = false,
  onUpdated,
}) {
  const [profiles, setProfiles] = useState([]);
  const [value, setValue] = useState(organizerProfileId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(organizerProfileId || "");
  }, [organizerProfileId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/me/profiles`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setProfiles(Array.isArray(body.profiles) ? body.profiles : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(
    async (next) => {
      if (!eventId) return;
      setBusy(true);
      setError("");
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/discover-meta`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organizerProfileId: next ? next : null,
            }),
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || `Erreur ${res.status}`);
        }
        setValue(next || "");
        onUpdated?.(next || null);
      } catch (e) {
        setError(e?.message || "Impossible d’associer le profil.");
      } finally {
        setBusy(false);
      }
    },
    [eventId, onUpdated],
  );

  return (
    <div style={{ margin: "0 0 0.75rem" }}>
      <label
        style={{
          display: "block",
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#64748b",
          marginBottom: "0.28rem",
        }}
      >
        Profil organisateur
      </label>
      <select
        value={value}
        disabled={disabled || busy}
        onChange={(e) => void save(e.target.value)}
        style={{
          width: "100%",
          minHeight: 36,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          padding: "0.35rem 0.5rem",
          fontSize: "0.84rem",
          background: "#fff",
        }}
      >
        <option value="">— Aucun (OK pour live privé) —</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
            {p.type === "organization" ? " (orga)" : " (perso)"}
            {p.isPublic ? "" : " · non public"}
          </option>
        ))}
      </select>
      <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
        Obligatoire + public pour Découvrir. Créer des profils dans Mon compte.
      </p>
      {error ? (
        <p style={{ margin: "0.25rem 0 0", color: "#b91c1c", fontSize: "0.78rem", fontWeight: 700 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
