"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminUser } from "@/components/admin/AdminUserContext";
import { CheckoutEventButton } from "@/components/billing/CheckoutEventButton";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

export default function AdminAccountPage() {
  const { user } = useAdminUser();
  const [eventCredits, setEventCredits] = useState(/** @type {number | null} */ (null));
  const [createdAt, setCreatedAt] = useState(/** @type {string | null} */ (null));
  const [payments, setPayments] = useState(
    /** @type {{ id: string; amount: number; credits: number; createdAt: string }[]} */ ([]),
  );

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
        if (!cancelled) {
          setEventCredits(raw == null ? null : Math.max(0, Number(raw)));
          setCreatedAt(typeof body?.user?.createdAt === "string" ? body.user.createdAt : null);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/billing/payments`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => []);
        if (!res.ok || cancelled || !Array.isArray(body)) return;
        const rows = body
          .map((x) => ({
            id: String(x?.id || ""),
            amount: Number(x?.amount || 0),
            credits: Math.max(1, Number(x?.credits || 1)),
            createdAt: String(x?.createdAt || ""),
          }))
          .filter((x) => x.id && x.createdAt);
        if (!cancelled) setPayments(rows);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 16px 40px",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: "0 0 1rem", fontSize: "0.88rem" }}>
        <Link href="/admin/events" style={{ color: "#64748b", fontWeight: 600, textDecoration: "none" }}>
          ← Mes événements
        </Link>
      </p>
      <header style={{ marginBottom: "1rem" }}>
        <h1
          style={{
            margin: "0 0 0.35rem",
            fontSize: "clamp(1.4rem, 2.8vw, 1.85rem)",
            fontWeight: 820,
            letterSpacing: "-0.03em",
            color: "#0f172a",
          }}
        >
          Mon compte
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", maxWidth: "60ch" }}>
          Informations de profil liées à votre espace administrateur.
        </p>
      </header>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "0.9rem",
        }}
      >
        <article style={CARD}>
          <h2 style={CARD_TITLE}>Informations du compte</h2>
          <p style={ROW_TEXT}>
            <span style={ROW_LABEL}>E-mail : </span>
            {user?.email ?? "—"}
          </p>
          <p style={{ ...ROW_TEXT, marginTop: "0.45rem" }}>
            <span style={ROW_LABEL}>Crédits disponibles : </span>
            {typeof eventCredits === "number" && !Number.isNaN(eventCredits)
              ? eventCredits
              : "—"}
          </p>
          {createdAt ? (
            <p style={{ ...ROW_TEXT, marginTop: "0.45rem" }}>
              <span style={ROW_LABEL}>Compte créé le : </span>
              {new Date(createdAt).toLocaleString("fr-FR")}
            </p>
          ) : null}
        </article>

        <article style={CARD}>
          <h2 style={CARD_TITLE}>Crédits & achat</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem", fontWeight: 700 }}>
            1 événement réel = 49€ jusqu’à 500 participants.
          </p>
          <div style={{ marginTop: "0.85rem", maxWidth: "320px" }}>
            <CheckoutEventButton
              label="Acheter un événement (49€)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.6rem 0.95rem",
                borderRadius: "10px",
                border: "1px solid #7c3aed",
                background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.86rem",
                textDecoration: "none",
                boxShadow: "0 8px 20px rgba(124,58,237,0.22)",
              }}
            />
          </div>
        </article>

        <article style={CARD}>
          <h2 style={CARD_TITLE}>Factures / achats</h2>
          {payments.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem", fontWeight: 600 }}>
              Aucun achat pour le moment.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {payments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "#f8fafc",
                    padding: "0.55rem 0.6rem",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                    {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{ marginTop: "0.16rem", fontSize: "0.8rem", color: "#334155", fontWeight: 700 }}>
                    {`${p.credits} crédit${p.credits > 1 ? "s" : ""}`}
                  </div>
                  <div style={{ marginTop: "0.12rem", fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    }).format(Math.max(0, Number(p.amount || 0)) / 100)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article style={CARD}>
          <h2 style={CARD_TITLE}>Sécurité</h2>
          <p style={{ margin: "0 0 0.55rem", color: "#64748b", fontSize: "0.86rem", fontWeight: 600 }}>
            La modification du mot de passe sera bientôt disponible.
          </p>
          <button
            type="button"
            disabled
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.52rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#94a3b8",
              fontWeight: 700,
              fontSize: "0.84rem",
              cursor: "not-allowed",
            }}
          >
            Modifier mon mot de passe
          </button>
          <p style={{ margin: "0.65rem 0 0", color: "#64748b", fontSize: "0.82rem", fontWeight: 600 }}>
            Les paiements sont sécurisés par Stripe.
          </p>
        </article>
      </section>
    </main>
  );
}

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  padding: "1rem 1.15rem",
};

const CARD_TITLE = {
  margin: "0 0 0.75rem",
  color: "#0f172a",
  fontSize: "0.98rem",
  fontWeight: 800,
};

const ROW_TEXT = {
  margin: 0,
  color: "#475569",
  fontSize: "0.9rem",
};

const ROW_LABEL = {
  color: "#64748b",
  fontWeight: 700,
};
