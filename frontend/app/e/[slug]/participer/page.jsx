"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MiniSiteShell } from "@/components/minisite/MiniSiteShell";
import { MiniSiteParticipate } from "@/components/minisite/MiniSiteParticipate";
import { useMiniSiteLanding } from "@/lib/useMiniSiteLanding";

export default function MiniSiteParticipatePage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  const { loading, error, payload } = useMiniSiteLanding(slug, {
    isDemo: slug === "demo",
  });

  if (!slug) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>Lien invalide.</p>
      </main>
    );
  }

  if (slug === "demo") {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p>
          Démo : l’onglet Participer redirige vers{" "}
          <Link href="/join/demo">/join/demo</Link>.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "40vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#64748b",
        }}
      >
        Chargement…
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>{error || "Mini-site indisponible."}</p>
        <p>
          <Link href={`/join/${encodeURIComponent(slug)}`}>
            Accéder à la salle
          </Link>
        </p>
      </main>
    );
  }

  return (
    <MiniSiteShell
      slug={slug}
      activeTab="participer"
      primaryColor={
        typeof payload.primaryColor === "string" ? payload.primaryColor : null
      }
      tabs={payload.tabs}
      landingPayload={payload}
    >
      <MiniSiteParticipate slug={slug} landingPayload={payload} />
    </MiniSiteShell>
  );
}
