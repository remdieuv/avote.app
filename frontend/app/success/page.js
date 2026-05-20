"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

export default function SuccessPage() {
  const [eventCredits, setEventCredits] = useState(/** @type {number | null} */ (null));
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const raw =
          typeof body?.eventCredits === "number"
            ? body.eventCredits
            : typeof body?.user?.eventCredits === "number"
              ? body.user.eventCredits
              : null;
        if (!cancelled) setEventCredits(raw == null ? null : Math.max(0, Number(raw)));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingCredits(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={shell}>
      <LandingHeader />
      <main style={mainWrap}>
        <section style={card}>
          <p style={eyebrow}>Paiement confirmé ✅</p>
          <h1 style={title}>Votre achat a bien été validé.</h1>
          <p style={subtitle}>1 activation a été ajoutée à votre compte.</p>
          <p style={activationLine}>
            {loadingCredits
              ? "Mise à jour du solde en cours..."
              : typeof eventCredits === "number"
                ? `Activations disponibles maintenant : ${eventCredits}`
                : "Votre solde sera actualisé automatiquement."}
          </p>
          <div style={ctaWrap}>
            <Link href="/admin/events" style={btnPrimary}>
              Retour à mes événements
            </Link>
            <Link href="/admin/account" style={btnSecondary}>
              Mon compte
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

const shell = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  color: "#0f172a",
  fontFamily: "system-ui, sans-serif",
};

const mainWrap = {
  maxWidth: "920px",
  margin: "0 auto",
  padding: "clamp(2rem, 5vw, 4rem) 1rem 3rem",
  display: "flex",
  justifyContent: "center",
};

const card = {
  width: "100%",
  maxWidth: "640px",
  border: "1px solid #ddd6fe",
  borderRadius: "16px",
  background:
    "radial-gradient(700px 220px at 20% -10%, rgba(124,58,237,0.11), transparent 62%), #fff",
  boxShadow: "0 12px 34px rgba(76, 29, 149, 0.08)",
  padding: "clamp(1rem, 3vw, 2rem)",
  textAlign: "center",
};

const eyebrow = {
  margin: 0,
  color: "#7c3aed",
  fontSize: "0.78rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const title = {
  margin: "0.62rem 0 0",
  fontSize: "clamp(1.35rem, 3.8vw, 2rem)",
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  fontWeight: 850,
  color: "#0f172a",
};

const subtitle = {
  margin: "0.55rem 0 0",
  color: "#334155",
  fontSize: "1rem",
  fontWeight: 700,
};

const activationLine = {
  margin: "0.75rem 0 0",
  color: "#64748b",
  fontSize: "0.88rem",
  fontWeight: 700,
};

const ctaWrap = {
  marginTop: "1.1rem",
  display: "flex",
  flexWrap: "wrap",
  gap: "0.65rem",
  justifyContent: "center",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.7rem 1rem",
  borderRadius: "10px",
  border: "1px solid #7c3aed",
  background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "0.88rem",
  fontWeight: 800,
};

const btnSecondary = {
  ...btnPrimary,
  border: "1px solid #c4b5fd",
  background: "#fff",
  color: "#5b21b6",
};
