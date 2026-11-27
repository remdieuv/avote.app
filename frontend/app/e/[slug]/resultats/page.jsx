"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MiniSiteShell } from "@/components/minisite/MiniSiteShell";
import { MiniSiteResultsList } from "@/components/minisite/MiniSiteResultsList";
import { useMiniSiteLanding } from "@/lib/useMiniSiteLanding";

export default function MiniSiteResultsPage() {
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
          Démo : l’onglet Résultats n’est pas simulé ici.{" "}
          <Link href={`/e/${encodeURIComponent(slug)}`}>Retour à l’accueil</Link>
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
          <Link href={`/e/${encodeURIComponent(slug)}`}>Retour à l’accueil</Link>
        </p>
      </main>
    );
  }

  const tabs = Array.isArray(payload.tabs) ? payload.tabs : [];
  const resultsEnabled = tabs.some(
    (t) => t && t.id === "resultats" && t.enabled === true,
  );
  if (!resultsEnabled && payload.miniSiteTabResults !== true) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#64748b" }}>
          L’onglet Résultats n’est pas affiché pour cet événement.
        </p>
        <p>
          <Link href={`/e/${encodeURIComponent(slug)}`}>Retour à l’accueil</Link>
        </p>
      </main>
    );
  }

  return (
    <MiniSiteShell
      slug={slug}
      activeTab="resultats"
      primaryColor={
        typeof payload.primaryColor === "string" ? payload.primaryColor : null
      }
      tabs={payload.tabs}
      landingPayload={payload}
    >
      <MiniSiteResultsList slug={slug} landingPayload={payload} />
    </MiniSiteShell>
  );
}
