"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MiniSiteShell } from "@/components/minisite/MiniSiteShell";
import { MiniSiteJournal } from "@/components/minisite/MiniSiteJournal";
import { useMiniSiteLanding } from "@/lib/useMiniSiteLanding";

export default function MiniSiteJournalPage() {
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
          Démo : l’onglet Journal n’est pas simulé ici.{" "}
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
  const journalEnabled = tabs.some(
    (t) => t && t.id === "journal" && t.enabled === true,
  );
  if (!journalEnabled && payload.miniSiteTabJournal !== true) {
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
      <MiniSiteJournal slug={slug} landingPayload={payload} />
    </MiniSiteShell>
  );
}
