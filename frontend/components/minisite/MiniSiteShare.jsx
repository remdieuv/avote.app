"use client";

import { useCallback, useState } from "react";

/**
 * Partage / copie du lien mini-site.
 * @param {{
 *   url: string;
 *   title?: string;
 *   accent?: string;
 * }} props
 */
export function MiniSiteShare({ url, title, accent = "#0f766e" }) {
  const [copied, setCopied] = useState(false);

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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.65rem 1.05rem",
        borderRadius: "999px",
        border: `1px solid color-mix(in srgb, ${accent} 28%, #e2e8f0)`,
        background: "#fff",
        color: accent,
        fontWeight: 650,
        fontSize: "0.9rem",
        cursor: "pointer",
      }}
    >
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
