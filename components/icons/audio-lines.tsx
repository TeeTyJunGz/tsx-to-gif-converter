import type { CSSProperties } from "react"

export interface AudioLinesIconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function AudioLinesIcon({
  size = 96,
  color = "#fcb8d9",
  className,
  style,
}: AudioLinesIconProps) {
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
      <path d="M2 10v3" />
      <path d="M6 6v11" />
      <path d="M10 3v18" />
      <path d="M14 8v7" />
      <path d="M18 5v13" />
      <path d="M22 10v3" />
    </svg>
  )
}
