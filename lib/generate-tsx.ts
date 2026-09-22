import type { IconElement, IconRecord } from "./icon-types"

export function pascalCase(slug: string): string {
  const name = slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("")
  return name || "Icon"
}

function elementTag(el: IconElement): { tag: string; attrs: string } {
  switch (el.type) {
    case "path":
      return { tag: "path", attrs: `d="${el.d}"` }
    case "line":
      return { tag: "line", attrs: `x1={${el.x1}} y1={${el.y1}} x2={${el.x2}} y2={${el.y2}}` }
    case "circle":
      return { tag: "circle", attrs: `cx={${el.cx}} cy={${el.cy}} r={${el.r}}` }
    case "ellipse":
      return { tag: "ellipse", attrs: `cx={${el.cx}} cy={${el.cy}} rx={${el.rx}} ry={${el.ry}}` }
    case "rect":
      return {
        tag: "rect",
        attrs: `x={${el.x}} y={${el.y}} width={${el.width}} height={${el.height}}${
          el.rx != null ? ` rx={${el.rx}}` : ""
        }${el.ry != null ? ` ry={${el.ry}}` : ""}`,
      }
    case "polyline":
      return { tag: "polyline", attrs: `points="${el.points}"` }
    case "polygon":
      return { tag: "polygon", attrs: `points="${el.points}"` }
  }
}

function elementJsx(el: IconElement, draw: boolean): string {
  const { tag, attrs } = elementTag(el)
  const pl = draw ? " pathLength={1}" : ""
  return `<${tag} ${attrs}${pl} />`
}

/**
 * Emits the element with its original motion baked in as SMIL `<animate>` — a
 * dependency-free way to reproduce the icon's designed animation in the
 * downloadable component. Static elements fall back to a plain tag.
 */
function elementOriginalJsx(el: IconElement, speed: number): string {
  const { tag, attrs } = elementTag(el)
  const anim = el.anim
  if (!anim) return `<${tag} ${attrs} />`
  const dur = (anim.duration / Math.max(0.1, speed)).toFixed(2)
  const animates: string[] = []
  if (anim.d && anim.d.length > 1) {
    animates.push(
      `<animate attributeName="d" values="${anim.d.join(";")}" dur="${dur}s" repeatCount="indefinite" />`,
    )
  }
  if (anim.opacity && anim.opacity.length > 1) {
    animates.push(
      `<animate attributeName="opacity" values="${anim.opacity.join(";")}" dur="${dur}s" repeatCount="indefinite" />`,
    )
  }
  if (animates.length === 0) return `<${tag} ${attrs} />`
  return `<${tag} ${attrs}>${animates.join("")}</${tag}>`
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
  const original = c.animation === "original"
  const cls = `anim-${record.slug}`
  const dur = (2 / Math.max(0.1, c.speed)).toFixed(2)
  const shapes = record.elements
    .map((el) => `      ${original ? elementOriginalJsx(el, c.speed) : elementJsx(el, draw)}`)
    .join("\n")

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
