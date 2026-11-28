"use client";

import Link from "next/link";
import { MiniSiteShell } from "@/components/minisite/MiniSiteShell";
import { MiniSiteNewsDetail } from "@/components/minisite/MiniSiteNewsDetail";
import { useMiniSiteLanding } from "@/lib/useMiniSiteLanding";

/**
 * @param {{ slug: string; messageId: string }} props
 */
export function MiniSiteNewsDetailPageClient({ slug, messageId }) {
  const { loading, error, payload } = useMiniSiteLanding(slug, {
    isDemo: slug === "demo",
  });

  if (slug === "demo") {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p>
          Démo : les actualités individuelles ne sont pas simulées ici.{" "}
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
  const journalEnabled =
    tabs.some((t) => t && t.id === "journal" && t.enabled === true) ||
    payload.miniSiteTabJournal === true;
  if (!journalEnabled) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#64748b" }}>
          L’onglet Journal n’est pas affiché pour cet événement.
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
      activeTab="journal"
      primaryColor={
        typeof payload.primaryColor === "string" ? payload.primaryColor : null
      }
      tabs={payload.tabs}
      landingPayload={payload}
    >
      <MiniSiteNewsDetail
        slug={slug}
        messageId={messageId}
        landingPayload={payload}
      />
    </MiniSiteShell>
  );
}
