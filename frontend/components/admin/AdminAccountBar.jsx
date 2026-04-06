"use client";

import { AdminAccountMenu } from "./AdminAccountMenu";

export function AdminAccountBar() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0.45rem 0.85rem",
        borderBottom: "1px solid #e2e8f0",
        background: "#fafafa",
        flexShrink: 0,
      }}
    >
      <AdminAccountMenu />
    </header>
  );
}
