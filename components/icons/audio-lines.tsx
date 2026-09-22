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
      strokeLinejoin="round" className="anim-audio-lines"
    >
      <style>{`@keyframes anim-audio-lines { 0% { stroke-dashoffset: 1 } 50% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 1 } } .anim-audio-lines > :is(path,line,circle,ellipse,rect,polyline,polygon) { stroke-dasharray: 1; animation: anim-audio-lines 2.00s ease-in-out infinite; }`}</style>
      <path d="M2 10v3" pathLength={1} />
      <path d="M6 6v11" pathLength={1} />
      <path d="M10 3v18" pathLength={1} />
      <path d="M14 8v7" pathLength={1} />
      <path d="M18 5v13" pathLength={1} />
      <path d="M22 10v3" pathLength={1} />
    </svg>
  )
}
