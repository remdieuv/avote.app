"use client";

import { useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  PARTICIPANT_PACKS,
  parseParticipantPackSize,
} from "@/lib/participantPacks";

/**
 * @param {{
 *   label: string;
 *   loadingLabel?: string;
 *   pack: 50 | 100 | 250 | 500 | 1000;
 *   style?: React.CSSProperties;
 *   className?: string;
 * }} props
 */
export function CheckoutEventButton({
  label,
  loadingLabel = "Redirection...",
  pack: packProp,
  style,
  className,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pack = parseParticipantPackSize(packProp);

  async function handleClick() {
    if (loading) return;
    if (!pack) {
      setError("Pack invalide.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/billing/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pack }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 503 && body?.error === "STRIPE_PRICE_MISSING") {
        throw new Error("PRICE_MISSING");
      }
      if (!res.ok || typeof body?.url !== "string" || !body.url) {
        throw new Error("CHECKOUT_FAILED");
      }
      window.location.href = body.url;
    } catch (e) {
      setError(
        e?.message === "PRICE_MISSING"
          ? "Paiement temporairement indisponible (configuration Stripe)."
          : "Impossible de lancer le paiement. Réessayez.",
      );
      setLoading(false);
    }
  }

  const packMeta = pack ? PARTICIPANT_PACKS[pack] : null;

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !pack}
        style={{
          ...style,
          cursor: loading || !pack ? "not-allowed" : "pointer",
          opacity: loading ? 0.92 : 1,
          width: style?.width || "100%",
        }}
        className={className}
        aria-label={
          packMeta ? `${label} — ${packMeta.label}` : label
        }
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
