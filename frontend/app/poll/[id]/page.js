"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { PollExperience } from "@/components/PollExperience";
import { API_URL } from "@/lib/config";

export default function PollPage() {
  const params = useParams();
  const idParam = params?.id;
  const pollId = typeof idParam === "string" ? idParam : idParam?.[0];

  const getPollUrl = useMemo(() => {
    return () => {
      if (!pollId) return `${API_URL}/polls/__invalid__`;
      return `${API_URL}/polls/${pollId}`;
    };
  }, [pollId]);

  if (!pollId) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Identifiant de sondage manquant.</p>
      </main>
    );
  }

  return (
    <PollExperience
      getPollUrl={getPollUrl}
      titrePage={`Sondage`}
      retourHref="/"
    />
  );
}
