"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const totalCreditsBought = payments.reduce((sum, p) => sum + Math.max(0, Number(p.credits || 0)), 0);
  const creditCount = typeof eventCredits === "number" && !Number.isNaN(eventCredits) ? eventCredits : null;
  const hasNoCredit = creditCount === 0;

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

  async function submitPasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Tous les champs sont requis.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("La confirmation du mot de passe ne correspond pas.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Le nouveau mot de passe doit être différent de l’actuel.");
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" && body.error.trim()
            ? body.error
            : "Impossible de modifier le mot de passe.",
        );
      }
      setPasswordSuccess(
        typeof body?.message === "string" && body.message.trim()
          ? body.message
          : "Mot de passe mis à jour.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err?.message || "Impossible de modifier le mot de passe.");
    } finally {
      setPasswordBusy(false);
    }
  }

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
      id="account-page"
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px clamp(16px, 3vw, 24px) 40px",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
        boxSizing: "border-box",
      }}
    >
      <AdminPageHeader
        title="Mon compte"
        subtitle="Informations de profil liées à votre espace administrateur."
        breadcrumbs={
          <Link href="/admin/events" style={{ color: "#64748b", fontWeight: 600, textDecoration: "none", fontSize: "0.88rem" }}>
            ← Mes événements
          </Link>
        }
      />
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "clamp(0.75rem, 1.8vw, 1rem)",
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
          <p
            style={{
              margin: "0 0 0.45rem",
              color: hasNoCredit ? "#b45309" : "#0f172a",
              fontSize: "0.86rem",
              fontWeight: 800,
              padding: "0.38rem 0.48rem",
              borderRadius: "9px",
              border: hasNoCredit ? "1px solid #fdba74" : "1px solid #e2e8f0",
              background: hasNoCredit ? "#fff7ed" : "#f8fafc",
            }}
          >
            {creditCount == null
              ? "Crédits en cours de chargement..."
              : hasNoCredit
                ? "Aucun crédit disponible"
                : creditCount === 1
                  ? "1 crédit disponible"
                  : `${creditCount} crédits disponibles`}
          </p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem", fontWeight: 700 }}>
            1 événement réel = 49€ jusqu’à 500 participants.
          </p>
          <div className="buy-credit-cta" style={{ marginTop: "0.95rem", maxWidth: "360px" }}>
            <CheckoutEventButton
              label="Acheter 1 crédit événement"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                minHeight: "46px",
                padding: "0.72rem 1rem",
                borderRadius: "12px",
                border: "1px solid #7c3aed",
                background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 58%, #6d28d9 100%)",
                color: "#fff",
                fontWeight: 850,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: "0 12px 24px rgba(124,58,237,0.26)",
                transition: "transform 160ms ease, box-shadow 160ms ease, filter 160ms ease",
              }}
            />
          </div>
          <p style={{ margin: "0.55rem 0 0", color: "#64748b", fontSize: "0.8rem", fontWeight: 700 }}>
            Paiement sécurisé • Sans abonnement
          </p>
          <p style={{ margin: "0.65rem 0 0", color: "#64748b", fontSize: "0.82rem", fontWeight: 600 }}>
            Les paiements sont sécurisés par Stripe.
          </p>
        </article>
      </section>

      <section style={{ marginTop: "clamp(1rem, 2vw, 1.5rem)" }}>
        <article style={CARD}>
          <h2 style={CARD_TITLE}>Factures / achats</h2>
          <p style={{ margin: "0 0 0.6rem", color: "#334155", fontSize: "0.84rem", fontWeight: 800 }}>
            Total acheté : {totalCreditsBought} crédit{totalCreditsBought > 1 ? "s" : ""}
          </p>
          {payments.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem", fontWeight: 600 }}>
              Aucun achat pour le moment.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {payments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e6ebf3",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    padding: "0.7rem 0.75rem",
                  }}
                >
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.01em" }}>
                    {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{ marginTop: "0.22rem", fontSize: "0.83rem", color: "#334155", fontWeight: 700 }}>
                    {`${p.credits} crédit${p.credits > 1 ? "s" : ""}`}
                  </div>
                  <div style={{ marginTop: "0.16rem", fontSize: "0.95rem", color: "#0f172a", fontWeight: 850 }}>
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
      </section>

      <section style={{ marginTop: "clamp(1rem, 2vw, 1.5rem)" }}>
        <article style={CARD}>
          <h2 style={CARD_TITLE}>Sécurité</h2>
          <form onSubmit={submitPasswordChange} style={{ display: "grid", gap: "0.75rem", maxWidth: "640px" }}>
            <label style={LABEL_STYLE}>
              Mot de passe actuel
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={INPUT_STYLE}
                required
              />
            </label>
            <label style={LABEL_STYLE}>
              Nouveau mot de passe
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                style={INPUT_STYLE}
                required
              />
            </label>
            <label style={LABEL_STYLE}>
              Confirmer le nouveau mot de passe
              <input
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                minLength={8}
                style={INPUT_STYLE}
                required
              />
            </label>
            {passwordError ? (
              <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.82rem", fontWeight: 700 }}>
                {passwordError}
              </p>
            ) : null}
            {passwordSuccess ? (
              <p style={{ margin: 0, color: "#166534", fontSize: "0.82rem", fontWeight: 700 }}>
                {passwordSuccess}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={passwordBusy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "fit-content",
                minHeight: "40px",
                padding: "0.58rem 0.9rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: passwordBusy ? "#e2e8f0" : "#f8fafc",
                color: passwordBusy ? "#64748b" : "#0f172a",
                fontWeight: 700,
                fontSize: "0.86rem",
                cursor: passwordBusy ? "not-allowed" : "pointer",
              }}
            >
              {passwordBusy ? "Mise à jour..." : "Modifier mon mot de passe"}
            </button>
          </form>
        </article>
      </section>
      <style>{`
        #account-page .buy-credit-cta :is(a,button) {
          cursor: pointer;
        }
        #account-page .buy-credit-cta :is(a,button):hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(124, 58, 237, 0.3);
          filter: saturate(1.03);
        }
        #account-page .buy-credit-cta :is(a,button):active {
          transform: translateY(0);
        }
        #account-page input:focus-visible {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
        }
      `}</style>
    </main>
  );
}

const CARD = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
  padding: "1rem 1rem",
};

const CARD_TITLE = {
  margin: "0 0 0.85rem",
  color: "#0f172a",
  fontSize: "1rem",
  fontWeight: 820,
  letterSpacing: "-0.01em",
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

const LABEL_STYLE = {
  display: "grid",
  gap: "0.3rem",
  color: "#334155",
  fontSize: "0.84rem",
  fontWeight: 740,
};

const INPUT_STYLE = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "42px",
  padding: "0.58rem 0.68rem",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "0.88rem",
  outline: "none",
};
