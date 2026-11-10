"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * Lot F — Invitations et confidentialité (Landing admin).
 * @param {{ eventId: string; eventSlug?: string | null }} props
 */
export function EventInvitesPanel({ eventId, eventSlug }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [data, setData] = useState(/** @type {null | Record<string, any>} */ (null));
  const [plaintextCode, setPlaintextCode] = useState(/** @type {string|null} */ (null));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(/** @type {string|null} */ (null));

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/invite`,
        { cache: "no-store" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
      setData(body);
    } catch (e) {
      setError(e?.message || "Impossible de charger les invitations.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invitePath =
    data?.invitePath ||
    (eventSlug ? `/invite/${eventSlug}` : null);
  const inviteAbsolute =
    typeof window !== "undefined" && invitePath
      ? `${window.location.origin}${invitePath}`
      : invitePath;

  async function copy(text, key) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copie impossible sur cet appareil.");
    }
  }

  async function enableProtection() {
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/invite/enable`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          Array.isArray(body?.failed) && body.failed.length
            ? ` (${body.failed.slice(0, 3).join(", ")})`
            : "";
        throw new Error((body?.error || `Erreur ${res.status}`) + detail);
      }
      setData(body);
      setPlaintextCode(
        typeof body?.inviteCode === "string" ? body.inviteCode : null,
      );
      setConfirmOpen(false);
    } catch (e) {
      setError(e?.message || "Activation impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function rotateCode() {
    const ok = window.confirm(
      data?.warnings?.rotate ||
        "Renouveler le code ? Les invités déjà autorisés gardent leur accès.",
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/invite/rotate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
      setData(body);
      setPlaintextCode(
        typeof body?.inviteCode === "string" ? body.inviteCode : null,
      );
    } catch (e) {
      setError(e?.message || "Renouvellement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={card}>
      <h2 style={sectionTitle}>Invitations et confidentialité</h2>
      <p style={hint}>
        Protège réellement les souvenirs de la page de l’événement (photos, fil, médias). Le
        live <code style={{ fontSize: "0.72rem" }}>/join</code> et le vote restent
        ouverts sans code. Les événements publics ne sont pas concernés.
      </p>

      {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>
          {error}
        </p>
      ) : null}

      {!loading && data ? (
        <>
          <p
            style={{
              margin: "0 0 0.85rem",
              fontSize: "0.84rem",
              fontWeight: 750,
              color: data.inviteEnabled ? "#15803d" : "#b45309",
            }}
          >
            {data.inviteEnabled
              ? data.mediaProtectionEnabled
                ? "État : protection active (accès invitation + médias sécurisés)"
                : "État : invitation active (vérifiez la protection médias)"
              : "État : accès historique par lien /e (non verrouillé)"}
          </p>

          {!data.inviteEnabled ? (
            <>
              {!confirmOpen ? (
                <button
                  type="button"
                  style={btnPrimary}
                  disabled={saving}
                  onClick={() => setConfirmOpen(true)}
                >
                  Activer la protection sur invitation
                </button>
              ) : (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: 12,
                    border: "1px solid #fdba74",
                    background: "#fff7ed",
                    marginBottom: "0.75rem",
                  }}
                >
                  <p style={{ margin: "0 0 0.55rem", fontWeight: 800, color: "#9a3412" }}>
                    Avant d’activer
                  </p>
                  <p style={{ margin: "0 0 0.55rem", fontSize: "0.86rem", lineHeight: 1.5, color: "#9a3412" }}>
                    {data.warnings?.activation}
                  </p>
                  <p style={{ margin: "0 0 0.85rem", fontSize: "0.86rem", lineHeight: 1.5, color: "#9a3412" }}>
                    {data.warnings?.mediaMigration}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <button
                      type="button"
                      style={btnPrimary}
                      disabled={saving}
                      onClick={() => void enableProtection()}
                    >
                      {saving ? "Migration & activation…" : "Confirmer l’activation"}
                    </button>
                    <button
                      type="button"
                      style={btnGhost}
                      disabled={saving}
                      onClick={() => setConfirmOpen(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: "grid", gap: "0.65rem", marginBottom: "0.85rem" }}>
                <label style={labelStyle}>
                  Lien d’invitation
                  <div style={row}>
                    <code style={codeBox}>{inviteAbsolute || "—"}</code>
                    <button
                      type="button"
                      style={btnGhost}
                      onClick={() => void copy(inviteAbsolute, "link")}
                    >
                      {copied === "link" ? "Copié" : "Copier le lien"}
                    </button>
                  </div>
                </label>
                <label style={labelStyle}>
                  Code d’accès
                  <div style={row}>
                    <code style={codeBox}>
                      {plaintextCode ||
                        (data.hasInviteCode
                          ? "•••••••• (affiché uniquement à la génération)"
                          : "—")}
                    </code>
                    {plaintextCode ? (
                      <button
                        type="button"
                        style={btnGhost}
                        onClick={() => void copy(plaintextCode, "code")}
                      >
                        {copied === "code" ? "Copié" : "Copier le code"}
                      </button>
                    ) : null}
                  </div>
                </label>
              </div>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "#64748b" }}>
                Invités autorisés :{" "}
                <strong style={{ color: "#0f172a" }}>
                  {typeof data.guestCount === "number" ? data.guestCount : "—"}
                </strong>
                . Renouveler le code ne révoque pas les accès déjà accordés.
              </p>
              <button
                type="button"
                style={btnGhost}
                disabled={saving}
                onClick={() => void rotateCode()}
              >
                {saving ? "…" : "Renouveler le code"}
              </button>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}

const card = {
  marginBottom: "1.15rem",
  padding: "1rem 1.05rem",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
};

const sectionTitle = {
  margin: "0 0 0.55rem",
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const hint = {
  margin: "0 0 0.85rem",
  fontSize: "0.82rem",
  color: "#64748b",
  lineHeight: 1.5,
};

const labelStyle = {
  display: "grid",
  gap: "0.35rem",
  fontSize: "0.78rem",
  fontWeight: 800,
  color: "#475569",
};

const row = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.45rem",
  alignItems: "center",
};

const codeBox = {
  fontSize: "0.78rem",
  padding: "0.4rem 0.55rem",
  borderRadius: 8,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0.45rem 0.85rem",
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const btnGhost = {
  ...btnPrimary,
  background: "#fff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};
