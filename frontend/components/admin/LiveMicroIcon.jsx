"use client";

export function LiveMicroIcon({ size = 14, strokeWidth = 1.8, style = {} }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <rect
        x="5.25"
        y="1.75"
        width="5.5"
        height="8"
        rx="2.75"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        d="M12 7.5a4 4 0 0 1-8 0"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M8 11.5v2.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M5.5 14h5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LiveMicroLabel({
  children = "Salle live",
  iconSize = 14,
  gap = "0.38rem",
  style = {},
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        verticalAlign: "middle",
        ...style,
      }}
    >
      <LiveMicroIcon size={iconSize} />
      <span>{children}</span>
    </span>
  );
}
