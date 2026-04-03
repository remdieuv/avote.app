"use client";

import { Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PollExperience } from "@/components/PollExperience";

function PublicPollBody({ slug }) {
  const searchParams = useSearchParams();
  const pollParam =
    searchParams.get("poll")?.trim() ||
    searchParams.get("pollId")?.trim() ||
    "";

  const getPollUrl = useMemo(() => {
    return () => {
      if (!slug) return "https://avoteapp-production.up.railway.app/p/__invalid__";
      const base = `https://avoteapp-production.up.railway.app/p/${encodeURIComponent(slug)}`;
      if (pollParam) {
        return `${base}?poll=${encodeURIComponent(pollParam)}`;
      }
      return base;
    };
  }, [slug, pollParam]);

  const titrePage = pollParam
    ? `Vote — ${slug} (question précédente)`
    : `Vote — ${slug}`;

  return (
    <PollExperience
      getPollUrl={getPollUrl}
      titrePage={titrePage}
      retourHref={`/join/${encodeURIComponent(slug)}`}
      retourLabel="← Retour à l'accueil"
      slugPublic={slug}
    />
  );
}

export default function PublicEventPollPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : slugParam?.[0];

  if (!slug) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Lien d’événement invalide.</p>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main
          style={{
            padding: "2rem",
            fontFamily:
              'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            background:
              "linear-gradient(165deg, #0b1120 0%, #0f172a 38%, #1e1b4b 100%)",
            color: "#e2e8f0",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0 }}>Chargement…</p>
        </main>
      }
    >
      <PublicPollBody slug={slug} />
    </Suspense>
  );
}
