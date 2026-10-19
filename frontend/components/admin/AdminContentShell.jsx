"use client";

import {
  adminContentShellStyle,
  adminFormRailStyle,
} from "@/lib/adminLayout";

/**
 * Cadre admin desktop (1600 px) — aligné sur le header.
 * @param {{
 *  children: import("react").ReactNode;
 *  as?: keyof JSX.IntrinsicElements;
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

/**
 * Rail formulaire (1200 px) à l’intérieur du cadre 1600.
 * @param {{
 *  children: import("react").ReactNode;
 *  style?: Record<string, string | number>;
 *  className?: string;
 * }} props
 */
export function AdminFormRail({ children, style, className }) {
  return (
    <div className={className} style={{ ...adminFormRailStyle(), ...style }}>
      {children}
    </div>
  );
}
