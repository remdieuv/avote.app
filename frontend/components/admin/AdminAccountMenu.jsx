"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminUser } from "./AdminUserContext";

function UserIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function AdminAccountMenu() {
  const { user, logout } = useAdminUser();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onLogout = useCallback(async () => {
    setOpen(false);
    await logout();
  }, [logout]);

  const label = "Mon compte";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        className="admin-account-trigger"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.35rem 0.55rem",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          color: "#334155",
          fontSize: "0.8125rem",
          fontWeight: 600,
          cursor: "pointer",
          lineHeight: 1.2,
        }}
      >
        <UserIcon />
        <span className="admin-account-label">{label}</span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            minWidth: "11.5rem",
            padding: "0.35rem 0",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.1)",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              padding: "0.35rem 0.85rem 0.5rem",
              fontSize: "0.7rem",
              color: "#64748b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "16rem",
            }}
            title={user?.email ?? ""}
          >
            {user?.email}
          </div>
          <Link
            role="menuitem"
            href="/admin/account"
            onClick={() => setOpen(false)}
            className="admin-account-item"
            style={{
              display: "block",
              padding: "0.45rem 0.85rem",
              fontSize: "0.8125rem",
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Mon compte
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className="admin-account-item danger"
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.45rem 0.85rem",
              fontSize: "0.8125rem",
              border: "none",
              background: "none",
              color: "#b91c1c",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </div>
      ) : null}

      <style>{`
        .admin-account-trigger:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .admin-account-trigger:focus-visible,
        .admin-account-item:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 1px;
        }
        .admin-account-item:hover {
          background: #f8fafc;
        }
        .admin-account-item.danger:hover {
          background: #fff1f2;
        }
        @media (max-width: 520px) {
          .admin-account-label {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
        }
      `}</style>
    </div>
  );
}
