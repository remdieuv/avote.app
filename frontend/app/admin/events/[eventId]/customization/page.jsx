"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolveApiAssetUrl } from "@/lib/assetUrl";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const card = {
  background: "#fff",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  padding: "1.15rem 1.2rem",
  boxSizing: "border-box",
};

const btnPrimary = {
  padding: "0.55rem 1.1rem",
  fontSize: "0.9rem",
  fontWeight: 700,
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
  color: "#fff",
  cursor: "pointer",
  boxSizing: "border-box",
};

const btnSecondary = {
  padding: "0.55rem 1rem",
  fontSize: "0.88rem",
  fontWeight: 600,
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  boxSizing: "border-box",
};

const btnDanger = {
  ...btnSecondary,
  color: "#b91c1c",
  borderColor: "#fecaca",
  background: "#fef2f2",
};

export default function EventCustomizationPage() {
  const params = useParams();
  const rawId = params?.eventId;
  const eventId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [slug, setSlug] = useState(null);
  const [eventTitle, setEventTitle] = useState("");

  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  /** Fond uni de la salle uniquement sans image (#RRGGBB). */
  const [roomBackgroundColor, setRoomBackgroundColor] = useState("");
  const [themeMode, setThemeMode] = useState("auto");
  const [backgroundOverlayStrength, setBackgroundOverlayStrength] =
    useState("medium");

  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [uploadKind, setUploadKind] = useState(null);
  const [toast, setToast] = useState(null);
  const previewIframeRef = useRef(null);
  const [previewIframeReady, setPreviewIframeReady] = useState(false);

  /** Brouillon aligné sur le formulaire → postMessage vers l’iframe /join (sans API). */
  const draftCustomization = useMemo(
    () => ({
      description:
        description.trim() === "" ? null : description.trim().slice(0, 2000),
      logoUrl:
        logoUrl.trim() === "" ? null : resolveApiAssetUrl(logoUrl.trim()),
      backgroundUrl:
        backgroundUrl.trim() === ""
          ? null
          : resolveApiAssetUrl(backgroundUrl.trim()),
      primaryColor:
        primaryColor.trim() !== "" &&
        /^#[0-9A-Fa-f]{6}$/.test(primaryColor.trim())
          ? primaryColor.trim()
          : null,
      themeMode: themeMode ? String(themeMode).toLowerCase() : null,
      backgroundOverlayStrength:
        backgroundOverlayStrength
          ? String(backgroundOverlayStrength).toLowerCase()
          : null,
      roomBackgroundColor:
        roomBackgroundColor.trim() !== "" &&
        /^#[0-9A-Fa-f]{6}$/.test(roomBackgroundColor.trim())
          ? roomBackgroundColor.trim()
          : null,
    }),
    [
      description,
      logoUrl,
      backgroundUrl,
      primaryColor,
      roomBackgroundColor,
      themeMode,
      backgroundOverlayStrength,
    ],
  );

  const postPreviewToIframe = useCallback(() => {
    const win = previewIframeRef.current?.contentWindow;
    if (!win || typeof window === "undefined") return;
    win.postMessage(
      {
        type: "preview_customization",
        payload: draftCustomization,
      },
      window.location.origin,
    );
  }, [draftCustomization]);

  useEffect(() => {
    setPreviewIframeReady(false);
  }, [slug]);

  useEffect(() => {
    if (!slug || !previewIframeReady) return;
    postPreviewToIframe();
  }, [slug, previewIframeReady, postPreviewToIframe]);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return (
      description !== baseline.description ||
      logoUrl !== baseline.logoUrl ||
      backgroundUrl !== baseline.backgroundUrl ||
      primaryColor !== baseline.primaryColor ||
      roomBackgroundColor !== baseline.roomBackgroundColor ||
      themeMode !== baseline.themeMode ||
      backgroundOverlayStrength !== baseline.backgroundOverlayStrength
    );
  }, [
    baseline,
    description,
    logoUrl,
    backgroundUrl,
    primaryColor,
    roomBackgroundColor,
    themeMode,
    backgroundOverlayStrength,
  ]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/events/${eventId}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setLoadError("Événement introuvable.");
        return;
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setSlug(typeof data.slug === "string" ? data.slug : null);
      setEventTitle(typeof data.title === "string" ? data.title : "");
      const d = data.description;
      const desc = typeof d === "string" ? d : "";
      const lu = data.logoUrl;
      const bu = data.backgroundUrl;
      const pc = data.primaryColor;
      const tm = data.themeMode;
      const ov = data.backgroundOverlayStrength;
      const rbc = data.roomBackgroundColor;

      setDescription(desc);
      setLogoUrl(typeof lu === "string" ? resolveApiAssetUrl(lu) : "");
      setBackgroundUrl(typeof bu === "string" ? resolveApiAssetUrl(bu) : "");
      setPrimaryColor(
        typeof pc === "string" && /^#[0-9A-Fa-f]{6}$/.test(pc)
          ? pc
          : "#2563eb",
      );
      setThemeMode(
        typeof tm === "string" && tm.trim()
          ? String(tm).toLowerCase()
          : "auto",
      );
      setBackgroundOverlayStrength(
        typeof ov === "string" && ov.trim()
          ? String(ov).toLowerCase()
          : "medium",
      );
      setRoomBackgroundColor(
        typeof rbc === "string" && /^#[0-9A-Fa-f]{6}$/.test(rbc.trim())
          ? rbc.trim()
          : "",
      );

      setBaseline({
        description: desc,
        logoUrl: typeof lu === "string" ? resolveApiAssetUrl(lu) : "",
        backgroundUrl: typeof bu === "string" ? resolveApiAssetUrl(bu) : "",
        primaryColor:
          typeof pc === "string" && /^#[0-9A-Fa-f]{6}$/.test(pc)
            ? pc
            : "#2563eb",
        roomBackgroundColor:
          typeof rbc === "string" && /^#[0-9A-Fa-f]{6}$/.test(rbc.trim())
            ? rbc.trim()
            : "",
        themeMode:
          typeof tm === "string" && tm.trim()
            ? String(tm).toLowerCase()
            : "auto",
        backgroundOverlayStrength:
          typeof ov === "string" && ov.trim()
            ? String(ov).toLowerCase()
            : "medium",
      });
    } catch (e) {
      setLoadError(e.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(kind, file) {
    if (!eventId || !file) return;
    setUploadKind(kind);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/customization/upload?kind=${encodeURIComponent(kind)}`,
        { method: "POST", body: fd },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Upload ${res.status}`);
      }
      if (typeof body.url !== "string") {
        throw new Error("Réponse serveur invalide.");
      }
      if (kind === "logo") setLogoUrl(resolveApiAssetUrl(body.url));
      else setBackgroundUrl(resolveApiAssetUrl(body.url));
    } catch (e) {
      setSaveError(e.message || "Échec de l’envoi du fichier.");
    } finally {
      setUploadKind(null);
    }
  }

  async function handleSave() {
    if (!eventId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const pcTrim = primaryColor.trim();
      const rbcTrim = roomBackgroundColor.trim();
      const payload = {
        description: description.trim() === "" ? null : description.trim(),
        logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
        backgroundUrl:
          backgroundUrl.trim() === "" ? null : backgroundUrl.trim(),
        primaryColor:
          /^#[0-9A-Fa-f]{6}$/.test(pcTrim) ? pcTrim : null,
        roomBackgroundColor:
          rbcTrim === ""
            ? null
            : /^#[0-9A-Fa-f]{6}$/.test(rbcTrim)
              ? rbcTrim
              : null,
        themeMode: themeMode || null,
        backgroundOverlayStrength: backgroundOverlayStrength || null,
      };
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/customization`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      setToast("Personnalisation enregistrée");
      window.setTimeout(() => setToast(null), 3200);
      setBaseline({
        description: description.trim() === "" ? "" : description.trim(),
        logoUrl: logoUrl.trim(),
        backgroundUrl: backgroundUrl.trim(),
        primaryColor: /^#[0-9A-Fa-f]{6}$/.test(primaryColor.trim())
          ? primaryColor.trim()
          : "#2563eb",
        roomBackgroundColor: /^#[0-9A-Fa-f]{6}$/.test(
          roomBackgroundColor.trim(),
        )
          ? roomBackgroundColor.trim()
          : "",
        themeMode,
        backgroundOverlayStrength,
      });
    } catch (e) {
      setSaveError(e.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function clearLogo() {
    setLogoUrl("");
  }
  function clearBackground() {
    setBackgroundUrl("");
  }

  const joinPath = slug ? `/join/${encodeURIComponent(slug)}` : null;

  if (!eventId) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Événement manquant.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily:
          'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        color: "#0f172a",
        lineHeight: 1.5,
        boxSizing: "border-box",
      }}
    >
      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "0.75rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "0.55rem 1.15rem",
            borderRadius: "10px",
            background: "#0f172a",
            color: "#f8fafc",
            fontSize: "0.88rem",
            fontWeight: 700,
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
          }}
        >
          {toast}
        </div>
      ) : null}

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1.25rem clamp(1rem, 3vw, 1.75rem) 2.5rem",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "1.35rem" }}>
          <Link
            href="/admin/events"
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#475569",
              textDecoration: "none",
            }}
          >
            ← Mes événements
          </Link>
          <h1
            style={{
              margin: "0.65rem 0 0.35rem",
              fontSize: "clamp(1.35rem, 3vw, 1.65rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Personnalisation de la salle
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            Configurez l’apparence publique de votre événement
          </p>
          {dirty ? (
            <p
              style={{
                margin: "0.5rem 0 0",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#b45309",
              }}
            >
              Modifications non enregistrées
            </p>
          ) : null}
        </div>

        {loadError ? (
          <p style={{ color: "#b91c1c" }} role="alert">
            {loadError}
          </p>
        ) : null}
        {saveError ? (
          <p
            style={{
              color: "#b91c1c",
              marginBottom: "1rem",
              padding: "0.65rem 0.85rem",
              background: "#fef2f2",
              borderRadius: "8px",
            }}
            role="alert"
          >
            {saveError}
          </p>
        ) : null}

        {loading ? (
          <p style={{ color: "#64748b" }}>Chargement…</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(300px, 45%) minmax(320px, 55%)",
              gap: "1.35rem",
              alignItems: "start",
              boxSizing: "border-box",
            }}
            className="customization-layout"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem",
                minWidth: 0,
              }}
            >
              <section style={card}>
                <h2
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Identité
                </h2>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                  }}
                >
                  Titre de l’événement
                </label>
                <input
                  type="text"
                  readOnly
                  value={eventTitle}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.5rem 0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: "0.88rem",
                    marginBottom: "0.85rem",
                  }}
                />
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                  }}
                >
                  Description (salle /join)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Texte affiché sous le titre pour les participants…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.55rem 0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
                <p
                  style={{
                    margin: "0.85rem 0 0.35rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  Logo
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Aperçu logo"
                      style={{
                        width: "56px",
                        height: "56px",
                        objectFit: "contain",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                      }}
                    />
                  ) : null}
                  <label style={{ ...btnSecondary, display: "inline-block", cursor: "pointer" }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      disabled={uploadKind !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleUpload("logo", f);
                      }}
                    />
                    {uploadKind === "logo" ? "Envoi…" : "Envoyer un logo"}
                  </label>
                  {logoUrl ? (
                    <button type="button" style={btnDanger} onClick={clearLogo}>
                      Retirer
                    </button>
                  ) : null}
                </div>
              </section>

              <section style={card}>
                <h2
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Apparence
                </h2>
                <p
                  style={{
                    margin: "0 0 0.35rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                  }}
                >
                  Image de fond
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.85rem" }}>
                  {backgroundUrl ? (
                    <img
                      src={backgroundUrl}
                      alt=""
                      style={{
                        width: "120px",
                        height: "72px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  ) : null}
                  <label style={{ ...btnSecondary, display: "inline-block", cursor: "pointer" }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      disabled={uploadKind !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleUpload("background", f);
                      }}
                    />
                    {uploadKind === "background" ? "Envoi…" : "Image de fond"}
                  </label>
                  {backgroundUrl ? (
                    <button type="button" style={btnDanger} onClick={clearBackground}>
                      Retirer
                    </button>
                  ) : null}
                </div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                  }}
                >
                  Couleur de fond (sans image)
                </label>
                <p
                  style={{
                    margin: "0 0 0.4rem",
                    fontSize: "0.72rem",
                    color: "#64748b",
                    lineHeight: 1.45,
                  }}
                >
                  S’applique lorsque aucune image de fond n’est définie. Sinon,
                  dégradé ou thème par défaut.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginBottom: "0.85rem",
                  }}
                >
                  <input
                    type="text"
                    value={roomBackgroundColor}
                    onChange={(e) => setRoomBackgroundColor(e.target.value)}
                    placeholder="#e5e7eb ou vide"
                    style={{
                      width: "10rem",
                      padding: "0.45rem 0.55rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "0.85rem",
                    }}
                  />
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(roomBackgroundColor.trim())
                        ? roomBackgroundColor.trim()
                        : "#e5e7eb"
                    }
                    onChange={(e) => setRoomBackgroundColor(e.target.value)}
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      padding: 0,
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  />
                  <button
                    type="button"
                    style={btnDanger}
                    onClick={() => setRoomBackgroundColor("")}
                  >
                    Par défaut
                  </button>
                </div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                  }}
                >
                  Couleur principale (accents)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#2563eb"
                    style={{
                      width: "7rem",
                      padding: "0.45rem 0.55rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "0.85rem",
                    }}
                  />
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#2563eb"}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      padding: 0,
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
                        ? primaryColor
                        : "#2563eb",
                    }}
                    aria-hidden
                  />
                </div>
              </section>

              <section style={card}>
                <h2
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Ambiance
                </h2>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                  }}
                >
                  Thème de base
                </label>
                <select
                  value={themeMode}
                  onChange={(e) => setThemeMode(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "16rem",
                    padding: "0.45rem 0.55rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    marginBottom: "0.85rem",
                  }}
                >
                  <option value="dark">Sombre</option>
                  <option value="light">Clair</option>
                  <option value="auto">Auto (appareil)</option>
                </select>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.35rem",
                  }}
                >
                  Assombrissement sur l’image de fond
                </label>
                <select
                  value={backgroundOverlayStrength}
                  onChange={(e) =>
                    setBackgroundOverlayStrength(e.target.value)
                  }
                  style={{
                    width: "100%",
                    maxWidth: "16rem",
                    padding: "0.45rem 0.55rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                  }}
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyen</option>
                  <option value="strong">Fort</option>
                </select>
              </section>

              <section style={card}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                  <button
                    type="button"
                    style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
                    disabled={saving}
                    onClick={() => void handleSave()}
                  >
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  {joinPath ? (
                    <button
                      type="button"
                      style={btnSecondary}
                      onClick={() =>
                        window.open(
                          `${window.location.origin}${joinPath}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Voir la salle
                    </button>
                  ) : null}
                </div>
              </section>
            </div>

            <div style={card} className="customization-preview-card">
                <h2
                  style={{
                    margin: "0 0 0.15rem",
                    fontSize: "1rem",
                    fontWeight: 800,
                  }}
                >
                  Aperçu de la salle
                </h2>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "#64748b" }}>
                  Aperçu brouillon en direct (sans enregistrement) : seule la page admin reçoit ces
                  réglages ; les participants voient la version sauvegardée côté serveur.
                </p>
                {joinPath ? (
                  <>
                    <div
                      style={{
                        borderRadius: "18px",
                        overflow: "hidden",
                        border: "1px solid #cbd5e1",
                        background: "#0f172a",
                        boxShadow:
                          "0 24px 48px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                        minHeight: "min(520px, 62vh)",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: "72px",
                          height: "5px",
                          borderRadius: "4px",
                          background: "rgba(255,255,255,0.15)",
                          zIndex: 2,
                        }}
                        aria-hidden
                      />
                      <iframe
                        ref={previewIframeRef}
                        key={slug ?? "join-preview"}
                        title="Aperçu salle"
                        src={joinPath}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        onLoad={() => {
                          setPreviewIframeReady(true);
                          window.requestAnimationFrame(() => {
                            postPreviewToIframe();
                          });
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          height: "min(520px, 62vh)",
                          border: "none",
                          background: "#fff",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      style={{ ...btnSecondary, marginTop: "0.75rem", width: "100%" }}
                      onClick={() =>
                        window.open(
                          `${window.location.origin}${joinPath}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Ouvrir l’aperçu dans un nouvel onglet
                    </button>
                  </>
                ) : (
                  <p style={{ color: "#64748b", margin: 0 }}>Slug manquant.</p>
                )}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .customization-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
