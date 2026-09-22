import type { ElementAnim, GroupAnim, IconElement } from "./icon-types"

export interface ParsedIcon {
  viewBox: string
  elements: IconElement[]
  /** Whole-icon rotate animation captured off an outer `<motion.svg>`/`<motion.g>`, if any. */
  groupAnim?: GroupAnim
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

/** Reads a `key: "value"` (any quote style) out of raw JSX attrs or an object body. */
function getQuotedProp(s: string, key: string): string | undefined {
  const m = s.match(new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`))
  return m?.[1]
}

/** Finds the substring starting at an opening `{` through its matching closing brace. */
function matchBalancedBraces(text: string, start: number): string | undefined {
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++
    else if (text[i] === "}") {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return undefined
}

/** Extracts the full body of a top-level `const NAME = { ... }` (or `const NAME: Type = { ... }`) declaration. */
function findConstBlock(source: string, name: string): string | undefined {
  const m = source.match(new RegExp(`const\\s+${name}\\b[^={]*=\\s*\\{`))
  if (!m || m.index == null) return undefined
  const braceIndex = m.index + m[0].length - 1
  return matchBalancedBraces(source, braceIndex)
}

/** Extracts a nested `key: { ... }` object body from within a larger block of text. */
function findNamedBlock(text: string, key: string): string | undefined {
  const m = text.match(new RegExp(`(?:^|[^\\w])${key}\\s*:\\s*\\{`))
  if (!m || m.index == null) return undefined
  const braceIndex = m.index + m[0].length - 1
  return matchBalancedBraces(text, braceIndex)
}

/**
 * Resolves a `variants={SomeIdentifier}` reference on a tag to the referenced
 * top-level constant's source text, so keyframe extraction can run over it as
 * if it had been written inline. This is what lets us read icons (like
 * Lucide's animated set) that factor their `variants` object out into a
 * separate `const PATH_VARIANTS = { ... }` instead of inlining it in the JSX.
 */
function resolveVariantsRef(source: string, attrs: string): string {
  const ref = attrs.match(/variants\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/)
  if (!ref) return attrs
  const block = findConstBlock(source, ref[1])
  return block ? `${attrs}\n${block}` : attrs
}

/**
 * Captures an element's built-in animation (motion/react variants) so we can
 * replay the *original* motion. We look for keyframe arrays of `d`, `opacity`,
 * and/or `pathLength`, plus the transition `duration`. Returns undefined for
 * static shapes.
 *
 * `attrs` may already have an external `variants` constant's body appended
 * (see `resolveVariantsRef`) — when it has an "animate" sub-block we read the
 * keyframes and duration from there specifically, since the "normal"/rest
 * state's own numbers would otherwise be picked up first.
 */
function parseElementAnim(attrs: string): ElementAnim | undefined {
  const animateBlock = findNamedBlock(attrs, "animate")
  const primary = animateBlock ?? attrs
  const d = getStringArray(primary, "d") ?? getStringArray(attrs, "d")
  const opacity = getNumberArray(primary, "opacity") ?? getNumberArray(attrs, "opacity")
  const pathLength = getNumberArray(primary, "pathLength") ?? getNumberArray(attrs, "pathLength")
  if (!d && !opacity && !pathLength) return undefined
  const durMatch = primary.match(/duration\s*:\s*([\d.]+)/) ?? attrs.match(/duration\s*:\s*([\d.]+)/)
  const duration = durMatch ? Math.max(0.05, Number(durMatch[1])) : 1
  const anim: ElementAnim = { duration }
  if (d) anim.d = d
  if (opacity) anim.opacity = opacity
  if (pathLength) anim.pathLength = pathLength
  return anim
}

/**
 * Captures a whole-icon rotate animation from an outer `<motion.svg>` or
 * `<motion.g>` wrapper (e.g. Lucide's Hammer, which swings the entire SVG
 * rather than morphing an individual shape). Looks for a `rotate: [...]`
 * keyframe array, its `transition.times`/`duration`, and a `transformOrigin`
 * (via `style={{ transformOrigin: ... }}` or a plain `transform-origin` attr)
 * so the rotation pivots correctly. Returns undefined when there's no rotate.
 */
function parseGroupAnim(source: string, attrs: string): GroupAnim | undefined {
  const resolved = resolveVariantsRef(source, attrs)
  const animateBlock = findNamedBlock(resolved, "animate")
  const primary = animateBlock ?? resolved
  const rotate = getNumberArray(primary, "rotate") ?? getNumberArray(resolved, "rotate")
  if (!rotate || rotate.length < 2) return undefined

  const transitionBlock = findNamedBlock(primary, "transition") ?? primary
  const times = getNumberArray(transitionBlock, "times")
  const durMatch = transitionBlock.match(/duration\s*:\s*([\d.]+)/) ?? primary.match(/duration\s*:\s*([\d.]+)/)
  const duration = durMatch ? Math.max(0.05, Number(durMatch[1])) : 1
  const transformOrigin = getQuotedProp(attrs, "transformOrigin") ?? getAttr(attrs, "transform-origin") ?? "50% 50%"

  const anim: GroupAnim = { rotate, duration, transformOrigin }
  if (times && times.length === rotate.length) anim.times = times
  return anim
}

/**
 * Extracts the drawable geometry from pasted Lucide-style icon source, plus any
 * built-in per-element animation (motion/react `variants`) and any whole-icon
 * rotate animation on an outer `<motion.svg>`/`<motion.g>` wrapper. The static
 * geometry powers the generic draw/pulse effects; the captured animation powers
 * the "Original" mode so the icon can move exactly as its author designed it.
 */
export function parseIconSource(source: string): ParsedIcon {
  const vb = source.match(/viewBox\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*"([^"]+)"\s*\})/)
  const viewBox = (vb?.[1] ?? vb?.[2] ?? vb?.[3] ?? "0 0 24 24").trim()

  // The outer wrapper carries the whole-icon rotate animation, if any (e.g.
  // Lucide's Hammer rotates the entire `<motion.svg>` rather than any one path).
  const groupTagMatch = source.match(/<motion\.(svg|g)\b([^>]*?)>/)
  const groupAnim = groupTagMatch ? parseGroupAnim(source, groupTagMatch[2]) : undefined

  const elements: IconElement[] = []
  const tagRegex = /<(?:motion\.)?(path|line|circle|ellipse|rect|polyline|polygon)\b([^>]*?)\/?>/g
  let m: RegExpExecArray | null

  while ((m = tagRegex.exec(source))) {
    const type = m[1]
    const attrs = m[2]

    // Capture any built-in per-element motion (motion/react variant keyframes)
    // so the "Original" animation mode can replay the author's designed motion.
    // `resolveVariantsRef` pulls in an externally-declared `variants` constant
    // (e.g. Lucide's `variants={PATH_VARIANTS}`) so it reads the same as an
    // inline variants object.
    const anim = parseElementAnim(resolveVariantsRef(source, attrs))
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

  return { viewBox, elements, ...(groupAnim ? { groupAnim } : {}) }
}
