"use client";

import { JoinLiveHub } from "@/components/JoinLiveHub";

/** Route statique : /join/demo (prioritaire sur /join/[slug]). */
export default function JoinDemoPage() {
  return <JoinLiveHub slug="demo" />;
}
