import type { ElementAnim, IconElement } from "./icon-types"

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

/** Reads a `key: ["a", "b", ...]` string array out of a motion variant block. */
function getStringArray(s: string, key: string): string[] | undefined {
  const m = s.match(new RegExp(`(?:^|[^a-zA-Z0-9])${key}\\s*:\\s*\\[([^\\]]*)\\]`))
  if (!m) return undefined
  const items = [...m[1].matchAll(/["'`]([^"'`]*)["'`]/g)].map((x) => x[1])
  return items.length ? items : undefined
}

/** Reads a `key: [1, 0.5, ...]` numeric array out of a motion variant block. */
function getNumberArray(s: string, key: string): number[] | undefined {
  const m = s.match(new RegExp(`(?:^|[^a-zA-Z0-9])${key}\\s*:\\s*\\[([^\\]]*)\\]`))
  if (!m) return undefined
  const nums = [...m[1].matchAll(/-?\d*\.?\d+/g)].map((x) => Number(x[0]))
  return nums.length ? nums : undefined
}

/**
 * Captures an element's built-in animation (motion/react variants) so we can
 * replay the *original* motion. We look for keyframe arrays of `d` and/or
 * `opacity` and the transition `duration`. Returns undefined for static shapes.
 */
function parseElementAnim(attrs: string): ElementAnim | undefined {
  const d = getStringArray(attrs, "d")
  const opacity = getNumberArray(attrs, "opacity")
  if (!d && !opacity) return undefined
  const durMatch = attrs.match(/duration\s*:\s*([\d.]+)/)
  const duration = durMatch ? Math.max(0.05, Number(durMatch[1])) : 1
  const anim: ElementAnim = { duration }
  if (d) anim.d = d
  if (opacity) anim.opacity = opacity
  return anim
}

/**
 * Extracts the drawable geometry from pasted Lucide-style icon source, plus any
 * built-in per-element animation (motion/react `variants`). The static geometry
 * powers the generic draw/pulse effects; the captured animation powers the
 * "Original" mode so the icon can move exactly as its author designed it.
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

    // Capture any built-in per-element motion (motion/react variant keyframes)
    // so the "Original" animation mode can replay the author's designed motion.
    const anim = parseElementAnim(attrs)
    const withAnim = <T extends IconElement>(el: T): T => (anim ? { ...el, anim } : el)

    switch (type) {
      case "path": {
        // Animated paths express `d` as a keyframe array; fall back to the first
        // keyframe as the static geometry when there's no plain `d` attribute.
        const d = getAttr(attrs, "d") ?? anim?.d?.[0]
        if (d) elements.push(withAnim({ type: "path", d }))
        break
      }
      case "line":
        elements.push(
          withAnim({
            type: "line",
            x1: num(getAttr(attrs, "x1")),
            y1: num(getAttr(attrs, "y1")),
            x2: num(getAttr(attrs, "x2")),
            y2: num(getAttr(attrs, "y2")),
          }),
        )
        break
      case "circle":
        elements.push(
          withAnim({
            type: "circle",
            cx: num(getAttr(attrs, "cx")),
            cy: num(getAttr(attrs, "cy")),
            r: num(getAttr(attrs, "r")),
          }),
        )
        break
      case "ellipse":
        elements.push(
          withAnim({
            type: "ellipse",
            cx: num(getAttr(attrs, "cx")),
            cy: num(getAttr(attrs, "cy")),
            rx: num(getAttr(attrs, "rx")),
            ry: num(getAttr(attrs, "ry")),
          }),
        )
        break
      case "rect": {
        const rx = getAttr(attrs, "rx")
        const ry = getAttr(attrs, "ry")
        elements.push(
          withAnim({
            type: "rect",
            x: num(getAttr(attrs, "x")),
            y: num(getAttr(attrs, "y")),
            width: num(getAttr(attrs, "width")),
            height: num(getAttr(attrs, "height")),
            ...(rx != null ? { rx: num(rx) } : {}),
            ...(ry != null ? { ry: num(ry) } : {}),
          }),
        )
        break
      }
      case "polyline": {
        const points = getAttr(attrs, "points")
        if (points) elements.push(withAnim({ type: "polyline", points }))
        break
      }
      case "polygon": {
        const points = getAttr(attrs, "points")
        if (points) elements.push(withAnim({ type: "polygon", points }))
        break
      }
    }
  }

  return { viewBox, elements }
}
