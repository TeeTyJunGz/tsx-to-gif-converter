import type { CSSProperties } from "react"

export interface AirplayIconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function AirplayIcon({
  size = 96,
  color = "#fcb8d9",
  className,
  style,
}: AirplayIconProps) {
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
      strokeLinejoin="round" className="anim-airplay"
    >
      <style>{`@keyframes anim-airplay { 0% { stroke-dashoffset: 1 } 50% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 1 } } .anim-airplay > :is(path,line,circle,ellipse,rect,polyline,polygon) { stroke-dasharray: 1; animation: anim-airplay 2.00s ease-in-out infinite; }`}</style>
      <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" pathLength={1} />
      <path d="M12 15l5 6H7z" pathLength={1} />
    </svg>
  )
}
