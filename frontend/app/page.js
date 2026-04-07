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

function LiveResultsCard() {
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
        padding: "1.35rem 1.5rem",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.1rem" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.25)",
          }}
        />
        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
          Résultats en direct
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                color: "#475569",
                marginBottom: "0.35rem",
              }}
            >
              <span>{r.label}</span>
              <span style={{ fontWeight: 700, color: "#7c3aed" }}>{r.pct}%</span>
            </div>
            <div
              style={{
                height: "10px",
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
                  background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
                  transition: "width 0.6s ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "1rem 0 0", fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>
        Aperçu décoratif — vos vrais chiffres s’affichent pendant l’événement
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

        {/* Pensé pour le live */}
        <section id="live" style={sectionY}>
          <div
            style={{
              borderRadius: "20px",
              border: "1px solid #ddd6fe",
              background: "linear-gradient(160deg, #faf5ff 0%, #fff 55%)",
              padding: "clamp(2rem, 5vw, 3rem)",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(1.25rem, 3vw, 1.5rem)",
                fontWeight: 800,
                textAlign: "center",
                margin: "0 0 2rem",
                color: "#4c1d95",
                letterSpacing: "-0.02em",
              }}
            >
              Pensé pour le live
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: "1.25rem",
                maxWidth: "520px",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {[
                { icon: "⚡", text: "Mise à jour en temps réel" },
                { icon: "🔗", text: "Synchronisation régie / participants / écran" },
                { icon: "✨", text: "Aucune installation" },
              ].map((item) => (
                <li
                  key={item.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    fontSize: "1.02rem",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }} aria-hidden>
                    {item.icon}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Preuve visuelle — résultats */}
        <section style={sectionY}>
          <LiveResultsCard />
        </section>

        {/* Cas d’usage */}
        <section style={sectionY}>
          <h2
            style={{
              fontSize: "clamp(1.2rem, 3vw, 1.4rem)",
              fontWeight: 700,
              textAlign: "center",
              margin: "0 0 2.5rem",
              color: "#1e293b",
            }}
          >
            Cas d’usage
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "1fr",
            }}
            className="landing-usecases"
          >
            {[
              { icon: "🎤", text: "Conférences et keynotes interactives" },
              { icon: "🏢", text: "Réunions d’équipe et votes internes" },
              { icon: "🎓", text: "Formations et quiz en salle" },
              { icon: "🎭", text: "Événements associatifs et assemblées" },
            ].map((row) => (
              <li
                key={row.text}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.85rem",
                  padding: "1rem 1.15rem",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                }}
              >
                <span style={{ fontSize: "1.35rem", lineHeight: 1 }} aria-hidden>
                  {row.icon}
                </span>
                <span style={{ fontSize: "1rem", color: "#334155" }}>{row.text}</span>
              </li>
            ))}
          </ul>
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
        @media (min-width: 640px) {
          .landing-usecases {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
