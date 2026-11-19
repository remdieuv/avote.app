"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { computeActivationBalance } from "@/lib/activationBalance";
import { useAuthMe } from "@/components/navigation/useAuthMe";

/**
 * CTA droit unifié : Se connecter | Mon compte (infos + déconnexion).
 * @param {{
 *  className?: string;
 *  variant?: "primary" | "subtle";
 *  isAuthed?: boolean;
 *  user?: { email?: string; eventCredits?: number | null; activationsAvailable?: Record<string, number> | null } | null;
 *  logout?: () => Promise<void>;
 * }} [props]
 */
export function HeaderAuthCta({
  className = "header-auth-cta",
  variant = "primary",
  isAuthed: isAuthedProp,
  user: userProp,
  logout: logoutProp,
}) {
  const pathname = usePathname();
  const auth = useAuthMe();
  const isAuthed = typeof isAuthedProp === "boolean" ? isAuthedProp : auth.isAuthed;
  const user = userProp !== undefined ? userProp : auth.user;
  const logout = logoutProp || auth.logout;

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  if (!isAuthed) {
    return (
      <Link href={loginHref} className={`${className} ${className}--${variant}`}>
        Se connecter
        <AuthCtaStyles className={className} />
      </Link>
    );
  }

  const { totalAvailable } = computeActivationBalance(
    user?.eventCredits,
    user?.activationsAvailable,
  );

  return (
    <div ref={wrapRef} className={`${className}-wrap`} style={{ position: "relative" }}>
      <button
        type="button"
        className={`${className} ${className}--${variant} ${className}--account`}
        aria-label="Mon compte"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        Mon compte
      </button>
      {open ? (
        <div className={`${className}-menu`} role="menu" aria-label="Mon compte">
          <Link
            role="menuitem"
            href="/admin/account"
            className={`${className}-menu-info`}
            onClick={() => setOpen(false)}
            title={user?.email || ""}
          >
            <span className={`${className}-menu-email`}>{user?.email || "Mon compte"}</span>
            <span className={`${className}-menu-credits`}>
              {`Activations dispo. ${totalAvailable === null ? "—" : totalAvailable}`}
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${className}-menu-logout`}
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            Se déconnecter
          </button>
        </div>
      ) : null}
      <AuthCtaStyles className={className} />
    </div>
  );
}

function AuthCtaStyles({ className }) {
  return (
    <style>{`
      .${className} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        text-decoration: none;
        font-size: 0.84rem;
        font-weight: 800;
        padding: 0.45rem 0.75rem;
        white-space: nowrap;
        cursor: pointer;
        font-family: inherit;
        line-height: 1.2;
      }
      .${className}--primary {
        border: 1px solid #1d4ed8;
        background: linear-gradient(180deg, #2563eb, #1d4ed8);
        color: #fff;
        box-shadow: 0 8px 22px rgba(37, 99, 235, 0.22);
      }
      .${className}--primary:hover {
        filter: brightness(1.03);
      }
      .${className}--subtle {
        border-radius: 9px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #0f172a;
        font-weight: 750;
        font-size: 0.82rem;
        padding: 0.42rem 0.7rem;
        box-shadow: none;
      }
      .${className}--subtle:hover {
        border-color: #94a3b8;
        background: #f8fafc;
      }
      .${className}:focus-visible {
        outline: 2px solid #93c5fd;
        outline-offset: 1px;
      }
      .${className}-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        min-width: 12rem;
        padding: 0.35rem 0;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
        z-index: 2000;
      }
      .${className}-menu-info {
        display: block;
        padding: 0.4rem 0.85rem 0.5rem;
        text-decoration: none;
        color: inherit;
      }
      .${className}-menu-info:hover {
        background: #f8fafc;
      }
      .${className}-menu-email {
        display: block;
        font-size: 0.72rem;
        color: #64748b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 14rem;
      }
      .${className}-menu-credits {
        display: inline-block;
        margin-top: 0.35rem;
        padding: 0.28rem 0.45rem;
        border-radius: 8px;
        border: 1px solid #dbeafe;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 0.72rem;
        font-weight: 800;
      }
      .${className}-menu-logout {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.45rem 0.85rem;
        font-size: 0.8125rem;
        border: none;
        background: none;
        color: #b91c1c;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      .${className}-menu-logout:hover {
        background: #fff1f2;
      }
      @media (max-width: 640px) {
        .${className} {
          font-size: 0.8rem;
          padding: 0.4rem 0.6rem;
        }
        .${className}--subtle {
          font-size: 0.78rem;
          padding: 0.38rem 0.55rem;
        }
      }
    `}</style>
  );
}
