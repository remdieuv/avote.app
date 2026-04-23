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

const SUBSCRIPTION_LINKS = {
  // TODO: remplacer par les vrais liens Stripe abonnements quand ils seront prêts.
  proMonthly: "/admin",
  business: "/admin",
  agency: "/admin",
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
      "Jusqu'à 50 participations",
      "QR code + lien de participation",
      "Résultats en direct",
      "Branding Avote",
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
      "Branding Avote",
    ],
  },
  {
    key: "pro",
    name: "Pro Événement",
    price: "49€",
    unit: "/ événement",
    label: "Expérience live complète",
    sublabel: "Idéal pour événements publics et animations live",
    cta: "Choisir Pro Événement",
    href: STRIPE_LINKS.pro,
    badge: "Le plus utilisé",
    featured: true,
    features: [
      "1 événement",
      "Jusqu'à 1 000 participations",
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
    label: "Pour gros événements ponctuels",
    cta: "Choisir Premium",
    href: STRIPE_LINKS.premium,
    features: [
      "1 événement",
      "Jusqu'à 5 000 participations",
      "Capacité renforcée pour les gros événements",
      "Projection écran / OBS",
      "Personnalisation visuelle avancée",
      "Statistiques détaillées",
      "Support prioritaire",
    ],
  },
];

const participationExamples = [
  {
    title: "Conférence (100 personnes)",
    value: "Environ 100 participations",
  },
  {
    title: "Réunion (20 personnes)",
    value: "Environ 20 participations",
  },
  {
    title: "Jeu concours (300 participants)",
    value: "Environ 300 participations",
  },
];

const offerModes = [
  {
    key: "one-shot",
    title: "Événement ponctuel",
    text: "Vous avez un besoin unique ? Payez une seule fois, sans engagement mensuel.",
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
    title: "Abonnement mensuel",
    text: "Vous organisez des événements régulièrement ? Passez à une formule mensuelle plus rentable.",
    points: [
      "Utilisation récurrente",
      "Plus économique sur la durée",
      "Idéal pour agences, entreprises, organisateurs réguliers",
    ],
    cta: "Voir les abonnements",
    href: "#subscriptions",
  },
];

const eventCompareRows = [
  { label: "Prix", free: "0€", starter: "19€ / événement", pro: "49€ / événement", premium: "99€ / événement" },
  { label: "Événements inclus", free: "1 sondage actif", starter: "1", pro: "1", premium: "1" },
  { label: "Participations incluses", free: "Jusqu'à 50", starter: "Jusqu'à 100", pro: "Jusqu'à 1 000", premium: "Jusqu'à 5 000" },
  { label: "QR code", free: "Oui", starter: "Oui", pro: "Oui", premium: "Oui" },
  { label: "Résultats live", free: "Oui", starter: "Oui", pro: "Oui", premium: "Oui" },
  { label: "Projection écran / OBS", free: "Non", starter: "Non", pro: "Oui", premium: "Oui" },
  { label: "Personnalisation visuelle", free: "Branding Avote", starter: "Branding Avote", pro: "Logo + couleurs", premium: "Avancée" },
  { label: "Statistiques + export", free: "Non", starter: "Non", pro: "Oui", premium: "Oui" },
  { label: "Support", free: "Standard", starter: "Standard", pro: "Prioritaire", premium: "Prioritaire" },
];

const monthlyPlans = [
  {
    key: "pro-monthly",
    name: "Pro Abonnement",
    price: "39€",
    unit: "/ mois",
    badge: "Le plus rentable pour commencer",
    featured: true,
    cta: "Choisir Pro Abonnement",
    label: "Pour usage régulier",
    href: SUBSCRIPTION_LINKS.proMonthly,
    features: [
      "1 500 participations / mois",
      "Projection écran / OBS",
      "Suppression du branding Avote",
      "Historique complet",
    ],
  },
  {
    label: "Pour équipes et structures actives",
    key: "business",
    name: "Business",
    price: "79€",
    unit: "/ mois",
    cta: "Choisir Business",
    href: SUBSCRIPTION_LINKS.business,
    features: [
      "5 000 participations / mois",
      "Multi-événements",
      "Personnalisation complète",
      "Statistiques + export",
      "Support prioritaire",
    ],
  },
  {
    label: "Pour agences et multi-clients",
    key: "agency",
    name: "Agence",
    price: "149€",
    unit: "/ mois",
    cta: "Choisir Agence",
    href: SUBSCRIPTION_LINKS.agency,
    features: [
      "20 000 participations / mois",
      "Gestion multi-événements",
      "Branding avancé",
      "Support prioritaire",
    ],
  },
];

function PlanCard({ plan }) {
  const isExternal = /^https?:\/\//i.test(plan.href);
  return (
    <div className="pricing-card-wrap">
      <div className="pricing-card-badge-row external">
        {plan.badge ? <span className="pricing-plan-badge">{plan.badge}</span> : <span className="pricing-plan-badge-placeholder" aria-hidden />}
      </div>
      <article className={`pricing-card ${plan.featured ? "featured" : ""}`}>
      <div className="pricing-card-top">
        <div className="pricing-card-head">
          <p className="pricing-plan-name">{plan.name}</p>
        </div>
        <p className="pricing-plan-label">{plan.label}</p>
        <p className="pricing-plan-sublabel">{plan.sublabel || "\u00A0"}</p>
      <div className="pricing-price-box">
        <p className="pricing-price">
          <strong>{plan.price}</strong>
          {plan.unit ? <span>{plan.unit}</span> : null}
        </p>
      </div>
      </div>
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
      <p className="pricing-pro-discovery-tag">
        {plan.key === "pro" ? "Le meilleur choix dans 90% des cas" : "\u00A0"}
      </p>
      </article>
    </div>
  );
}

function MonthlyPlanCard({ plan }) {
  return (
    <div className="pricing-card-wrap">
      <div className="pricing-card-badge-row external">
        {plan.badge ? <span className="pricing-plan-badge">{plan.badge}</span> : <span className="pricing-plan-badge-placeholder" aria-hidden />}
      </div>
      <article className={`pricing-card monthly ${plan.featured ? "featured" : ""}`}>
      <div className="pricing-card-head">
        <p className="pricing-plan-name">{plan.name}</p>
      </div>
      {plan.label ? <p className="pricing-plan-label">{plan.label}</p> : null}
      <div className="pricing-price-box">
        <p className="pricing-price">
          <strong>{plan.price}</strong>
          <span>{plan.unit}</span>
        </p>
      </div>
      <ul className="pricing-features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <div className="pricing-card-cta">
        <Link href={plan.href} style={plan.featured ? btnPrimary : btnSecondary}>
          {plan.cta}
        </Link>
      </div>
      </article>
    </div>
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
              Payez une seule fois pour un événement, ou choisissez un abonnement mensuel si vous
              utilisez Avote régulièrement.
            </p>
            <p className="pricing-micro-reassurance">
              Aucun engagement. Paiement sécurisé avec Stripe. Test gratuit disponible.
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

        <section style={{ ...sectionY, paddingTop: "0.6rem" }} aria-labelledby="pricing-count-title">
          <div className="pricing-count-wrap">
            <h2 id="pricing-count-title" className="section-title">
              Comment ça se compte ?
            </h2>
            <p className="pricing-count-text">
              Une participation correspond à une réponse envoyée par un participant.
            </p>
            <div className="pricing-count-grid">
              {participationExamples.map((example) => (
                <article key={example.title} className="pricing-count-card">
                  <p className="pricing-count-card-title">{example.title}</p>
                  <p className="pricing-count-card-value">{example.value}</p>
                </article>
              ))}
            </div>
            <p className="pricing-count-note">
              Le nombre réel dépend du nombre de personnes qui répondent pendant votre événement.
            </p>
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
          <p className="pricing-section-subtitle">
            Pour un besoin ponctuel, payez une seule fois selon la taille de votre audience.
          </p>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <PlanCard key={plan.key} plan={plan} />
            ))}
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-compare-title">
          <h2 id="pricing-compare-title" className="section-title">
            Comparatif des offres par événement
          </h2>
          <div className="pricing-table-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Fonctionnalités</th>
                  <th>Gratuit</th>
                  <th>Starter</th>
                  <th>Pro Événement</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                {eventCompareRows.map((row) => (
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

        <section style={{ ...sectionY, paddingTop: "0.6rem" }} aria-labelledby="pricing-transition-title">
          <div id="subscriptions" className="pricing-sub-plan">
            <h2 id="pricing-transition-title" className="pricing-sub-plan-title">
              Vous organisez des événements régulièrement ?
            </h2>
            <p className="pricing-sub-plan-text">
              Passez à un abonnement mensuel Avote pour profiter d&apos;un coût plus avantageux chaque mois.
            </p>
          </div>
        </section>

        <section style={sectionY} aria-labelledby="pricing-monthly-title">
          <h2 id="pricing-monthly-title" className="section-title">
            Choisissez votre abonnement
          </h2>
          <p className="pricing-monthly-subtitle">
            Pour un usage récurrent, bénéficiez d&apos;un tarif mensuel plus avantageux.
          </p>
          <div className="pricing-monthly-grid">
            {monthlyPlans.map((plan) => (
              <MonthlyPlanCard key={plan.key} plan={plan} />
            ))}
          </div>
        </section>

        <section style={sectionY} className="pricing-final">
          <h2>Vous prévoyez un très grand événement ?</h2>
          <p className="pricing-final-sub">
            Concert, stade, festival, grande opération publique : contactez-nous pour une offre
            sur mesure adaptée à votre audience et à vos contraintes techniques.
          </p>
          <div className="pricing-reassure-grid">
            <p>Capacité grande échelle</p>
            <p>Accompagnement personnalisé</p>
            <p>Infrastructure adaptée</p>
            <p>Tarification sur devis</p>
          </div>
          <div className="pricing-final-cta">
            <Link href="/admin" style={btnPrimary}>
              Nous contacter
            </Link>
          </div>
        </section>

        <section style={{ ...sectionY, paddingTop: "1rem", paddingBottom: "1rem" }}>
          <div className="pricing-bottom-reassurance">
            <span>Aucun engagement</span>
            <span>Paiement sécurisé avec Stripe</span>
            <span>Test gratuit disponible</span>
            <span>Fonctionne sans application</span>
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
        .pricing-micro-reassurance {
          margin: 0.55rem auto 0;
          max-width: 62ch;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .pricing-hero-cta {
          display: flex;
          gap: 0.7rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 1.2rem;
        }
        .pricing-count-wrap {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
          padding: 1rem;
        }
        .pricing-count-text {
          margin: -0.1rem auto 0.85rem;
          text-align: center;
          color: #475569;
          font-size: 0.9rem;
        }
        .pricing-count-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        .pricing-count-card {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 0.75rem 0.8rem;
        }
        .pricing-count-card-title {
          margin: 0;
          font-size: 0.8rem;
          color: #334155;
          font-weight: 700;
        }
        .pricing-count-card-value {
          margin: 0.25rem 0 0;
          font-size: 0.92rem;
          color: #5b21b6;
          font-weight: 800;
        }
        .pricing-count-note {
          margin: 0.8rem auto 0;
          text-align: center;
          color: #64748b;
          font-size: 0.78rem;
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
        .pricing-section-subtitle {
          margin: -0.15rem auto 1rem;
          max-width: 62ch;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
        }
        .pricing-monthly-subtitle {
          margin: -0.15rem auto 1rem;
          max-width: 62ch;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
        }
        .pricing-monthly-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }
        .pricing-card-wrap {
          display: flex;
          flex-direction: column;
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
        .pricing-card.monthly {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
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
          justify-content: flex-start;
          gap: 0.6rem;
          align-items: center;
          min-height: 1.7rem;
        }
        .pricing-card-badge-row {
          min-height: 1.7rem;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 0.15rem;
        }
        .pricing-card-badge-row.external {
          margin-bottom: 0.35rem;
        }
        .pricing-card-top {
          border: 1px solid #ede9fe;
          background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
          border-radius: 12px;
          padding: 0.7rem 0.72rem 0.68rem;
          min-height: 10.6rem;
        }
        .pricing-card.featured .pricing-card-top {
          border-color: #d8b4fe;
          background:
            radial-gradient(220px 90px at 85% -20%, rgba(167, 139, 250, 0.14), transparent 70%),
            linear-gradient(180deg, #ffffff 0%, #f8f2ff 100%);
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
        .pricing-plan-badge-placeholder {
          display: inline-flex;
          visibility: hidden;
          min-width: 1px;
          min-height: 1.2rem;
        }
        .pricing-plan-label {
          margin: 0.35rem 0 0;
          font-size: 0.88rem;
          color: #64748b;
          min-height: 2.2em;
        }
        .pricing-plan-sublabel {
          margin: 0.3rem 0 0;
          font-size: 0.76rem;
          color: #64748b;
          line-height: 1.4;
          min-height: 2.2em;
        }
        .pricing-price {
          margin: 0;
          display: flex;
          align-items: flex-end;
          gap: 0.28rem;
        }
        .pricing-price-box {
          margin: 0.72rem 0 0;
          min-height: 4.15rem;
          border-radius: 12px;
          border: 1px solid #ddd6fe;
          background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
          padding: 0.65rem 0.75rem;
          display: flex;
          align-items: center;
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
          font-size: 0.72rem;
          font-weight: 700;
          color: #6b7280;
          text-align: center;
          min-height: 1.15rem;
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
        .pricing-sub-plan {
          margin: 0 auto;
          max-width: 760px;
          border-radius: 14px;
          border: 1px solid #c4b5fd;
          background: linear-gradient(150deg, #f5f3ff 0%, #ffffff 100%);
          padding: 0.95rem 1rem;
          box-shadow: 0 10px 30px rgba(124, 58, 237, 0.1);
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
        .pricing-reassure-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.7rem;
          margin-top: 1rem;
        }
        .pricing-reassure-grid p {
          margin: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
          text-align: center;
          font-weight: 700;
          color: #334155;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          font-size: 0.82rem;
          padding: 0.72rem 0.8rem;
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
        .pricing-bottom-reassurance {
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.85rem 0.4rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.4rem;
          text-align: center;
          color: #64748b;
          font-size: 0.79rem;
          font-weight: 700;
        }
        @media (min-width: 640px) {
          .pricing-count-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .pricing-mode-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pricing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pricing-monthly-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pricing-bottom-reassurance {
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
          .pricing-monthly-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .pricing-reassure-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          .pricing-bottom-reassurance {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
