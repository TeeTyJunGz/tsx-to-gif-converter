import type { CSSProperties } from "react"

export interface UntitledIconIconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function UntitledIconIcon({
  size = 96,
  color = "#fcb8d9",
  className,
  style,
}: UntitledIconIconProps) {
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
      strokeLinejoin="round" className="anim-untitled-icon"
    >
      <style>{`@keyframes anim-untitled-icon { 0% { stroke-dashoffset: 1 } 50% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 1 } } .anim-untitled-icon > :is(path,line,circle,ellipse,rect,polyline,polygon) { stroke-dasharray: 1; animation: anim-untitled-icon 2.00s ease-in-out infinite; }`}</style>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" pathLength={1} />
      <path d="m3.3 7 8.7 5 8.7-5" pathLength={1} />
      <path d="M12 22V12" pathLength={1} />
    </svg>
  )
}
