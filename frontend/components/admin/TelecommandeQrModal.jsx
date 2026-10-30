"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  TELECOMMANDE_QR_COPY,
  buildTelecommandeAbsoluteUrl,
  buildTelecommandePath,
} from "@/lib/telecommandeQr";

/**
 * Modal QR d’accès à la télécommande orga (`/admin/event/[eventId]`).
 * Distinct du QR participant (join / vote).
 *
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   eventId: string | null | undefined;
 *   eventTitle?: string | null;
 * }} props
 */
export function TelecommandeQrModal({
  open,
  onClose,
  eventId,
  eventTitle = null,
}) {
  const [targetUrl, setTargetUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const path = buildTelecommandePath(eventId);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || !path) {
      setTargetUrl("");
      return;
    }
    setTargetUrl(
      buildTelecommandeAbsoluteUrl({
        origin: window.location.origin,
        eventId,
      }),
    );
  }, [open, path, eventId]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function copierLien() {
    const url =
      targetUrl ||
      buildTelecommandeAbsoluteUrl({
        origin:
          typeof window !== "undefined" ? window.location.origin : "",
        eventId,
      });
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* ignore */
    }
  }

  function ouvrirLien() {
    const url =
      targetUrl ||
      buildTelecommandeAbsoluteUrl({
        origin:
          typeof window !== "undefined" ? window.location.origin : "",
        eventId,
      });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={TELECOMMANDE_QR_COPY.title}
      data-testid="telecommande-qr-modal"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.48)",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "22rem",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.22)",
          padding: "1.15rem 1.2rem 1.25rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "0.65rem",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              {TELECOMMANDE_QR_COPY.title}
            </h2>
            {eventTitle ? (
              <p
                style={{
                  margin: "0.2rem 0 0",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#64748b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={eventTitle}
              >
                {eventTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={TELECOMMANDE_QR_COPY.closeLabel}
            style={{
              flexShrink: 0,
              width: "2rem",
              height: "2rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#475569",
              fontSize: "1.05rem",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: "0.7rem",
          }}
        >
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.18rem 0.46rem",
              borderRadius: "999px",
              background: "rgba(15, 118, 110, 0.1)",
              color: "#0f766e",
              border: "1px solid rgba(45, 212, 191, 0.35)",
            }}
          >
            {TELECOMMANDE_QR_COPY.badge}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            ≠ QR {TELECOMMANDE_QR_COPY.audienceBadgeContrast.toLowerCase()}
          </span>
        </div>

        <p
          style={{
            margin: "0 0 0.85rem",
            fontSize: "0.78rem",
            color: "#475569",
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          {TELECOMMANDE_QR_COPY.hint}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "1rem 0.75rem",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            marginBottom: "0.65rem",
          }}
          data-testid="telecommande-qr-code"
        >
          {targetUrl ? (
            <QRCodeSVG
              value={targetUrl}
              size={196}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          ) : (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
              {path ? "Chargement…" : "Événement indisponible."}
            </p>
          )}
        </div>

        {path ? (
          <p
            title={targetUrl || path}
            data-testid="telecommande-qr-path"
            style={{
              margin: "0 0 0.75rem",
              textAlign: "center",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#64748b",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {path}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={ouvrirLien}
            disabled={!path}
            style={{
              padding: "0.5rem 0.95rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              borderRadius: "10px",
              border: "1px solid rgba(15, 118, 110, 0.35)",
              background: "rgba(20, 184, 166, 0.1)",
              color: "#0f766e",
              cursor: path ? "pointer" : "not-allowed",
              opacity: path ? 1 : 0.55,
              flex: 1,
              minWidth: "5.5rem",
            }}
          >
            {TELECOMMANDE_QR_COPY.openLabel}
          </button>
          <button
            type="button"
            onClick={() => void copierLien()}
            disabled={!path}
            data-testid="telecommande-qr-copy"
            style={{
              padding: "0.5rem 0.95rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              cursor: path ? "pointer" : "not-allowed",
              opacity: path ? 1 : 0.55,
              flex: 1,
              minWidth: "5.5rem",
            }}
          >
            {copied
              ? TELECOMMANDE_QR_COPY.copiedLabel
              : TELECOMMANDE_QR_COPY.copyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Icône téléphone / télécommande (stroke discret).
 * @param {{ size?: number; stroke?: string }} props
 */
export function TelecommandeIcon({ size = 18, stroke = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="7"
        y="2.75"
        width="10"
        height="18.5"
        rx="2.25"
        stroke={stroke}
        strokeWidth="1.75"
      />
      <circle cx="12" cy="17.25" r="1" fill={stroke} />
      <path
        d="M9.5 5.75h5"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
