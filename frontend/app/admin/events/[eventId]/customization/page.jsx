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
import { LiveMicroLabel } from "@/components/admin/LiveMicroIcon";
import { resolveApiAssetUrl } from "@/lib/assetUrl";
import {
  adminContentMaxWidth,
  adminContentShellStyle,
} from "@/lib/adminLayout";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

function mapApiError(body, status, fallbackPrefix = "Erreur") {
  const code = String(body?.error || "").trim();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (code === "EVENT_ALREADY_ACTIVE") {
    return "Vous avez déjà un événement actif. Terminez-le avant d’en créer un nouveau.";
  }
  return message || code || `${fallbackPrefix} ${status}`;
}

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

function getEventIdFromParams(params) {
  const rawId = params?.eventId;
  return typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : null;
}

function isHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value || "").trim());
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

const fieldErrorStyle = {
  margin: "0.35rem 0 0",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#b91c1c",
  lineHeight: 1.35,
};

const fieldHintStyle = {
  margin: "0 0 0.4rem",
  fontSize: "0.72rem",
  color: "#64748b",
  lineHeight: 1.45,
};

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" style={fieldErrorStyle}>
      {children}
    </p>
  );
}

function CollapsibleSection({ title, defaultOpen = false, children, summaryHint }) {
  return (
    <details
      className="customization-section"
      style={card}
      defaultOpen={defaultOpen}
    >
      <summary
        className="customization-section-summary"
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {title}
        </span>
        {summaryHint ? (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {summaryHint}
          </span>
        ) : null}
      </summary>
      <div style={{ marginTop: "0.9rem" }}>{children}</div>
    </details>
  );
}

function EditorModeSwitch({ eventId, current }) {
  const liveHref = eventId ? `/admin/events/${encodeURIComponent(eventId)}/live` : "/admin/events";
  const landingHref = eventId
    ? `/admin/events/${encodeURIComponent(eventId)}/landing`
    : "/admin/events";

  function linkStyle(active) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.48rem 0.8rem",
      borderRadius: "999px",
      textDecoration: "none",
      fontSize: "0.84rem",
      fontWeight: 700,
      border: active ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
      background: active ? "#eff6ff" : "#fff",
      color: active ? "#1d4ed8" : "#475569",
    };
  }

  return (
    <div
      style={{
        display: "inline-flex",
        gap: "0.45rem",
        flexWrap: "wrap",
        padding: "0.35rem",
        borderRadius: "999px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        marginTop: "0.95rem",
      }}
    >
      <Link
        href={liveHref}
        className="editor-universe-link editor-universe-link--live"
        style={linkStyle(current === "live")}
      >
        <LiveMicroLabel />
      </Link>
      <Link
        href={landingHref}
        className="editor-universe-link editor-universe-link--landing"
        style={linkStyle(current === "landing")}
      >
        ✨ Landing événement
      </Link>
    </div>
  );
}

export function EventCustomizationEditor({ mode = "live" }) {
  const params = useParams();
  const eventId = getEventIdFromParams(params);
  const isLivePage = mode === "live";
  const isLandingPage = mode === "landing";

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
  const [infoSectionTitle, setInfoSectionTitle] = useState("");
  const [infoSectionText, setInfoSectionText] = useState("");
  const [infoPrimaryCtaLabel, setInfoPrimaryCtaLabel] = useState("");
  const [infoPrimaryCtaUrl, setInfoPrimaryCtaUrl] = useState("");
  const [infoSecondaryCtaLabel, setInfoSecondaryCtaLabel] = useState("");
  const [infoSecondaryCtaUrl, setInfoSecondaryCtaUrl] = useState("");
  const [infoShowOnFinished, setInfoShowOnFinished] = useState(true);

  const [baseline, setBaseline] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [uploadKind, setUploadKind] = useState(
    /** @type {null | "logo" | "background" | "landing_cover"} */ (null),
  );
  const [toast, setToast] = useState(null);
  const [landingEnabled, setLandingEnabled] = useState(false);
  const [landingCoverUrl, setLandingCoverUrl] = useState("");
  const [landingTitle, setLandingTitle] = useState("");
  const [landingDescription, setLandingDescription] = useState("");
  /** @type {{ id: string; url: string; createdAt: string }[]} */
  const [showcasePhotos, setShowcasePhotos] = useState([]);
  const [landingLivePhotosCount, setLandingLivePhotosCount] = useState(0);
  const [showcasePhotoBusy, setShowcasePhotoBusy] = useState(false);
  const previewIframeRef = useRef(null);
  const [previewIframeReady, setPreviewIframeReady] = useState(false);
  /** Mobile (<900px) : bascule Réglages / Aperçu sans changer le layout desktop. */
  const [mobilePanel, setMobilePanel] = useState(/** @type {"form" | "preview"} */ ("form"));

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
      infoSectionTitle:
        infoSectionTitle.trim() === "" ? null : infoSectionTitle.trim().slice(0, 120),
      infoSectionText:
        infoSectionText.trim() === "" ? null : infoSectionText.trim().slice(0, 1200),
      infoPrimaryCtaLabel:
        infoPrimaryCtaLabel.trim() === ""
          ? null
          : infoPrimaryCtaLabel.trim().slice(0, 80),
      infoPrimaryCtaUrl:
        /^https?:\/\/\S+$/i.test(infoPrimaryCtaUrl.trim())
          ? infoPrimaryCtaUrl.trim()
          : null,
      infoSecondaryCtaLabel:
        infoSecondaryCtaLabel.trim() === ""
          ? null
          : infoSecondaryCtaLabel.trim().slice(0, 80),
      infoSecondaryCtaUrl:
        /^https?:\/\/\S+$/i.test(infoSecondaryCtaUrl.trim())
          ? infoSecondaryCtaUrl.trim()
          : null,
      infoShowOnFinished: Boolean(infoShowOnFinished),
    }),
    [
      description,
      logoUrl,
      backgroundUrl,
      primaryColor,
      roomBackgroundColor,
      themeMode,
      backgroundOverlayStrength,
      infoSectionTitle,
      infoSectionText,
      infoPrimaryCtaLabel,
      infoPrimaryCtaUrl,
      infoSecondaryCtaLabel,
      infoSecondaryCtaUrl,
      infoShowOnFinished,
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
    if (!isLivePage || !slug || !previewIframeReady) return;
    postPreviewToIframe();
  }, [isLivePage, slug, previewIframeReady, postPreviewToIframe]);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    if (isLandingPage) {
      return (
        landingEnabled !== baseline.landingEnabled ||
        landingCoverUrl !== baseline.landingCoverUrl ||
        landingTitle !== baseline.landingTitle ||
        landingDescription !== baseline.landingDescription
      );
    }
    return (
      description !== baseline.description ||
      logoUrl !== baseline.logoUrl ||
      backgroundUrl !== baseline.backgroundUrl ||
      primaryColor !== baseline.primaryColor ||
      roomBackgroundColor !== baseline.roomBackgroundColor ||
      themeMode !== baseline.themeMode ||
      backgroundOverlayStrength !== baseline.backgroundOverlayStrength ||
      infoSectionTitle !== baseline.infoSectionTitle ||
      infoSectionText !== baseline.infoSectionText ||
      infoPrimaryCtaLabel !== baseline.infoPrimaryCtaLabel ||
      infoPrimaryCtaUrl !== baseline.infoPrimaryCtaUrl ||
      infoSecondaryCtaLabel !== baseline.infoSecondaryCtaLabel ||
      infoSecondaryCtaUrl !== baseline.infoSecondaryCtaUrl ||
      infoShowOnFinished !== baseline.infoShowOnFinished
    );
  }, [
    baseline,
    isLandingPage,
    description,
    logoUrl,
    backgroundUrl,
    primaryColor,
    roomBackgroundColor,
    themeMode,
    backgroundOverlayStrength,
    infoSectionTitle,
    infoSectionText,
    infoPrimaryCtaLabel,
    infoPrimaryCtaUrl,
    infoSecondaryCtaLabel,
    infoSecondaryCtaUrl,
    infoShowOnFinished,
    landingEnabled,
    landingCoverUrl,
    landingTitle,
    landingDescription,
  ]);

  const liveFieldErrors = useMemo(() => {
    /** @type {Record<string, string>} */
    const errors = {};
    if (primaryColor.trim() && !isHexColor(primaryColor)) {
      errors.primaryColor = "Format attendu : #RRGGBB";
    }
    if (roomBackgroundColor.trim() && !isHexColor(roomBackgroundColor)) {
      errors.roomBackgroundColor = "Format attendu : #RRGGBB, ou laissez vide";
    }
    if (infoPrimaryCtaUrl.trim() && !isHttpUrl(infoPrimaryCtaUrl)) {
      errors.infoPrimaryCtaUrl =
        "URL invalide : utilisez http:// ou https://";
    } else if (infoPrimaryCtaLabel.trim() && !infoPrimaryCtaUrl.trim()) {
      errors.infoPrimaryCtaUrl =
        "Ajoutez une URL pour afficher le bouton principal";
    } else if (infoPrimaryCtaUrl.trim() && !infoPrimaryCtaLabel.trim()) {
      errors.infoPrimaryCtaLabel =
        "Ajoutez un libellé pour afficher le bouton principal";
    }
    if (infoSecondaryCtaUrl.trim() && !isHttpUrl(infoSecondaryCtaUrl)) {
      errors.infoSecondaryCtaUrl =
        "URL invalide : utilisez http:// ou https://";
    } else if (infoSecondaryCtaLabel.trim() && !infoSecondaryCtaUrl.trim()) {
      errors.infoSecondaryCtaUrl =
        "Ajoutez une URL pour afficher le bouton secondaire";
    } else if (infoSecondaryCtaUrl.trim() && !infoSecondaryCtaLabel.trim()) {
      errors.infoSecondaryCtaLabel =
        "Ajoutez un libellé pour afficher le bouton secondaire";
    }
    return errors;
  }, [
    primaryColor,
    roomBackgroundColor,
    infoPrimaryCtaLabel,
    infoPrimaryCtaUrl,
    infoSecondaryCtaLabel,
    infoSecondaryCtaUrl,
  ]);

  const hasLiveFieldErrors = Object.keys(liveFieldErrors).length > 0;

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
      const ist = data.infoSectionTitle;
      const isx = data.infoSectionText;
      const ipcl = data.infoPrimaryCtaLabel;
      const ipcu = data.infoPrimaryCtaUrl;
      const iscl = data.infoSecondaryCtaLabel;
      const iscu = data.infoSecondaryCtaUrl;
      const isof = data.infoShowOnFinished;
      const landEn = Boolean(data.landingEnabled);
      const lcov = data.landingCoverUrl;
      const ltit = data.landingTitle;
      const ldesc = data.landingDescription;
      const landingPhotos = Array.isArray(data.landingPhotos) ? data.landingPhotos : [];

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
      setInfoSectionTitle(typeof ist === "string" ? ist : "");
      setInfoSectionText(typeof isx === "string" ? isx : "");
      setInfoPrimaryCtaLabel(typeof ipcl === "string" ? ipcl : "");
      setInfoPrimaryCtaUrl(typeof ipcu === "string" ? ipcu : "");
      setInfoSecondaryCtaLabel(typeof iscl === "string" ? iscl : "");
      setInfoSecondaryCtaUrl(typeof iscu === "string" ? iscu : "");
      setInfoShowOnFinished(typeof isof === "boolean" ? isof : true);

      setLandingEnabled(landEn);
      setLandingCoverUrl(
        typeof lcov === "string" ? resolveApiAssetUrl(lcov) : "",
      );
      setLandingTitle(typeof ltit === "string" ? ltit : "");
      setLandingDescription(typeof ldesc === "string" ? ldesc : "");
      if (Array.isArray(data.landingShowcasePhotos)) {
        setShowcasePhotos(
          data.landingShowcasePhotos
            .map((p) => ({
              id: String(p?.id || ""),
              url:
                typeof p?.url === "string"
                  ? resolveApiAssetUrl(p.url)
                  : "",
              createdAt:
                typeof p?.createdAt === "string" ? p.createdAt : "",
            }))
            .filter((p) => p.id && p.url),
        );
      } else {
        setShowcasePhotos([]);
      }
      setLandingLivePhotosCount(landingPhotos.length);

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
        infoSectionTitle: typeof ist === "string" ? ist : "",
        infoSectionText: typeof isx === "string" ? isx : "",
        infoPrimaryCtaLabel: typeof ipcl === "string" ? ipcl : "",
        infoPrimaryCtaUrl: typeof ipcu === "string" ? ipcu : "",
        infoSecondaryCtaLabel: typeof iscl === "string" ? iscl : "",
        infoSecondaryCtaUrl: typeof iscu === "string" ? iscu : "",
        infoShowOnFinished: typeof isof === "boolean" ? isof : true,
        landingEnabled: landEn,
        landingCoverUrl:
          typeof lcov === "string" ? resolveApiAssetUrl(lcov) : "",
        landingTitle: typeof ltit === "string" ? ltit : "",
        landingDescription: typeof ldesc === "string" ? ldesc : "",
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
        throw new Error(mapApiError(body, res.status, "Upload"));
      }
      if (typeof body.url !== "string") {
        throw new Error("Réponse serveur invalide.");
      }
      if (kind === "logo") setLogoUrl(resolveApiAssetUrl(body.url));
      else if (kind === "background") {
        setBackgroundUrl(resolveApiAssetUrl(body.url));
      } else if (kind === "landing_cover") {
        setLandingCoverUrl(resolveApiAssetUrl(body.url));
      }
    } catch (e) {
      setSaveError(e.message || "Échec de l’envoi du fichier.");
    } finally {
      setUploadKind(null);
    }
  }

  async function handleSave() {
    if (!eventId) return;
    if (isLivePage && hasLiveFieldErrors) {
      setSaveError(
        "Corrigez les champs en erreur (couleurs ou URL) avant d’enregistrer.",
      );
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const pcTrim = primaryColor.trim();
      const rbcTrim = roomBackgroundColor.trim();
      const ipUrlTrim = infoPrimaryCtaUrl.trim();
      const isUrlTrim = infoSecondaryCtaUrl.trim();
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
        infoSectionTitle:
          infoSectionTitle.trim() === "" ? null : infoSectionTitle.trim().slice(0, 120),
        infoSectionText:
          infoSectionText.trim() === "" ? null : infoSectionText.trim().slice(0, 1200),
        infoPrimaryCtaLabel:
          infoPrimaryCtaLabel.trim() === ""
            ? null
            : infoPrimaryCtaLabel.trim().slice(0, 80),
        infoPrimaryCtaUrl:
          ipUrlTrim === ""
            ? null
            : /^https?:\/\/\S+$/i.test(ipUrlTrim)
              ? ipUrlTrim
              : null,
        infoSecondaryCtaLabel:
          infoSecondaryCtaLabel.trim() === ""
            ? null
            : infoSecondaryCtaLabel.trim().slice(0, 80),
        infoSecondaryCtaUrl:
          isUrlTrim === ""
            ? null
            : /^https?:\/\/\S+$/i.test(isUrlTrim)
              ? isUrlTrim
              : null,
        infoShowOnFinished: Boolean(infoShowOnFinished),
        landingEnabled: Boolean(landingEnabled),
        landingCoverUrl:
          landingCoverUrl.trim() === "" ? null : landingCoverUrl.trim(),
        landingTitle:
          landingTitle.trim() === ""
            ? null
            : landingTitle.trim().slice(0, 200),
        landingDescription:
          landingDescription.trim() === ""
            ? null
            : landingDescription.trim().slice(0, 1200),
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
        throw new Error(mapApiError(body, res.status));
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
        infoSectionTitle: infoSectionTitle.trim(),
        infoSectionText: infoSectionText.trim(),
        infoPrimaryCtaLabel: infoPrimaryCtaLabel.trim(),
        infoPrimaryCtaUrl:
          /^https?:\/\/\S+$/i.test(infoPrimaryCtaUrl.trim())
            ? infoPrimaryCtaUrl.trim()
            : "",
        infoSecondaryCtaLabel: infoSecondaryCtaLabel.trim(),
        infoSecondaryCtaUrl:
          /^https?:\/\/\S+$/i.test(infoSecondaryCtaUrl.trim())
            ? infoSecondaryCtaUrl.trim()
            : "",
        infoShowOnFinished: Boolean(infoShowOnFinished),
        landingEnabled: Boolean(landingEnabled),
        landingCoverUrl: landingCoverUrl.trim(),
        landingTitle: landingTitle.trim(),
        landingDescription: landingDescription.trim(),
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
  function clearLandingCover() {
    setLandingCoverUrl("");
  }

  async function addShowcasePhotos(fileList) {
    if (!eventId || !fileList?.length) return;
    const files = Array.from(fileList).filter(Boolean);
    if (!files.length) return;
    setShowcasePhotoBusy(true);
    setSaveError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${eventId}/landing/showcase-photos`,
          { method: "POST", body: fd },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(mapApiError(body, res.status, "Photo"));
        }
        if (typeof body.id === "string" && typeof body.url === "string") {
          setShowcasePhotos((prev) => [
            ...prev,
            {
              id: body.id,
              url: resolveApiAssetUrl(body.url),
              createdAt:
                typeof body.createdAt === "string" ? body.createdAt : "",
            },
          ]);
        }
      }
      setToast("Photos ajoutées");
      window.setTimeout(() => setToast(null), 2400);
    } catch (e) {
      setSaveError(e.message || "Envoi photo impossible.");
    } finally {
      setShowcasePhotoBusy(false);
    }
  }

  async function removeShowcasePhoto(photoId) {
    if (!eventId || !photoId) return;
    setShowcasePhotoBusy(true);
    setSaveError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/landing/showcase-photos/${encodeURIComponent(photoId)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      setShowcasePhotos((prev) => prev.filter((p) => p.id !== photoId));
      setToast("Photo supprimée");
      window.setTimeout(() => setToast(null), 2200);
    } catch (e) {
      setSaveError(e.message || "Suppression impossible.");
    } finally {
      setShowcasePhotoBusy(false);
    }
  }

  const joinPath = slug ? `/join/${encodeURIComponent(slug)}` : null;
  const landingPath = slug ? `/e/${encodeURIComponent(slug)}` : null;

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
        paddingBottom: "5.5rem",
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
          maxWidth: adminContentMaxWidth("workspace"),
          margin: "0 auto",
          padding: "1.25rem clamp(1rem, 3vw, 1.75rem) 2.5rem",
          boxSizing: "border-box",
          width: "100%",
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
            {isLandingPage ? "✨ Landing événement" : <LiveMicroLabel iconSize={18} gap="0.45rem" />}
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            {isLandingPage
              ? "Créez la vitrine immersive de votre événement avant et pendant le live."
              : "Configurez l’expérience interactive et visuelle de votre salle de vote."}
          </p>
          <EditorModeSwitch eventId={eventId} current={isLandingPage ? "landing" : "live"} />
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

        {!loading && isLivePage ? (
          <div
            className="customization-mobile-tabs"
            role="tablist"
            aria-label="Affichage mobile"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === "form"}
              className={
                mobilePanel === "form"
                  ? "customization-mobile-tab customization-mobile-tab--active"
                  : "customization-mobile-tab"
              }
              onClick={() => setMobilePanel("form")}
            >
              Réglages
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === "preview"}
              className={
                mobilePanel === "preview"
                  ? "customization-mobile-tab customization-mobile-tab--active"
                  : "customization-mobile-tab"
              }
              onClick={() => setMobilePanel("preview")}
            >
              Aperçu
            </button>
          </div>
        ) : null}

        {loading ? (
          <p style={{ color: "#64748b" }}>Chargement…</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(340px, 42%) minmax(320px, 1fr)",
              gap: "1.35rem",
              alignItems: "start",
              boxSizing: "border-box",
            }}
            className="customization-layout"
            data-mobile-panel={isLivePage ? mobilePanel : "form"}
          >
            <div
              className="customization-form-col"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem",
                minWidth: 0,
              }}
            >
              {isLandingPage ? (
                <>
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
                      Landing page
                    </h2>
                    <p
                      style={{
                        margin: "0 0 0.85rem",
                        fontSize: "0.77rem",
                        color: "#64748b",
                        lineHeight: 1.45,
                      }}
                    >
                      Vitrine publique <code style={{ fontSize: "0.76rem" }}>/e/[slug]</code>{" "}
                      : teaser, storytelling visuel, galerie événement et photos publiées
                      en direct.
                      {landingPath ? (
                        <>
                          {" "}
                          <Link
                            href={landingPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563eb", fontWeight: 600 }}
                          >
                            Ouvrir la landing
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.85rem",
                        color: "#334155",
                        cursor: "pointer",
                        marginBottom: "0.85rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={landingEnabled}
                        onChange={(e) => setLandingEnabled(e.target.checked)}
                      />
                      Activer la landing événement
                    </label>

                    <p
                      style={{
                        margin: "0 0 0.35rem",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "#475569",
                      }}
                    >
                      Image de couverture
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
                      {landingCoverUrl ? (
                        <img
                          src={landingCoverUrl}
                          alt="Couverture landing"
                          style={{
                            width: "140px",
                            height: "84px",
                            objectFit: "cover",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      ) : null}
                      <label
                        style={{
                          ...btnSecondary,
                          display: "inline-block",
                          cursor:
                            uploadKind !== null || showcasePhotoBusy
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            uploadKind !== null || showcasePhotoBusy ? 0.65 : 1,
                        }}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: "none" }}
                          disabled={uploadKind !== null || showcasePhotoBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void handleUpload("landing_cover", f);
                          }}
                        />
                        {uploadKind === "landing_cover"
                          ? "Envoi…"
                          : "Envoyer une couverture"}
                      </label>
                      {landingCoverUrl ? (
                        <button
                          type="button"
                          style={btnDanger}
                          disabled={showcasePhotoBusy}
                          onClick={clearLandingCover}
                        >
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
                      Titre affiché sur la landing (optionnel)
                    </label>
                    <input
                      type="text"
                      value={landingTitle}
                      maxLength={200}
                      onChange={(e) => setLandingTitle(e.target.value)}
                      placeholder={
                        eventTitle
                          ? `Par défaut : ${eventTitle}`
                          : "Sinon : titre de l’événement"
                      }
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.5rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        marginBottom: "0.75rem",
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
                      Description courte (optionnelle)
                    </label>
                    <textarea
                      value={landingDescription}
                      onChange={(e) => setLandingDescription(e.target.value)}
                      rows={3}
                      maxLength={1200}
                      placeholder="Accroche sous le titre sur la landing uniquement."
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        resize: "vertical",
                        fontFamily: "inherit",
                        marginBottom: "0.85rem",
                      }}
                    />

                    <h3
                      style={{
                        margin: "0 0 0.35rem",
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      ✨ Galerie événement
                    </h3>
                    <p
                      style={{
                        margin: "0 0 0.65rem",
                        fontSize: "0.8rem",
                        color: "#64748b",
                        lineHeight: 1.45,
                      }}
                    >
                      Teaser, ambiance, lieu, sponsors : ces visuels sont affichés sur la
                      landing avant et pendant le live. Les moments live se publient
                      depuis la régie ou la landing.
                    </p>
                    <label
                      style={{
                        ...btnPrimary,
                        display: "inline-block",
                        cursor: showcasePhotoBusy ? "not-allowed" : "pointer",
                        opacity: showcasePhotoBusy ? 0.65 : 1,
                        marginBottom: "0.65rem",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        style={{ display: "none" }}
                        disabled={showcasePhotoBusy}
                        onChange={(e) => {
                          const raw = e.target.files;
                          const files = raw?.length ? Array.from(raw) : [];
                          e.target.value = "";
                          if (files.length) void addShowcasePhotos(files);
                        }}
                      />
                      {showcasePhotoBusy ? "Envoi…" : "Ajouter des photos"}
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                        gap: "0.5rem",
                      }}
                    >
                      {showcasePhotos.map((ph) => (
                        <div
                          key={ph.id}
                          style={{
                            position: "relative",
                            borderRadius: "10px",
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            aspectRatio: "1",
                            background: "#f8fafc",
                          }}
                        >
                          <img
                            src={ph.url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => void removeShowcasePhoto(ph.id)}
                            disabled={showcasePhotoBusy}
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              padding: "0.2rem 0.45rem",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              background: "rgba(254,242,242,0.95)",
                              color: "#b91c1c",
                              cursor: showcasePhotoBusy ? "not-allowed" : "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
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
                      Moments live
                    </h2>
                    <p
                      style={{
                        margin: "0 0 0.75rem",
                        fontSize: "0.77rem",
                        color: "#64748b",
                        lineHeight: 1.45,
                      }}
                    >
                      Les photos publiées pendant l’événement enrichissent la landing en
                      temps réel. Leur publication se pilote depuis la régie ou la
                      landing publique.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "0.65rem",
                        marginBottom: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          padding: "0.75rem 0.8rem",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 0.2rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#64748b",
                          }}
                        >
                          Galerie événement
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "1.2rem",
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          {showcasePhotos.length}
                        </p>
                      </div>
                      <div
                        style={{
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          padding: "0.75rem 0.8rem",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 0.2rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#64748b",
                          }}
                        >
                          Photos live publiées
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "1.2rem",
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          {landingLivePhotosCount}
                        </p>
                      </div>
                    </div>
                    {eventId ? (
                      <Link
                        href={`/admin/event/${encodeURIComponent(eventId)}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0.55rem 0.9rem",
                          borderRadius: "10px",
                          textDecoration: "none",
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#334155",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                        }}
                      >
                        Ouvrir la régie
                      </Link>
                    ) : null}
                  </section>

                  <section style={card}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                      <button
                        type="button"
                        style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
                        disabled={saving}
                        onClick={() => void handleSave()}
                      >
                        {saving ? "Enregistrement…" : "Enregistrer la landing"}
                      </button>
                      {landingPath ? (
                        <button
                          type="button"
                          style={btnSecondary}
                          onClick={() =>
                            window.open(
                              `${window.location.origin}${landingPath}`,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          Voir la landing
                        </button>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <CollapsibleSection title="Identité" defaultOpen>
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
                      }}
                    />
                    <p style={{ ...fieldHintStyle, margin: "0.35rem 0 0.85rem" }}>
                      Défini à la création de l’événement.{" "}
                      <Link
                        href={`/admin/event/${encodeURIComponent(eventId)}`}
                        style={{ color: "#2563eb", fontWeight: 600 }}
                      >
                        Ouvrir la régie
                      </Link>{" "}
                      pour le gérer.
                    </p>
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
                    <p style={fieldHintStyle}>
                      Visible pour les participants après enregistrement.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
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
                      <label
                        style={{
                          ...btnSecondary,
                          display: "inline-block",
                          cursor: "pointer",
                        }}
                      >
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
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Infos & liens"
                    defaultOpen={false}
                    summaryHint="Optionnel"
                  >
                    <p style={{ ...fieldHintStyle, marginBottom: "0.75rem" }}>
                      Bloc d’information affiché sur la salle participant{" "}
                      <code style={{ fontSize: "0.72rem" }}>/join</code>. Les
                      boutons n’apparaissent que si libellé et URL sont tous les
                      deux renseignés.
                    </p>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "#475569",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Titre du bloc
                    </label>
                    <input
                      type="text"
                      value={infoSectionTitle}
                      maxLength={120}
                      onChange={(e) => setInfoSectionTitle(e.target.value)}
                      placeholder="Infos pratiques"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.5rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        marginBottom: "0.75rem",
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
                      Texte court
                    </label>
                    <textarea
                      value={infoSectionText}
                      onChange={(e) => setInfoSectionText(e.target.value)}
                      rows={3}
                      maxLength={1200}
                      placeholder="Ex: Consultez le programme, le règlement ou nos ressources."
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        resize: "vertical",
                        fontFamily: "inherit",
                        marginBottom: "0.75rem",
                      }}
                    />
                    <div
                      style={{
                        border: "1px dashed #cbd5e1",
                        borderRadius: "10px",
                        padding: "0.65rem",
                        marginBottom: "0.6rem",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 0.45rem",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          color: "#475569",
                        }}
                      >
                        Bouton principal
                      </p>
                      <input
                        type="text"
                        value={infoPrimaryCtaLabel}
                        maxLength={80}
                        onChange={(e) => setInfoPrimaryCtaLabel(e.target.value)}
                        placeholder="Label (ex: Programme)"
                        aria-invalid={Boolean(liveFieldErrors.infoPrimaryCtaLabel)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.47rem 0.6rem",
                          borderRadius: "8px",
                          border: liveFieldErrors.infoPrimaryCtaLabel
                            ? "1px solid #fca5a5"
                            : "1px solid #cbd5e1",
                          fontSize: "0.84rem",
                          marginBottom: "0.4rem",
                        }}
                      />
                      <FieldError>{liveFieldErrors.infoPrimaryCtaLabel}</FieldError>
                      <input
                        type="url"
                        value={infoPrimaryCtaUrl}
                        onChange={(e) => setInfoPrimaryCtaUrl(e.target.value)}
                        placeholder="https://..."
                        aria-invalid={Boolean(liveFieldErrors.infoPrimaryCtaUrl)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.47rem 0.6rem",
                          borderRadius: "8px",
                          border: liveFieldErrors.infoPrimaryCtaUrl
                            ? "1px solid #fca5a5"
                            : "1px solid #cbd5e1",
                          fontSize: "0.84rem",
                          marginTop: liveFieldErrors.infoPrimaryCtaLabel
                            ? "0.4rem"
                            : 0,
                        }}
                      />
                      <FieldError>{liveFieldErrors.infoPrimaryCtaUrl}</FieldError>
                    </div>
                    <div
                      style={{
                        border: "1px dashed #cbd5e1",
                        borderRadius: "10px",
                        padding: "0.65rem",
                        marginBottom: "0.7rem",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 0.45rem",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          color: "#475569",
                        }}
                      >
                        Bouton secondaire (optionnel)
                      </p>
                      <input
                        type="text"
                        value={infoSecondaryCtaLabel}
                        maxLength={80}
                        onChange={(e) => setInfoSecondaryCtaLabel(e.target.value)}
                        placeholder="Label (ex: Règlement)"
                        aria-invalid={Boolean(
                          liveFieldErrors.infoSecondaryCtaLabel,
                        )}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.47rem 0.6rem",
                          borderRadius: "8px",
                          border: liveFieldErrors.infoSecondaryCtaLabel
                            ? "1px solid #fca5a5"
                            : "1px solid #cbd5e1",
                          fontSize: "0.84rem",
                          marginBottom: "0.4rem",
                        }}
                      />
                      <FieldError>
                        {liveFieldErrors.infoSecondaryCtaLabel}
                      </FieldError>
                      <input
                        type="url"
                        value={infoSecondaryCtaUrl}
                        onChange={(e) => setInfoSecondaryCtaUrl(e.target.value)}
                        placeholder="https://..."
                        aria-invalid={Boolean(liveFieldErrors.infoSecondaryCtaUrl)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "0.47rem 0.6rem",
                          borderRadius: "8px",
                          border: liveFieldErrors.infoSecondaryCtaUrl
                            ? "1px solid #fca5a5"
                            : "1px solid #cbd5e1",
                          fontSize: "0.84rem",
                          marginTop: liveFieldErrors.infoSecondaryCtaLabel
                            ? "0.4rem"
                            : 0,
                        }}
                      />
                      <FieldError>
                        {liveFieldErrors.infoSecondaryCtaUrl}
                      </FieldError>
                    </div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.82rem",
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={infoShowOnFinished}
                        onChange={(e) => setInfoShowOnFinished(e.target.checked)}
                      />
                      Afficher aussi après la fin de l’événement
                    </label>
                    <p style={{ ...fieldHintStyle, marginTop: "0.4rem" }}>
                      Ce réglage s’applique sur la salle réelle une fois
                      l’événement terminé (l’aperçu ne simule pas cette étape).
                    </p>
                  </CollapsibleSection>

                  <CollapsibleSection title="Apparence" defaultOpen>
                    <p style={{ ...fieldHintStyle, marginBottom: "0.85rem" }}>
                      Fond, couleurs, thème et assombrissement — regroupés pour
                      régler l’ambiance visuelle de la salle.
                    </p>

                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "0.75rem",
                        marginBottom: "0.85rem",
                        background: "#f8fafc",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 0.35rem",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        1. Image de fond (prioritaire)
                      </p>
                      <p style={fieldHintStyle}>
                        Si une image est définie, elle remplace la couleur de
                        fond. Visible pour les participants après
                        enregistrement.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          alignItems: "center",
                          marginBottom: backgroundUrl ? "0.75rem" : 0,
                        }}
                      >
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
                        <label
                          style={{
                            ...btnSecondary,
                            display: "inline-block",
                            cursor: "pointer",
                          }}
                        >
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
                          {uploadKind === "background"
                            ? "Envoi…"
                            : "Image de fond"}
                        </label>
                        {backgroundUrl ? (
                          <button
                            type="button"
                            style={btnDanger}
                            onClick={clearBackground}
                          >
                            Retirer
                          </button>
                        ) : null}
                      </div>
                      {backgroundUrl ? (
                        <>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "#475569",
                              marginBottom: "0.35rem",
                            }}
                          >
                            Assombrissement sur l’image
                          </label>
                          <p style={fieldHintStyle}>
                            Améliore la lisibilité du texte par-dessus l’image.
                          </p>
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
                        </>
                      ) : (
                        <p style={{ ...fieldHintStyle, margin: "0.55rem 0 0" }}>
                          Sans image, l’assombrissement n’a pas d’effet. Ajoutez
                          une image pour l’activer.
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "0.75rem",
                        marginBottom: "0.85rem",
                        background: backgroundUrl ? "#fff" : "#f8fafc",
                        opacity: backgroundUrl ? 0.72 : 1,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 0.35rem",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        2. Couleur de fond (sans image)
                      </p>
                      <p style={fieldHintStyle}>
                        {backgroundUrl
                          ? "Une image est active : cette couleur ne s’applique qu’après retrait de l’image."
                          : "S’applique lorsque aucune image de fond n’est définie. Sinon, dégradé ou thème par défaut."}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={roomBackgroundColor}
                          onChange={(e) => setRoomBackgroundColor(e.target.value)}
                          placeholder="#e5e7eb ou vide"
                          aria-invalid={Boolean(
                            liveFieldErrors.roomBackgroundColor,
                          )}
                          style={{
                            width: "10rem",
                            padding: "0.45rem 0.55rem",
                            borderRadius: "8px",
                            border: liveFieldErrors.roomBackgroundColor
                              ? "1px solid #fca5a5"
                              : "1px solid #cbd5e1",
                            fontFamily: "ui-monospace, monospace",
                            fontSize: "0.85rem",
                          }}
                        />
                        <input
                          type="color"
                          value={
                            isHexColor(roomBackgroundColor)
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
                      <FieldError>
                        {liveFieldErrors.roomBackgroundColor}
                      </FieldError>
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
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#2563eb"
                        aria-invalid={Boolean(liveFieldErrors.primaryColor)}
                        style={{
                          width: "7rem",
                          padding: "0.45rem 0.55rem",
                          borderRadius: "8px",
                          border: liveFieldErrors.primaryColor
                            ? "1px solid #fca5a5"
                            : "1px solid #cbd5e1",
                          fontFamily: "ui-monospace, monospace",
                          fontSize: "0.85rem",
                        }}
                      />
                      <input
                        type="color"
                        value={
                          isHexColor(primaryColor)
                            ? primaryColor.trim()
                            : "#2563eb"
                        }
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
                          background: isHexColor(primaryColor)
                            ? primaryColor.trim()
                            : "#2563eb",
                        }}
                        aria-hidden
                      />
                    </div>
                    <FieldError>{liveFieldErrors.primaryColor}</FieldError>

                    <label
                      style={{
                        display: "block",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "#475569",
                        margin: "0.85rem 0 0.35rem",
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
                      }}
                    >
                      <option value="dark">Sombre</option>
                      <option value="light">Clair</option>
                      <option value="auto">Auto (appareil)</option>
                    </select>
                    {!backgroundUrl ? (
                      <div style={{ marginTop: "0.85rem" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "#475569",
                            marginBottom: "0.35rem",
                          }}
                        >
                          Assombrissement image (mémorisé)
                        </label>
                        <p style={fieldHintStyle}>
                          Conservé pour la prochaine image de fond. Sans effet
                          tant qu’aucune image n’est définie.
                        </p>
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
                      </div>
                    ) : null}
                  </CollapsibleSection>
                </>
              )}
            </div>

            <div style={card} className="customization-preview-card">
              <h2
                style={{
                  margin: "0 0 0.15rem",
                  fontSize: "1rem",
                  fontWeight: 800,
                }}
              >
                {isLandingPage ? "Aperçu landing" : "Aperçu brouillon"}
              </h2>
              <p style={{ margin: "0 0 0.85rem", fontSize: "0.82rem", color: "#64748b" }}>
                {isLandingPage
                  ? "Prévisualisation de la vitrine publique. L’aperçu reflète la dernière version enregistrée."
                  : "Brouillon en direct dans cette page (mise en page, couleurs, médias). Les participants voient uniquement la version enregistrée. Cet aperçu ne simule pas les étapes de vote."}
              </p>
              {(isLandingPage ? landingPath : joinPath) ? (
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
                      key={`${mode}-${slug ?? "preview"}`}
                      title={isLandingPage ? "Aperçu landing" : "Aperçu salle"}
                      src={isLandingPage ? landingPath : joinPath}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      onLoad={() => {
                        if (!isLivePage) return;
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
                        `${window.location.origin}${isLandingPage ? landingPath : joinPath}`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    {isLandingPage
                      ? "Ouvrir la landing publiée"
                      : "Ouvrir la salle publiée"}
                  </button>
                  {isLivePage ? (
                    <p style={{ ...fieldHintStyle, marginTop: "0.45rem" }}>
                      La salle publiée ignore le brouillon non enregistré de
                      cette page.
                    </p>
                  ) : null}
                </>
              ) : (
                <p style={{ color: "#64748b", margin: 0 }}>Slug manquant.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {!loading ? (
        <div className="customization-sticky-bar" role="region" aria-label="Enregistrement">
          <div className="customization-sticky-bar-inner">
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: dirty
                  ? "#b45309"
                  : hasLiveFieldErrors && isLivePage
                    ? "#b91c1c"
                    : "#64748b",
                flex: "1 1 auto",
                minWidth: 0,
              }}
            >
              {isLivePage && hasLiveFieldErrors
                ? "Corrigez les champs en erreur avant d’enregistrer"
                : dirty
                  ? "Modifications non enregistrées"
                  : "Tout est enregistré"}
            </p>
            <button
              type="button"
              style={{
                ...btnPrimary,
                opacity: saving || (isLivePage && hasLiveFieldErrors) ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
              disabled={saving || (isLivePage && hasLiveFieldErrors)}
              onClick={() => void handleSave()}
            >
              {saving
                ? "Enregistrement…"
                : isLandingPage
                  ? "Enregistrer la landing"
                  : "Enregistrer la salle live"}
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .editor-universe-link {
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease;
        }
        .editor-universe-link--live {
          background: rgba(59, 130, 246, 0.12) !important;
          border-color: rgba(59, 130, 246, 0.24) !important;
          color: #1e3a8a !important;
        }
        .editor-universe-link--landing {
          background: rgba(168, 85, 247, 0.12) !important;
          border-color: rgba(168, 85, 247, 0.24) !important;
          color: #6d28d9 !important;
        }
        @media (hover: hover) {
          .editor-universe-link--live:hover {
            background: rgba(59, 130, 246, 0.18) !important;
            border-color: rgba(59, 130, 246, 0.32) !important;
          }
          .editor-universe-link--landing:hover {
            background: rgba(168, 85, 247, 0.18) !important;
            border-color: rgba(168, 85, 247, 0.32) !important;
          }
        }
        .customization-section-summary::-webkit-details-marker {
          display: none;
        }
        .customization-section-summary::before {
          content: "▾";
          font-size: 0.85rem;
          color: #94a3b8;
          transition: transform 0.15s ease;
          flex: 0 0 auto;
        }
        details.customization-section:not([open]) > .customization-section-summary::before {
          transform: rotate(-90deg);
        }
        .customization-mobile-tabs {
          display: none;
          gap: 0.4rem;
          margin: 0 0 1rem;
          padding: 0.3rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
        }
        .customization-mobile-tab {
          flex: 1;
          border: none;
          background: transparent;
          border-radius: 9px;
          padding: 0.55rem 0.75rem;
          font-size: 0.86rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
        }
        .customization-mobile-tab--active {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .customization-sticky-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(8px);
        }
        .customization-sticky-bar-inner {
          max-width: ${adminContentMaxWidth("workspace")};
          margin: 0 auto;
          padding: 0.7rem clamp(1rem, 3vw, 1.75rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          box-sizing: border-box;
          width: 100%;
        }
        @media (min-width: 901px) {
          .customization-preview-card {
            position: sticky;
            top: 1rem;
          }
        }
        @media (max-width: 900px) {
          .customization-layout {
            grid-template-columns: 1fr !important;
          }
          .customization-mobile-tabs {
            display: flex;
          }
          .customization-layout[data-mobile-panel="form"] .customization-preview-card {
            display: none;
          }
          .customization-layout[data-mobile-panel="preview"] .customization-form-col {
            display: none;
          }
          .customization-preview-card iframe {
            height: min(420px, 58vh) !important;
          }
        }
      `}</style>
    </main>
  );
}

export default function EventCustomizationHubPage() {
  const params = useParams();
  const eventId = getEventIdFromParams(params);
  const liveHref = eventId ? `/admin/events/${encodeURIComponent(eventId)}/live` : "/admin/events";
  const landingHref = eventId
    ? `/admin/events/${encodeURIComponent(eventId)}/landing`
    : "/admin/events";

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
      <div
        style={adminContentShellStyle("workspace", {
          padding: "1.25rem clamp(1rem, 3vw, 1.75rem) 2.5rem",
        })}
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
            Personnalisation de l’événement
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            Choisissez l’espace à configurer : le live interactif ou la vitrine
            événementielle.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          <section style={card}>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: "#1d4ed8",
              }}
            >
              <LiveMicroLabel iconSize={15} gap="0.42rem" />
            </p>
            <p
              style={{
                margin: "0 0 0.9rem",
                color: "#475569",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            >
              Configurez l’expérience interactive et visuelle de votre salle de
              vote : logo, fond, couleurs, thème, infos et aperçu live.
            </p>
            <Link
              href={liveHref}
              className="hub-universe-link hub-universe-link--live"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              Ouvrir la salle live
            </Link>
          </section>

          <section style={card}>
            <p
              style={{
                margin: "0 0 0.35rem",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: "#7c3aed",
              }}
            >
              ✨ Landing événement
            </p>
            <p
              style={{
                margin: "0 0 0.9rem",
                color: "#475569",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            >
              Créez la vitrine immersive de l’événement : couverture, titre,
              description, galerie événement, moments live et aperçu landing.
            </p>
            <Link
              href={landingHref}
              className="hub-universe-link hub-universe-link--landing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              Ouvrir la landing événement
            </Link>
          </section>
        </div>
      </div>
      <style>{`
        .hub-universe-link {
          padding: 0.55rem 1rem;
          font-size: 0.88rem;
          font-weight: 700;
          border-radius: 10px;
          border: 1px solid transparent;
          transition:
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease;
        }
        .hub-universe-link--live {
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.24);
          color: #1e3a8a;
        }
        .hub-universe-link--landing {
          background: rgba(168, 85, 247, 0.12);
          border-color: rgba(168, 85, 247, 0.24);
          color: #6d28d9;
        }
        @media (hover: hover) {
          .hub-universe-link--live:hover {
            background: rgba(59, 130, 246, 0.18);
            border-color: rgba(59, 130, 246, 0.32);
          }
          .hub-universe-link--landing:hover {
            background: rgba(168, 85, 247, 0.18);
            border-color: rgba(168, 85, 247, 0.32);
          }
        }
      `}</style>
    </main>
  );
}
