import type { IconElement, IconRecord } from "./icon-types"

export function pascalCase(slug: string): string {
  const name = slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("")
  return name || "Icon"
}

function elementJsx(el: IconElement, draw: boolean): string {
  const pl = draw ? " pathLength={1}" : ""
  switch (el.type) {
    case "path":
      return `<path d="${el.d}"${pl} />`
    case "line":
      return `<line x1={${el.x1}} y1={${el.y1}} x2={${el.x2}} y2={${el.y2}}${pl} />`
    case "circle":
      return `<circle cx={${el.cx}} cy={${el.cy}} r={${el.r}}${pl} />`
    case "ellipse":
      return `<ellipse cx={${el.cx}} cy={${el.cy}} rx={${el.rx}} ry={${el.ry}}${pl} />`
    case "rect":
      return `<rect x={${el.x}} y={${el.y}} width={${el.width}} height={${el.height}}${
        el.rx != null ? ` rx={${el.rx}}` : ""
      }${el.ry != null ? ` ry={${el.ry}}` : ""}${pl} />`
    case "polyline":
      return `<polyline points="${el.points}"${pl} />`
    case "polygon":
      return `<polygon points="${el.points}"${pl} />`
  }
}

/**
 * Generates a self-contained, dependency-free animated icon component from a
 * record. This is the `.tsx` artifact the user downloads/keeps in the project.
 */
export function generateIconTsx(record: IconRecord): string {
  const componentName = `${pascalCase(record.slug)}Icon`
  const c = record.config
  const draw = c.animation === "draw"
  const pulse = c.animation === "pulse"
  const cls = `anim-${record.slug}`
  const dur = (2 / Math.max(0.1, c.speed)).toFixed(2)
  const shapes = record.elements.map((el) => `      ${elementJsx(el, draw)}`).join("\n")

  let css = ""
  if (draw) {
    css =
      `@keyframes ${cls} { 0% { stroke-dashoffset: 1 } 50% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 1 } } ` +
      `.${cls} > :is(path,line,circle,ellipse,rect,polyline,polygon) { stroke-dasharray: 1; animation: ${cls} ${dur}s ease-in-out infinite; }`
  } else if (pulse) {
    css =
      `@keyframes ${cls} { 0%,100% { opacity: 1 } 50% { opacity: .35 } } ` +
      `.${cls} > :is(path,line,circle,ellipse,rect,polyline,polygon) { animation: ${cls} ${dur}s ease-in-out infinite; }`
  }

  const styleTag = css ? `\n      <style>{\`${css}\`}</style>` : ""
  const svgClass = css ? ` className="${cls}"` : ""
  const opaque = c.background && c.background !== "transparent"

  const svg = `<svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="${record.viewBox}"
      fill="none"
      stroke={color}
      strokeWidth={${c.strokeWidth}}
      strokeLinecap="${c.lineCap}"
      strokeLinejoin="${c.lineJoin}"${svgClass}
    >${styleTag}
${shapes}
    </svg>`

  const body = opaque
    ? `<span
      className={className}
      style={{ display: "inline-flex", background: "${c.background}", ...style }}
    >
      ${svg.replace(/\n/g, "\n  ")}
    </span>`
    : `${svg}`

  return `import type { CSSProperties } from "react"

export interface ${componentName}Props {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function ${componentName}({
  size = ${c.size},
  color = "${c.color}",
  className,
  style,
}: ${componentName}Props) {
  return (
    ${body}
  )
}
`
}
