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
  const choiceBtn = {
    padding: "0.55rem 0.65rem",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#334155",
    background: "#f8fafc",
    textAlign: "left",
  };

  return (
    <div className="hero-mockup-wrap" aria-hidden>
      {/* Carte QR */}
      <div
        style={{
          position: "absolute",
          left: "0",
          top: "12%",
          width: "5.5rem",
          height: "5.5rem",
          borderRadius: "12px",
          background: "#fff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
          padding: "0.45rem",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "6px",
            background:
              "repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 3px, transparent 3px, transparent 5px)," +
              "repeating-linear-gradient(0deg, #0f172a 0px, #0f172a 3px, transparent 3px, transparent 5px)",
            backgroundBlendMode: "multiply",
            opacity: 0.92,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "28%",
            background: "#fff",
            borderRadius: "4px",
            border: "2px solid #0f172a",
          }}
        />
      </div>

      {/* Téléphone */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          margin: "0 auto",
          width: "min(100%, 242px)",
          borderRadius: "2rem",
          padding: "0.45rem",
          background: "linear-gradient(145deg, #334155 0%, #1e293b 100%)",
          boxShadow:
            "0 24px 48px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
      >
        <div
          style={{
            height: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.35rem",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "5px",
              borderRadius: "99px",
              background: "rgba(255,255,255,0.12)",
            }}
          />
        </div>
        <div
          style={{
            borderRadius: "1.35rem",
            background: "linear-gradient(180deg, #f8fafc 0%, #fff 100%)",
            padding: "1rem 0.85rem 1.1rem",
            minHeight: "280px",
            border: "1px solid #e2e8f0",
          }}
        >
          <p
            style={{
              margin: "0 0 1rem",
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.35,
            }}
          >
            Quelle session ouvrez-vous en premier ?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            <div style={{ ...choiceBtn, borderColor: "#c4b5fd", background: "#f5f3ff" }}>
              ▣ UX &amp; design
            </div>
            <div style={choiceBtn}>□ Data &amp; live</div>
            <div style={choiceBtn}>□ Q&amp;R publique</div>
          </div>
          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "0.68rem",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Rejoignez via QR · Avote
          </p>
        </div>
      </div>

      {/* Encart résultats mini */}
      <div
        style={{
          position: "absolute",
          right: "0",
          bottom: "8%",
          width: "9rem",
          borderRadius: "12px",
          background: "#fff",
          border: "1px solid #e9d5ff",
          boxShadow: "0 14px 32px rgba(91, 33, 182, 0.15)",
          padding: "0.65rem 0.75rem",
          zIndex: 3,
        }}
      >
        <p
          style={{
            margin: "0 0 0.45rem",
            fontSize: "0.62rem",
            fontWeight: 700,
            color: "#6d28d9",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Live
        </p>
        {[
          { label: "UX", w: "72%" },
          { label: "Data", w: "21%" },
          { label: "Q&R", w: "7%" },
        ].map((row) => (
          <div key={row.label} style={{ marginBottom: "0.35rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.62rem",
                color: "#64748b",
                marginBottom: "2px",
              }}
            >
              <span>{row.label}</span>
            </div>
            <div
              style={{
                height: "5px",
                borderRadius: "99px",
                background: "#f1f5f9",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: row.w,
                  height: "100%",
                  borderRadius: "99px",
                  background: "linear-gradient(90deg, #a78bfa, #7c3aed)",
                }}
              />
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
            <h1
              style={{
                fontSize: "clamp(1.75rem, 5vw, 2.45rem)",
                fontWeight: 800,
                margin: "0 0 1rem",
                letterSpacing: "-0.03em",
                lineHeight: 1.12,
                textAlign: "left",
              }}
            >
              Le vote en direct, simple et instantané
            </h1>
            <p
              style={{
                fontSize: "clamp(1rem, 2.4vw, 1.12rem)",
                color: "#475569",
                margin: "0 0 1.75rem",
                maxWidth: "28rem",
                textAlign: "left",
              }}
            >
              Faites participer votre audience via QR code en quelques secondes
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "flex-start",
              }}
            >
              <Link href="/admin" style={btnPrimary}>
                Créer un événement
              </Link>
              <Link href="/join/demo" style={btnSecondary}>
                Voir une démo
              </Link>
            </div>
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
            Activez un jeu concours, puis collectez les contacts via une question{' '}
            <strong style={{ color: "#4c1d95" }}>Lead (Oui/Non + formulaire)</strong>.
          </p>
          <div className="landing-proof-grid">
            <LiveContestPreviewCard />
            <LiveLeadCapturePreviewCard />
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
        .hero-mockup-wrap {
          position: relative;
          min-height: 320px;
          padding: 1.5rem 0 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 900px) {
          .landing-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
            gap: 2.5rem 3rem;
            align-items: center;
          }
          .landing-hero-text {
            text-align: left;
          }
          .hero-mockup-wrap {
            min-height: 360px;
            padding: 2rem 0.5rem 2rem 1rem;
          }
        }
        @media (max-width: 899px) {
          .landing-hero {
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
            text-align: center;
          }
          .landing-hero-text h1,
          .landing-hero-text p {
            text-align: center !important;
          }
          .landing-hero-text > div {
            justify-content: center !important;
          }
          .hero-mockup-wrap {
            max-width: 340px;
            margin-left: auto;
            margin-right: auto;
            padding-left: 2rem;
            padding-right: 2rem;
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
          max-width: 920px;
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
