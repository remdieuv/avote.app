import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";

export const metadata = {
  title: "Tarifs Avote | Vote interactif en direct",
  description:
    "Des tarifs simples pour vos événements en direct. Testez gratuitement Avote, puis choisissez l'offre adaptée à votre audience.",
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
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "1.25rem 1.25rem 4rem",
  boxSizing: "border-box",
};

const sectionY = {
  paddingTop: "clamp(2.8rem, 7vw, 4.4rem)",
  paddingBottom: "clamp(2.8rem, 7vw, 4.4rem)",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.75rem 1.2rem",
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

const STRIPE_LINKS = {
  starter: "https://buy.stripe.com/test_4gM4gB1t5a0Vc4JgO07g400",
  pro: "https://buy.stripe.com/fZu8wOadmcrvd1A1BTcMM01",
  premium: "https://buy.stripe.com/9B600ifxG6371iS5S9cMM02",
};

const plans = [
  {
    key: "free",
    name: "Gratuit",
    price: "0€",
    unit: "",
    label: "Tester en conditions réelles",
    cta: "Démarrer gratuitement",
    href: "/join/demo",
    features: [
      "1 sondage actif",
      "Jusqu'à 50 votes",
      "QR code + lien de participation",
      "Résultats en direct",
      "Branding Avote par défaut",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    price: "19€",
    unit: "/ événement",
    label: "Pour petits événements",
    cta: "Choisir Starter",
    href: STRIPE_LINKS.starter,
    features: [
      "1 événement",
      "Jusqu'à 100 participants",
      "QR code + lien court",
      "Résultats en direct",
      "Accès mobile optimisé",
      "Branding Avote par défaut",
    ],
  },
  {
    key: "pro",
    name: "PRO",
    price: "49€",
    unit: "/ événement",
    label: "Expérience live complète",
    sublabel: "Idéal pour événements publics et animations live",
    cta: "Choisir PRO",
    href: STRIPE_LINKS.pro,
    badge: "Le plus utilisé",
    featured: true,
    features: [
      "1 événement",
      "Jusqu'à 500 participants",
      "QR code + lien court",
      "Résultats en direct",
      "Projection écran / OBS",
      "Personnalisation visuelle (logo, couleurs)",
      "Statistiques détaillées + export des résultats",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "99€",
    unit: "/ événement",
    label: "Pour gros événements",
    cta: "Choisir Premium",
    href: STRIPE_LINKS.premium,
    features: [
      "1 événement",
      "Jusqu'à 2 000 participants",
      "Capacité renforcée pour les gros événements",
      "Projection écran / OBS",
      "Personnalisation visuelle avancée",
      "Statistiques détaillées + export des résultats",
      "Support prioritaire",
    ],
  },
];

const offerModes = [
  {
    key: "one-shot",
    title: "Événement ponctuel",
    text: "Vous avez un besoin unique ? Payez une seule fois, sans abonnement.",
    points: [
      "Paiement unique",
      "Mise en ligne rapide",
      "Idéal pour conférences, soirées, animations, réunions",
    ],
    cta: "Créer mon événement",
    href: "/admin",
    featured: true,
  },
  {
    key: "subscription",
    title: "Abonnement",
    text: "Vous organisez des événements régulièrement ? Passez à une formule plus rentable.",
    points: [
      "Utilisation récurrente",
      "Plus économique sur la durée",
      "Idéal pour agences, entreprises, organisateurs réguliers",
    ],
    cta: "Voir les abonnements",
    href: "#abonnement-pro",
  },
];

const compareRows = [
  { label: "Participants max", free: "≈ 50 votes", starter: "100", pro: "500", premium: "2 000" },
  { label: "QR code", free: "Oui", starter: "Oui", pro: "Oui", premium: "Oui" },
  { label: "Résultats live", free: "Oui", starter: "Oui", pro: "Oui", premium: "Oui" },
  { label: "Affichage écran", free: "-", starter: "-", pro: "Oui", premium: "Oui" },
  { label: "Logo et couleurs personnalisés", free: "Avote", starter: "Avote", pro: "Oui", premium: "Avancé" },
  { label: "Statistiques détaillées + export des résultats", free: "-", starter: "-", pro: "Oui", premium: "Oui" },
  { label: "Suppression branding Avote", free: "-", starter: "-", pro: "-", premium: "Sur demande" },
  { label: "Support prioritaire", free: "-", starter: "-", pro: "-", premium: "Oui" },
];

const useCases = [
  { icon: "🎤", title: "Conferences & keynotes", text: "Faites reagir votre public en direct sur grand ecran." },
  { icon: "🏢", title: "Reunions d'equipe", text: "Accordez-vous vite avec des votes clairs et visibles." },
  { icon: "🎓", title: "Formations & quiz", text: "Transformez vos sessions en experiences participatives." },
  { icon: "🎉", title: "Soirees & evenements live", text: "Animez la salle avec un vote simple et instantane." },
];

const faq = [
  {
    q: "Puis-je tester gratuitement ?",
    a: "Oui. Vous pouvez lancer un test immediatement avec l'offre gratuite.",
  },
  {
    q: "Faut-il installer une application ?",
    a: "Non. Vos participants votent via un scan QR code, sans application.",
  },
  {
    q: "Puis-je personnaliser l'evenement ?",
    a: "Oui, a partir de l'offre PRO vous pouvez ajouter logo et couleurs.",
  },
  {
    q: "Quelle offre choisir pour un evenement public ?",
    a: "PRO est le meilleur point d'equilibre. Premium convient aux gros volumes et besoins white label.",
  },
];

function PlanCard({ plan }) {
  const isExternal = /^https?:\/\//i.test(plan.href);
  return (
    <article className={`pricing-card ${plan.featured ? "featured" : ""}`}>
      <div className="pricing-card-head">
        <p className="pricing-plan-name">{plan.name}</p>
        {plan.badge ? <span className="pricing-plan-badge">{plan.badge}</span> : null}
      </div>
      <p className="pricing-plan-label">{plan.label}</p>
      {plan.sublabel ? <p className="pricing-plan-sublabel">{plan.sublabel}</p> : null}
      <p className="pricing-price">
        <strong>{plan.price}</strong>
        {plan.unit ? <span>{plan.unit}</span> : null}
      </p>
      {plan.key === "pro" ? (
        <p className="pricing-plan-proof">Le meilleur choix dans 90% des cas</p>
      ) : null}
      <ul className="pricing-features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <div className="pricing-card-cta">
        {isExternal ? (
          <a href={plan.href} style={plan.featured ? btnPrimary : btnSecondary}>
            {plan.cta}
          </a>
        ) : (
          <Link href={plan.href} style={plan.featured ? btnPrimary : btnSecondary}>
            {plan.cta}
          </Link>
        )}
      </div>
      {plan.key === "pro" ? (
        <p className="pricing-pro-discovery-tag">Premier événement à 9€</p>
      ) : null}
    </article>
  );
}

export default function PricingPage() {
  return (
    <div style={shell}>
      <LandingHeader />

      <main style={{ ...inner, flex: 1 }}>
        <section style={sectionY} className="pricing-hero">
          <div className="pricing-hero-wrap">
            <p className="pricing-eyebrow">Tarifs Avote</p>
            <h1 className="pricing-title">Des tarifs simples pour vos événements en direct</h1>
            <p className="pricing-subtitle">
              Payez une seule fois pour un événement, ou choisissez un abonnement si vous
              utilisez Avote régulièrement.
            </p>
            <div className="pricing-hero-cta">
              <Link href="/join/demo" style={btnPrimary}>
                Tester gratuitement
              </Link>
              <Link href="/admin" style={btnSecondary}>
                Créer un événement
              </Link>
            </div>
          </div>
        </section>

        <section style={{ ...sectionY, paddingTop: "0.6rem" }} aria-labelledby="pricing-modes-title">
          <h2 id="pricing-modes-title" className="section-title">
            Choisissez votre mode d&apos;utilisation
          </h2>
          <div className="pricing-mode-grid">
            {offerModes.map((mode) => (
              <article key={mode.key} className={`pricing-mode-card ${mode.featured ? "featured" : ""}`}>
                <h3>{mode.title}</h3>
                <p className="pricing-mode-text">{mode.text}</p>
                <ul>
                  {mode.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link href={mode.href} style={mode.featured ? btnPrimary : btnSecondary}>
                  {mode.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-cards-title">
          <h2 id="pricing-cards-title" className="section-title">
            Choisissez votre formule par événement
          </h2>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <PlanCard key={plan.key} plan={plan} />
            ))}
          </div>
          <div
            id="abonnement-pro"
            className="pricing-sub-plan"
            role="note"
            aria-label="Offre abonnement secondaire"
          >
            <p className="pricing-sub-plan-title">Vous organisez des événements régulièrement ?</p>
            <p className="pricing-sub-plan-text">
              Passez à l&apos;abonnement Avote PRO pour créer plusieurs événements et profiter
              d&apos;un coût plus avantageux.
            </p>
            <ul>
              <li>
                <strong>PRO+ — 39€/mois</strong>
              </li>
              <li>1 événement PRO inclus / mois</li>
              <li>Suppression du branding Avote</li>
              <li>Historique complet</li>
              <li>Remise sur les événements supplémentaires</li>
            </ul>
            <Link href="/admin" style={btnSecondary}>
              Découvrir l&apos;abonnement PRO
            </Link>
          </div>
          <p className="pricing-social-proof">
            Déjà utilisé pour des conférences, soirées, animations et événements d&apos;entreprise.
          </p>
          <p className="pricing-payment-note">Paiement sécurisé avec Stripe.</p>
        </section>

        <section style={{ ...sectionY, paddingTop: "0.4rem" }} aria-label="Offre decouverte">
          <div className="pricing-offer">
            <div>
              <p className="pricing-offer-title">Offre découverte</p>
              <p className="pricing-offer-text">
                Premier événement à 9€ pour tester Avote en conditions réelles.
              </p>
            </div>
            <Link href="/admin" style={btnPrimary}>
              En profiter
            </Link>
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-compare-title">
          <h2 id="pricing-compare-title" className="section-title">
            Tableau comparatif
          </h2>
          <div className="pricing-table-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Fonctionnalités</th>
                  <th>Gratuit</th>
                  <th>Starter</th>
                  <th>PRO</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.free}</td>
                    <td>{row.starter}</td>
                    <td>{row.pro}</td>
                    <td>{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-usecases-title">
          <h2 id="pricing-usecases-title" className="section-title">
            Cas d&apos;usage fréquents
          </h2>
          <div className="usecase-grid">
            {useCases.map((item) => (
              <article key={item.title} className="usecase-item">
                <span className="usecase-icon" aria-hidden>
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-reassure-title">
          <h2 id="pricing-reassure-title" className="section-title">
            Réassurance
          </h2>
          <div className="reassure-grid">
            <p>Sans application à installer</p>
            <p>Accès en un scan</p>
            <p>Résultats instantanés</p>
            <p>Paiement simple et sans engagement</p>
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-faq-title">
          <h2 id="pricing-faq-title" className="section-title">
            FAQ rapide
          </h2>
          <div className="faq-grid">
            {faq.map((item) => (
              <article key={item.q} className="faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={sectionY} className="pricing-final">
          <h2>Prêt à faire voter votre audience en direct ?</h2>
          <p className="pricing-final-sub">
            Lancez votre événement en quelques minutes, sans application à installer.
          </p>
          <div className="pricing-final-cta">
            <Link href="/join/demo" style={btnPrimary}>
              Tester Avote
            </Link>
            <Link href="/admin" style={btnSecondary}>
              Créer un événement
            </Link>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "1.5rem 1.25rem",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#94a3b8",
        }}
      >
        © {new Date().getFullYear()} Avote
      </footer>

      <style>{`
        .pricing-hero-wrap {
          border-radius: 24px;
          border: 1px solid #ddd6fe;
          background:
            radial-gradient(820px 240px at 14% -12%, rgba(124, 58, 237, 0.12), transparent 60%),
            linear-gradient(160deg, #ffffff 0%, #f8fafc 52%, #faf5ff 100%);
          box-shadow: 0 18px 48px rgba(76, 29, 149, 0.08);
          padding: clamp(1.35rem, 3.8vw, 2.4rem);
          text-align: center;
        }
        .pricing-eyebrow {
          margin: 0 0 0.48rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #7c3aed;
        }
        .pricing-title {
          margin: 0;
          font-size: clamp(1.5rem, 4.4vw, 2.5rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          font-weight: 900;
          color: #0f172a;
        }
        .pricing-subtitle {
          margin: 0.9rem auto 0;
          max-width: 64ch;
          font-size: clamp(0.95rem, 2.2vw, 1.05rem);
          color: #64748b;
        }
        .pricing-hero-cta {
          display: flex;
          gap: 0.7rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 1.2rem;
        }
        .section-title {
          margin: 0 0 1rem;
          text-align: center;
          font-size: clamp(1.2rem, 3vw, 1.7rem);
          font-weight: 850;
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .pricing-mode-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }
        .pricing-mode-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pricing-mode-card.featured {
          border-color: #c4b5fd;
          background:
            radial-gradient(220px 120px at 90% -16%, rgba(196, 181, 253, 0.28), transparent 60%),
            linear-gradient(160deg, #ffffff 0%, #faf5ff 100%);
          box-shadow: 0 14px 30px rgba(124, 58, 237, 0.12);
        }
        .pricing-mode-card h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 850;
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .pricing-mode-text {
          margin: 0;
          color: #64748b;
          font-size: 0.84rem;
          line-height: 1.45;
        }
        .pricing-mode-card ul {
          margin: 0.1rem 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: #334155;
          flex: 1;
        }
        .pricing-mode-card li {
          display: flex;
          gap: 0.45rem;
        }
        .pricing-mode-card li::before {
          content: "•";
          color: #7c3aed;
          font-weight: 900;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }
        .pricing-card {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
          padding: 1rem 1rem 0.95rem;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .pricing-card:hover {
          transform: translateY(-2px);
          border-color: #c4b5fd;
          box-shadow: 0 16px 34px rgba(124, 58, 237, 0.12);
        }
        .pricing-card.featured {
          border-color: #a78bfa;
          background:
            radial-gradient(220px 120px at 85% -10%, rgba(167, 139, 250, 0.24), transparent 60%),
            linear-gradient(160deg, #ffffff 0%, #faf5ff 100%);
          box-shadow: 0 18px 40px rgba(124, 58, 237, 0.16);
        }
        .pricing-card-head {
          display: flex;
          justify-content: space-between;
          gap: 0.6rem;
          align-items: center;
        }
        .pricing-plan-name {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #475569;
        }
        .pricing-plan-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.24rem 0.5rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          color: #5b21b6;
          border: 1px solid #c4b5fd;
          background: #f5f3ff;
          white-space: nowrap;
        }
        .pricing-plan-label {
          margin: 0.35rem 0 0;
          font-size: 0.88rem;
          color: #64748b;
          min-height: 2.6em;
        }
        .pricing-plan-sublabel {
          margin: 0.3rem 0 0;
          font-size: 0.76rem;
          color: #64748b;
          line-height: 1.4;
        }
        .pricing-price {
          margin: 0.72rem 0 0;
          display: flex;
          align-items: baseline;
          gap: 0.28rem;
        }
        .pricing-price strong {
          font-size: 1.6rem;
          letter-spacing: -0.03em;
          color: #0f172a;
          font-weight: 900;
        }
        .pricing-price span {
          font-size: 0.8rem;
          color: #64748b;
        }
        .pricing-plan-proof {
          margin: 0.35rem 0 0;
          font-size: 0.72rem;
          color: #6b7280;
          font-weight: 700;
        }
        .pricing-features {
          margin: 0.85rem 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.42rem;
          color: #334155;
          font-size: 0.83rem;
          line-height: 1.45;
          flex: 1;
        }
        .pricing-features li {
          display: flex;
          gap: 0.45rem;
        }
        .pricing-features li::before {
          content: "•";
          color: #7c3aed;
          font-weight: 900;
        }
        .pricing-card-cta {
          margin-top: 0.9rem;
          display: flex;
        }
        .pricing-card-cta a {
          width: 100%;
        }
        .pricing-pro-discovery-tag {
          margin: 0.52rem 0 0;
          font-size: 0.68rem;
          font-weight: 700;
          color: #6d28d9;
          text-align: center;
        }
        .pricing-social-proof {
          margin: 0.9rem auto 0;
          max-width: 760px;
          text-align: center;
          font-size: 0.8rem;
          color: #64748b;
        }
        .pricing-payment-note {
          margin: 0.32rem auto 0;
          max-width: 760px;
          text-align: center;
          font-size: 0.74rem;
          color: #94a3b8;
        }
        .pricing-offer {
          border-radius: 18px;
          border: 1px solid #c4b5fd;
          background: linear-gradient(150deg, #f5f3ff 0%, #ffffff 100%);
          padding: 1rem 1.05rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          box-shadow: 0 10px 30px rgba(124, 58, 237, 0.1);
        }
        .pricing-sub-plan {
          margin: 1rem auto 0;
          max-width: 760px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(160deg, #ffffff 0%, #f8fafc 100%);
          padding: 0.8rem 0.95rem;
        }
        .pricing-sub-plan-title {
          margin: 0;
          font-size: 0.86rem;
          font-weight: 800;
          color: #334155;
        }
        .pricing-sub-plan-text {
          margin: 0.35rem 0 0;
          color: #64748b;
          font-size: 0.8rem;
          line-height: 1.45;
        }
        .pricing-sub-plan ul {
          margin: 0.5rem 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem 0.7rem;
          color: #475569;
          font-size: 0.8rem;
        }
        .pricing-sub-plan li {
          white-space: nowrap;
        }
        .pricing-sub-plan a {
          margin-top: 0.7rem;
        }
        .pricing-offer-title {
          margin: 0;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 800;
          color: #6d28d9;
        }
        .pricing-offer-text {
          margin: 0.26rem 0 0;
          color: #334155;
          font-size: 0.93rem;
        }
        .pricing-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #fff;
        }
        .pricing-table {
          width: 100%;
          min-width: 680px;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .pricing-table th,
        .pricing-table td {
          text-align: left;
          padding: 0.68rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .pricing-table th {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #475569;
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .pricing-table td:first-child {
          font-weight: 700;
          color: #1e293b;
        }
        .usecase-grid,
        .reassure-grid,
        .faq-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.8rem;
        }
        .usecase-item,
        .reassure-grid p,
        .faq-item {
          margin: 0;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
          padding: 0.85rem 0.9rem;
        }
        .usecase-item {
          display: flex;
          flex-direction: column;
          gap: 0.36rem;
        }
        .usecase-icon {
          width: 1.9rem;
          height: 1.9rem;
          border-radius: 999px;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }
        .usecase-item h3,
        .faq-item h3 {
          margin: 0;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .usecase-item p,
        .faq-item p {
          margin: 0;
          color: #64748b;
          font-size: 0.84rem;
        }
        .reassure-grid p {
          text-align: center;
          font-weight: 700;
          color: #334155;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .pricing-final {
          border: 1px solid #ddd6fe;
          border-radius: 20px;
          text-align: center;
          background: linear-gradient(135deg, #ede9fe 0%, #fae8ff 100%);
          padding: clamp(1.4rem, 3.5vw, 2.4rem);
        }
        .pricing-final h2 {
          margin: 0;
          font-size: clamp(1.14rem, 2.6vw, 1.45rem);
          color: #4c1d95;
          letter-spacing: -0.02em;
        }
        .pricing-final-sub {
          margin: 0.5rem auto 0;
          max-width: 48ch;
          color: #6b7280;
          font-size: 0.86rem;
        }
        .pricing-final-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          justify-content: center;
          margin-top: 1rem;
        }
        @media (min-width: 640px) {
          .pricing-mode-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .usecase-grid,
          .reassure-grid,
          .faq-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pricing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pricing-card {
            padding: 1.08rem 1.08rem 1rem;
          }
        }
        @media (min-width: 1040px) {
          .pricing-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            align-items: stretch;
          }
          .usecase-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          .reassure-grid,
          .faq-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
