import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";

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
  maxWidth: "960px",
  margin: "0 auto",
  padding: "1.25rem 1.25rem 4rem",
  boxSizing: "border-box",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.75rem 1.25rem",
  fontSize: "1rem",
  fontWeight: 600,
  borderRadius: "10px",
  border: "none",
  background: "#7c3aed",
  color: "#fff",
  textDecoration: "none",
  cursor: "pointer",
  boxShadow: "0 2px 12px rgba(124, 58, 237, 0.25)",
};

const btnSecondary = {
  ...btnPrimary,
  background: "#fff",
  color: "#5b21b6",
  border: "2px solid #ddd6fe",
  boxShadow: "none",
};

const sectionY = {
  paddingTop: "clamp(4rem, 10vw, 6.25rem)",
  paddingBottom: "clamp(4rem, 10vw, 6.25rem)",
};

function HeroMockup() {
  return (
    <div className="hero-mockup-wrap" aria-hidden>
      <div className="hero-qr-card">
        <div className="hero-qr-grid" />
      </div>

      <div className="hero-phone">
        <div className="hero-phone-top">
          <div className="hero-phone-notch" />
        </div>
        <div className="hero-phone-screen">
          <p className="hero-phone-question">
            Quel sujet voulez-vous aborder maintenant ?
          </p>
          <div className="hero-phone-choices">
            <button type="button" className="hero-choice hero-choice-active">
              Produit
            </button>
            <button type="button" className="hero-choice">Marketing</button>
            <button type="button" className="hero-choice">IA</button>
          </div>
          <button type="button" className="hero-phone-cta">Tester en live</button>
          <p className="hero-phone-foot">
            Sans application. Sans inscription pour voter.
          </p>
        </div>
      </div>

      <div className="hero-live-card">
        <div className="hero-live-head">
          <span className="hero-live-dot" />
          LIVE
        </div>
        {[
          { label: "Produit", pct: 42, w: "42%" },
          { label: "Marketing", pct: 33, w: "33%" },
          { label: "IA", pct: 25, w: "25%" },
        ].map((row) => (
          <div key={row.label} className="hero-live-row">
            <div className="hero-live-line">
              <span>{row.label}</span>
              <span>{row.pct}%</span>
            </div>
            <div className="hero-live-track">
              <div className="hero-live-fill" style={{ width: row.w }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveContestPreviewCard() {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #ddd6fe",
        background: "#fff",
        padding: "1.35rem 1.5rem",
        boxShadow: "0 18px 40px rgba(91, 33, 182, 0.08)",
        maxWidth: "420px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.18rem 0.45rem",
              borderRadius: "999px",
              border: "1px solid #c4b5fd",
              background: "#f5f3ff",
              color: "#6d28d9",
            }}
          >
            Concours
          </span>
          <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#0f172a" }}>
            Oui/Non + tirage
          </h3>
        </div>
      </div>

      <p
        style={{
          margin: "0 0 0.75rem 0",
          fontSize: "0.86rem",
          fontWeight: 600,
          color: "#334155",
          lineHeight: 1.4,
        }}
      >
        Souhaitez-vous participer au tirage au sort pour gagner un iPhone 15 ?
      </p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <span
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.45rem 0.5rem",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "2px solid #7c3aed",
            background: "#f5f3ff",
            color: "#5b21b6",
          }}
        >
          Oui
        </span>
        <span
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.45rem 0.5rem",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontWeight: 600,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            color: "#64748b",
          }}
        >
          Non
        </span>
      </div>

      <p
        style={{
          margin: "0 0 0.65rem 0",
          padding: "0.55rem 0.7rem",
          borderRadius: "10px",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#0f172a",
          background: "color-mix(in srgb, #7c3aed 12%, transparent)",
          border: "1px solid color-mix(in srgb, #7c3aed 28%, transparent)",
        }}
      >
        Merci pour votre participation !
      </p>

      <div
        style={{
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          background: "#fafafa",
          padding: "0.85rem 0.9rem",
        }}
      >
        <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.84rem", fontWeight: 700, color: "#1e293b" }}>
          Participant éligible
        </p>
        <div
          style={{
            padding: "0.52rem",
            borderRadius: "10px",
            textAlign: "center",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
            opacity: 0.88,
          }}
        >
          En attente du tirage
        </div>
      </div>
      <p style={{ margin: "0.85rem 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.45 }}>
        Aperçu décoratif — le formulaire s’ouvre après un vote sur l’option
        définie (ex. « Oui »), puis le participant devient éligible.
      </p>
    </div>
  );
}

function LiveQuestionPreviewCard() {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #ddd6fe",
        background: "#fff",
        padding: "1.35rem 1.5rem",
        boxShadow: "0 18px 40px rgba(91, 33, 182, 0.08)",
        maxWidth: "420px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "1rem" }}>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0.18rem 0.45rem",
            borderRadius: "999px",
            border: "1px solid #c4b5fd",
            background: "#f5f3ff",
            color: "#6d28d9",
          }}
        >
          Question
        </span>
        <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#0f172a" }}>
          Sondage
        </h3>
      </div>
      <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", fontWeight: 600, color: "#334155", lineHeight: 1.4 }}>
        Qui est le gagnant ?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {["Option A", "Option B", "Option C"].map((opt, idx) => (
          <div
            key={opt}
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: "10px",
              border: idx === 0 ? "2px solid #7c3aed" : "1px solid #e2e8f0",
              background: idx === 0 ? "#f5f3ff" : "#f8fafc",
              color: idx === 0 ? "#5b21b6" : "#64748b",
              fontSize: "0.8rem",
              fontWeight: idx === 0 ? 700 : 600,
              textAlign: "center",
            }}
          >
            {opt}
          </div>
        ))}
      </div>
      <p style={{ margin: "0.85rem 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.45 }}>
        Aperçu décoratif — vote classique à choix simple ou multiple.
      </p>
    </div>
  );
}

function LiveQuizPreviewCard() {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #bbf7d0",
        background: "#fff",
        padding: "1.35rem 1.5rem",
        boxShadow: "0 18px 40px rgba(22, 163, 74, 0.1)",
        maxWidth: "420px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "1rem" }}>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0.18rem 0.45rem",
            borderRadius: "999px",
            border: "1px solid #86efac",
            background: "#ecfdf5",
            color: "#166534",
          }}
        >
          Quiz
        </span>
        <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#0f172a" }}>
          1 bonne réponse
        </h3>
      </div>
      <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", fontWeight: 600, color: "#334155", lineHeight: 1.4 }}>
        Qui a marqué le premier but ?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {["Mbappé", "Dembélé", "Vitinha"].map((opt, idx) => (
          <div
            key={opt}
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: "10px",
              border: idx === 0 ? "2px solid #16a34a" : "1px solid #e2e8f0",
              background: idx === 0 ? "#f0fdf4" : "#f8fafc",
              color: idx === 0 ? "#166534" : "#64748b",
              fontSize: "0.8rem",
              fontWeight: idx === 0 ? 700 : 600,
              textAlign: "center",
              opacity: idx === 0 ? 1 : 0.75,
            }}
          >
            {opt}
          </div>
        ))}
      </div>
      <p style={{ margin: "0.85rem 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.45 }}>
        Aperçu décoratif — la bonne réponse est révélée en régie après fermeture du vote.
      </p>
    </div>
  );
}

function LiveResultsCardCompact() {
  const rows = [
    { label: "Option A — Lever de rideau", pct: 58, w: "58%" },
    { label: "Option B — Table ronde", pct: 34, w: "34%" },
    { label: "Option C — Networking", pct: 8, w: "8%" },
  ];

  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        background: "#fff",
        padding: "1.2rem 1.25rem",
        boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.95rem" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.2)",
          }}
        />
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
          Résultats en direct
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                color: "#475569",
                marginBottom: "0.3rem",
              }}
            >
              <span>{r.label}</span>
              <span style={{ fontWeight: 700, color: "#7c3aed" }}>{r.pct}%</span>
            </div>
            <div
              style={{
                height: "9px",
                borderRadius: "99px",
                background: "#f1f5f9",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: r.w,
                  height: "100%",
                  borderRadius: "99px",
                  background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "0.85rem 0 0", fontSize: "0.76rem", color: "#94a3b8", textAlign: "center" }}>
        Aperçu décoratif — vos vrais chiffres s’affichent pendant l’événement
      </p>
    </div>
  );
}

/** Aperçu landing : question Lead (Oui/Non + formulaire) après vote déclencheur — 100 % décoratif. */
function LiveLeadCapturePreviewCard() {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #ddd6fe",
        background: "#fff",
        padding: "1.35rem 1.5rem",
        boxShadow: "0 18px 40px rgba(91, 33, 182, 0.08)",
        maxWidth: "420px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.18rem 0.45rem",
              borderRadius: "999px",
              border: "1px solid #c4b5fd",
              background: "#f5f3ff",
              color: "#6d28d9",
            }}
          >
            Lead
          </span>
          <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700, color: "#0f172a" }}>
            Oui/Non + formulaire
          </h3>
        </div>
      </div>

      <p
        style={{
          margin: "0 0 0.75rem 0",
          fontSize: "0.86rem",
          fontWeight: 600,
          color: "#334155",
          lineHeight: 1.4,
        }}
      >
        Souhaitez-vous être recontacté(e) après la session ?
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.85rem",
        }}
      >
        <span
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.45rem 0.5rem",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "2px solid #7c3aed",
            background: "#f5f3ff",
            color: "#5b21b6",
          }}
        >
          Oui
        </span>
        <span
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.45rem 0.5rem",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontWeight: 600,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            color: "#64748b",
          }}
        >
          Non
        </span>
      </div>

      <p
        style={{
          margin: "0 0 0.65rem 0",
          padding: "0.55rem 0.7rem",
          borderRadius: "10px",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#0f172a",
          background: "color-mix(in srgb, #7c3aed 12%, transparent)",
          border: "1px solid color-mix(in srgb, #7c3aed 28%, transparent)",
        }}
      >
        Merci pour votre vote !
      </p>

      <div
        style={{
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          background: "#fafafa",
          padding: "0.85rem 0.9rem",
        }}
      >
        <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.84rem", fontWeight: 700, color: "#1e293b" }}>
          Restez en contact
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {[
            { ph: "Prénom", v: "Alex" },
            { ph: "Téléphone", v: "06 12 34 56 78" },
            { ph: "E-mail (optionnel)", v: "" },
          ].map((f) => (
            <div
              key={f.ph}
              style={{
                padding: "0.48rem 0.55rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontSize: "0.8rem",
                color: f.v ? "#334155" : "#94a3b8",
              }}
            >
              {f.v || f.ph}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "0.6rem",
            padding: "0.52rem",
            borderRadius: "10px",
            textAlign: "center",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
            opacity: 0.85,
          }}
        >
          Envoyer
        </div>
      </div>

      <p style={{ margin: "0.85rem 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.45 }}>
        Aperçu décoratif — le formulaire s’ouvre après un vote sur l’option
        définie (ex. « Oui »).
      </p>
      <p style={{ margin: "0.65rem 0 0", fontSize: "0.76rem", color: "#64748b", textAlign: "center", lineHeight: 1.45 }}>
        Les contacts sont retrouvables dans votre espace{' '}
        <Link href="/admin/leads" style={{ color: "#7c3aed", fontWeight: 700 }}>
          Mes leads
        </Link>
        {' '}une fois connecté.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div style={shell}>
      <LandingHeader />

      <main style={{ ...inner, flex: 1 }}>
        {/* Hero */}
        <section id="hero" className="landing-hero" style={{ ...sectionY }}>
          <div className="landing-hero-text">
            <span className="hero-eyebrow">Vote interactif en direct</span>
            <h1 className="hero-title">
              Faites voter
              <br />
              votre&nbsp;audience
              <br />
              en direct.
            </h1>
            <p className="hero-subtitle">
              <span>Un QR code.</span>
              <span>Quelques secondes pour répondre.</span>
              <span>Résultats affichés instantanément sur écran.</span>
            </p>
            <div className="hero-cta-row">
              <Link href="/join/demo" style={btnPrimary} className="hero-cta-primary">
                Tester en live
              </Link>
              <Link href="/admin" style={btnSecondary} className="hero-cta-secondary">
                Créer un événement gratuit
              </Link>
            </div>
            <p className="hero-reassurance">
              Sans application. Sans inscription pour voter.
            </p>
          </div>
          <div className="landing-hero-visual">
            <HeroMockup />
          </div>
        </section>

        {/* Comment ça marche — version premium */}
        <section id="how" style={sectionY}>
          <div className="how-premium-wrap">
            <div className="how-premium-head">
              <p className="how-eyebrow">Flow produit</p>
              <h2 className="how-title">Comment ça marche</h2>
              <p className="how-subtitle">
                Trois étapes simples pour passer de la préparation au résultat
                live, sans friction.
              </p>
            </div>

            <div className="how-timeline" aria-hidden />

            <div className="how-grid">
              {[
                {
                  step: "01",
                  icon: "✏️",
                  title: "Créez votre événement",
                  line: "Questions et réponses prêtes avant le live.",
                  micro: "Questions configurées · prête à lancer",
                },
                {
                  step: "02",
                  icon: "📱",
                  title: "Partagez le QR code",
                  line: "L’audience rejoint en un scan, sans app à installer.",
                  micro: "Scan instantané · accès mobile immédiat",
                },
                {
                  step: "03",
                  icon: "📊",
                  title: "Lancez et affichez les résultats",
                  line: "Régie, votes et écran restent synchros en direct.",
                  micro: "Votes + écran + régie synchronisés",
                },
              ].map((step, idx) => (
                <article key={step.title} className="how-card">
                  <div className="how-card-top">
                    <span className="how-step">{step.step}</span>
                    <span className="how-icon" aria-hidden>
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="how-card-title">{step.title}</h3>
                  <p className="how-card-line">{step.line}</p>

                  {idx === 0 ? (
                    <div className="how-micro how-micro-compose" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}
                  {idx === 1 ? (
                    <div className="how-micro how-micro-qr" aria-hidden>
                      <div />
                    </div>
                  ) : null}
                  {idx === 2 ? (
                    <div className="how-micro how-micro-bars" aria-hidden>
                      <span style={{ width: "68%" }} />
                      <span style={{ width: "42%" }} />
                      <span style={{ width: "24%" }} />
                    </div>
                  ) : null}

                  <p className="how-card-micro">{step.micro}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pensé pour le live — version premium */}
        <section id="live" style={sectionY}>
          <div className="live-premium-wrap">
            <div className="live-premium-head">
              <p className="live-eyebrow">Fiabilité produit</p>
              <h2 className="live-title">Pensé pour le live</h2>
              <p className="live-subtitle">
                Une base robuste pour animer sans friction, du vote participant
                à l’affichage en salle.
              </p>
            </div>

            <div className="live-grid">
              {[
                {
                  icon: "⚡",
                  title: "Mise à jour en temps réel",
                  micro: "Temps réel natif",
                },
                {
                  icon: "🔗",
                  title: "Synchronisation régie / participants / écran",
                  micro: "Synchronisation continue",
                },
                {
                  icon: "✨",
                  title: "Aucune installation",
                  micro: "Accès direct via lien",
                },
              ].map((item, idx) => (
                <article key={item.title} className="live-card">
                  <div className="live-card-top">
                    <span className="live-icon" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="live-badge">
                      {idx === 0 ? "Live" : idx === 1 ? "Sync" : "Simple"}
                    </span>
                  </div>
                  <h3 className="live-card-title">{item.title}</h3>
                  <div className="live-mini" aria-hidden>
                    {idx === 0 ? (
                      <span className="live-pulse" />
                    ) : idx === 1 ? (
                      <span className="live-links" />
                    ) : (
                      <span className="live-check" />
                    )}
                  </div>
                  <p className="live-card-micro">{item.micro}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Preuve visuelle — concours + collecte leads (aperçus décoratifs) */}
        <section style={sectionY} aria-labelledby="landing-proof-heading">
          <h2
            id="landing-proof-heading"
            style={{
              fontSize: "clamp(1.1rem, 2.6vw, 1.35rem)",
              fontWeight: 800,
              textAlign: "center",
              margin: "0 0 0.45rem",
              color: "#1e293b",
              letterSpacing: "-0.02em",
            }}
          >
            Ce que vivent vos participants
          </h2>
          <p
            style={{
              margin: "0 auto 1.5rem",
              maxWidth: "42ch",
              textAlign: "center",
              fontSize: "0.92rem",
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            Une carte par type de vote, pour montrer clairement les 4 usages :{" "}
            <strong style={{ color: "#4c1d95" }}>
              Question sondage, Lead, Participation concours, Quiz
            </strong>.
          </p>
          <div className="landing-proof-grid">
            <LiveQuestionPreviewCard />
            <LiveContestPreviewCard />
            <LiveLeadCapturePreviewCard />
            <LiveQuizPreviewCard />
          </div>
        </section>

        <section style={sectionY} aria-labelledby="landing-live-results-heading">
          <div className="results-dedicated-wrap">
            <div className="results-dedicated-copy">
              <p className="results-eyebrow">Lecture instantanée</p>
              <h2 id="landing-live-results-heading" className="results-title">
                Vos résultats parlent en temps réel
              </h2>
              <p className="results-slogan">
                Un vote, un impact visuel immédiat.
              </p>
              <p className="results-explain">
                Dès qu’un participant répond, les barres s’actualisent en direct.
                Régie, participants et écran voient la même dynamique au même moment.
                Idéal pour maintenir l’attention et rythmer une session live.
              </p>
            </div>
            <div className="results-dedicated-visual">
              <LiveResultsCardCompact />
            </div>
          </div>
        </section>

        {/* Cas d’usage — version premium */}
        <section style={sectionY}>
          <div className="usecases-wrap">
            <div className="usecases-head">
              <p className="usecases-eyebrow">Cas d’usage Avote</p>
              <h2 className="usecases-title">Où Avote crée de l’impact</h2>
              <p className="usecases-subtitle">
                Du live événementiel à la génération de leads qualifiés :
                activez votre audience et obtenez des résultats exploitables.
              </p>
            </div>

            <div className="usecases-highlight">
              <span className="usecases-highlight-pill">Focus conversion</span>
              <p>
                <strong>Marketing & business</strong> : génération de leads,
                qualification prospects et collecte d’emails/téléphones pendant
                le live.
              </p>
            </div>

            <div className="usecases-grid">
              {[
                {
                  icon: "🎤",
                  title: "Événementiel & conférences",
                  points: [
                    "Conférences et keynotes interactives",
                    "Tables rondes avec vote du public",
                    "Salons professionnels (engagement visiteurs)",
                  ],
                },
                {
                  icon: "🏢",
                  title: "Entreprises & interne",
                  points: [
                    "Réunions d’équipe interactives",
                    "Votes internes (décisions rapides)",
                    "Feedback collaborateurs en live",
                  ],
                },
                {
                  icon: "🎓",
                  title: "Formation & éducation",
                  points: [
                    "Quiz en salle et tests en direct",
                    "Formation interactive (engagement apprenants)",
                    "Évaluation post-formation",
                  ],
                },
                {
                  icon: "🎭",
                  title: "Public & collectivités",
                  points: [
                    "Assemblées générales et votes officiels",
                    "Consultations citoyennes",
                    "Débats publics interactifs",
                  ],
                },
                {
                  icon: "🎬",
                  title: "Divertissement & médias",
                  points: [
                    "Votes du public (talent show)",
                    "Jeux / quiz live et streams",
                    "Podcasts et émissions interactives",
                  ],
                },
                {
                  icon: "🛍️",
                  title: "Marketing & business",
                  points: [
                    "Génération de leads en live",
                    "Qualification prospects (intérêt produit)",
                    "Landing page interactive",
                  ],
                },
                {
                  icon: "⚽",
                  title: "Sport & événements live",
                  points: [
                    "Votes supporters (MVP, pronostics)",
                    "Animation écran géant",
                    "Jeux concours live",
                  ],
                },
                {
                  icon: "⛪",
                  title: "Associations & communautés",
                  points: [
                    "Votes associatifs",
                    "Décisions collectives",
                    "Animation de communauté",
                  ],
                },
              ].map((block) => (
                <article key={block.title} className="usecase-card">
                  <div className="usecase-card-top">
                    <span className="usecase-icon" aria-hidden>
                      {block.icon}
                    </span>
                    <h3 className="usecase-title">{block.title}</h3>
                  </div>
                  <ul className="usecase-points">
                    {block.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section
          style={{
            ...sectionY,
            textAlign: "center",
            padding: "clamp(3rem, 8vw, 5rem) 1.25rem",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ede9fe 0%, #fae8ff 100%)",
            border: "1px solid #ddd6fe",
            marginBottom: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(1.15rem, 2.5vw, 1.35rem)",
              fontWeight: 700,
              margin: "0 0 1.5rem",
              color: "#4c1d95",
            }}
          >
            Prêt à animer votre prochain live ?
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <Link href="/admin" style={{ ...btnPrimary, padding: "0.9rem 1.75rem", fontSize: "1.05rem" }}>
              Créer mon événement
            </Link>
            <Link
              href="/join/demo"
              style={{ ...btnSecondary, padding: "0.9rem 1.75rem", fontSize: "1.05rem" }}
            >
              Voir une démo
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
        .landing-hero {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(2rem, 5vw, 3rem);
          align-items: center;
        }
        .landing-hero-text {
          text-align: left;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 0.28rem 0.68rem;
          border-radius: 999px;
          border: 1px solid #ddd6fe;
          background: rgba(255, 255, 255, 0.9);
          color: #6d28d9;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.95rem;
        }
        .hero-title {
          margin: 0;
          font-size: clamp(2rem, 5.4vw, 3.25rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 830;
          color: #0f172a;
          max-width: 16ch;
        }
        .hero-subtitle {
          margin: 1rem 0 0;
          max-width: 48ch;
          font-size: clamp(1rem, 2vw, 1.14rem);
          color: #475569;
          line-height: 1.6;
          display: grid;
          gap: 0.18rem;
        }
        .hero-subtitle > span {
          display: block;
        }
        .hero-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.95rem;
        }
        .hero-cta-primary {
          padding: 1rem 1.75rem !important;
          font-size: 1.03rem !important;
          font-weight: 720 !important;
          box-shadow: 0 14px 30px rgba(124, 58, 237, 0.34) !important;
        }
        .hero-cta-secondary {
          padding: 0.92rem 1.3rem !important;
        }
        .hero-reassurance {
          margin: 1.3rem 0 0;
          font-size: 0.86rem;
          color: #64748b;
          font-weight: 520;
        }
        .landing-hero-visual {
          width: 100%;
        }
        .hero-mockup-wrap {
          position: relative;
          min-height: 420px;
          width: min(100%, 520px);
          margin-left: auto;
          margin-right: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }
        .hero-mockup-wrap::before {
          content: "";
          position: absolute;
          width: 72%;
          aspect-ratio: 1 / 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.22), rgba(124, 58, 237, 0));
          filter: blur(8px);
          z-index: 0;
        }
        .hero-phone {
          position: relative;
          z-index: 2;
          width: min(88vw, 330px);
          border-radius: 2rem;
          padding: 0.46rem;
          background: linear-gradient(145deg, #0f172a 0%, #334155 100%);
          box-shadow:
            0 34px 60px rgba(15, 23, 42, 0.24),
            0 0 0 1px rgba(255, 255, 255, 0.14) inset;
        }
        .hero-phone-top {
          height: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .hero-phone-notch {
          width: 68px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
        }
        .hero-phone-screen {
          border-radius: 1.4rem;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 1rem 0.9rem 0.95rem;
          min-height: 320px;
          display: flex;
          flex-direction: column;
        }
        .hero-phone-question {
          margin: 0;
          font-size: 0.94rem;
          line-height: 1.35;
          font-weight: 750;
          color: #0f172a;
        }
        .hero-phone-choices {
          margin-top: 0.82rem;
          display: grid;
          gap: 0.45rem;
        }
        .hero-choice {
          width: 100%;
          text-align: left;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          border-radius: 12px;
          padding: 0.54rem 0.62rem;
          font-size: 0.8rem;
          font-weight: 640;
        }
        .hero-choice-active {
          border-color: #c4b5fd;
          background: #f5f3ff;
          color: #5b21b6;
        }
        .hero-phone-cta {
          margin-top: auto;
          border: 1px solid #6d28d9;
          background: linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%);
          color: #fff;
          border-radius: 11px;
          padding: 0.6rem 0.7rem;
          font-size: 0.83rem;
          font-weight: 760;
          box-shadow: 0 10px 22px rgba(124, 58, 237, 0.24);
        }
        .hero-phone-foot {
          margin: 0.55rem 0 0;
          text-align: center;
          font-size: 0.66rem;
          color: #94a3b8;
          line-height: 1.35;
        }
        .hero-live-card {
          position: absolute;
          right: 2%;
          top: 56%;
          transform: translateY(-50%);
          z-index: 3;
          width: min(44vw, 200px);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid #e9d5ff;
          box-shadow:
            0 24px 46px rgba(91, 33, 182, 0.18),
            0 0 0 1px rgba(255, 255, 255, 0.45) inset;
          backdrop-filter: blur(10px);
          padding: 0.7rem 0.78rem;
          animation: heroFloat 4.8s ease-in-out infinite;
        }
        .hero-live-head {
          display: inline-flex;
          align-items: center;
          gap: 0.32rem;
          margin-bottom: 0.48rem;
          font-size: 0.62rem;
          font-weight: 800;
          color: #6d28d9;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .hero-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45);
          animation: heroPulse 2.4s ease-out infinite;
        }
        .hero-live-row {
          margin-bottom: 0.34rem;
        }
        .hero-live-row:last-child {
          margin-bottom: 0;
        }
        .hero-live-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
          font-size: 0.67rem;
          color: #64748b;
        }
        .hero-live-track {
          height: 6px;
          border-radius: 999px;
          background: #f1f5f9;
          overflow: hidden;
        }
        .hero-live-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%);
          animation: heroBars 1.2s ease-out;
        }
        .hero-qr-card {
          position: absolute;
          left: 4%;
          top: 8%;
          z-index: 4;
          width: 72px;
          height: 72px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
          padding: 0.4rem;
          opacity: 0.78;
        }
        .hero-qr-grid {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          background:
            repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 5px),
            repeating-linear-gradient(0deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 5px);
          opacity: 0.88;
        }
        @keyframes heroPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(-50%); }
          50% { transform: translateY(-54%); }
        }
        @keyframes heroBars {
          from { transform: scaleX(0.25); transform-origin: left center; opacity: 0.6; }
          to { transform: scaleX(1); transform-origin: left center; opacity: 1; }
        }
        @media (min-width: 980px) {
          .landing-hero {
            grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
            gap: clamp(2.4rem, 4vw, 3.6rem);
          }
        }
        @media (max-width: 979px) {
          .landing-hero {
            text-align: left;
          }
          .hero-title {
            max-width: 18ch;
          }
        }
        @media (max-width: 760px) {
          .landing-hero {
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }
          .hero-title,
          .hero-subtitle,
          .hero-reassurance {
            text-align: left;
          }
          .hero-cta-row {
            justify-content: flex-start;
          }
          .hero-mockup-wrap {
            min-height: 360px;
            width: 100%;
            max-width: 380px;
            padding-left: 0.8rem;
            padding-right: 0.8rem;
          }
          .hero-phone {
            width: min(86vw, 290px);
          }
          .hero-live-card {
            right: 0;
            top: auto;
            bottom: 5%;
            transform: none;
            width: min(46vw, 178px);
            animation: none;
          }
          .hero-qr-card {
            left: 2%;
            top: 6%;
            width: 62px;
            height: 62px;
            padding: 0.36rem;
            opacity: 0.72;
          }
        }
        .how-premium-wrap {
          position: relative;
          border-radius: 26px;
          border: 1px solid #ddd6fe;
          background:
            radial-gradient(900px 260px at 50% -8%, rgba(124, 58, 237, 0.12), transparent 62%),
            linear-gradient(160deg, #f8fafc 0%, #ffffff 45%, #faf5ff 100%);
          padding: clamp(1.45rem, 3.8vw, 2.3rem);
          box-shadow: 0 24px 58px rgba(76, 29, 149, 0.08);
          overflow: hidden;
        }
        .how-premium-head {
          text-align: center;
          max-width: 650px;
          margin: 0 auto;
        }
        .how-eyebrow {
          margin: 0 0 0.5rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
        }
        .how-title {
          margin: 0;
          font-size: clamp(1.45rem, 3.4vw, 2rem);
          line-height: 1.14;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: #0f172a;
        }
        .how-subtitle {
          margin: 0.8rem auto 0;
          max-width: 44ch;
          font-size: clamp(0.9rem, 2.2vw, 1rem);
          color: #64748b;
        }
        .how-timeline {
          display: none;
        }
        .how-grid {
          margin-top: clamp(1.2rem, 3.5vw, 1.8rem);
          display: grid;
          gap: 0.95rem;
          grid-template-columns: 1fr;
        }
        .how-card {
          position: relative;
          border-radius: 18px;
          border: 1px solid #e9d5ff;
          background: rgba(255, 255, 255, 0.86);
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          padding: clamp(1rem, 2.5vw, 1.2rem);
          min-height: 212px;
          display: flex;
          flex-direction: column;
          transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
        }
        .how-card:hover {
          transform: translateY(-3px);
          border-color: #c4b5fd;
          box-shadow:
            0 18px 42px rgba(91, 33, 182, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }
        .how-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          margin-bottom: 0.7rem;
        }
        .how-step {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2.2rem;
          padding: 0.16rem 0.48rem;
          border-radius: 999px;
          border: 1px solid #c4b5fd;
          background: #f5f3ff;
          color: #6d28d9;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .how-icon {
          width: 2.15rem;
          height: 2.15rem;
          border-radius: 10px;
          border: 1px solid #ddd6fe;
          background: #faf5ff;
          display: grid;
          place-items: center;
          font-size: 1.05rem;
        }
        .how-card-title {
          margin: 0;
          font-size: 1.01rem;
          line-height: 1.3;
          font-weight: 750;
          color: #111827;
        }
        .how-card-line {
          margin: 0.46rem 0 0;
          font-size: 0.89rem;
          line-height: 1.5;
          color: #64748b;
        }
        .how-micro {
          margin-top: 0.85rem;
          border-radius: 11px;
          border: 1px solid #ede9fe;
          background: #f8fafc;
          padding: 0.5rem;
        }
        .how-micro-compose {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.35rem;
        }
        .how-micro-compose span {
          display: block;
          height: 26px;
          border-radius: 7px;
          border: 1px solid #ddd6fe;
          background: #fff;
        }
        .how-micro-qr {
          display: grid;
          place-items: center;
        }
        .how-micro-qr > div {
          width: 42px;
          height: 42px;
          border-radius: 8px;
          border: 1px solid #d8b4fe;
          background:
            repeating-linear-gradient(90deg, #7c3aed 0 2px, transparent 2px 4px),
            repeating-linear-gradient(0deg, #7c3aed 0 2px, transparent 2px 4px);
          opacity: 0.85;
        }
        .how-micro-bars span {
          display: block;
          height: 7px;
          border-radius: 999px;
          margin-bottom: 0.32rem;
          background: linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%);
        }
        .how-card-micro {
          margin: auto 0 0;
          padding-top: 0.75rem;
          font-size: 0.73rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #7c3aed;
        }
        @media (min-width: 820px) {
          .how-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.05rem;
          }
          .how-timeline {
            position: absolute;
            display: block;
            left: clamp(2rem, 6vw, 3.2rem);
            right: clamp(2rem, 6vw, 3.2rem);
            top: clamp(11.1rem, 19vw, 12.2rem);
            height: 2px;
            background: linear-gradient(90deg, rgba(167, 139, 250, 0.16), rgba(124, 58, 237, 0.55), rgba(167, 139, 250, 0.16));
            z-index: 0;
          }
          .how-card {
            z-index: 1;
          }
        }
        .live-premium-wrap {
          position: relative;
          border-radius: 24px;
          border: 1px solid #ddd6fe;
          background:
            radial-gradient(900px 260px at 50% -10%, rgba(124, 58, 237, 0.12), transparent 62%),
            linear-gradient(160deg, #faf5ff 0%, #ffffff 52%, #f8fafc 100%);
          padding: clamp(1.45rem, 3.8vw, 2.3rem);
          box-shadow: 0 22px 48px rgba(76, 29, 149, 0.08);
        }
        .live-premium-head {
          text-align: center;
          max-width: 640px;
          margin: 0 auto;
        }
        .live-eyebrow {
          margin: 0 0 0.45rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
        }
        .live-title {
          margin: 0;
          font-size: clamp(1.35rem, 3.2vw, 1.85rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          color: #4c1d95;
        }
        .live-subtitle {
          margin: 0.75rem auto 0;
          max-width: 44ch;
          font-size: clamp(0.9rem, 2.2vw, 1rem);
          color: #64748b;
        }
        .live-grid {
          margin-top: clamp(1.2rem, 3.4vw, 1.8rem);
          display: grid;
          gap: 0.95rem;
          grid-template-columns: 1fr;
        }
        .live-card {
          border-radius: 18px;
          border: 1px solid #e9d5ff;
          background: rgba(255, 255, 255, 0.9);
          box-shadow:
            0 10px 28px rgba(15, 23, 42, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          padding: clamp(1rem, 2.4vw, 1.2rem);
          min-height: 172px;
          display: flex;
          flex-direction: column;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .live-card:hover {
          transform: translateY(-3px);
          border-color: #c4b5fd;
          box-shadow:
            0 18px 40px rgba(91, 33, 182, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }
        .live-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.72rem;
        }
        .live-icon {
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 11px;
          display: grid;
          place-items: center;
          border: 1px solid #ddd6fe;
          background: #faf5ff;
          font-size: 1.06rem;
        }
        .live-badge {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.16rem 0.48rem;
          border-radius: 999px;
          border: 1px solid #c4b5fd;
          background: #f5f3ff;
          color: #6d28d9;
        }
        .live-card-title {
          margin: 0;
          font-size: 1rem;
          line-height: 1.34;
          font-weight: 750;
          color: #1f2937;
        }
        .live-mini {
          margin-top: 0.8rem;
          border-radius: 10px;
          border: 1px solid #ede9fe;
          background: #f8fafc;
          min-height: 34px;
          display: flex;
          align-items: center;
          padding: 0.45rem 0.6rem;
        }
        .live-pulse,
        .live-links,
        .live-check {
          display: block;
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, #a78bfa 0%, #7c3aed 100%);
        }
        .live-pulse {
          width: 68%;
          box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.22);
        }
        .live-links {
          width: 84%;
          background:
            linear-gradient(90deg, #a78bfa 0 30%, transparent 30% 36%, #8b5cf6 36% 64%, transparent 64% 70%, #7c3aed 70% 100%);
        }
        .live-check {
          width: 46%;
          background: linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%);
          position: relative;
        }
        .live-check::after {
          content: "✓";
          position: absolute;
          right: -1.35rem;
          top: -0.48rem;
          font-size: 0.92rem;
          color: #7c3aed;
          font-weight: 800;
        }
        .live-card-micro {
          margin: auto 0 0;
          padding-top: 0.72rem;
          font-size: 0.73rem;
          font-weight: 600;
          color: #7c3aed;
        }
        @media (min-width: 820px) {
          .live-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.05rem;
          }
        }
        .landing-proof-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: 1fr;
          max-width: 980px;
          margin: 0 auto;
          align-items: stretch;
        }
        @media (min-width: 840px) {
          .landing-proof-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1.35rem;
          }
        }
        .results-dedicated-wrap {
          border-radius: 22px;
          border: 1px solid #ddd6fe;
          background:
            radial-gradient(680px 220px at 20% -10%, rgba(124, 58, 237, 0.1), transparent 62%),
            linear-gradient(155deg, #ffffff 0%, #f8fafc 54%, #faf5ff 100%);
          box-shadow: 0 20px 46px rgba(76, 29, 149, 0.08);
          padding: clamp(1.2rem, 3.5vw, 2rem);
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
          align-items: center;
        }
        .results-eyebrow {
          margin: 0 0 0.45rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
        }
        .results-title {
          margin: 0;
          font-size: clamp(1.2rem, 2.8vw, 1.7rem);
          font-weight: 800;
          line-height: 1.16;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .results-slogan {
          margin: 0.55rem 0 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #5b21b6;
        }
        .results-explain {
          margin: 0.65rem 0 0;
          max-width: 52ch;
          font-size: 0.9rem;
          line-height: 1.55;
          color: #64748b;
        }
        .results-dedicated-visual {
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
        }
        @media (min-width: 920px) {
          .results-dedicated-wrap {
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
            gap: 1.25rem;
          }
          .results-dedicated-copy {
            padding-right: 0.5rem;
          }
        }
        .usecases-wrap {
          border-radius: 24px;
          border: 1px solid #ddd6fe;
          background:
            radial-gradient(780px 220px at 50% -10%, rgba(124, 58, 237, 0.12), transparent 65%),
            linear-gradient(160deg, #f8fafc 0%, #ffffff 55%, #faf5ff 100%);
          box-shadow: 0 22px 52px rgba(76, 29, 149, 0.08);
          padding: clamp(1.35rem, 3.8vw, 2.2rem);
        }
        .usecases-head {
          text-align: center;
          max-width: 690px;
          margin: 0 auto;
        }
        .usecases-eyebrow {
          margin: 0 0 0.48rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c3aed;
        }
        .usecases-title {
          margin: 0;
          font-size: clamp(1.4rem, 3.2vw, 1.95rem);
          line-height: 1.15;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: #0f172a;
        }
        .usecases-subtitle {
          margin: 0.8rem auto 0;
          max-width: 50ch;
          font-size: clamp(0.9rem, 2.2vw, 1rem);
          color: #64748b;
          line-height: 1.55;
        }
        .usecases-highlight {
          margin: 1rem auto 0;
          max-width: 760px;
          border: 1px solid #d8b4fe;
          border-radius: 14px;
          background: linear-gradient(135deg, #faf5ff 0%, #fff 100%);
          padding: 0.8rem 0.95rem;
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
        }
        .usecases-highlight p {
          margin: 0;
          color: #4b5563;
          font-size: 0.87rem;
          line-height: 1.45;
        }
        .usecases-highlight-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.22rem 0.52rem;
          border-radius: 999px;
          background: #f5f3ff;
          border: 1px solid #c4b5fd;
          color: #6d28d9;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .usecases-grid {
          margin-top: 1.1rem;
          display: grid;
          gap: 0.9rem;
          grid-template-columns: 1fr;
        }
        .usecase-card {
          border-radius: 16px;
          border: 1px solid #e9d5ff;
          background: rgba(255, 255, 255, 0.9);
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          padding: 0.95rem 1rem;
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .usecase-card:hover {
          transform: translateY(-2px);
          border-color: #c4b5fd;
          box-shadow:
            0 18px 42px rgba(91, 33, 182, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }
        .usecase-card-top {
          display: flex;
          align-items: center;
          gap: 0.58rem;
          margin-bottom: 0.6rem;
        }
        .usecase-icon {
          width: 1.95rem;
          height: 1.95rem;
          border-radius: 10px;
          display: grid;
          place-items: center;
          border: 1px solid #ddd6fe;
          background: #faf5ff;
          font-size: 0.95rem;
          flex-shrink: 0;
        }
        .usecase-title {
          margin: 0;
          font-size: 0.94rem;
          line-height: 1.3;
          font-weight: 760;
          color: #111827;
        }
        .usecase-points {
          margin: 0;
          padding: 0 0 0 1.05rem;
          display: grid;
          gap: 0.28rem;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.45;
        }
        .usecase-points li::marker {
          color: #8b5cf6;
        }
        @media (min-width: 700px) {
          .usecases-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (min-width: 1040px) {
          .usecases-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
