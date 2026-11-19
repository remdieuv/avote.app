"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * Bouton droit unique des headers pages classiques (public).
 * Déconnecté → « Se connecter » /login ; connecté → « Mon compte » /admin/account.
 * @param {{ className?: string; variant?: "primary" | "subtle" }} [props]
 */
export function HeaderAuthCta({ className = "header-auth-cta", variant = "primary" }) {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
          cache: "no-store",
        });
        if (!cancelled) setIsAuthed(res.ok);
      } catch {
        if (!cancelled) setIsAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;
  const href = isAuthed ? "/admin/account" : loginHref;
  const label = isAuthed ? "Mon compte" : "Se connecter";

  return (
    <Link href={href} className={`${className} ${className}--${variant}`}>
      {label}
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
    </Link>
  );
}
