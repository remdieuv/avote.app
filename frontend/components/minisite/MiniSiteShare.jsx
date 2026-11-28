"use client";

import { useCallback, useState } from "react";

/**
 * Partage / copie de lien (mini-site, résultat, actualité).
 * @param {{
 *   url: string;
 *   title?: string;
 *   accent?: string;
 *   variant?: "default" | "onDark";
 *   size?: "default" | "compact";
 *   label?: string;
 * }} props
 */
export function MiniSiteShare({
  url,
  title,
  accent = "#0f766e",
  variant = "default",
  size = "default",
  label = "Partager",
}) {
  const [copied, setCopied] = useState(false);
  const onDark = variant === "onDark";
  const compact = size === "compact";

  const onShare = useCallback(async () => {
    const shareTitle = title || "Événement AVOTE";
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: shareTitle, url });
        return;
      }
    } catch {
      /* fallback copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [title, url]);

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      aria-label={copied ? "Lien copié" : label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? "0.3rem" : "0.45rem",
        padding: compact ? "0.4rem 0.75rem" : "0.65rem 1.05rem",
        borderRadius: "999px",
        border: onDark
          ? "1px solid rgba(255,255,255,0.55)"
          : `1px solid color-mix(in srgb, ${accent} 28%, #e2e8f0)`,
        background: onDark ? "rgba(255,255,255,0.14)" : "#fff",
        color: onDark ? "#fff" : accent,
        fontWeight: 650,
        fontSize: compact ? "0.82rem" : "0.9rem",
        cursor: "pointer",
        textShadow: onDark ? "0 1px 2px rgba(15,23,42,0.35)" : undefined,
      }}
    >
      {copied ? "Lien copié" : label}
    </button>
  );
}
