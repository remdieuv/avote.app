"use client";

import { useParams } from "next/navigation";
import { JoinLiveHub } from "@/components/JoinLiveHub";

export default function JoinEventPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  if (!slug) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ color: "#b91c1c" }}>Lien invalide.</p>
      </main>
    );
  }

  return <JoinLiveHub slug={slug} />;
}
