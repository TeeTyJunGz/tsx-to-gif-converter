import type { CSSProperties } from "react"

export interface HammerIconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function HammerIcon({
  size = 96,
  color = "#fcb8d9",
  className,
  style,
}: HammerIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g style={{ transformOrigin: "0% 100%", transformBox: "fill-box" }}>
        <animateTransform attributeName="transform" type="rotate" values="0;-20;25;0" keyTimes="0.0000;0.6000;0.8000;1.0000" dur="0.80s" repeatCount="indefinite" />
<path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
      <path d="m18 15 4-4" />
      <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
      </g>
    </svg>
  )
}
