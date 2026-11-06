"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const inputStyle = {
  width: "100%",
  minHeight: "40px",
  padding: "0.5rem 0.65rem",
  fontSize: "0.88rem",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

/**
 * Lot D — gestion des profils organisateurs (compte).
 */
export function OrganizerProfilesPanel() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [formType, setFormType] = useState(/** @type {"personal"|"organization"} */ ("personal"));
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [editId, setEditId] = useState(/** @type {string|null} */ (null));

  const hasPersonal = profiles.some((p) => p.type === "personal");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/me/profiles`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      setProfiles(Array.isArray(body.profiles) ? body.profiles : []);
    } catch (e) {
      setError(e?.message || "Impossible de charger les profils.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (formType === "organization" && !editId) setIsPublic(true);
    if (formType === "personal" && !editId) setIsPublic(false);
  }, [formType, editId]);

  function resetForm() {
    setEditId(null);
    setFormType(hasPersonal ? "organization" : "personal");
    setDisplayName("");
    setBio("");
    setWebsiteUrl("");
    setIsPublic(hasPersonal);
  }

  function startEdit(p) {
    setEditId(p.id);
    setFormType(p.type === "organization" ? "organization" : "personal");
    setDisplayName(p.displayName || "");
    setBio(p.bio || "");
    setWebsiteUrl(p.websiteUrl || "");
    setIsPublic(Boolean(p.isPublic));
  }

  async function submitForm(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        isPublic,
      };
      let res;
      if (editId) {
        res = await adminFetch(
          `${apiBaseBrowser()}/me/profiles/${encodeURIComponent(editId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
      } else {
        res = await adminFetch(`${apiBaseBrowser()}/me/profiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, type: formType }),
        });
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err?.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProfile(id) {
    if (!window.confirm("Supprimer ce profil ? Les événements liés resteront, sans organisateur.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/me/profiles/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
      if (editId === id) resetForm();
      await load();
    } catch (err) {
      setError(err?.message || "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(profileId, file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch(
        `${apiBaseBrowser()}/me/profiles/${encodeURIComponent(profileId)}/image`,
        { method: "POST", body: fd },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
      await load();
    } catch (err) {
      setError(err?.message || "Upload impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "1rem 1.05rem 1.1rem",
        marginTop: "1rem",
      }}
    >
      <h2
        style={{
          margin: "0 0 0.35rem",
          fontSize: "1.05rem",
          color: "#0f172a",
        }}
      >
        Profils organisateurs
      </h2>
      <p style={{ margin: "0 0 0.85rem", color: "#64748b", fontSize: "0.84rem" }}>
        Identité Particulier et Organisations. Non obligatoire pour le live.
        Requis pour apparaître dans Découvrir. Le nom n’est jamais repris automatiquement depuis l’e-mail.
      </p>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: "0.86rem" }}>Chargement…</p>
      ) : null}
      {error ? (
        <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: "0.86rem" }}>{error}</p>
      ) : null}

      <ul style={{ listStyle: "none", margin: "0 0 1rem", padding: 0 }}>
        {profiles.map((p) => (
          <li
            key={p.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.75rem",
              marginBottom: "0.55rem",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  width={48}
                  height={48}
                  style={{ borderRadius: "10px", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "10px",
                    background: "#e2e8f0",
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>
                  {p.displayName}{" "}
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: "0.78rem" }}>
                    ({p.type === "organization" ? "Organisation" : "Particulier"}
                    {p.isPublic ? " · public" : " · privé"})
                  </span>
                </p>
                {p.bio ? (
                  <p style={{ margin: "0.25rem 0 0", color: "#475569", fontSize: "0.82rem" }}>
                    {p.bio}
                  </p>
                ) : null}
                <div style={{ marginTop: "0.45rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  <button type="button" disabled={busy} onClick={() => startEdit(p)} style={btnGhost}>
                    Modifier
                  </button>
                  <label style={{ ...btnGhost, cursor: busy ? "not-allowed" : "pointer" }}>
                    Photo / logo
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={busy}
                      onChange={(ev) => {
                        const f = ev.target.files?.[0];
                        void uploadImage(p.id, f);
                        ev.target.value = "";
                      }}
                    />
                  </label>
                  {p.isPublic ? (
                    <Link href={`/organizers/${encodeURIComponent(p.slug)}`} style={btnGhost}>
                      Voir la page
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeProfile(p.id)}
                    style={{ ...btnGhost, color: "#b91c1c", borderColor: "#fecaca" }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={(e) => void submitForm(e)}>
        <h3 style={{ margin: "0 0 0.55rem", fontSize: "0.95rem" }}>
          {editId ? "Modifier le profil" : "Créer un profil"}
        </h3>
        {!editId ? (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.55rem" }}>
            <label style={{ fontSize: "0.84rem", fontWeight: 700 }}>
              <input
                type="radio"
                name="ptype"
                checked={formType === "personal"}
                disabled={hasPersonal}
                onChange={() => setFormType("personal")}
              />{" "}
              Particulier {hasPersonal ? "(déjà créé)" : ""}
            </label>
            <label style={{ fontSize: "0.84rem", fontWeight: 700 }}>
              <input
                type="radio"
                name="ptype"
                checked={formType === "organization"}
                onChange={() => setFormType("organization")}
              />{" "}
              Organisation
            </label>
          </div>
        ) : null}
        <label style={labelStyle}>
          Nom ou pseudonyme *
          <input
            style={inputStyle}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={80}
            placeholder="Ex. Studio Nord / Alex M."
          />
        </label>
        <label style={labelStyle}>
          Présentation
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={2000}
          />
        </label>
        <label style={labelStyle}>
          Site internet
          <input
            style={inputStyle}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://"
          />
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.84rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Profil public (visible sur une page organisateur)
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            disabled={busy || !displayName.trim()}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "9px",
              border: "none",
              background: "#1d4ed8",
              color: "#fff",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {editId ? "Enregistrer" : "Créer"}
          </button>
          {editId ? (
            <button type="button" disabled={busy} onClick={resetForm} style={btnGhost}>
              Annuler
            </button>
          ) : null}
        </div>
      </form>
    </article>
  );
}

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.32rem 0.55rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  textDecoration: "none",
  cursor: "pointer",
};

const labelStyle = {
  display: "block",
  marginBottom: "0.55rem",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#334155",
};
