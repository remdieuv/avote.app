"use client";

import { adminContentShellStyle } from "@/lib/adminLayout";

/**
 * Cadre admin desktop (1600 px) — aligné sur le header.
 * @param {{
 *  children: import("react").ReactNode;
 *  as?: string;
 *  style?: Record<string, string | number>;
 *  className?: string;
 *  id?: string;
 * }} props
 */
export function AdminContentShell({
  children,
  as: Comp = "main",
  style,
  className,
  id,
}) {
  return (
    <Comp
      id={id}
      className={className}
      style={{ ...adminContentShellStyle(), ...style }}
    >
      {children}
    </Comp>
  );
}
