"use client";

import { JoinDemoExperience } from "@/components/JoinDemoExperience";

/** Route statique : /p/demo — écran de vote démo sans backend. */
export default function PublicPollDemoPage() {
  return <JoinDemoExperience variant="poll" />;
}
