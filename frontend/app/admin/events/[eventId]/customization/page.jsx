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
import { LandingFeedAdminPanel } from "@/components/event/LandingFeedAdminPanel";
import { resolveApiAssetUrl } from "@/lib/assetUrl";
import {
  adminContentMaxWidth,
  adminContentShellStyle,
} from "@/lib/adminLayout";
import {
  LANDING_PHOTO_TOO_HEAVY_MESSAGE,
  prepareLandingPhotoForUpload,
} from "@/lib/compressLandingPhoto";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  LANDING_CAPTION_MAX,
  LANDING_META_DATE_MAX,
  LANDING_META_HOURS_MAX,
  LANDING_META_VENUE_MAX,
  LANDING_MESSAGE_BODY_MAX,
  LANDING_MESSAGE_PHOTOS_MAX,
  LANDING_MESSAGE_TITLE_MAX,
  LANDING_PROGRAM_TIME_MAX,
  LANDING_PROGRAM_TITLE_MAX,
  parseLandingMessagePhotoIds,
  sortLandingProgramItems,
} from "@/lib/landingEventPresentation";

/** Limites alignées sur l’API (affichage orga, pas de nouvelle règle métier). */
const LANDING_SHOWCASE_MAX = 30;
const LANDING_LIVE_PHOTOS_MAX = 50;
const LANDING_PROGRAM_MAX = 40;

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
  const regieHref = eventId
    ? `/admin/event/${encodeURIComponent(eventId)}`
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
      <Link
        href={regieHref}
        className="editor-universe-link editor-universe-link--regie"
        style={linkStyle(false)}
        data-testid="landing-admin-regie-link"
      >
        Régie
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
  const [landingEventDate, setLandingEventDate] = useState("");
  const [landingVenue, setLandingVenue] = useState("");
  const [landingHours, setLandingHours] = useState("");
  const [landingIntroTitle, setLandingIntroTitle] = useState("");
  const [landingIntroBody, setLandingIntroBody] = useState("");
  const [landingIntroPhotoIds, setLandingIntroPhotoIds] = useState(
    /** @type {string[]} */ ([]),
  );
  const [landingThanksTitle, setLandingThanksTitle] = useState("");
  const [landingThanksBody, setLandingThanksBody] = useState("");
  const [landingThanksPhotoIds, setLandingThanksPhotoIds] = useState(
    /** @type {string[]} */ ([]),
  );
  const [landingKeepPhotosAfter, setLandingKeepPhotosAfter] = useState(true);
  const [landingKeepResultsAfter, setLandingKeepResultsAfter] = useState(true);
  const [landingKeepMessagesAfter, setLandingKeepMessagesAfter] =
    useState(true);
  /** Galerie événement (showInGallery) — hors photos message-only. */
  /** @type {{ id: string; url: string; createdAt: string; caption?: string | null; showInGallery?: boolean }[]} */
  const [showcasePhotos, setShowcasePhotos] = useState([]);
  /** Pool complet (galerie + uploads directs messages) pour résoudre les IDs. */
  /** @type {{ id: string; url: string; createdAt: string; caption?: string | null; showInGallery?: boolean }[]} */
  const [messagePhotoAssets, setMessagePhotoAssets] = useState([]);
  /** Panneau « Choisir dans la galerie » ouvert pour intro | thanks. */
  const [messageGalleryPicker, setMessageGalleryPicker] = useState(
    /** @type {null | "intro" | "thanks"} */ (null),
  );
  const [messagePhotoBusy, setMessagePhotoBusy] = useState(false);
  /** Brouillons légendes galerie événement. */
  const [showcaseCaptionDrafts, setShowcaseCaptionDrafts] = useState(
    /** @type {Record<string, string>} */ ({}),
  );
  const [showcaseCaptionBusyId, setShowcaseCaptionBusyId] = useState(
    /** @type {string | null} */ (null),
  );
  /** @type {{ id: string; url: string; createdAt: string; caption?: string | null }[]} */
  const [landingLivePhotos, setLandingLivePhotos] = useState([]);
  /** @type {{ id: string; timeLabel: string; title: string; sortOrder?: number; createdAt?: string }[]} */
  const [programItems, setProgramItems] = useState([]);
  const [programDraftTime, setProgramDraftTime] = useState("");
  const [programDraftTitle, setProgramDraftTitle] = useState("");
  const [programBusy, setProgramBusy] = useState(false);
  const [programEditId, setProgramEditId] = useState(
    /** @type {string | null} */ (null),
  );
  const [programEditTime, setProgramEditTime] = useState("");
  const [programEditTitle, setProgramEditTitle] = useState("");
  /** Questions CLOSED pour masquage fil (Lead CRM exclu côté panel). */
  const [closedLandingPolls, setClosedLandingPolls] = useState(
    /** @type {{ id: string; question?: string; title?: string; status?: string; type?: string; leadEnabled?: boolean; landingResultHidden?: boolean }[]} */ ([]),
  );
  const [showcasePhotoBusy, setShowcasePhotoBusy] = useState(false);
  const [livePhotoBusy, setLivePhotoBusy] = useState(false);
  const [landingLinkCopied, setLandingLinkCopied] = useState(false);
  /** Force le reload de l’iframe aperçu après save / photos immédiates. */
  const [previewNonce, setPreviewNonce] = useState(0);
  const previewIframeRef = useRef(null);
  const [previewIframeReady, setPreviewIframeReady] = useState(false);
  /** Mobile (<900px) : bascule Réglages / Aperçu sans changer le layout desktop. */
  const [mobilePanel, setMobilePanel] = useState(/** @type {"form" | "preview"} */ ("form"));

  const bumpLandingPreview = useCallback(() => {
    if (!isLandingPage) return;
    setPreviewNonce((n) => n + 1);
  }, [isLandingPage]);

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
        landingDescription !== baseline.landingDescription ||
        landingEventDate !== baseline.landingEventDate ||
        landingVenue !== baseline.landingVenue ||
        landingHours !== baseline.landingHours ||
        landingIntroTitle !== baseline.landingIntroTitle ||
        landingIntroBody !== baseline.landingIntroBody ||
        landingIntroPhotoIds.join(",") !==
          (baseline.landingIntroPhotoIds || []).join(",") ||
        landingThanksTitle !== baseline.landingThanksTitle ||
        landingThanksBody !== baseline.landingThanksBody ||
        landingThanksPhotoIds.join(",") !==
          (baseline.landingThanksPhotoIds || []).join(",") ||
        landingKeepPhotosAfter !== baseline.landingKeepPhotosAfter ||
        landingKeepResultsAfter !== baseline.landingKeepResultsAfter ||
        landingKeepMessagesAfter !== baseline.landingKeepMessagesAfter
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
    landingEventDate,
    landingVenue,
    landingHours,
    landingIntroTitle,
    landingIntroBody,
    landingIntroPhotoIds,
    landingThanksTitle,
    landingThanksBody,
    landingThanksPhotoIds,
    landingKeepPhotosAfter,
    landingKeepResultsAfter,
    landingKeepMessagesAfter,
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
      const ldate =
        typeof data.landingEventDate === "string" ? data.landingEventDate : "";
      const lvenue =
        typeof data.landingVenue === "string" ? data.landingVenue : "";
      const lhours =
        typeof data.landingHours === "string" ? data.landingHours : "";
      const lintTitle =
        typeof data.landingIntroTitle === "string" ? data.landingIntroTitle : "";
      const lintBody =
        typeof data.landingIntroBody === "string" ? data.landingIntroBody : "";
      const lintPhotos = parseLandingMessagePhotoIds(data.landingIntroPhotoIds);
      const lthTitle =
        typeof data.landingThanksTitle === "string"
          ? data.landingThanksTitle
          : "";
      const lthBody =
        typeof data.landingThanksBody === "string" ? data.landingThanksBody : "";
      const lthPhotos = parseLandingMessagePhotoIds(data.landingThanksPhotoIds);
      const keepPhotos =
        typeof data.landingKeepPhotosAfter === "boolean"
          ? data.landingKeepPhotosAfter
          : true;
      const keepResults =
        typeof data.landingKeepResultsAfter === "boolean"
          ? data.landingKeepResultsAfter
          : true;
      const keepMessages =
        typeof data.landingKeepMessagesAfter === "boolean"
          ? data.landingKeepMessagesAfter
          : true;
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
      setLandingEventDate(ldate);
      setLandingVenue(lvenue);
      setLandingHours(lhours);
      setLandingIntroTitle(lintTitle);
      setLandingIntroBody(lintBody);
      setLandingIntroPhotoIds(lintPhotos);
      setLandingThanksTitle(lthTitle);
      setLandingThanksBody(lthBody);
      setLandingThanksPhotoIds(lthPhotos);
      setLandingKeepPhotosAfter(keepPhotos);
      setLandingKeepResultsAfter(keepResults);
      setLandingKeepMessagesAfter(keepMessages);
      if (Array.isArray(data.landingShowcasePhotos)) {
        const showcaseMapped = data.landingShowcasePhotos
          .map((p) => ({
            id: String(p?.id || ""),
            url:
              typeof p?.url === "string" ? resolveApiAssetUrl(p.url) : "",
            createdAt: typeof p?.createdAt === "string" ? p.createdAt : "",
            caption:
              typeof p?.caption === "string" && p.caption.trim()
                ? p.caption.trim()
                : null,
            showInGallery: p?.showInGallery !== false,
          }))
          .filter((p) => p.id && p.url);
        setMessagePhotoAssets(showcaseMapped);
        const galleryOnly = showcaseMapped.filter(
          (p) => p.showInGallery !== false,
        );
        setShowcasePhotos(galleryOnly);
        /** @type {Record<string, string>} */
        const drafts = {};
        for (const ph of galleryOnly) {
          drafts[ph.id] = ph.caption || "";
        }
        setShowcaseCaptionDrafts(drafts);
      } else {
        setMessagePhotoAssets([]);
        setShowcasePhotos([]);
        setShowcaseCaptionDrafts({});
      }
      setLandingLivePhotos(
        landingPhotos
          .map((p) => ({
            id: String(p?.id || ""),
            url:
              typeof p?.url === "string" ? resolveApiAssetUrl(p.url) : "",
            createdAt:
              typeof p?.createdAt === "string" ? p.createdAt : "",
            caption:
              typeof p?.caption === "string" && p.caption.trim()
                ? p.caption.trim()
                : null,
          }))
          .filter((p) => p.id && p.url),
      );
      if (Array.isArray(data.landingProgramItems)) {
        setProgramItems(
          sortLandingProgramItems(
            data.landingProgramItems.map((step) => ({
              id: String(step?.id || ""),
              timeLabel: String(step?.timeLabel || ""),
              title: String(step?.title || ""),
              sortOrder:
                typeof step?.sortOrder === "number" ? step.sortOrder : 0,
              createdAt:
                typeof step?.createdAt === "string" ? step.createdAt : "",
            })),
          ).filter((step) => step.id && step.timeLabel && step.title),
        );
      } else {
        setProgramItems([]);
      }
      const pollsRaw = Array.isArray(data.polls) ? data.polls : [];
      setClosedLandingPolls(
        pollsRaw
          .filter((p) => String(p?.status || "").toUpperCase() === "CLOSED")
          .map((p) => ({
            id: String(p.id),
            question: typeof p.question === "string" ? p.question : "",
            title: typeof p.title === "string" ? p.title : "",
            status: String(p.status || ""),
            type: typeof p.type === "string" ? p.type : "",
            leadEnabled: Boolean(p.leadEnabled),
            landingResultHidden: Boolean(p.landingResultHidden),
          })),
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
        landingEventDate: ldate,
        landingVenue: lvenue,
        landingHours: lhours,
        landingIntroTitle: lintTitle,
        landingIntroBody: lintBody,
        landingIntroPhotoIds: lintPhotos,
        landingThanksTitle: lthTitle,
        landingThanksBody: lthBody,
        landingThanksPhotoIds: lthPhotos,
        landingKeepPhotosAfter: keepPhotos,
        landingKeepResultsAfter: keepResults,
        landingKeepMessagesAfter: keepMessages,
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
        landingEventDate:
          landingEventDate.trim() === ""
            ? null
            : landingEventDate.trim().slice(0, LANDING_META_DATE_MAX),
        landingVenue:
          landingVenue.trim() === ""
            ? null
            : landingVenue.trim().slice(0, LANDING_META_VENUE_MAX),
        landingHours:
          landingHours.trim() === ""
            ? null
            : landingHours.trim().slice(0, LANDING_META_HOURS_MAX),
        landingIntroTitle:
          landingIntroTitle.trim() === ""
            ? null
            : landingIntroTitle.trim().slice(0, LANDING_MESSAGE_TITLE_MAX),
        landingIntroBody:
          landingIntroBody.trim() === ""
            ? null
            : landingIntroBody.trim().slice(0, LANDING_MESSAGE_BODY_MAX),
        landingIntroPhotoIds:
          landingIntroPhotoIds.length > 0
            ? landingIntroPhotoIds.slice(0, LANDING_MESSAGE_PHOTOS_MAX)
            : null,
        landingThanksTitle:
          landingThanksTitle.trim() === ""
            ? null
            : landingThanksTitle.trim().slice(0, LANDING_MESSAGE_TITLE_MAX),
        landingThanksBody:
          landingThanksBody.trim() === ""
            ? null
            : landingThanksBody.trim().slice(0, LANDING_MESSAGE_BODY_MAX),
        landingThanksPhotoIds:
          landingThanksPhotoIds.length > 0
            ? landingThanksPhotoIds.slice(0, LANDING_MESSAGE_PHOTOS_MAX)
            : null,
        landingKeepPhotosAfter: Boolean(landingKeepPhotosAfter),
        landingKeepResultsAfter: Boolean(landingKeepResultsAfter),
        landingKeepMessagesAfter: Boolean(landingKeepMessagesAfter),
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
      setToast(
        isLandingPage
          ? "Landing enregistrée"
          : "Personnalisation enregistrée",
      );
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
        landingEventDate: landingEventDate.trim(),
        landingVenue: landingVenue.trim(),
        landingHours: landingHours.trim(),
        landingIntroTitle: landingIntroTitle.trim(),
        landingIntroBody: landingIntroBody.trim(),
        landingIntroPhotoIds: [...landingIntroPhotoIds],
        landingThanksTitle: landingThanksTitle.trim(),
        landingThanksBody: landingThanksBody.trim(),
        landingThanksPhotoIds: [...landingThanksPhotoIds],
        landingKeepPhotosAfter: Boolean(landingKeepPhotosAfter),
        landingKeepResultsAfter: Boolean(landingKeepResultsAfter),
        landingKeepMessagesAfter: Boolean(landingKeepMessagesAfter),
      });
      if (isLandingPage) bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function toggleMessagePhoto(kind, photoId) {
    const setter =
      kind === "intro" ? setLandingIntroPhotoIds : setLandingThanksPhotoIds;
    setter((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      if (prev.length >= LANDING_MESSAGE_PHOTOS_MAX) return prev;
      return [...prev, photoId];
    });
  }

  function removeMessagePhoto(kind, photoId) {
    const setter =
      kind === "intro" ? setLandingIntroPhotoIds : setLandingThanksPhotoIds;
    setter((prev) => prev.filter((id) => id !== photoId));
  }

  /**
   * Upload direct dans un message (hors galerie). Association immédiate côté API.
   * @param {"intro" | "thanks"} kind
   * @param {FileList | File[] | null | undefined} fileList
   */
  async function addMessagePhotos(kind, fileList) {
    if (!eventId || !fileList?.length) return;
    const files = Array.from(fileList).filter(Boolean);
    if (!files.length) return;
    let selectedCount =
      kind === "intro"
        ? landingIntroPhotoIds.length
        : landingThanksPhotoIds.length;
    if (selectedCount >= LANDING_MESSAGE_PHOTOS_MAX) {
      setSaveError(
        `Maximum ${LANDING_MESSAGE_PHOTOS_MAX} photos par message.`,
      );
      return;
    }
    setMessagePhotoBusy(true);
    setSaveError(null);
    try {
      for (const file of files) {
        if (selectedCount >= LANDING_MESSAGE_PHOTOS_MAX) break;
        const fd = new FormData();
        fd.append("file", file);
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${eventId}/landing/message-photos?attach=${encodeURIComponent(kind)}`,
          { method: "POST", body: fd },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(mapApiError(body, res.status, "Photo"));
        }
        const photo = body?.photo;
        if (typeof photo?.id === "string" && typeof photo?.url === "string") {
          const mapped = {
            id: photo.id,
            url: resolveApiAssetUrl(photo.url),
            createdAt:
              typeof photo.createdAt === "string" ? photo.createdAt : "",
            caption: null,
            showInGallery: false,
          };
          setMessagePhotoAssets((prev) => {
            if (prev.some((p) => p.id === mapped.id)) return prev;
            return [...prev, mapped];
          });
        }
        if (Array.isArray(body.landingIntroPhotoIds)) {
          const nextIntro = body.landingIntroPhotoIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
            .slice(0, LANDING_MESSAGE_PHOTOS_MAX);
          setLandingIntroPhotoIds(nextIntro);
          if (kind === "intro") selectedCount = nextIntro.length;
        }
        if (Array.isArray(body.landingThanksPhotoIds)) {
          const nextThanks = body.landingThanksPhotoIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
            .slice(0, LANDING_MESSAGE_PHOTOS_MAX);
          setLandingThanksPhotoIds(nextThanks);
          if (kind === "thanks") selectedCount = nextThanks.length;
        }
      }
      setToast("Photo ajoutée au message");
      window.setTimeout(() => setToast(null), 2200);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Envoi photo impossible.");
    } finally {
      setMessagePhotoBusy(false);
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
          const mapped = {
            id: body.id,
            url: resolveApiAssetUrl(body.url),
            createdAt:
              typeof body.createdAt === "string" ? body.createdAt : "",
            caption: null,
            showInGallery: body.showInGallery !== false,
          };
          setShowcasePhotos((prev) => [...prev, mapped]);
          setMessagePhotoAssets((prev) => {
            if (prev.some((p) => p.id === mapped.id)) return prev;
            return [...prev, mapped];
          });
          setShowcaseCaptionDrafts((prev) => ({ ...prev, [body.id]: "" }));
        }
      }
      setToast("Galerie événement mise à jour");
      window.setTimeout(() => setToast(null), 2400);
      bumpLandingPreview();
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
      setMessagePhotoAssets((prev) => prev.filter((p) => p.id !== photoId));
      setShowcaseCaptionDrafts((prev) => {
        const next = { ...prev };
        delete next[photoId];
        return next;
      });
      setLandingIntroPhotoIds((prev) => prev.filter((id) => id !== photoId));
      setLandingThanksPhotoIds((prev) => prev.filter((id) => id !== photoId));
      setToast("Photo retirée de la galerie événement");
      window.setTimeout(() => setToast(null), 2200);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Suppression impossible.");
    } finally {
      setShowcasePhotoBusy(false);
    }
  }

  async function saveShowcaseCaption(photoId, overrideText) {
    if (!eventId || !photoId || showcaseCaptionBusyId) return;
    const draft =
      overrideText !== undefined
        ? String(overrideText)
        : String(showcaseCaptionDrafts[photoId] ?? "");
    const existing = showcasePhotos.find((p) => p.id === photoId);
    const current =
      typeof existing?.caption === "string" && existing.caption.trim()
        ? existing.caption.trim()
        : "";
    const next = draft.trim();
    if (next === current) {
      setToast("Légende à jour");
      window.setTimeout(() => setToast(null), 1800);
      return;
    }
    setShowcaseCaptionBusyId(photoId);
    setSaveError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/landing/showcase-photos/${encodeURIComponent(photoId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: next === "" ? null : next }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status, "Légende"));
      }
      const saved =
        typeof body.caption === "string" && body.caption.trim()
          ? body.caption.trim()
          : null;
      setShowcasePhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, caption: saved } : p)),
      );
      setShowcaseCaptionDrafts((prev) => ({
        ...prev,
        [photoId]: saved || "",
      }));
      setToast(saved ? "Légende enregistrée" : "Légende retirée");
      window.setTimeout(() => setToast(null), 2200);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Légende non enregistrée.");
    } finally {
      setShowcaseCaptionBusyId(null);
    }
  }

  async function addProgramItem() {
    if (!eventId || programBusy) return;
    const timeLabel = programDraftTime.trim();
    const title = programDraftTitle.trim();
    if (!timeLabel || !title) {
      setSaveError("Heure et titre requis pour une étape du programme.");
      return;
    }
    if (programItems.length >= LANDING_PROGRAM_MAX) {
      setSaveError(`Programme limité à ${LANDING_PROGRAM_MAX} étapes.`);
      return;
    }
    setProgramBusy(true);
    setSaveError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/landing/program`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeLabel: timeLabel.slice(0, LANDING_PROGRAM_TIME_MAX),
            title: title.slice(0, LANDING_PROGRAM_TITLE_MAX),
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status, "Programme"));
      }
      setProgramItems((prev) =>
        sortLandingProgramItems([
          ...prev,
          {
            id: String(body.id),
            timeLabel: String(body.timeLabel || timeLabel),
            title: String(body.title || title),
            sortOrder:
              typeof body.sortOrder === "number" ? body.sortOrder : 0,
            createdAt:
              typeof body.createdAt === "string" ? body.createdAt : "",
          },
        ]),
      );
      setProgramDraftTime("");
      setProgramDraftTitle("");
      setToast("Étape ajoutée au programme");
      window.setTimeout(() => setToast(null), 2200);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Ajout programme impossible.");
    } finally {
      setProgramBusy(false);
    }
  }

  async function saveProgramEdit() {
    if (!eventId || !programEditId || programBusy) return;
    const timeLabel = programEditTime.trim();
    const title = programEditTitle.trim();
    if (!timeLabel || !title) {
      setSaveError("Heure et titre requis.");
      return;
    }
    setProgramBusy(true);
    setSaveError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/landing/program/${encodeURIComponent(programEditId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeLabel: timeLabel.slice(0, LANDING_PROGRAM_TIME_MAX),
            title: title.slice(0, LANDING_PROGRAM_TITLE_MAX),
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status, "Programme"));
      }
      setProgramItems((prev) =>
        sortLandingProgramItems(
          prev.map((step) =>
            step.id === programEditId
              ? {
                  ...step,
                  timeLabel: String(body.timeLabel || timeLabel),
                  title: String(body.title || title),
                  sortOrder:
                    typeof body.sortOrder === "number"
                      ? body.sortOrder
                      : step.sortOrder,
                }
              : step,
          ),
        ),
      );
      setProgramEditId(null);
      setProgramEditTime("");
      setProgramEditTitle("");
      setToast("Étape mise à jour");
      window.setTimeout(() => setToast(null), 2200);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Modification programme impossible.");
    } finally {
      setProgramBusy(false);
    }
  }

  async function removeProgramItem(itemId) {
    if (!eventId || !itemId || programBusy) return;
    setProgramBusy(true);
    setSaveError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/landing/program/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      setProgramItems((prev) => prev.filter((step) => step.id !== itemId));
      if (programEditId === itemId) {
        setProgramEditId(null);
        setProgramEditTime("");
        setProgramEditTitle("");
      }
      setToast("Étape retirée");
      window.setTimeout(() => setToast(null), 2000);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Suppression programme impossible.");
    } finally {
      setProgramBusy(false);
    }
  }

  async function addLiveMomentPhotos(fileList) {
    if (!eventId || !fileList?.length) return;
    const files = Array.from(fileList).filter(Boolean);
    if (!files.length) return;
    setLivePhotoBusy(true);
    setSaveError(null);
    try {
      for (const file of files) {
        const prepared = await prepareLandingPhotoForUpload(file);
        const fd = new FormData();
        fd.append("file", prepared);
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${eventId}/landing/photos`,
          { method: "POST", body: fd },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(mapApiError(body, res.status, "Moment live"));
        }
        if (typeof body.id === "string" && typeof body.url === "string") {
          setLandingLivePhotos((prev) => [
            {
              id: body.id,
              url: resolveApiAssetUrl(body.url),
              createdAt:
                typeof body.createdAt === "string" ? body.createdAt : "",
              caption: null,
            },
            ...prev,
          ]);
        }
      }
      setToast("Moment live publié");
      window.setTimeout(() => setToast(null), 2400);
      bumpLandingPreview();
    } catch (e) {
      const msg = e?.message || "Publication impossible.";
      setSaveError(
        msg === LANDING_PHOTO_TOO_HEAVY_MESSAGE ||
          String(msg).includes("trop volumineux")
          ? LANDING_PHOTO_TOO_HEAVY_MESSAGE
          : msg,
      );
    } finally {
      setLivePhotoBusy(false);
    }
  }

  async function removeLiveMomentPhoto(photoId) {
    if (!eventId || !photoId) return;
    setLivePhotoBusy(true);
    setSaveError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/events/${eventId}/landing/photos/${encodeURIComponent(photoId)}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(mapApiError(body, res.status));
      }
      setLandingLivePhotos((prev) => prev.filter((p) => p.id !== photoId));
      setToast("Moment live retiré");
      window.setTimeout(() => setToast(null), 2200);
      bumpLandingPreview();
    } catch (e) {
      setSaveError(e.message || "Suppression impossible.");
    } finally {
      setLivePhotoBusy(false);
    }
  }

  const joinPath = slug ? `/join/${encodeURIComponent(slug)}` : null;
  const landingPath = slug ? `/e/${encodeURIComponent(slug)}` : null;
  const photosBusy = showcasePhotoBusy || livePhotoBusy;
  /** Aperçu iframe seulement si la landing est réellement publiée (évite /join). */
  const landingPreviewActive =
    Boolean(landingEnabled) && Boolean(baseline?.landingEnabled);

  async function copyLandingPublicLink() {
    if (!landingPath || typeof window === "undefined") return;
    const url = `${window.location.origin}${landingPath}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setLandingLinkCopied(true);
      window.setTimeout(() => setLandingLinkCopied(false), 2200);
    } catch {
      setSaveError("Impossible de copier le lien.");
    }
  }

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
              ? "Page centrale facultative (/e) : teaser, galerie événement et moments live."
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

        {!loading ? (
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
            data-mobile-panel={mobilePanel}
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
                  {/* 1. Publication */}
                  <section style={card}>
                    <h2
                      style={{
                        margin: "0 0 0.55rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      Publication
                    </h2>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.85rem" }}>
                      Landing événement = page centrale facultative. Désactivée, le
                      lien <code style={{ fontSize: "0.72rem" }}>/e</code> redirige
                      vers la salle live.
                    </p>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.85rem",
                        color: "#334155",
                        cursor: "pointer",
                        marginBottom: "0.75rem",
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
                        margin: "0 0 0.85rem",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: landingEnabled ? "#15803d" : "#b45309",
                      }}
                    >
                      {landingEnabled
                        ? "État : activée — visible sur /e"
                        : "État : désactivée — /e redirige vers la salle live"}
                    </p>
                    {landingPath ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <code
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.4rem 0.55rem",
                            borderRadius: "8px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {landingPath}
                        </code>
                        <button
                          type="button"
                          style={btnSecondary}
                          onClick={() => void copyLandingPublicLink()}
                        >
                          {landingLinkCopied ? "Lien copié" : "Copier"}
                        </button>
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
                          Ouvrir
                        </button>
                      </div>
                    ) : (
                      <p style={{ ...fieldHintStyle, margin: 0 }}>Slug manquant.</p>
                    )}
                  </section>

                  {/* 2. Personnalisation */}
                  <section style={card}>
                    <h2
                      style={{
                        margin: "0 0 0.55rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      Personnalisation
                    </h2>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.85rem" }}>
                      Couverture, titre et accroche : à valider avec{" "}
                      <strong style={{ fontWeight: 700, color: "#475569" }}>
                        Enregistrer la landing
                      </strong>
                      . Logo et couleur d’accent viennent de la{" "}
                      {eventId ? (
                        <Link
                          href={`/admin/events/${encodeURIComponent(eventId)}/live`}
                          style={{ color: "#2563eb", fontWeight: 600 }}
                        >
                          Salle live
                        </Link>
                      ) : (
                        "Salle live"
                      )}
                      .
                    </p>

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
                            uploadKind !== null || photosBusy
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            uploadKind !== null || photosBusy ? 0.65 : 1,
                        }}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: "none" }}
                          disabled={uploadKind !== null || photosBusy}
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
                          disabled={photosBusy}
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
                      Titre landing (optionnel)
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
                      Accroche (optionnelle)
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

                    <p
                      style={{
                        margin: "0 0 0.55rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      ✨ L&apos;événement — infos structurées
                    </p>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.65rem" }}>
                      Date, lieu et horaires facultatifs. Source unique pour la
                      landing — pas de doublon avec Infos pratiques. Blocs vides
                      masqués sur /e. À valider avec Enregistrer.
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
                      Date (facultative)
                    </label>
                    <input
                      type="text"
                      value={landingEventDate}
                      maxLength={LANDING_META_DATE_MAX}
                      onChange={(e) => setLandingEventDate(e.target.value)}
                      placeholder="Ex. Samedi 12 avril 2026"
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
                      Lieu (facultatif)
                    </label>
                    <input
                      type="text"
                      value={landingVenue}
                      maxLength={LANDING_META_VENUE_MAX}
                      onChange={(e) => setLandingVenue(e.target.value)}
                      placeholder="Ex. Villa des Pins, Lyon"
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
                      Horaires (facultatifs)
                    </label>
                    <input
                      type="text"
                      value={landingHours}
                      maxLength={LANDING_META_HOURS_MAX}
                      onChange={(e) => setLandingHours(e.target.value)}
                      placeholder="Ex. 19h – 23h"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.5rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        marginBottom: 0,
                      }}
                    />
                  </section>

                  {/* Message organisateur */}
                  <section style={card}>
                    <h2
                      style={{
                        margin: "0 0 0.45rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      Message de l&apos;organisateur
                    </h2>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.65rem" }}>
                      Présentation libre (plusieurs paragraphes). Visible avant,
                      pendant et après. Illustrations = photos de la galerie
                      événement (pas de nouvel upload).
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
                      Titre (facultatif)
                    </label>
                    <input
                      type="text"
                      value={landingIntroTitle}
                      maxLength={LANDING_MESSAGE_TITLE_MAX}
                      onChange={(e) => setLandingIntroTitle(e.target.value)}
                      placeholder="Ex. Un grand rendez-vous à ne pas manquer"
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
                      Texte
                    </label>
                    <textarea
                      value={landingIntroBody}
                      maxLength={LANDING_MESSAGE_BODY_MAX}
                      rows={5}
                      onChange={(e) => setLandingIntroBody(e.target.value)}
                      placeholder={
                        "Séparez les paragraphes par une ligne vide.\n\nEx. Venez partager un moment unique…"
                      }
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        resize: "vertical",
                        fontFamily: "inherit",
                        marginBottom: "0.65rem",
                      }}
                    />
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.45rem" }}>
                      Photos d&apos;illustration ({landingIntroPhotoIds.length}/
                      {LANDING_MESSAGE_PHOTOS_MAX}). Upload direct hors galerie,
                      ou sélection depuis la galerie (sans duplication).
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.45rem",
                        marginBottom: "0.55rem",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.4rem 0.7rem",
                          borderRadius: "8px",
                          border: "1px solid #2563eb",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontSize: "0.8rem",
                          fontWeight: 650,
                          cursor:
                            messagePhotoBusy ||
                            landingIntroPhotoIds.length >=
                              LANDING_MESSAGE_PHOTOS_MAX
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            messagePhotoBusy ||
                            landingIntroPhotoIds.length >=
                              LANDING_MESSAGE_PHOTOS_MAX
                              ? 0.55
                              : 1,
                        }}
                      >
                        + Ajouter une photo
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={
                            messagePhotoBusy ||
                            landingIntroPhotoIds.length >=
                              LANDING_MESSAGE_PHOTOS_MAX
                          }
                          style={{ display: "none" }}
                          onChange={(e) => {
                            // Snapshot avant reset : FileList est live (sinon length → 0).
                            const raw = e.target.files;
                            const files = raw?.length ? Array.from(raw) : [];
                            e.target.value = "";
                            if (files.length) void addMessagePhotos("intro", files);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setMessageGalleryPicker((prev) =>
                            prev === "intro" ? null : "intro",
                          )
                        }
                        style={{
                          padding: "0.4rem 0.7rem",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background:
                            messageGalleryPicker === "intro"
                              ? "#f1f5f9"
                              : "#fff",
                          color: "#334155",
                          fontSize: "0.8rem",
                          fontWeight: 650,
                          cursor: "pointer",
                        }}
                      >
                        Choisir dans la galerie
                      </button>
                    </div>
                    {landingIntroPhotoIds.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(72px, 1fr))",
                          gap: "0.45rem",
                          marginBottom:
                            messageGalleryPicker === "intro" ? "0.65rem" : 0,
                        }}
                      >
                        {landingIntroPhotoIds.map((id) => {
                          const ph = messagePhotoAssets.find((p) => p.id === id);
                          if (!ph) return null;
                          return (
                            <div
                              key={`intro-sel-${id}`}
                              style={{
                                position: "relative",
                                borderRadius: "10px",
                                overflow: "hidden",
                                border: "2px solid #2563eb",
                                aspectRatio: "1",
                                background: "#f8fafc",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                              <span
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  top: 4,
                                  left: 4,
                                  width: 20,
                                  height: 20,
                                  borderRadius: "999px",
                                  background: "#2563eb",
                                  color: "#fff",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                ✓
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMessagePhoto("intro", id)}
                                title="Retirer du message"
                                aria-label="Retirer du message"
                                style={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "999px",
                                  border: "none",
                                  background: "rgba(15,23,42,0.72)",
                                  color: "#fff",
                                  fontSize: "0.85rem",
                                  lineHeight: 1,
                                  cursor: "pointer",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ ...fieldHintStyle, margin: "0 0 0.35rem" }}>
                        Aucune photo associée pour l&apos;instant.
                      </p>
                    )}
                    {messageGalleryPicker === "intro" ? (
                      showcasePhotos.length === 0 ? (
                        <p style={{ ...fieldHintStyle, margin: 0 }}>
                          Galerie événement vide — utilisez « + Ajouter une
                          photo » ou alimentez la galerie plus bas.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(72px, 1fr))",
                            gap: "0.45rem",
                          }}
                        >
                          {showcasePhotos.map((ph) => {
                            const selected = landingIntroPhotoIds.includes(
                              ph.id,
                            );
                            return (
                              <button
                                key={`intro-gal-${ph.id}`}
                                type="button"
                                onClick={() =>
                                  toggleMessagePhoto("intro", ph.id)
                                }
                                aria-pressed={selected}
                                title={
                                  selected
                                    ? "Retirer du message"
                                    : "Illustrer le message"
                                }
                                style={{
                                  position: "relative",
                                  padding: 0,
                                  borderRadius: "10px",
                                  overflow: "hidden",
                                  border: selected
                                    ? "2px solid #2563eb"
                                    : "1px solid #e2e8f0",
                                  aspectRatio: "1",
                                  cursor: "pointer",
                                  background: "#f8fafc",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                {selected ? (
                                  <span
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      top: 4,
                                      left: 4,
                                      width: 20,
                                      height: 20,
                                      borderRadius: "999px",
                                      background: "#2563eb",
                                      color: "#fff",
                                      fontSize: "0.7rem",
                                      fontWeight: 800,
                                      display: "grid",
                                      placeItems: "center",
                                    }}
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )
                    ) : null}
                  </section>

                  {/* Remerciements */}
                  <section style={card}>
                    <h2
                      style={{
                        margin: "0 0 0.45rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      Message de remerciement
                    </h2>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.65rem" }}>
                      Facultatif. Rédigeable à tout moment ; affiché
                      automatiquement uniquement lorsque l&apos;événement est
                      terminé. Bloc masqué si vide.
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
                      Titre (facultatif)
                    </label>
                    <input
                      type="text"
                      value={landingThanksTitle}
                      maxLength={LANDING_MESSAGE_TITLE_MAX}
                      onChange={(e) => setLandingThanksTitle(e.target.value)}
                      placeholder="Ex. Un immense merci à tous les participants !"
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
                      Texte
                    </label>
                    <textarea
                      value={landingThanksBody}
                      maxLength={LANDING_MESSAGE_BODY_MAX}
                      rows={4}
                      onChange={(e) => setLandingThanksBody(e.target.value)}
                      placeholder="Merci à tous pour cette belle soirée…"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        resize: "vertical",
                        fontFamily: "inherit",
                        marginBottom: "0.65rem",
                      }}
                    />
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.45rem" }}>
                      Photos d&apos;illustration ({landingThanksPhotoIds.length}/
                      {LANDING_MESSAGE_PHOTOS_MAX}). Upload direct hors galerie,
                      ou sélection depuis la galerie.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.45rem",
                        marginBottom: "0.55rem",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.4rem 0.7rem",
                          borderRadius: "8px",
                          border: "1px solid #16a34a",
                          background: "#f0fdf4",
                          color: "#15803d",
                          fontSize: "0.8rem",
                          fontWeight: 650,
                          cursor:
                            messagePhotoBusy ||
                            landingThanksPhotoIds.length >=
                              LANDING_MESSAGE_PHOTOS_MAX
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            messagePhotoBusy ||
                            landingThanksPhotoIds.length >=
                              LANDING_MESSAGE_PHOTOS_MAX
                              ? 0.55
                              : 1,
                        }}
                      >
                        + Ajouter une photo
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={
                            messagePhotoBusy ||
                            landingThanksPhotoIds.length >=
                              LANDING_MESSAGE_PHOTOS_MAX
                          }
                          style={{ display: "none" }}
                          onChange={(e) => {
                            // Snapshot avant reset : FileList est live (sinon length → 0).
                            const raw = e.target.files;
                            const files = raw?.length ? Array.from(raw) : [];
                            e.target.value = "";
                            if (files.length)
                              void addMessagePhotos("thanks", files);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setMessageGalleryPicker((prev) =>
                            prev === "thanks" ? null : "thanks",
                          )
                        }
                        style={{
                          padding: "0.4rem 0.7rem",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          background:
                            messageGalleryPicker === "thanks"
                              ? "#f1f5f9"
                              : "#fff",
                          color: "#334155",
                          fontSize: "0.8rem",
                          fontWeight: 650,
                          cursor: "pointer",
                        }}
                      >
                        Choisir dans la galerie
                      </button>
                    </div>
                    {landingThanksPhotoIds.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(72px, 1fr))",
                          gap: "0.45rem",
                          marginBottom:
                            messageGalleryPicker === "thanks" ? "0.65rem" : 0,
                        }}
                      >
                        {landingThanksPhotoIds.map((id) => {
                          const ph = messagePhotoAssets.find((p) => p.id === id);
                          if (!ph) return null;
                          return (
                            <div
                              key={`thanks-sel-${id}`}
                              style={{
                                position: "relative",
                                borderRadius: "10px",
                                overflow: "hidden",
                                border: "2px solid #16a34a",
                                aspectRatio: "1",
                                background: "#f8fafc",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                              <span
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  top: 4,
                                  left: 4,
                                  width: 20,
                                  height: 20,
                                  borderRadius: "999px",
                                  background: "#16a34a",
                                  color: "#fff",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                ✓
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeMessagePhoto("thanks", id)
                                }
                                title="Retirer du message"
                                aria-label="Retirer du message"
                                style={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "999px",
                                  border: "none",
                                  background: "rgba(15,23,42,0.72)",
                                  color: "#fff",
                                  fontSize: "0.85rem",
                                  lineHeight: 1,
                                  cursor: "pointer",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ ...fieldHintStyle, margin: "0 0 0.35rem" }}>
                        Aucune photo associée pour l&apos;instant.
                      </p>
                    )}
                    {messageGalleryPicker === "thanks" ? (
                      showcasePhotos.length === 0 ? (
                        <p style={{ ...fieldHintStyle, margin: 0 }}>
                          Galerie événement vide — utilisez « + Ajouter une
                          photo » ou alimentez la galerie plus bas.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(72px, 1fr))",
                            gap: "0.45rem",
                          }}
                        >
                          {showcasePhotos.map((ph) => {
                            const selected = landingThanksPhotoIds.includes(
                              ph.id,
                            );
                            return (
                              <button
                                key={`thanks-gal-${ph.id}`}
                                type="button"
                                onClick={() =>
                                  toggleMessagePhoto("thanks", ph.id)
                                }
                                aria-pressed={selected}
                                title={
                                  selected
                                    ? "Retirer du message"
                                    : "Illustrer le message"
                                }
                                style={{
                                  position: "relative",
                                  padding: 0,
                                  borderRadius: "10px",
                                  overflow: "hidden",
                                  border: selected
                                    ? "2px solid #16a34a"
                                    : "1px solid #e2e8f0",
                                  aspectRatio: "1",
                                  cursor: "pointer",
                                  background: "#f8fafc",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                {selected ? (
                                  <span
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      top: 4,
                                      left: 4,
                                      width: 20,
                                      height: 20,
                                      borderRadius: "999px",
                                      background: "#16a34a",
                                      color: "#fff",
                                      fontSize: "0.7rem",
                                      fontWeight: 800,
                                      display: "grid",
                                      placeItems: "center",
                                    }}
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )
                    ) : null}
                  </section>

                  {/* Programme */}
                  <section style={card}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "0.45rem",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#64748b",
                        }}
                      >
                        Programme
                      </h2>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#0f766e",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "999px",
                          padding: "0.22rem 0.55rem",
                        }}
                      >
                        En ligne dès l’ajout
                      </span>
                    </div>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.65rem" }}>
                      Heure + titre. Affiché dans l’ordre chronologique sur /e.
                      {" "}
                      {programItems.length}/{LANDING_PROGRAM_MAX} étapes.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "5.5rem 1fr auto",
                        gap: "0.45rem",
                        marginBottom: "0.75rem",
                        alignItems: "end",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Heure
                        </label>
                        <input
                          type="text"
                          value={programDraftTime}
                          maxLength={LANDING_PROGRAM_TIME_MAX}
                          onChange={(e) => setProgramDraftTime(e.target.value)}
                          placeholder="19h30"
                          disabled={programBusy}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "0.45rem 0.5rem",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.84rem",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "#64748b",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Titre
                        </label>
                        <input
                          type="text"
                          value={programDraftTitle}
                          maxLength={LANDING_PROGRAM_TITLE_MAX}
                          onChange={(e) => setProgramDraftTitle(e.target.value)}
                          placeholder="Cocktail d’accueil"
                          disabled={programBusy}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "0.45rem 0.5rem",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.84rem",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        style={{
                          ...btnPrimary,
                          opacity:
                            programBusy ||
                            !programDraftTime.trim() ||
                            !programDraftTitle.trim()
                              ? 0.65
                              : 1,
                          cursor:
                            programBusy ||
                            !programDraftTime.trim() ||
                            !programDraftTitle.trim()
                              ? "not-allowed"
                              : "pointer",
                        }}
                        disabled={
                          programBusy ||
                          !programDraftTime.trim() ||
                          !programDraftTitle.trim()
                        }
                        onClick={() => void addProgramItem()}
                      >
                        Ajouter
                      </button>
                    </div>
                    {programItems.length === 0 ? (
                      <p style={{ ...fieldHintStyle, margin: 0 }}>
                        Aucune étape pour l’instant.
                      </p>
                    ) : (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: 0,
                          padding: 0,
                          display: "grid",
                          gap: "0.45rem",
                        }}
                      >
                        {programItems.map((step) => {
                          const editing = programEditId === step.id;
                          return (
                            <li
                              key={step.id}
                              style={{
                                padding: "0.55rem 0.65rem",
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                              }}
                            >
                              {editing ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gap: "0.4rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "5.5rem 1fr",
                                      gap: "0.4rem",
                                    }}
                                  >
                                    <input
                                      type="text"
                                      value={programEditTime}
                                      maxLength={LANDING_PROGRAM_TIME_MAX}
                                      onChange={(e) =>
                                        setProgramEditTime(e.target.value)
                                      }
                                      disabled={programBusy}
                                      style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        padding: "0.4rem 0.5rem",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "0.84rem",
                                      }}
                                    />
                                    <input
                                      type="text"
                                      value={programEditTitle}
                                      maxLength={LANDING_PROGRAM_TITLE_MAX}
                                      onChange={(e) =>
                                        setProgramEditTitle(e.target.value)
                                      }
                                      disabled={programBusy}
                                      style={{
                                        width: "100%",
                                        boxSizing: "border-box",
                                        padding: "0.4rem 0.5rem",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "0.84rem",
                                      }}
                                    />
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
                                      style={btnPrimary}
                                      disabled={programBusy}
                                      onClick={() => void saveProgramEdit()}
                                    >
                                      Enregistrer
                                    </button>
                                    <button
                                      type="button"
                                      style={btnSecondary}
                                      disabled={programBusy}
                                      onClick={() => {
                                        setProgramEditId(null);
                                        setProgramEditTime("");
                                        setProgramEditTitle("");
                                      }}
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "0.88rem",
                                      color: "#0f172a",
                                    }}
                                  >
                                    <strong style={{ fontWeight: 700 }}>
                                      {step.timeLabel}
                                    </strong>
                                    {" · "}
                                    {step.title}
                                  </p>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "0.35rem",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      style={btnSecondary}
                                      disabled={programBusy}
                                      onClick={() => {
                                        setProgramEditId(step.id);
                                        setProgramEditTime(step.timeLabel);
                                        setProgramEditTitle(step.title);
                                      }}
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        ...btnSecondary,
                                        color: "#b91c1c",
                                        borderColor: "#fecaca",
                                      }}
                                      disabled={programBusy}
                                      onClick={() =>
                                        void removeProgramItem(step.id)
                                      }
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {/* 4. Galerie événement */}
                  <section style={card}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        marginBottom: "0.45rem",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#64748b",
                        }}
                      >
                        Galerie événement
                      </h2>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#0f766e",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          borderRadius: "999px",
                          padding: "0.22rem 0.55rem",
                        }}
                      >
                        En ligne dès l’ajout
                      </span>
                    </div>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.65rem" }}>
                      Teaser / ambiance (avant et pendant le live). Légende
                      facultative par photo.{" "}
                      {showcasePhotos.length}/{LANDING_SHOWCASE_MAX} photos —
                      pas besoin d’Enregistrer pour les images.
                    </p>
                    <label
                      style={{
                        ...btnPrimary,
                        display: "inline-block",
                        cursor:
                          showcasePhotoBusy ||
                          showcasePhotos.length >= LANDING_SHOWCASE_MAX
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          showcasePhotoBusy ||
                          showcasePhotos.length >= LANDING_SHOWCASE_MAX
                            ? 0.65
                            : 1,
                        marginBottom: "0.65rem",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        style={{ display: "none" }}
                        disabled={
                          showcasePhotoBusy ||
                          showcasePhotos.length >= LANDING_SHOWCASE_MAX
                        }
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
                        gap: "0.65rem",
                      }}
                    >
                      {showcasePhotos.map((ph) => {
                        const draft = showcaseCaptionDrafts[ph.id] ?? "";
                        const saved =
                          typeof ph.caption === "string" && ph.caption.trim()
                            ? ph.caption.trim()
                            : "";
                        const dirty = draft.trim() !== saved;
                        const saving = showcaseCaptionBusyId === ph.id;
                        return (
                          <div
                            key={ph.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "96px 1fr",
                              gap: "0.65rem",
                              alignItems: "start",
                              padding: "0.5rem",
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                            }}
                          >
                            <div
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
                                aria-label="Retirer de la galerie événement"
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
                                  cursor: showcasePhotoBusy
                                    ? "not-allowed"
                                    : "pointer",
                                }}
                              >
                                ✕
                              </button>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <label
                                style={{
                                  display: "block",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                Légende (facultative)
                              </label>
                              <textarea
                                value={draft}
                                maxLength={LANDING_CAPTION_MAX}
                                rows={2}
                                disabled={saving || showcasePhotoBusy}
                                onChange={(e) =>
                                  setShowcaseCaptionDrafts((prev) => ({
                                    ...prev,
                                    [ph.id]: e.target.value,
                                  }))
                                }
                                placeholder="Ex. Vue de la salle"
                                style={{
                                  width: "100%",
                                  boxSizing: "border-box",
                                  resize: "vertical",
                                  minHeight: "2.6rem",
                                  padding: "0.4rem 0.5rem",
                                  borderRadius: "8px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.8rem",
                                  fontFamily: "inherit",
                                }}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "0.35rem",
                                  marginTop: "0.4rem",
                                }}
                              >
                                <button
                                  type="button"
                                  style={{
                                    ...btnSecondary,
                                    opacity:
                                      saving || showcasePhotoBusy || !dirty
                                        ? 0.65
                                        : 1,
                                    cursor:
                                      saving || showcasePhotoBusy || !dirty
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                  disabled={
                                    saving || showcasePhotoBusy || !dirty
                                  }
                                  onClick={() =>
                                    void saveShowcaseCaption(ph.id)
                                  }
                                >
                                  {saving ? "…" : "Enregistrer la légende"}
                                </button>
                                {saved || draft.trim() ? (
                                  <button
                                    type="button"
                                    style={btnSecondary}
                                    disabled={saving || showcasePhotoBusy}
                                    onClick={() =>
                                      void saveShowcaseCaption(ph.id, "")
                                    }
                                  >
                                    Effacer
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {showcasePhotos.length === 0 ? (
                      <p style={{ ...fieldHintStyle, margin: "0.55rem 0 0" }}>
                        Aucune photo pour l’instant.
                      </p>
                    ) : null}
                  </section>

                  {/* 5. Fil de l’événement (messages · Moments · résultats) */}
                  {eventId ? (
                    <LandingFeedAdminPanel
                      eventId={eventId}
                      photos={landingLivePhotos}
                      photosMax={LANDING_LIVE_PHOTOS_MAX}
                      photoBusy={livePhotoBusy}
                      onAddPhotos={(files) => void addLiveMomentPhotos(files)}
                      onRemovePhoto={(id) => void removeLiveMomentPhoto(id)}
                      onPhotoCaptionSaved={(photoId, caption) => {
                        setLandingLivePhotos((prev) =>
                          prev.map((p) =>
                            p.id === photoId ? { ...p, caption } : p,
                          ),
                        );
                      }}
                      closedPolls={closedLandingPolls}
                      onToast={(msg) => {
                        setToast(msg);
                        window.setTimeout(() => setToast(null), 2400);
                      }}
                      onChanged={() => bumpLandingPreview()}
                      cardStyle={card}
                      btnPrimaryStyle={btnPrimary}
                      btnSecondaryStyle={btnSecondary}
                      hintStyle={fieldHintStyle}
                    />
                  ) : null}

                  {/* 5. Visibilité après l’événement (H5) */}
                  <section style={card}>
                    <h2
                      style={{
                        margin: "0 0 0.45rem",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                      }}
                    >
                      Après l’événement
                    </h2>
                    <p style={{ ...fieldHintStyle, margin: "0 0 0.75rem" }}>
                      Choisissez ce qui reste visible dans le fil public une
                      fois l’événement terminé. Par défaut, tout reste affiché
                      (comportement actuel).
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.55rem",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.84rem",
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={landingKeepPhotosAfter}
                          onChange={(e) =>
                            setLandingKeepPhotosAfter(e.target.checked)
                          }
                        />
                        Conserver les photos (Moments)
                      </label>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.84rem",
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={landingKeepResultsAfter}
                          onChange={(e) =>
                            setLandingKeepResultsAfter(e.target.checked)
                          }
                        />
                        Conserver les résultats des questions
                      </label>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.84rem",
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={landingKeepMessagesAfter}
                          onChange={(e) =>
                            setLandingKeepMessagesAfter(e.target.checked)
                          }
                        />
                        Conserver les messages organisateur
                      </label>
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
                      Textes et liens complémentaires pour la salle{" "}
                      <code style={{ fontSize: "0.72rem" }}>/join</code> et la
                      landing — pas la date, le lieu ni le programme (ceux-ci
                      sont dans ✨ L&apos;événement). Les boutons n’apparaissent
                      que si libellé et URL sont tous les deux renseignés.
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
                  ? landingPreviewActive
                    ? "Dernière version enregistrée + galeries déjà en ligne. « Enregistrer » met à jour titre, accroche, couverture et publication."
                    : "Activez puis enregistrez la landing pour prévisualiser /e ici (sans afficher la salle live)."
                  : "Brouillon en direct dans cette page (mise en page, couleurs, médias). Les participants voient uniquement la version enregistrée. Cet aperçu ne simule pas les étapes de vote."}
              </p>
              {isLandingPage && !landingPreviewActive ? (
                <div
                  style={{
                    borderRadius: "18px",
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    minHeight: "min(420px, 52vh)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    padding: "1.5rem",
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {landingEnabled
                      ? "Enregistrez pour activer l’aperçu"
                      : "Landing désactivée"}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", maxWidth: "22rem" }}>
                    {landingEnabled
                      ? "La case est cochée : cliquez « Enregistrer la landing » pour publier /e et charger l’aperçu."
                      : "Cochez « Activer la landing événement », puis enregistrez. Tant qu’elle est off, /e redirige vers la salle."}
                  </p>
                  {landingPath && !landingEnabled ? (
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
                      Ouvrir /e (redirige vers la salle)
                    </button>
                  ) : null}
                </div>
              ) : (isLandingPage ? landingPath : joinPath) ? (
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
                      key={`${mode}-${slug ?? "preview"}-${previewNonce}`}
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
                  ) : (
                    <p style={{ ...fieldHintStyle, marginTop: "0.45rem" }}>
                      Galerie événement et fil (photos) sont déjà publics ; titre,
                      accroche, couverture et activation suivent « Enregistrer ».
                    </p>
                  )}
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
                  ? isLandingPage
                    ? "Publication / personnalisation non enregistrées (galeries déjà en ligne)"
                    : "Modifications non enregistrées"
                  : isLandingPage
                    ? "Publication & personnalisation à jour · galeries immédiates"
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
        .editor-universe-link--regie {
          background: rgba(15, 23, 42, 0.06) !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
          color: #0f172a !important;
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
          .editor-universe-link--regie:hover {
            background: rgba(15, 23, 42, 0.1) !important;
            border-color: rgba(15, 23, 42, 0.18) !important;
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
