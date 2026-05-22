import Link from "next/link";

const DEMO_ACCENT = "#7c3aed";

const TIMELINE = [
  {
    step: "01",
    title: "Avant l’événement",
    line: "Partagez un lien unique ou un QR code pour informer vos participants et préparer l’expérience live.",
  },
  {
    step: "02",
    title: "Pendant le live",
    line: "Les participants accèdent aux votes depuis leur smartphone, sans application à installer.",
  },
  {
    step: "03",
    title: "Après l’événement",
    line: "La page reste disponible pour retrouver les photos, les temps forts et prolonger l’expérience.",
  },
];

const GALLERY = [
  {
    label: "Accueil des participants",
    gradient: "linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)",
  },
  {
    label: "Vote en direct",
    gradient: "linear-gradient(145deg, #a855f7 0%, #7c3aed 100%)",
  },
  {
    label: "Projection des résultats",
    gradient: "linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)",
  },
  {
    label: "Animation live",
    gradient: "linear-gradient(145deg, #ec4899 0%, #db2777 100%)",
  },
  {
    label: "Moments partagés",
    gradient: "linear-gradient(145deg, #f59e0b 0%, #d97706 100%)",
  },
  {
    label: "Souvenirs de l’événement",
    gradient: "linear-gradient(145deg, #14b8a6 0%, #0d9488 100%)",
  },
];

/** Page publique statique /e/demo — sans appel API ni événement en base. */
export function EventLandingDemoPage() {
  return (
    <main
      className="ev-landing-shell ev-demo-shell"
      style={{
        minHeight: "100vh",
        fontFamily:
          'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        color: "#0f172a",
        background: "#0f172a",
        ["--ev-accent"]: DEMO_ACCENT,
      }}
    >
      <style>{`
        .ev-demo-shell { -webkit-font-smoothing: antialiased; }
        @media (prefers-reduced-motion: no-preference) {
          .ev-demo-hero-content { animation: evDemoFadeUp 0.75s ease-out both; }
          .ev-demo-section { animation: evDemoFadeUp 0.65s ease-out 0.1s both; }
        }
        @keyframes evDemoFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ev-demo-shell .ev-landing-hero {
          min-height: min(100svh, 920px);
        }
        .ev-demo-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.32rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(248, 250, 252, 0.92);
          margin-bottom: 1rem;
        }
        .ev-demo-hero-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          justify-content: center;
          margin-top: clamp(1.5rem, 4vw, 2rem);
        }
        .ev-demo-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.95rem 1.55rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: clamp(0.95rem, 2.8vw, 1.05rem);
          letter-spacing: 0.02em;
          text-decoration: none;
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .ev-demo-cta-secondary:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.14);
        }
        .ev-demo-body {
          position: relative;
          z-index: 1;
          margin-top: -2.5rem;
          padding: 0 clamp(1rem, 4vw, 1.5rem) clamp(2.5rem, 6vw, 4rem);
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .ev-demo-timeline {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: 1fr;
          margin-bottom: clamp(1.75rem, 4vw, 2.5rem);
        }
        @media (min-width: 768px) {
          .ev-demo-timeline {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1rem;
          }
        }
        .ev-demo-timeline-card {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: clamp(1rem, 2.5vw, 1.2rem);
          box-shadow: 0 18px 40px rgba(2, 6, 23, 0.28);
        }
        .ev-demo-step {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: color-mix(in srgb, var(--ev-accent) 85%, #e9d5ff);
          margin-bottom: 0.45rem;
        }
        .ev-demo-timeline-title {
          margin: 0 0 0.4rem;
          font-size: 1.02rem;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }
        .ev-demo-timeline-line {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.5;
          color: rgba(226, 232, 240, 0.88);
        }
        .ev-demo-gallery-wrap {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(12px);
          padding: clamp(1.15rem, 3vw, 1.5rem);
          margin-bottom: clamp(1.75rem, 4vw, 2.5rem);
        }
        .ev-demo-gallery-head {
          margin-bottom: 1.1rem;
        }
        .ev-demo-gallery-eyebrow {
          margin: 0;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.95);
        }
        .ev-demo-gallery-title {
          margin: 0.35rem 0 0;
          font-size: clamp(1.35rem, 3.5vw, 1.75rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #f8fafc;
        }
        .ev-demo-gallery-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
        }
        @media (min-width: 640px) {
          .ev-demo-gallery-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1rem;
          }
        }
        .ev-demo-gallery-card {
          position: relative;
          aspect-ratio: 4 / 5;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 32px rgba(2, 6, 23, 0.35);
        }
        .ev-demo-gallery-card-bg {
          position: absolute;
          inset: 0;
        }
        .ev-demo-gallery-card-label {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 0.65rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 700;
          line-height: 1.35;
          color: #f8fafc;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(2, 6, 23, 0.82) 100%
          );
        }
        .ev-demo-final-cta {
          text-align: center;
          border-radius: 24px;
          padding: clamp(1.5rem, 4vw, 2.25rem) clamp(1.1rem, 3vw, 1.75rem);
          border: 1px solid rgba(167, 139, 250, 0.35);
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124, 58, 237, 0.28), transparent 70%),
            rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
        }
        .ev-demo-final-title {
          margin: 0;
          font-size: clamp(1.2rem, 3.2vw, 1.55rem);
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.03em;
        }
        .ev-demo-final-text {
          margin: 0.75rem auto 0;
          max-width: 40ch;
          font-size: 0.95rem;
          line-height: 1.55;
          color: rgba(226, 232, 240, 0.9);
        }
        .ev-demo-final-btn {
          display: inline-flex;
          margin-top: 1.25rem;
          padding: 0.95rem 1.75rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          color: #0c1222;
          background: #f8fafc;
          box-shadow: 0 8px 28px rgba(124, 58, 237, 0.25);
          transition: transform 0.2s ease;
        }
        .ev-demo-final-btn:hover {
          transform: translateY(-2px);
        }
        .ev-demo-home-link {
          display: block;
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.82rem;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.9);
          text-decoration: none;
        }
        .ev-demo-home-link:hover {
          color: #e9d5ff;
        }
      `}</style>

      <section className="ev-landing-hero" aria-labelledby="ev-demo-hero-title">
        <div
          className="ev-landing-hero-bg ev-landing-hero-bg--placeholder"
          aria-hidden
        />
        <div className="ev-landing-hero-overlay" aria-hidden />
        <div className="ev-landing-hero-content ev-demo-hero-content">
          <span className="ev-demo-badge">Démo publique Avote</span>
          <h1 id="ev-demo-hero-title" className="ev-landing-hero-title">
            Une landing événementielle prête à partager
          </h1>
          <p className="ev-landing-hero-desc">
            Avant, pendant et après votre événement, Avote vous permet de
            centraliser l’accès au live, les votes, les résultats et les
            souvenirs dans une page simple et élégante.
          </p>
          <div className="ev-demo-hero-ctas">
            <Link href="/join/demo" className="ev-landing-hero-cta">
              Rejoindre la salle live
            </Link>
            <Link href="/p/demo" className="ev-demo-cta-secondary">
              Voir l’écran de vote
            </Link>
          </div>
        </div>
      </section>

      <div className="ev-demo-body">
        <section className="ev-demo-section ev-demo-timeline" aria-label="Parcours événement">
          {TIMELINE.map((item) => (
            <article key={item.title} className="ev-demo-timeline-card">
              <span className="ev-demo-step">{item.step}</span>
              <h2 className="ev-demo-timeline-title">{item.title}</h2>
              <p className="ev-demo-timeline-line">{item.line}</p>
            </article>
          ))}
        </section>

        <section className="ev-demo-section ev-demo-gallery-wrap" aria-labelledby="ev-demo-gallery-title">
          <div className="ev-demo-gallery-head">
            <p className="ev-demo-gallery-eyebrow">Galerie</p>
            <h2 id="ev-demo-gallery-title" className="ev-demo-gallery-title">
              Galerie événement
            </h2>
          </div>
          <div className="ev-demo-gallery-grid">
            {GALLERY.map((card) => (
              <figure key={card.label} className="ev-demo-gallery-card">
                <div
                  className="ev-demo-gallery-card-bg"
                  style={{ background: card.gradient }}
                  aria-hidden
                />
                <figcaption className="ev-demo-gallery-card-label">
                  {card.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="ev-demo-section ev-demo-final-cta" aria-labelledby="ev-demo-final-title">
          <h2 id="ev-demo-final-title" className="ev-demo-final-title">
            Créez votre propre page événement
          </h2>
          <p className="ev-demo-final-text">
            Configurez votre événement Avote, personnalisez votre page publique
            et partagez un lien unique avec vos participants.
          </p>
          <Link href="/admin" className="ev-demo-final-btn">
            Créer un événement
          </Link>
        </section>

        <Link href="/" className="ev-demo-home-link">
          ← Retour à l’accueil Avote
        </Link>
      </div>

      <style>{`
        .ev-demo-shell .ev-landing-hero-bg--placeholder {
          background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--ev-accent) 32%, #0f172a) 0%,
            #0f172a 48%,
            #020617 100%
          );
        }
        .ev-demo-shell .ev-landing-hero-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            rgba(2, 6, 23, 0.45) 0%,
            rgba(15, 23, 42, 0.2) 40%,
            rgba(2, 6, 23, 0.92) 100%
          );
        }
        .ev-demo-shell .ev-landing-hero {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ev-demo-shell .ev-landing-hero-bg {
          position: absolute;
          inset: 0;
        }
        .ev-demo-shell .ev-landing-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: clamp(1.5rem, 5vw, 2.75rem) clamp(1.25rem, 4vw, 2rem)
            clamp(2.5rem, 7vw, 4rem);
          text-align: center;
          box-sizing: border-box;
        }
        .ev-demo-shell .ev-landing-hero-title {
          margin: 0;
          font-size: clamp(1.85rem, 6vw, 3rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.035em;
          color: #f8fafc;
          text-wrap: balance;
          text-shadow: 0 4px 48px rgba(0, 0, 0, 0.45);
        }
        .ev-demo-shell .ev-landing-hero-desc {
          margin: 1.1rem auto 0;
          max-width: 40rem;
          font-size: clamp(1rem, 2.8vw, 1.15rem);
          line-height: 1.55;
          color: rgba(226, 232, 240, 0.94);
        }
        .ev-demo-shell .ev-landing-hero-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1.05rem 2rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: clamp(1rem, 2.8vw, 1.1rem);
          text-decoration: none;
          color: #0c1222;
          background: #f8fafc;
          border: none;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.28);
          transition: transform 0.2s ease;
        }
        .ev-demo-shell .ev-landing-hero-cta:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </main>
  );
}
