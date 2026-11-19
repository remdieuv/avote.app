"use client";

import { SiteHeader } from "@/components/navigation/SiteHeader";
import { ADMIN_CONTENT_MAX_WORKSPACE } from "@/lib/adminLayout";

export function AdminAccountBar() {
  return (
    <SiteHeader
      contentMaxWidth={ADMIN_CONTENT_MAX_WORKSPACE}
      accountVariant="subtle"
    />
  );
}
