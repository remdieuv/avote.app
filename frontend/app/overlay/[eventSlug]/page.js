"use client";

import { Suspense, useMemo } from "react";
import { useParams } from "next/navigation";
import { OverlayProjection } from "@/components/OverlayProjection";

function OverlayBody({ eventSlug }) {
  const getPollUrl = useMemo(() => {
    return () => {
      if (!eventSlug) return "https://avoteapp-production.up.railway.app/p/__invalid__";
      return `https://avoteapp-production.up.railway.app/p/${encodeURIComponent(eventSlug)}`;
    };
  }, [eventSlug]);

  return (
    <OverlayProjection slugPublic={eventSlug} getPollUrl={getPollUrl} />
  );
}

export default function OverlayStreamPage() {
  const params = useParams();
  const raw = params?.eventSlug;
  const eventSlug =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;

  if (!eventSlug) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            margin: 0,
            background: "transparent",
          }}
        />
      }
    >
      <OverlayBody eventSlug={eventSlug} />
    </Suspense>
  );
}
