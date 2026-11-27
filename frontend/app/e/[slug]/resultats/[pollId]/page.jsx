"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MiniSiteShell } from "@/components/minisite/MiniSiteShell";
import { MiniSiteResultDetail } from "@/components/minisite/MiniSiteResultDetail";
import { useMiniSiteLanding } from "@/lib/useMiniSiteLanding";

export default function MiniSiteResultDetailPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const pollParam = params?.pollId;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;
  const pollId =
    typeof pollParam === "string" ? pollParam : pollParam?.[0] ?? null;

  const { loading, error, payload } = useMiniSiteLanding(slug, {
    isDemo: slug === "demo",
  });

  if (!slug || !pollId) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c" }}>Lien invalide.</p>
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
  const resultsEnabled =
    tabs.some((t) => t && t.id === "resultats" && t.enabled === true) ||
    payload.miniSiteTabResults === true;
  if (!resultsEnabled) {
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
    >
      <MiniSiteResultDetail
        slug={slug}
        pollId={pollId}
        landingPayload={payload}
      />
    </MiniSiteShell>
  );
}
