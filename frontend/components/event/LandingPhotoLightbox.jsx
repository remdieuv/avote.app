"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Lightbox photos Landing — proportions natives, prev/next, Échap / croix / backdrop / swipe.
 *
 * @param {{
 *   open: boolean;
 *   photos: Array<{ id?: string; url: string; caption?: string | null }>;
 *   index: number;
 *   onClose: () => void;
 *   onIndexChange: (next: number) => void;
 * }} props
 */
export function LandingPhotoLightbox({
  open,
  photos,
  index,
  onClose,
  onIndexChange,
}) {
  const touchStartX = useRef(/** @type {number | null} */ (null));
  const list = Array.isArray(photos) ? photos.filter((p) => p?.url) : [];
  const safeIndex =
    list.length === 0
      ? 0
      : Math.min(Math.max(0, Number(index) || 0), list.length - 1);
  const current = list[safeIndex] || null;
  const hasNav = list.length > 1;
  const currentCaption =
    typeof current?.caption === "string" && current.caption.trim()
      ? current.caption.trim()
      : "";

  const goPrev = useCallback(() => {
    if (list.length < 2) return;
    onIndexChange((safeIndex - 1 + list.length) % list.length);
  }, [list.length, onIndexChange, safeIndex]);

  const goNext = useCallback(() => {
    if (list.length < 2) return;
    onIndexChange((safeIndex + 1) % list.length);
  }, [list.length, onIndexChange, safeIndex]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open || !current) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Photo agrandie"
        data-testid="landing-photo-lightbox"
        className="ev-landing-lightbox"
        onClick={onClose}
      >
        <button
          type="button"
          className="ev-landing-lightbox-close"
          aria-label="Fermer"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>

        {hasNav ? (
          <button
            type="button"
            className="ev-landing-lightbox-nav ev-landing-lightbox-nav--prev"
            aria-label="Photo précédente"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ‹
          </button>
        ) : null}

        <div
          className="ev-landing-lightbox-stage"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            const t = e.changedTouches?.[0];
            touchStartX.current = t ? t.clientX : null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            if (start == null || !hasNav) return;
            const t = e.changedTouches?.[0];
            if (!t) return;
            const dx = t.clientX - start;
            if (Math.abs(dx) < 48) return;
            if (dx > 0) goPrev();
            else goNext();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={currentCaption || ""}
            className="ev-landing-lightbox-img"
            draggable={false}
          />
          {currentCaption || hasNav ? (
            <div className="ev-landing-lightbox-meta">
              {currentCaption ? (
                <p className="ev-landing-lightbox-caption">{currentCaption}</p>
              ) : null}
              {hasNav ? (
                <p className="ev-landing-lightbox-counter" aria-live="polite">
                  {safeIndex + 1} / {list.length}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasNav ? (
          <button
            type="button"
            className="ev-landing-lightbox-nav ev-landing-lightbox-nav--next"
            aria-label="Photo suivante"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
        ) : null}
      </div>
      <style>{`
        .ev-landing-lightbox {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(0.75rem, env(safe-area-inset-top))
            max(0.75rem, env(safe-area-inset-right))
            max(0.75rem, env(safe-area-inset-bottom))
            max(0.75rem, env(safe-area-inset-left));
          box-sizing: border-box;
          background: rgba(2, 6, 23, 0.88);
          backdrop-filter: blur(6px);
        }
        .ev-landing-lightbox-stage {
          position: relative;
          max-width: min(96vw, 1100px);
          max-height: min(88svh, 900px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
        }
        .ev-landing-lightbox-img {
          display: block;
          max-width: min(96vw, 1100px);
          max-height: min(78svh, 800px);
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
          user-select: none;
          -webkit-user-drag: none;
          touch-action: pan-y;
        }
        .ev-landing-lightbox-meta {
          max-width: min(90vw, 36rem);
          text-align: center;
          padding: 0 0.5rem;
          box-sizing: border-box;
        }
        .ev-landing-lightbox-close {
          position: absolute;
          top: max(0.65rem, env(safe-area-inset-top));
          right: max(0.65rem, env(safe-area-inset-right));
          z-index: 2;
          width: 2.5rem;
          height: 2.5rem;
          border: none;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ev-landing-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          width: 2.75rem;
          height: 2.75rem;
          border: none;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          font-size: 1.75rem;
          line-height: 1;
          cursor: pointer;
        }
        .ev-landing-lightbox-nav--prev { left: max(0.5rem, env(safe-area-inset-left)); }
        .ev-landing-lightbox-nav--next { right: max(0.5rem, env(safe-area-inset-right)); }
        .ev-landing-lightbox-caption {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
          line-height: 1.4;
          color: rgba(248, 250, 252, 0.92);
        }
        .ev-landing-lightbox-counter {
          margin: 0.35rem 0 0;
          font-size: 0.82rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.82);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        @media (max-width: 767px) {
          .ev-landing-lightbox-nav {
            width: 2.35rem;
            height: 2.35rem;
            font-size: 1.45rem;
          }
        }
      `}</style>
    </>
  );
}

/**
 * Extrait les photos navigables (url résolue) d’une liste hétérogène.
 * @param {Array<{ id?: string; url?: string; caption?: string | null } | null | undefined>} photos
 * @returns {Array<{ id: string; url: string; caption: string | null }>}
 */
export function normalizeLightboxPhotos(photos) {
  if (!Array.isArray(photos)) return [];
  const out = [];
  for (const p of photos) {
    if (!p || typeof p !== "object") continue;
    const url = typeof p.url === "string" ? p.url.trim() : "";
    if (!url) continue;
    const caption =
      typeof p.caption === "string" && p.caption.trim()
        ? p.caption.trim()
        : null;
    out.push({
      id: String(p.id || url),
      url,
      caption,
    });
  }
  return out;
}
