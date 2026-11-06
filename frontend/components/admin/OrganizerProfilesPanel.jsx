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
 * Lot D — gestion compacte des profils organisateurs (Mon compte).
 * Formulaire masqué par défaut ; déplié via « Ajouter un profil » ou « Modifier ».
 * Aucun changement d’API / règles de visibilité.
 */
export function OrganizerProfilesPanel() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState(/** @type {"personal"|"organization"} */ ("personal"));
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [editId, setEditId] = useState(/** @type {string|null} */ (null));
  const [pendingImageFile, setPendingImageFile] = useState(
    /** @type {File|null} */ (null),
  );

  const hasPersonal = profiles.some((p) => p.type === "personal");
  const isEditing = Boolean(editId);
  const nameLabel =
    formType === "organization" ? "Nom de l'organisation" : "Nom ou pseudonyme";
  const namePlaceholder =
    formType === "organization" ? "Ex. Studio Nord" : "Ex. Alex M.";
  const imageLabel =
    formType === "organization" ? "Logo (facultatif)" : "Photo (facultatif)";

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
    if (!formOpen || isEditing) return;
    if (formType === "organization") setIsPublic(true);
    if (formType === "personal") setIsPublic(false);
  }, [formType, formOpen, isEditing]);

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
    setFormType(hasPersonal ? "organization" : "personal");
    setDisplayName("");
    setBio("");
    setWebsiteUrl("");
    setIsPublic(hasPersonal);
    setPendingImageFile(null);
  }

  function openCreateForm() {
    setError("");
    setEditId(null);
    setFormType(hasPersonal ? "organization" : "personal");
    setDisplayName("");
    setBio("");
    setWebsiteUrl("");
    setIsPublic(hasPersonal);
    setPendingImageFile(null);
    setFormOpen(true);
  }

  function startEdit(p) {
    setError("");
    setEditId(p.id);
    setFormType(p.type === "organization" ? "organization" : "personal");
    setDisplayName(p.displayName || "");
    setBio(p.bio || "");
    setWebsiteUrl(p.websiteUrl || "");
    setIsPublic(Boolean(p.isPublic));
    setPendingImageFile(null);
    setFormOpen(true);
  }

  async function uploadImage(profileId, file) {
    if (!file || !profileId) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await adminFetch(
      `${apiBaseBrowser()}/me/profiles/${encodeURIComponent(profileId)}/image`,
      { method: "POST", body: fd },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
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
      let savedId = editId;
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
      if (!savedId && body?.profile?.id) {
        savedId = body.profile.id;
      }
      if (pendingImageFile && savedId) {
        await uploadImage(savedId, pendingImageFile);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err?.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProfile(id) {
    if (
      !window.confirm(
        "Supprimer ce profil ? Les événements liés resteront, sans organisateur.",
      )
    ) {
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
      if (editId === id) closeForm();
      await load();
    } catch (err) {
      setError(err?.message || "Suppression impossible.");
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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.65rem",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "1.05rem",
              color: "#0f172a",
            }}
          >
            Mes profils organisateurs
          </h2>
          <p
            style={{
              margin: "0.3rem 0 0",
              color: "#64748b",
              fontSize: "0.84rem",
              lineHeight: 1.45,
            }}
          >
            Particulier et organisations. Facultatif pour le live, requis pour
            Découvrir. Le nom n’est jamais repris depuis l’e-mail.
          </p>
        </div>
        {!formOpen ? (
          <button
            type="button"
            disabled={busy || loading}
            onClick={openCreateForm}
            style={btnPrimary}
          >
            Ajouter un profil
          </button>
        ) : null}
      </div>

      {loading ? (
        <p style={{ color: "#64748b", fontSize: "0.86rem" }}>Chargement…</p>
      ) : null}
      {error ? (
        <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: "0.86rem" }}>
          {error}
        </p>
      ) : null}

      {!loading && profiles.length === 0 && !formOpen ? (
        <p
          style={{
            margin: "0 0 0.35rem",
            color: "#64748b",
            fontSize: "0.86rem",
          }}
        >
          Aucun profil pour le moment.
        </p>
      ) : null}

      <ul
        style={{
          listStyle: "none",
          margin: profiles.length ? "0 0 0.85rem" : 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "0.65rem",
        }}
      >
        {profiles.map((p) => {
          const isOrg = p.type === "organization";
          return (
            <li
              key={p.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "0.7rem 0.75rem",
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.65rem",
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    style={{
                      borderRadius: isOrg ? "10px" : "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                      background: "#e2e8f0",
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: isOrg ? "10px" : "50%",
                      background: "#e2e8f0",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 800,
                      color: "#0f172a",
                      fontSize: "0.92rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={p.displayName}
                  >
                    {p.displayName}
                  </p>
                  <p
                    style={{
                      margin: "0.18rem 0 0",
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: 650,
                    }}
                  >
                    {isOrg ? "Organisation" : "Particulier"}
                    {" · "}
                    {p.isPublic ? "Public" : "Privé"}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.35rem",
                }}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(p)}
                  style={btnGhost}
                >
                  Modifier
                </button>
                {p.isPublic ? (
                  <Link
                    href={`/organizers/${encodeURIComponent(p.slug)}`}
                    style={btnGhost}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir le profil
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeProfile(p.id)}
                  style={{
                    ...btnGhost,
                    color: "#b91c1c",
                    borderColor: "#fecaca",
                  }}
                >
                  Supprimer
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {formOpen ? (
        <form
          onSubmit={(e) => void submitForm(e)}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "0.85rem 0.9rem",
            background: "#fff",
          }}
        >
          <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.95rem" }}>
            {isEditing ? "Modifier le profil" : "Nouveau profil"}
          </h3>

          {!isEditing ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.85rem",
                marginBottom: "0.7rem",
              }}
            >
              <label style={radioLabel}>
                <input
                  type="radio"
                  name="ptype"
                  checked={formType === "personal"}
                  disabled={hasPersonal}
                  onChange={() => setFormType("personal")}
                />
                Particulier
                {hasPersonal ? " (déjà créé)" : ""}
              </label>
              <label style={radioLabel}>
                <input
                  type="radio"
                  name="ptype"
                  checked={formType === "organization"}
                  onChange={() => setFormType("organization")}
                />
                Organisation
              </label>
            </div>
          ) : (
            <p
              style={{
                margin: "0 0 0.65rem",
                fontSize: "0.82rem",
                color: "#64748b",
                fontWeight: 650,
              }}
            >
              Type :{" "}
              {formType === "organization" ? "Organisation" : "Particulier"}
            </p>
          )}

          <label style={labelStyle}>
            {nameLabel} *
            <input
              style={inputStyle}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
              placeholder={namePlaceholder}
              autoComplete="organization"
            />
          </label>

          <label style={labelStyle}>
            Présentation
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
              placeholder="Facultatif"
            />
          </label>

          <label style={labelStyle}>
            Site internet
            <input
              style={inputStyle}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https:// (facultatif)"
              inputMode="url"
            />
          </label>

          <label style={labelStyle}>
            {imageLabel}
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(ev) => {
                const f = ev.target.files?.[0] || null;
                setPendingImageFile(f);
              }}
              style={{
                display: "block",
                marginTop: "0.35rem",
                fontSize: "0.82rem",
              }}
            />
            {pendingImageFile ? (
              <span
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  fontSize: "0.78rem",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                Fichier sélectionné : {pendingImageFile.name}
              </span>
            ) : isEditing ? (
              <span
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  fontSize: "0.78rem",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                Laisser vide pour conserver l’image actuelle.
              </span>
            ) : null}
          </label>

          <div style={{ marginBottom: "0.85rem" }}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.45rem",
                fontSize: "0.84rem",
                fontWeight: 700,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ marginTop: "0.15rem" }}
              />
              <span>Rendre mon profil public</span>
            </label>
            <p
              style={{
                margin: "0.35rem 0 0 1.45rem",
                fontSize: "0.78rem",
                color: "#64748b",
                lineHeight: 1.45,
              }}
            >
              Votre profil et vos événements publics pourront être découverts
              par les visiteurs.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={busy || !displayName.trim()}
              style={{
                ...btnPrimary,
                opacity: busy || !displayName.trim() ? 0.65 : 1,
                cursor: busy || !displayName.trim() ? "not-allowed" : "pointer",
              }}
            >
              {isEditing ? "Enregistrer" : "Créer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={closeForm}
              style={btnGhost}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.48rem 0.85rem",
  borderRadius: "9px",
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.84rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

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

const radioLabel = {
  fontSize: "0.84rem",
  fontWeight: 700,
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
};
