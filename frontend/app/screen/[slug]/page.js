"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QrAccesVoteEcran } from "@/components/QrAccesVoteEcran";
import { ScreenProjection } from "@/components/ScreenProjection";

export default function ProjectionSallePage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : slugParam?.[0];
  const [surface, setSurface] = useState("other");

  const getPollUrl = useMemo(() => {
    return () => {
      if (!slug) return "https://avoteapp-production.up.railway.app/p/__invalid__";
      return `https://avoteapp-production.up.railway.app/p/${encodeURIComponent(slug)}`;
    };
  }, [slug]);

  if (!slug) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0c1222",
          color: "#e2e8f0",
        }}
      >
        <p>Lien d’affichage invalide.</p>
      </main>
    );
  }

  return (
    <>
      <ScreenProjection
        slugPublic={slug}
        getPollUrl={getPollUrl}
        onSurfaceChange={setSurface}
      />
      {surface !== "question" ? (
        <QrAccesVoteEcran slug={slug} compact={surface === "results"} />
      ) : null}
    </>
  );
}
