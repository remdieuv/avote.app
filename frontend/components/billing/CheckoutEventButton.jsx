"use client";

import { useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * @param {{
 *   label: string;
 *   loadingLabel?: string;
 *   style?: React.CSSProperties;
 *   className?: string;
 * }} props
 */
export function CheckoutEventButton({
  label,
  loadingLabel = "Redirection...",
  style,
  className,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/billing/create-checkout-session`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body?.url !== "string" || !body.url) {
        throw new Error("CHECKOUT_FAILED");
      }
      window.location.href = body.url;
    } catch {
      setError("Impossible de lancer le paiement. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          ...style,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.92 : 1,
          width: style?.width || "100%",
        }}
        className={className}
      >
        {loading ? loadingLabel : label}
      </button>
      {error ? (
        <p
          role="alert"
          style={{
            margin: "0.42rem 0 0",
            fontSize: "0.76rem",
            fontWeight: 700,
            color: "#b91c1c",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
