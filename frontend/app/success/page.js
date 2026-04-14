import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata = {
  title: "Paiement confirmé - Avote",
  description: "Votre paiement a été validé. Lancez votre événement en quelques secondes.",
};

const shell = {
  fontFamily: "system-ui, sans-serif",
  lineHeight: 1.55,
  color: "#0f172a",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(180deg, #f1f5f9 0%, #ffffff 38%, #faf5ff 100%)",
};

const inner = {
  width: "100%",
  maxWidth: "980px",
  margin: "0 auto",
  padding: "1.25rem 1.25rem 4rem",
  boxSizing: "border-box",
  flex: 1,
};

const sectionY = {
  paddingTop: "clamp(2.6rem, 6.5vw, 4.1rem)",
  paddingBottom: "clamp(2.6rem, 6.5vw, 4.1rem)",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.8rem 1.3rem",
  borderRadius: "10px",
  border: "1px solid #6d28d9",
  background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "0.95rem",
  fontWeight: 800,
  boxShadow: "0 10px 24px rgba(109, 40, 217, 0.2)",
};

const btnSecondary = {
  ...btnPrimary,
  background: "#fff",
  border: "1px solid #d8b4fe",
  color: "#5b21b6",
  boxShadow: "none",
};

const steps = [
  {
    title: "Accès immédiat",
    text: "Votre achat est actif. Vous pouvez commencer dès maintenant.",
  },
  {
    title: "Créez votre événement",
    text: "Ajoutez vos questions, réponses et personnalisez votre session.",
  },
  {
    title: "Partagez et lancez",
    text: "Diffusez votre QR code et affichez les résultats en direct.",
  },
];

export default function SuccessPage() {
  return (
    <div style={shell}>
      <LandingHeader />

      <main style={inner}>
        <section style={sectionY}>
          <div className="success-hero">
            <p className="success-eyebrow">Paiement confirmé</p>
            <h1 className="success-title">Votre paiement a bien été validé 🎉</h1>
            <p className="success-subtitle">
              Merci pour votre confiance. Vous pouvez maintenant créer votre événement et faire
              voter votre audience en direct.
            </p>
            <div className="success-cta">
              <Link href="/admin" style={btnPrimary}>
                Créer mon événement
              </Link>
              <Link href="/pricing" style={btnSecondary}>
                Retour aux tarifs
              </Link>
            </div>
          </div>
        </section>

        <section style={{ ...sectionY, paddingTop: "0.6rem" }}>
          <h2 className="success-section-title">Prochaines étapes</h2>
          <div className="success-steps-grid">
            {steps.map((step) => (
              <article key={step.title} className="success-step-card">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <p className="success-product-reminder">
            Un QR code, quelques secondes pour répondre, des résultats instantanés.
          </p>
          <p className="success-help">
            Besoin d’aide ? <Link href="/admin">Contactez-nous</Link>
          </p>
        </section>
      </main>

      <style>{`
        .success-hero {
          border-radius: 24px;
          border: 1px solid #ddd6fe;
          background:
            radial-gradient(760px 220px at 18% -10%, rgba(124, 58, 237, 0.12), transparent 60%),
            linear-gradient(160deg, #ffffff 0%, #f8fafc 52%, #faf5ff 100%);
          box-shadow: 0 18px 48px rgba(76, 29, 149, 0.08);
          padding: clamp(1.3rem, 3.8vw, 2.35rem);
          text-align: center;
        }
        .success-eyebrow {
          margin: 0 0 0.48rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #7c3aed;
        }
        .success-title {
          margin: 0;
          font-size: clamp(1.45rem, 4.1vw, 2.35rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 900;
          color: #0f172a;
        }
        .success-subtitle {
          margin: 0.9rem auto 0;
          max-width: 66ch;
          font-size: clamp(0.95rem, 2.2vw, 1.03rem);
          color: #64748b;
        }
        .success-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.72rem;
          justify-content: center;
          margin-top: 1.2rem;
        }
        .success-section-title {
          margin: 0 0 1rem;
          text-align: center;
          font-size: clamp(1.18rem, 2.8vw, 1.55rem);
          font-weight: 850;
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .success-steps-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.85rem;
        }
        .success-step-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          padding: 0.9rem 0.95rem;
        }
        .success-step-card h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }
        .success-step-card p {
          margin: 0.38rem 0 0;
          font-size: 0.84rem;
          color: #64748b;
        }
        .success-product-reminder {
          margin: 1rem auto 0;
          text-align: center;
          max-width: 56ch;
          color: #475569;
          font-size: 0.86rem;
          font-weight: 700;
        }
        .success-help {
          margin: 0.65rem 0 0;
          text-align: center;
          color: #64748b;
          font-size: 0.82rem;
        }
        .success-help a {
          color: #6d28d9;
          font-weight: 700;
          text-decoration: none;
        }
        .success-help a:hover {
          text-decoration: underline;
        }
        @media (min-width: 860px) {
          .success-steps-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
