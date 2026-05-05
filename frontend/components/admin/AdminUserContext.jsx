"use client";

import { createContext, useContext } from "react";

/** @type {React.Context<{ user: { id: string; email: string; eventCredits?: number | null } | null; logout: () => Promise<void> } | null>} */
const AdminUserContext = createContext(null);

export function useAdminUser() {
  const v = useContext(AdminUserContext);
  if (!v) {
    throw new Error("useAdminUser hors fournisseur admin");
  }
  return v;
}

export { AdminUserContext };
