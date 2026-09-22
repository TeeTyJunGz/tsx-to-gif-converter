import type { IconElement } from "./icon-types"

export interface ParsedIcon {
  viewBox: string
  elements: IconElement[]
}

function num(v: string | undefined, fallback = 0): number {
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Reads a single attribute value out of a raw JSX tag's attribute string.
 * Handles double/single quotes and simple brace expressions like {"..."} or {`...`}.
 */
function getAttr(attrs: string, name: string): string | undefined {
  const re = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*"([^"]*)"\\s*\\}|\\{\\s*'([^']*)'\\s*\\}|\\{\\s*\`([^\`]*)\`\\s*\\})`,
  )
  const m = attrs.match(re)
  if (!m) return undefined
  return m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]
}

/**
 * Extracts the drawable geometry from pasted Lucide-style icon source.
 *
 * We intentionally keep only the static SVG geometry (paths, lines, etc.) and
 * discard bespoke motion props — animation is re-applied generically by the
 * renderer. This makes ingestion of arbitrary animated icons reliable.
 */
export function parseIconSource(source: string): ParsedIcon {
  const vb = source.match(/viewBox\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*"([^"]+)"\s*\})/)
  const viewBox = (vb?.[1] ?? vb?.[2] ?? vb?.[3] ?? "0 0 24 24").trim()

  const elements: IconElement[] = []
  const tagRegex = /<(?:motion\.)?(path|line|circle|ellipse|rect|polyline|polygon)\b([^>]*?)\/?>/g
  let m: RegExpExecArray | null

  while ((m = tagRegex.exec(source))) {
    const type = m[1]
    const attrs = m[2]

    switch (type) {
      case "path": {
        const d = getAttr(attrs, "d")
        if (d) elements.push({ type: "path", d })
        break
      }
      case "line":
        elements.push({
          type: "line",
          x1: num(getAttr(attrs, "x1")),
          y1: num(getAttr(attrs, "y1")),
          x2: num(getAttr(attrs, "x2")),
          y2: num(getAttr(attrs, "y2")),
        })
        break
      case "circle":
        elements.push({
          type: "circle",
          cx: num(getAttr(attrs, "cx")),
          cy: num(getAttr(attrs, "cy")),
          r: num(getAttr(attrs, "r")),
        })
        break
      case "ellipse":
        elements.push({
          type: "ellipse",
          cx: num(getAttr(attrs, "cx")),
          cy: num(getAttr(attrs, "cy")),
          rx: num(getAttr(attrs, "rx")),
          ry: num(getAttr(attrs, "ry")),
        })
        break
      case "rect": {
        const rx = getAttr(attrs, "rx")
        const ry = getAttr(attrs, "ry")
        elements.push({
          type: "rect",
          x: num(getAttr(attrs, "x")),
          y: num(getAttr(attrs, "y")),
          width: num(getAttr(attrs, "width")),
          height: num(getAttr(attrs, "height")),
          ...(rx != null ? { rx: num(rx) } : {}),
          ...(ry != null ? { ry: num(ry) } : {}),
        })
        break
      }
      case "polyline": {
        const points = getAttr(attrs, "points")
        if (points) elements.push({ type: "polyline", points })
        break
      }
      case "polygon": {
        const points = getAttr(attrs, "points")
        if (points) elements.push({ type: "polygon", points })
        break
      }
    }
  }

  return { viewBox, elements }
}
