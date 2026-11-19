"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/**
 * @param {{
 *  logoHref: string;
 *  logoLabel: string;
 *  logoSrc?: string | null;
 *  logoWordmarkSrc?: string | null;
 *  navItems: Array<{ href: string; label: string; match?: "exact" | "prefix" | "none" }>;
 *  mobileQuickItem?: { href: string; label: string; match?: "exact" | "prefix" | "none" } | null;
 *  mobileMoreItems?: Array<{ href: string; label: string; match?: "exact" | "prefix" | "none" }> | null;
 *  rightSlot: import("react").ReactNode;
 *  contentMaxWidth?: number | string;
 * }} props
 */
export function AppHeaderShell({
  logoHref,
  logoLabel,
  logoSrc = null,
  logoWordmarkSrc = null,
  navItems,
  mobileQuickItem = null,
  mobileMoreItems = null,
  rightSlot,
  contentMaxWidth = 1440,
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const mobileMoreRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    function onDocPointerDown(ev) {
      const host = mobileMoreRef.current;
      if (!host) return;
      if (host.contains(ev.target)) return;
      setMobileMoreOpen(false);
    }
    function onKeyDown(ev) {
      if (ev.key === "Escape") setMobileMoreOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMoreOpen]);

  const isActive = (item) => {
    if (!pathname) return false;
    const mode = item.match || "prefix";
    if (mode === "none") return false;
    if (mode === "exact") return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const hasMobileMore =
    Array.isArray(mobileMoreItems) && mobileMoreItems.length > 0;

  return (
    <header className={`app-header ${scrolled ? "scrolled" : ""}`}>
      <div className="app-header-inner">
        <div className="app-header-left">
          <Link href={logoHref} className="app-header-logo">
            {logoWordmarkSrc ? (
              <img src={logoWordmarkSrc} alt={logoLabel} className="app-header-logo-wordmark" />
            ) : null}
            <span className={`app-header-logo-compact ${logoWordmarkSrc ? "with-wordmark" : ""}`}>
              {logoSrc ? (
                <img src={logoSrc} alt="" className="app-header-logo-image" aria-hidden />
              ) : null}
              <span>{logoLabel}</span>
            </span>
          </Link>
        </div>

        <nav className="app-header-nav" aria-label="Navigation principale">
          {navItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`app-header-link ${isActive(item) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-header-right">
          {rightSlot}
          {mobileQuickItem ? (
            <Link
              href={mobileQuickItem.href}
              className={`app-header-mobile-quick ${
                isActive(mobileQuickItem) ? "active" : ""
              }`}
            >
              {mobileQuickItem.label}
            </Link>
          ) : null}
          {hasMobileMore ? (
            <div className="app-header-mobile-more-wrap" ref={mobileMoreRef}>
              <button
                type="button"
                className="app-header-mobile-more-trigger"
                aria-label="Menu"
                aria-expanded={mobileMoreOpen}
                aria-haspopup="menu"
                aria-controls={menuId}
                onClick={() => setMobileMoreOpen((v) => !v)}
              >
                <span className="app-header-mobile-more-icon" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              {mobileMoreOpen ? (
                <div
                  id={menuId}
                  className="app-header-mobile-more-menu"
                  role="menu"
                  aria-label="Navigation"
                >
                  {mobileMoreItems.map((item) => (
                    <Link
                      key={`${item.href}-${item.label}-mobile-more`}
                      href={item.href}
                      className={`app-header-mobile-more-link ${isActive(item) ? "active" : ""}`}
                      role="menuitem"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 1500;
          border-bottom: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          transition: box-shadow .2s ease, background-color .2s ease;
        }
        .app-header.scrolled {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.96);
        }
        .app-header-inner {
          width: 100%;
          max-width: ${typeof contentMaxWidth === "number" ? `${contentMaxWidth}px` : contentMaxWidth};
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
          min-height: 56px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 0.75rem;
        }
        .app-header-left,
        .app-header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .app-header-left {
          justify-self: start;
          min-width: 0;
        }
        .app-header-right {
          justify-self: end;
          min-width: 0;
          justify-content: flex-end;
        }
        .app-header-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .app-header-logo-image {
          width: 1.65rem;
          height: 1.65rem;
          border-radius: 8px;
          object-fit: cover;
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.2);
          flex-shrink: 0;
        }
        .app-header-logo-wordmark {
          height: 2rem;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .app-header-logo-compact {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .app-header-logo-compact.with-wordmark {
          display: none;
        }
        .app-header-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          justify-self: center;
          min-width: 0;
        }
        .app-header-link,
        .app-header-mobile-quick {
          text-decoration: none;
          color: #475569;
          font-size: 0.84rem;
          font-weight: 700;
          border-radius: 9px;
          padding: 0.38rem 0.62rem;
          transition: background-color .16s ease, color .16s ease;
          white-space: nowrap;
        }
        .app-header-link:hover,
        .app-header-mobile-quick:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .app-header-link.active,
        .app-header-mobile-quick.active {
          background: #e0e7ff;
          color: #3730a3;
        }
        .app-header-mobile-quick {
          display: none;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          color: #1d4ed8;
        }
        .app-header-mobile-more-wrap {
          position: relative;
          display: none;
        }
        .app-header-mobile-more-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          color: #1d4ed8;
          border-radius: 9px;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
        }
        .app-header-mobile-more-trigger:hover {
          background: #eff6ff;
        }
        .app-header-mobile-more-trigger:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 1px;
        }
        .app-header-mobile-more-icon {
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          width: 1rem;
        }
        .app-header-mobile-more-icon span {
          display: block;
          height: 2px;
          width: 100%;
          border-radius: 999px;
          background: currentColor;
        }
        .app-header-mobile-more-menu {
          position: absolute;
          top: calc(100% + 0.35rem);
          right: 0;
          min-width: 10.5rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.14);
          padding: 0.3rem;
          z-index: 30;
        }
        .app-header-mobile-more-link {
          display: block;
          text-decoration: none;
          color: #334155;
          font-size: 0.84rem;
          font-weight: 600;
          border-radius: 8px;
          padding: 0.45rem 0.55rem;
        }
        .app-header-mobile-more-link:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .app-header-mobile-more-link.active {
          background: #e0e7ff;
          color: #3730a3;
          font-weight: 700;
        }
        @media (max-width: 860px) {
          .app-header-inner {
            padding: 0 16px;
            grid-template-columns: auto 1fr auto;
          }
          .app-header-nav {
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 1px;
          }
          .app-header-nav::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 640px) {
          .app-header-inner {
            padding: 0 12px;
            gap: 0.4rem;
            min-height: 52px;
          }
          .app-header-right {
            gap: 0.35rem;
          }
          .app-header-nav { display: none; }
          .app-header-mobile-quick { display: inline-flex; }
          .app-header-mobile-more-wrap { display: inline-flex; }
          .app-header-logo { font-size: 0.96rem; }
          .app-header-logo-wordmark { height: 1.7rem; }
          .app-header-logo-compact.with-wordmark { display: none; }
        }
      `}</style>
    </header>
  );
}
