"use client";

import { blankEventStructuredInfo } from "@/lib/eventDiscoverMeta";

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#334155",
  marginBottom: "0.28rem",
};

const inputStyle = {
  width: "100%",
  minHeight: "38px",
  padding: "0.45rem 0.6rem",
  fontSize: "0.86rem",
  borderRadius: "9px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  background: "#fff",
  outline: "none",
};

/**
 * Champs structurés Discover (création ou édition) — pas les textes libres Landing.
 *
 * @param {{
 *   value?: import("@/lib/eventDiscoverMeta").EventStructuredInfoForm;
 *   onChange?: (next: import("@/lib/eventDiscoverMeta").EventStructuredInfoForm) => void;
 *   themes?: Array<{ id: string; slug?: string; label?: string }>;
 *   profiles?: Array<{ id: string; displayName?: string; type?: string; isPublic?: boolean }>;
 *   disabled?: boolean;
 *   idPrefix?: string;
 *   compact?: boolean;
 * }} props
 */
export function EventStructuredInfoFields({
  value,
  onChange,
  themes = [],
  profiles = [],
  disabled = false,
  idPrefix = "ev-meta",
  compact = false,
}) {
  const v = value || blankEventStructuredInfo();

  function patch(partial) {
    onChange?.({ ...v, ...partial });
  }

  const primaryOptions = themes;
  const secondaryOptions = themes.filter(
    (t) => !v.primaryThemeId || t.id !== v.primaryThemeId,
  );

  return (
    <div
      style={{
        display: "grid",
        gap: compact ? "0.55rem" : "0.7rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.74rem",
          color: "#64748b",
          lineHeight: 1.4,
        }}
      >
        Infos structurées pour « Les événements » (annuaire). Distinctes des
        textes libres de la Landing.
      </p>

      <div>
        <label style={labelStyle} htmlFor={`${idPrefix}-startsAt`}>
          Date et heure de début
        </label>
        <input
          id={`${idPrefix}-startsAt`}
          type="datetime-local"
          value={v.startsAtLocal}
          disabled={disabled}
          onChange={(e) => patch({ startsAtLocal: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor={`${idPrefix}-city`}>
          Ville
        </label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          value={v.city}
          disabled={disabled}
          maxLength={120}
          placeholder="Ex. Lyon"
          onChange={(e) => patch({ city: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
          gap: "0.55rem",
        }}
      >
        <div>
          <label style={labelStyle} htmlFor={`${idPrefix}-theme-primary`}>
            Thème principal
          </label>
          <select
            id={`${idPrefix}-theme-primary`}
            value={v.primaryThemeId}
            disabled={disabled}
            onChange={(e) => {
              const nextPrimary = e.target.value;
              patch({
                primaryThemeId: nextPrimary,
                secondaryThemeId:
                  v.secondaryThemeId && v.secondaryThemeId === nextPrimary
                    ? ""
                    : v.secondaryThemeId,
              });
            }}
            style={inputStyle}
          >
            <option value="">— Aucun —</option>
            {primaryOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.slug || t.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor={`${idPrefix}-theme-secondary`}>
            Thème secondaire (facultatif)
          </label>
          <select
            id={`${idPrefix}-theme-secondary`}
            value={v.secondaryThemeId}
            disabled={disabled || !v.primaryThemeId}
            onChange={(e) => patch({ secondaryThemeId: e.target.value })}
            style={inputStyle}
          >
            <option value="">— Aucun —</option>
            {secondaryOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label || t.slug || t.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle} htmlFor={`${idPrefix}-organizer`}>
          Profil organisateur
        </label>
        <select
          id={`${idPrefix}-organizer`}
          value={v.organizerProfileId}
          disabled={disabled}
          onChange={(e) => patch({ organizerProfileId: e.target.value })}
          style={inputStyle}
        >
          <option value="">— Aucun (OK pour live privé) —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName || p.id}
              {p.type === "organization" ? " (orga)" : " (perso)"}
              {p.isPublic ? "" : " · non public"}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
