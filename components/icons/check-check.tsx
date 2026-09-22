import type { CSSProperties } from "react"

export interface CheckCheckIconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function CheckCheckIcon({
  size = 96,
  color = "#fcb8d9",
  className,
  style,
}: CheckCheckIconProps) {
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
      strokeLinejoin="round" className="anim-check-check"
    >
      <style>{`@keyframes anim-check-check { 0% { stroke-dashoffset: 1 } 50% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 1 } } .anim-check-check > :is(path,line,circle,ellipse,rect,polyline,polygon) { stroke-dasharray: 1; animation: anim-check-check 2.00s ease-in-out infinite; }`}</style>
      <path d="M2 12 7 17L18 6" pathLength={1} />
      <path d="M13 16L14.5 17.5L22 10" pathLength={1} />
    </svg>
  )
}
