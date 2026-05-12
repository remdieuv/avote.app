"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

function mapApiError(body, status) {
  const code = String(body?.error || "").trim();
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  return message || code || `Erreur ${status}`;
}

/** Photo galerie landing (carrousel ou grille) avec suppression optionnelle. */
function LandingGalleryPhoto({
  url,
  photoId,
  variant,
  canManage,
  isDeleting,
  isExiting,
  onDelete = () => {},
}) {
  const wrapClass =
    variant === "slide" ? "ev-gallery-slide" : "ev-gallery-card";
  const exitingClass = isExiting
    ? variant === "slide"
      ? " ev-gallery-slide--exiting"
      : " ev-gallery-card--exiting"
    : "";
  return (
    <div className={`${wrapClass}${exitingClass}`}>
      <div className="ev-gallery-frame">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" loading="lazy" />
        </figure>
        {canManage ? (
          <button
            type="button"
            className="ev-gallery-delete-btn"
            disabled={isDeleting}
            aria-label="Supprimer cette photo"
            onClick={() => onDelete(photoId)}
          >
            {isDeleting ? "…" : "✕"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Landing événement publique — vitrine + galerie + lien vers la salle live.
 */
export default function EventLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** @type {null | Record<string, unknown>} */
  const [payload, setPayload] = useState(null);
  const [toastNotif, setToastNotif] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [exitingPhotoId, setExitingPhotoId] = useState(null);
  const fileInputRef = useRef(null);
  const liveGalleryScrollRef = useRef(null);
  const liveCarouselRafRef = useRef(0);
  const [liveCarouselIndex, setLiveCarouselIndex] = useState(0);
  const showcaseScrollRef = useRef(null);
  const showcaseCarouselRafRef = useRef(0);
  const [showcaseCarouselIndex, setShowcaseCarouselIndex] = useState(0);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let redirected = false;
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}/landing`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          if (!cancelled) {
            setError("Événement introuvable.");
            setPayload(null);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(`Erreur ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.enabled === false) {
          redirected = true;
          router.replace(`/join/${encodeURIComponent(slug)}`);
          return;
        }
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError("Impossible de charger la page.");
      } finally {
        if (!cancelled && !redirected) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  const triggerLandingPhotoPicker = useCallback(() => {
    setUploadError(null);
    fileInputRef.current?.click();
  }, []);

  const onLandingPhotoSelected = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !payload) return;
      const can =
        payload.canUploadLandingPhoto === true &&
        typeof payload.landingPhotoUploadEventId === "string" &&
        String(payload.landingPhotoUploadEventId).trim() !== "";
      const eventId = can
        ? String(payload.landingPhotoUploadEventId).trim()
        : "";
      if (!can || !eventId) return;
      setUploadBusy(true);
      setUploadError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/photos`,
          { method: "POST", body: fd },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(mapApiError(body, res.status));
        const id = typeof body?.id === "string" ? body.id : null;
        const url = typeof body?.url === "string" ? body.url : null;
        const createdAt =
          typeof body?.createdAt === "string" ? body.createdAt : null;
        if (id && url && createdAt) {
          setPayload((prev) => {
            if (!prev || typeof prev !== "object") return prev;
            const prevPhotos = Array.isArray(prev.photos) ? prev.photos : [];
            return {
              ...prev,
              photos: [{ id, url, createdAt }, ...prevPhotos],
            };
          });
        }
        setToastNotif("✅ Photo publiée sur la landing");
        window.setTimeout(() => setToastNotif(null), 2600);
      } catch (err) {
        setUploadError(err?.message || "Upload impossible.");
      } finally {
        setUploadBusy(false);
      }
    },
    [payload],
  );

  const handleDeleteLandingPhoto = useCallback(
    async (photoId) => {
      if (!payload || typeof payload !== "object") return;
      const can =
        payload.canUploadLandingPhoto === true &&
        typeof payload.landingPhotoUploadEventId === "string" &&
        String(payload.landingPhotoUploadEventId).trim() !== "";
      const eventId = can
        ? String(payload.landingPhotoUploadEventId).trim()
        : "";
      const pid = String(photoId || "").trim();
      if (!can || !eventId || !pid) return;
      if (!window.confirm("Supprimer cette photo ?")) return;
      setDeletingPhotoId(pid);
      setUploadError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/${encodeURIComponent(eventId)}/landing/photos/${encodeURIComponent(pid)}`,
          { method: "DELETE" },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(mapApiError(body, res.status));
        setDeletingPhotoId(null);
        const reduceMotion =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
          setPayload((prev) => {
            if (!prev || typeof prev !== "object") return prev;
            const ph = Array.isArray(prev.photos) ? prev.photos : [];
            return { ...prev, photos: ph.filter((x) => String(x?.id) !== pid) };
          });
          setToastNotif("🗑 Photo supprimée");
          window.setTimeout(() => setToastNotif(null), 2600);
          return;
        }
        setExitingPhotoId(pid);
        window.setTimeout(() => {
          setPayload((prev) => {
            if (!prev || typeof prev !== "object") return prev;
            const ph = Array.isArray(prev.photos) ? prev.photos : [];
            return { ...prev, photos: ph.filter((x) => String(x?.id) !== pid) };
          });
          setExitingPhotoId(null);
          setToastNotif("🗑 Photo supprimée");
          window.setTimeout(() => setToastNotif(null), 2600);
        }, 320);
      } catch (err) {
        setUploadError(err?.message || "Suppression impossible.");
        setDeletingPhotoId(null);
      }
    },
    [payload],
  );

  const livePhotoIdsKey = useMemo(() => {
    if (!payload || typeof payload !== "object") return "";
    const ph = Array.isArray(payload.photos) ? payload.photos : [];
    return ph.map((p) => String(p?.id ?? "")).join(",");
  }, [payload]);

  const livePhotoCount = useMemo(() => {
    if (!payload || typeof payload !== "object") return 0;
    const ph = Array.isArray(payload.photos) ? payload.photos : [];
    return ph.length;
  }, [payload]);

  const showcasePhotoIdsKey = useMemo(() => {
    if (!payload || typeof payload !== "object") return "";
    const ph = Array.isArray(payload.showcasePhotos)
      ? payload.showcasePhotos
      : [];
    return ph.map((p) => String(p?.id ?? "")).join(",");
  }, [payload]);

  const showcasePhotoCount = useMemo(() => {
    if (!payload || typeof payload !== "object") return 0;
    const ph = Array.isArray(payload.showcasePhotos)
      ? payload.showcasePhotos
      : [];
    return ph.length;
  }, [payload]);

  const updateLiveCarouselIndexFromScroll = useCallback(() => {
    const root = liveGalleryScrollRef.current;
    if (!root) return;
    const slides = root.querySelectorAll(".ev-gallery-slide");
    if (!slides.length) return;
    const rootRect = root.getBoundingClientRect();
    const cs = getComputedStyle(root);
    const pad =
      parseFloat(cs.scrollPaddingLeft) || parseFloat(cs.paddingLeft) || 16;
    const anchor = rootRect.left + pad;
    let bestI = 0;
    let bestD = Infinity;
    slides.forEach((slide, i) => {
      const r = slide.getBoundingClientRect();
      const d = Math.abs(r.left - anchor);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    setLiveCarouselIndex((prev) => (prev !== bestI ? bestI : prev));
  }, []);

  const updateShowcaseCarouselIndexFromScroll = useCallback(() => {
    const root = showcaseScrollRef.current;
    if (!root) return;
    const slides = root.querySelectorAll(".ev-gallery-slide");
    if (!slides.length) return;
    const rootRect = root.getBoundingClientRect();
    const cs = getComputedStyle(root);
    const pad =
      parseFloat(cs.scrollPaddingLeft) || parseFloat(cs.paddingLeft) || 16;
    const anchor = rootRect.left + pad;
    let bestI = 0;
    let bestD = Infinity;
    slides.forEach((slide, i) => {
      const r = slide.getBoundingClientRect();
      const d = Math.abs(r.left - anchor);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    setShowcaseCarouselIndex((prev) => (prev !== bestI ? bestI : prev));
  }, []);

  useEffect(() => {
    setLiveCarouselIndex(0);
    const root = liveGalleryScrollRef.current;
    if (root) root.scrollLeft = 0;
  }, [livePhotoIdsKey]);

  useEffect(() => {
    setShowcaseCarouselIndex(0);
    const root = showcaseScrollRef.current;
    if (root) root.scrollLeft = 0;
  }, [showcasePhotoIdsKey]);

  useEffect(() => {
    const root = liveGalleryScrollRef.current;
    if (!root || livePhotoCount < 2) return undefined;
    const tick = () => {
      if (liveCarouselRafRef.current) return;
      liveCarouselRafRef.current = requestAnimationFrame(() => {
        liveCarouselRafRef.current = 0;
        updateLiveCarouselIndexFromScroll();
      });
    };
    const onScrollEnd = () => updateLiveCarouselIndexFromScroll();
    root.addEventListener("scroll", tick, { passive: true });
    root.addEventListener("scrollend", onScrollEnd);
    tick();
    return () => {
      root.removeEventListener("scroll", tick);
      root.removeEventListener("scrollend", onScrollEnd);
    };
  }, [livePhotoCount, livePhotoIdsKey, updateLiveCarouselIndexFromScroll]);

  useEffect(() => {
    const root = showcaseScrollRef.current;
    if (!root || showcasePhotoCount < 2) return undefined;
    const tick = () => {
      if (showcaseCarouselRafRef.current) return;
      showcaseCarouselRafRef.current = requestAnimationFrame(() => {
        showcaseCarouselRafRef.current = 0;
        updateShowcaseCarouselIndexFromScroll();
      });
    };
    const onScrollEnd = () => updateShowcaseCarouselIndexFromScroll();
    root.addEventListener("scroll", tick, { passive: true });
    root.addEventListener("scrollend", onScrollEnd);
    tick();
    return () => {
      root.removeEventListener("scroll", tick);
      root.removeEventListener("scrollend", onScrollEnd);
    };
  }, [
    showcasePhotoCount,
    showcasePhotoIdsKey,
    updateShowcaseCarouselIndexFromScroll,
  ]);

  const accent = useMemo(() => {
    const c = payload?.primaryColor;
    return typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c.trim())
      ? c.trim()
      : "#2563eb";
  }, [payload]);

  if (!slug) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Lien invalide.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        className="ev-landing-shell"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#64748b",
          background: "#0f172a",
        }}
      >
        <p className="ev-landing-fade-in" style={{ color: "#94a3b8" }}>
          Chargement…
        </p>
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main
        className="ev-landing-shell"
        style={{
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
        }}
      >
        <p style={{ color: "#b91c1c" }}>{error || "Indisponible."}</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/" style={{ color: "#2563eb", fontWeight: 600 }}>
            Accueil
          </Link>
        </p>
      </main>
    );
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Événement";
  const description =
    typeof payload.description === "string" && payload.description.trim()
      ? payload.description.trim()
      : null;
  const cover =
    typeof payload.coverUrl === "string"
      ? resolveApiAssetUrlNullable(payload.coverUrl.trim())
      : null;
  const logo =
    typeof payload.logoUrl === "string"
      ? resolveApiAssetUrlNullable(payload.logoUrl.trim())
      : null;
  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  const showcasePhotosList = Array.isArray(payload.showcasePhotos)
    ? payload.showcasePhotos
    : [];
  const joinHref =
    typeof payload.joinPath === "string" && payload.joinPath.startsWith("/")
      ? payload.joinPath
      : `/join/${encodeURIComponent(slug)}`;

  const infoTitle =
    typeof payload.infoSectionTitle === "string"
      ? payload.infoSectionTitle.trim()
      : "";
  const infoText =
    typeof payload.infoSectionText === "string"
      ? payload.infoSectionText.trim()
      : "";
  const ipL =
    typeof payload.infoPrimaryCtaLabel === "string"
      ? payload.infoPrimaryCtaLabel.trim()
      : "";
  const ipU =
    typeof payload.infoPrimaryCtaUrl === "string"
      ? payload.infoPrimaryCtaUrl.trim()
      : "";
  const isL =
    typeof payload.infoSecondaryCtaLabel === "string"
      ? payload.infoSecondaryCtaLabel.trim()
      : "";
  const isU =
    typeof payload.infoSecondaryCtaUrl === "string"
      ? payload.infoSecondaryCtaUrl.trim()
      : "";
  const showInfo =
    infoTitle ||
    infoText ||
    (ipL && ipU) ||
    (isL && isU);

  const canUploadLanding =
    payload.canUploadLandingPhoto === true &&
    typeof payload.landingPhotoUploadEventId === "string" &&
    String(payload.landingPhotoUploadEventId).trim() !== "";
  const showShowcaseBlock = showcasePhotosList.length > 0;
  const showLiveBlock = photos.length > 0 || canUploadLanding;

  const footerCta = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.95rem 1.75rem",
    borderRadius: "999px",
    border: "none",
    fontWeight: 700,
    fontSize: "1rem",
    letterSpacing: "0.02em",
    cursor: "pointer",
    textDecoration: "none",
    color: "#0c1222",
    background: "#f8fafc",
    boxShadow: `0 6px 28px color-mix(in srgb, ${accent} 28%, rgba(15,23,42,0.12))`,
    boxSizing: "border-box",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  return (
    <main
      className="ev-landing-shell"
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily:
          'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        color: "#0f172a",
      }}
    >
      <style>{`
        .ev-landing-shell { -webkit-font-smoothing: antialiased; }
        @media (prefers-reduced-motion: no-preference) {
          .ev-landing-fade-in {
            animation: evLandingFade 0.5s ease-out both;
          }
          .ev-landing-gallery-section {
            animation: evLandingFadeUp 0.65s ease-out 0.08s both;
          }
          .ev-landing-hero-content {
            animation: evLandingFadeUp 0.75s ease-out both;
          }
        }
        @keyframes evLandingFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes evLandingFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ev-landing-hero {
          position: relative;
          min-height: min(72svh, 600px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .ev-landing-hero {
            min-height: min(90svh, 860px);
          }
        }
        .ev-landing-hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.02);
        }
        .ev-landing-hero-bg--placeholder {
          background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--ev-accent, #2563eb) 28%, #0f172a) 0%,
            #0f172a 55%,
            #020617 100%
          );
        }
        .ev-landing-hero-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            rgba(2, 6, 23, 0.5) 0%,
            rgba(15, 23, 42, 0.25) 38%,
            rgba(2, 6, 23, 0.88) 100%
          );
        }
        .ev-landing-hero-overlay::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 85% 55% at 50% 100%,
            color-mix(in srgb, var(--ev-accent, #2563eb) 22%, transparent) 0%,
            transparent 62%
          );
          opacity: 0.85;
        }
        .ev-landing-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
          padding: clamp(1.5rem, 5vw, 2.75rem) clamp(1.25rem, 4vw, 2rem)
            clamp(2rem, 6vw, 3.5rem);
          text-align: center;
          box-sizing: border-box;
        }
        @media (max-width: 767px) {
          .ev-landing-hero-content {
            padding-top: clamp(1rem, 3vw, 1.35rem);
            padding-bottom: clamp(1.15rem, 3.5vw, 1.75rem);
          }
          .ev-landing-hero-cta {
            margin-top: clamp(1rem, 3vw, 1.5rem);
          }
          .ev-landing-hero-title {
            font-size: clamp(1.65rem, 6.2vw, 2.35rem);
          }
          .ev-landing-hero-desc {
            margin-top: 0.75rem;
          }
        }
        .ev-landing-hero-kicker {
          margin: 0 0 0.75rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(248, 250, 252, 0.72);
        }
        .ev-landing-hero-title {
          margin: 0;
          font-size: clamp(2rem, 7vw, 3.15rem);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -0.035em;
          color: #f8fafc;
          text-wrap: balance;
          text-shadow: 0 4px 48px rgba(0, 0, 0, 0.45);
        }
        .ev-landing-hero-desc {
          margin: 1.15rem auto 0;
          max-width: 38rem;
          font-size: clamp(1.02rem, 3.2vw, 1.2rem);
          line-height: 1.55;
          font-weight: 450;
          color: rgba(226, 232, 240, 0.94);
          text-wrap: pretty;
        }
        .ev-landing-hero-logo {
          width: clamp(56px, 14vw, 72px);
          height: clamp(56px, 14vw, 72px);
          object-fit: contain;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 10px;
          margin: 0 auto 1.35rem;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.18),
            0 18px 48px rgba(0, 0, 0, 0.35);
        }
        .ev-landing-hero-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: clamp(1.75rem, 4vw, 2.35rem);
          padding: 1.05rem 2.1rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: clamp(1.02rem, 3vw, 1.125rem);
          letter-spacing: 0.03em;
          text-decoration: none;
          color: #0c1222;
          background: #f8fafc;
          border: none;
          cursor: pointer;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.28),
            0 0 0 1px rgba(255, 255, 255, 0.35) inset;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .ev-landing-hero-cta:hover {
          transform: translateY(-2px);
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.32),
            0 0 0 1px rgba(255, 255, 255, 0.45) inset;
        }
        .ev-landing-hero-cta:active {
          transform: translateY(0);
        }

        .ev-landing-gallery-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-padding-inline-start: 1rem;
          scroll-padding-inline-end: 0.75rem;
          padding: 0.25rem 1rem 0.65rem;
          margin-inline: -1rem;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .ev-landing-gallery-scroll::-webkit-scrollbar {
          display: none;
        }
        .ev-gallery-slide {
          flex: 0 0 calc(100vw - 4.75rem);
          max-width: min(360px, calc(100vw - 4.75rem));
          scroll-snap-align: start;
          scroll-snap-stop: normal;
          transition:
            opacity 0.32s ease,
            transform 0.32s ease;
        }
        .ev-gallery-slide--exiting {
          opacity: 0;
          transform: scale(0.96);
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-gallery-slide--exiting {
            transition: none;
          }
        }
        .ev-gallery-frame {
          position: relative;
          height: 100%;
          border-radius: 22px;
          overflow: hidden;
          box-shadow:
            0 22px 50px rgba(15, 23, 42, 0.14),
            0 0 0 1px rgba(15, 23, 42, 0.06);
        }
        .ev-gallery-slide .ev-gallery-frame {
          height: min(58vw, 320px);
        }
        .ev-gallery-slide figure {
          margin: 0;
          height: 100%;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
          transition: transform 0.35s ease;
        }
        .ev-gallery-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ev-gallery-slide .ev-gallery-frame:hover img {
            transform: scale(1.04);
          }
        }
        .ev-landing-carousel-progress {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          margin-top: 0.45rem;
          padding: 0 1rem 0.35rem;
        }
        @media (min-width: 768px) {
          .ev-landing-carousel-progress {
            display: none;
          }
        }
        .ev-landing-carousel-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.32rem;
        }
        .ev-landing-carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #cbd5e1;
          flex-shrink: 0;
          transition: transform 0.2s ease, background 0.2s ease, width 0.2s ease;
        }
        .ev-landing-carousel-dot--active {
          width: 7px;
          height: 7px;
          background: var(--ev-accent, #2563eb);
          transform: scale(1.15);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--ev-accent, #2563eb) 22%, transparent);
        }
        .ev-landing-carousel-fraction {
          font-size: 0.72rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
          color: #94a3b8;
          min-width: 2.5rem;
          text-align: center;
        }
        @media (min-width: 768px) {
          .ev-landing-gallery-scroll {
            display: none;
          }
          .ev-landing-gallery-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
          }
        }
        @media (min-width: 1024px) {
          .ev-landing-gallery-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.35rem;
          }
        }
        @media (min-width: 1280px) {
          .ev-landing-gallery-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .ev-landing-gallery-grid {
          display: none;
        }
        .ev-gallery-card {
          transition:
            opacity 0.32s ease,
            transform 0.32s ease;
        }
        .ev-gallery-card--exiting {
          opacity: 0;
          transform: scale(0.97);
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-gallery-card--exiting {
            transition: none;
          }
        }
        .ev-gallery-card .ev-gallery-frame {
          border-radius: 20px;
          aspect-ratio: 4 / 3;
          box-shadow:
            0 18px 44px rgba(15, 23, 42, 0.1),
            0 0 0 1px rgba(15, 23, 42, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .ev-gallery-card figure {
          margin: 0;
          height: 100%;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
        }
        .ev-gallery-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.45s ease;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ev-gallery-card:hover .ev-gallery-frame {
            transform: translateY(-4px);
            box-shadow:
              0 28px 56px rgba(15, 23, 42, 0.14),
              0 0 0 1px rgba(15, 23, 42, 0.06);
          }
          .ev-gallery-card:hover img {
            transform: scale(1.03);
          }
        }

        .ev-gallery-delete-btn {
          position: absolute;
          top: 0.55rem;
          right: 0.55rem;
          z-index: 4;
          width: 2.1rem;
          height: 2.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: none;
          border-radius: 50%;
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          color: #f8fafc;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            0 2px 12px rgba(0, 0, 0, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.12) inset;
          transition:
            opacity 0.22s ease,
            transform 0.2s ease,
            background 0.2s ease;
          opacity: 0.92;
        }
        .ev-gallery-delete-btn:hover:not(:disabled) {
          background: rgba(185, 28, 28, 0.88);
          transform: scale(1.05);
        }
        .ev-gallery-delete-btn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .ev-gallery-delete-btn:disabled {
          opacity: 0.55;
          cursor: wait;
        }
        @media (min-width: 768px) {
          .ev-gallery-delete-btn {
            opacity: 0;
          }
          .ev-gallery-frame:hover .ev-gallery-delete-btn {
            opacity: 1;
          }
        }
        .ev-gallery-delete-btn:focus-visible {
          opacity: 1;
          outline: 2px solid var(--ev-accent, #2563eb);
          outline-offset: 2px;
        }
        .ev-landing-upload-fab {
          position: fixed;
          right: max(1rem, env(safe-area-inset-right));
          bottom: max(1rem, env(safe-area-inset-bottom));
          z-index: 60;
          width: 3.5rem;
          height: 3.5rem;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: none;
          font-size: 1.35rem;
          line-height: 1;
          cursor: pointer;
          color: #fff;
          box-shadow:
            0 12px 36px rgba(15, 23, 42, 0.28),
            0 0 0 1px rgba(255, 255, 255, 0.12) inset;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ev-landing-upload-fab:not(:disabled):hover {
          transform: scale(1.06);
          box-shadow:
            0 16px 44px rgba(15, 23, 42, 0.32),
            0 0 0 1px rgba(255, 255, 255, 0.18) inset;
        }
        .ev-landing-upload-fab:not(:disabled):active {
          transform: scale(0.96);
        }
        .ev-landing-upload-fab:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        @media (min-width: 768px) {
          .ev-landing-upload-fab {
            display: none;
          }
        }
        .ev-landing-upload-desktop {
          display: none;
        }
        @media (min-width: 768px) {
          .ev-landing-upload-desktop {
            display: inline-flex;
          }
        }
        .ev-landing-upload-desktop {
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 1.1rem;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.01em;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .ev-landing-upload-desktop:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
        }
        .ev-landing-upload-desktop:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .ev-landing-footer-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 36px color-mix(in srgb, var(--ev-accent, #2563eb) 32%, rgba(15,23,42,0.15));
        }
        .ev-landing-footer-cta:active {
          transform: translateY(0);
        }
      `}</style>

      <section
        className="ev-landing-hero"
        style={{ "--ev-accent": accent }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ev-landing-hero-bg" src={cover} alt="" />
        ) : (
          <div
            className="ev-landing-hero-bg ev-landing-hero-bg--placeholder"
            aria-hidden
          />
        )}
        <div className="ev-landing-hero-overlay" aria-hidden />
        <div className="ev-landing-hero-content ev-landing-fade-in">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ev-landing-hero-logo" src={logo} alt="" />
          ) : null}
          <p className="ev-landing-hero-kicker">Événement en direct</p>
          <h1 className="ev-landing-hero-title">{title}</h1>
          {description ? (
            <p className="ev-landing-hero-desc">{description}</p>
          ) : null}
        </div>
      </section>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "clamp(1.5rem, 4vw, 2.5rem) clamp(1.15rem, 4vw, 2rem) 2.75rem",
          boxSizing: "border-box",
        }}
      >
        {showShowcaseBlock ? (
          <section
            className="ev-landing-gallery-section"
            style={{
              marginBottom: "clamp(1.75rem, 5vw, 2.5rem)",
              "--ev-accent": accent,
            }}
          >
            <div style={{ marginBottom: "1.15rem" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Avant le live
              </p>
              <h2
                style={{
                  margin: "0.35rem 0 0",
                  fontSize: "clamp(1.45rem, 4vw, 1.85rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#0f172a",
                  lineHeight: 1.15,
                }}
              >
                ✨ L&apos;événement
              </h2>
              <p
                style={{
                  margin: "0.4rem 0 0",
                  fontSize: "0.95rem",
                  color: "#64748b",
                  maxWidth: "32rem",
                  lineHeight: 1.45,
                }}
              >
                Découvrez l&apos;ambiance et les temps forts de l&apos;événement.
              </p>
            </div>
            <div className="ev-landing-carousel-mobile-wrap">
              <div
                ref={showcaseScrollRef}
                className="ev-landing-gallery-scroll"
              >
                {showcasePhotosList.map((p) => {
                  const u =
                    typeof p?.url === "string"
                      ? resolveApiAssetUrlNullable(p.url.trim())
                      : null;
                  if (!u) return null;
                  const pid = String(p.id ?? "");
                  return (
                    <LandingGalleryPhoto
                      key={`s-${p.id}`}
                      url={u}
                      photoId={pid}
                      variant="slide"
                      canManage={false}
                      isDeleting={false}
                      isExiting={false}
                    />
                  );
                })}
              </div>
              {showcasePhotosList.length > 1 ? (
                <div className="ev-landing-carousel-progress">
                  <div className="ev-landing-carousel-dots" aria-hidden="true">
                    {showcasePhotosList.map((p, i) => (
                      <span
                        key={p.id}
                        className={
                          i === showcaseCarouselIndex
                            ? "ev-landing-carousel-dot ev-landing-carousel-dot--active"
                            : "ev-landing-carousel-dot"
                        }
                      />
                    ))}
                  </div>
                  <span className="ev-landing-carousel-fraction">
                    {showcaseCarouselIndex + 1} / {showcasePhotosList.length}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="ev-landing-gallery-grid">
              {showcasePhotosList.map((p) => {
                const u =
                  typeof p?.url === "string"
                    ? resolveApiAssetUrlNullable(p.url.trim())
                    : null;
                if (!u) return null;
                const pid = String(p.id ?? "");
                return (
                  <LandingGalleryPhoto
                    key={`sg-${p.id}`}
                    url={u}
                    photoId={pid}
                    variant="card"
                    canManage={false}
                    isDeleting={false}
                    isExiting={false}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        <section
          style={{
            textAlign: "center",
            marginBottom: "clamp(1.75rem, 5vw, 2.75rem)",
            padding: "0.25rem 0",
          }}
        >
          <Link href={joinHref} className="ev-landing-hero-cta">
            Participer au live
          </Link>
          <p
            style={{
              margin: "0.85rem 0 0",
              fontSize: "0.9rem",
              color: "#64748b",
              maxWidth: "26rem",
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.45,
            }}
          >
            Accès à la salle interactive : votes et animations en direct.
          </p>
        </section>

        {showLiveBlock ? (
          <section
            className="ev-landing-gallery-section"
            style={{
              marginBottom: "clamp(2rem, 5vw, 3rem)",
              "--ev-accent": accent,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "1rem",
                marginBottom: "1.15rem",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  En direct
                </p>
                <h2
                  style={{
                    margin: "0.35rem 0 0",
                    fontSize: "clamp(1.45rem, 4vw, 1.85rem)",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "#0f172a",
                    lineHeight: 1.15,
                  }}
                >
                  🔴 Moments live
                </h2>
                <p
                  style={{
                    margin: "0.4rem 0 0",
                    fontSize: "0.95rem",
                    color: "#64748b",
                    maxWidth: "28rem",
                    lineHeight: 1.45,
                  }}
                >
                  Les photos ajoutées pendant le live apparaissent ici.
                </p>
              </div>
              {canUploadLanding ? (
                <button
                  type="button"
                  className="ev-landing-upload-desktop"
                  disabled={uploadBusy}
                  onClick={triggerLandingPhotoPicker}
                  style={{ color: accent }}
                >
                  📸 Ajouter un moment live
                </button>
              ) : null}
            </div>
            {canUploadLanding ? (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={onLandingPhotoSelected}
              />
            ) : null}
            {uploadError ? (
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.88rem",
                  color: "#b91c1c",
                }}
              >
                {uploadError}
              </p>
            ) : null}
            {photos.length === 0 && canUploadLanding ? (
              <p
                style={{
                  margin: "0 0 1rem",
                  fontSize: "0.95rem",
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Aucun moment pour l’instant — ajoutez une photo pour donner vie
                à cette page.
              </p>
            ) : null}
            <div className="ev-landing-carousel-mobile-wrap">
              <div
                ref={liveGalleryScrollRef}
                className="ev-landing-gallery-scroll"
              >
                {photos.map((p) => {
                  const u =
                    typeof p?.url === "string"
                      ? resolveApiAssetUrlNullable(p.url.trim())
                      : null;
                  if (!u) return null;
                  const pid = String(p.id ?? "");
                  return (
                    <LandingGalleryPhoto
                      key={p.id}
                      url={u}
                      photoId={pid}
                      variant="slide"
                      canManage={canUploadLanding}
                      isDeleting={deletingPhotoId === pid}
                      isExiting={exitingPhotoId === pid}
                      onDelete={handleDeleteLandingPhoto}
                    />
                  );
                })}
              </div>
              {photos.length > 1 ? (
                <div className="ev-landing-carousel-progress">
                  <div className="ev-landing-carousel-dots" aria-hidden="true">
                    {photos.map((p, i) => (
                      <span
                        key={p.id}
                        className={
                          i === liveCarouselIndex
                            ? "ev-landing-carousel-dot ev-landing-carousel-dot--active"
                            : "ev-landing-carousel-dot"
                        }
                      />
                    ))}
                  </div>
                  <span className="ev-landing-carousel-fraction">
                    {liveCarouselIndex + 1} / {photos.length}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="ev-landing-gallery-grid">
              {photos.map((p) => {
                const u =
                  typeof p?.url === "string"
                    ? resolveApiAssetUrlNullable(p.url.trim())
                    : null;
                if (!u) return null;
                const pid = String(p.id ?? "");
                return (
                  <LandingGalleryPhoto
                    key={`g-${p.id}`}
                    url={u}
                    photoId={pid}
                    variant="card"
                    canManage={canUploadLanding}
                    isDeleting={deletingPhotoId === pid}
                    isExiting={exitingPhotoId === pid}
                    onDelete={handleDeleteLandingPhoto}
                  />
                );
              })}
            </div>
          </section>
        ) : null}

        {showInfo ? (
          <section
            style={{
              marginBottom: "clamp(1.75rem, 4vw, 2.5rem)",
              padding: "clamp(1.25rem, 3vw, 1.65rem)",
              borderRadius: "22px",
              border: "1px solid rgba(15,23,42,0.06)",
              background: "#fff",
              boxShadow: "0 16px 48px rgba(15,23,42,0.06)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Infos pratiques
            </h2>
            {infoTitle ? (
              <p
                style={{
                  margin: "0.65rem 0 0",
                  fontWeight: 700,
                  fontSize: "clamp(1.05rem, 2.8vw, 1.2rem)",
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {infoTitle}
              </p>
            ) : null}
            {infoText ? (
              <p
                style={{
                  margin: infoTitle ? "0.5rem 0 0" : "0.65rem 0 0",
                  fontSize: "0.98rem",
                  lineHeight: 1.6,
                  color: "#475569",
                  whiteSpace: "pre-wrap",
                }}
              >
                {infoText}
              </p>
            ) : null}
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.65rem",
              }}
            >
              {ipL && ipU ? (
                <a
                  href={ipU}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...footerCta,
                    background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 82%, #000))`,
                    color: "#fff",
                  }}
                >
                  ↗ {ipL}
                </a>
              ) : null}
              {isL && isU ? (
                <a
                  href={isU}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.65rem 1.1rem",
                    borderRadius: "999px",
                    border: `1px solid color-mix(in srgb, ${accent} 35%, #e2e8f0)`,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: accent,
                    textDecoration: "none",
                    background: "#f8fafc",
                    transition: "transform 0.2s ease, background 0.2s ease",
                  }}
                >
                  ↗ {isL}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          style={{
            textAlign: "center",
            padding: "clamp(1.5rem, 4vw, 2.5rem) 0 2.5rem",
          }}
        >
          <Link
            href={joinHref}
            className="ev-landing-footer-cta"
            style={{
              ...footerCta,
              background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 82%, #000))`,
              color: "#fff",
            }}
          >
            Rejoindre la salle live
          </Link>
          <p
            style={{
              margin: "1.1rem auto 0",
              fontSize: "0.92rem",
              color: "#64748b",
              maxWidth: "22rem",
              lineHeight: 1.5,
            }}
          >
            Accès interactif : votes et animations en direct.
          </p>
        </section>
      </div>

      {canUploadLanding ? (
        <button
          type="button"
          className="ev-landing-upload-fab"
          disabled={uploadBusy}
          onClick={triggerLandingPhotoPicker}
          aria-label="Ajouter un moment live"
          style={{
            background: `linear-gradient(160deg, ${accent}, color-mix(in srgb, ${accent} 72%, #0f172a))`,
          }}
        >
          📸
        </button>
      ) : null}

      {toastNotif ? (
        <div
          role="status"
          className="ev-landing-fade-in"
          style={{
            position: "fixed",
            left: "50%",
            top: "max(0.85rem, env(safe-area-inset-top))",
            transform: "translateX(-50%)",
            zIndex: 70,
            padding: "0.65rem 1.15rem",
            borderRadius: "999px",
            background: "rgba(15,23,42,0.94)",
            color: "#f8fafc",
            fontSize: "0.9rem",
            fontWeight: 600,
            boxShadow: "0 16px 40px rgba(15,23,42,0.35)",
            maxWidth: "min(92vw, 22rem)",
            textAlign: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          {toastNotif}
        </div>
      ) : null}
    </main>
  );
}
