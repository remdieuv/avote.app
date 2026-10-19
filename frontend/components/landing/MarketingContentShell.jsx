import { marketingContentShellStyle } from "@/lib/marketingLayout";

/**
 * Conteneur marketing desktop (1200 px) — aligné sur LandingHeader.
 * @param {{
 *  children: import("react").ReactNode;
 *  as?: keyof JSX.IntrinsicElements;
 *  style?: Record<string, string | number>;
 *  className?: string;
 * }} props
 */
export function MarketingContentShell({
  children,
  as: Comp = "main",
  style,
  className,
}) {
  return (
    <Comp
      className={className}
      style={{ ...marketingContentShellStyle(), ...style }}
    >
      {children}
    </Comp>
  );
}
