"use client";

import { SiteHeader } from "@/components/navigation/SiteHeader";
import { MARKETING_CONTENT_MAX } from "@/lib/marketingLayout";

export function LandingHeader() {
  return <SiteHeader contentMaxWidth={MARKETING_CONTENT_MAX} />;
}
