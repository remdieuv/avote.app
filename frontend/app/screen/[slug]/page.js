"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QrAccesVoteEcran } from "@/components/QrAccesVoteEcran";
import { ScreenProjection } from "@/components/ScreenProjection";
import { API_URL } from "@/lib/config";

export default function ProjectionSallePage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : slugParam?.[0];
  const searchParams = useSearchParams();
  const [surface, setSurface] = useState("other");
  const projectionMode = String(searchParams?.get("pm") || "standard")
    .trim()
    .toLowerCase();

  const getPollUrl = useMemo(() => {
    return () => {
      if (!slug) return `${API_URL}/p/__invalid__`;
      return `${API_URL}/p/${encodeURIComponent(slug)}`;
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
      {surface !== "question" && projectionMode !== "results_focus" ? (
        <QrAccesVoteEcran slug={slug} compact={surface === "results"} />
      ) : null}
    </>
  );
}
