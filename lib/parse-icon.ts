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

/** Reads a `key: 1.5` (or `-9`) scalar number out of an object literal body. */
function getNumProp(s: string, key: string): number | undefined {
  const m = s.match(new RegExp(`(?:^|[^\\w])${key}\\s*:\\s*(-?\\d*\\.?\\d+)`))
  return m ? Number(m[1]) : undefined
}

/** True when a transition block declares `type: "spring"` (any quote style). */
function isSpringTransition(s: string): boolean {
  return /type\s*:\s*["']spring["']/.test(s)
}

/**
 * Resolves a cycle duration from one or more candidate text blobs (checked in
 * order). SVG SMIL can't replay spring physics, so a `type: "spring"`
 * transition — or any transition with no explicit `duration` at all — falls
 * back to a fixed default that the speed slider can still scale.
 */
function resolveDuration(...texts: string[]): number {
  if (texts.some(isSpringTransition)) return 0.5
  for (const t of texts) {
    const m = t.match(/duration\s*:\s*([\d.]+)/)
    if (m) return Math.max(0.05, Number(m[1]))
  }
  return 0.5
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
  // The `__VARIANTS__:` marker gives `getVariantsStates` an unambiguous way to
  // relocate this block later; plain substring search (used by the rest of
  // this file to find nested "animate"/"rotate" keys) still works right
  // through it since it doesn't care about the marker at all.
  return block ? `${attrs}\n__VARIANTS__:${block}` : attrs
}

/**
 * Resolves a `transition={SomeIdentifier}` reference the same way
 * `resolveVariantsRef` does for `variants` — so a transition factored out
 * into a shared `const DEFAULT_TRANSITION = { type: "spring", ... }` reads
 * the same as if it had been written inline on the tag.
 */
function resolveTransitionRef(source: string, attrs: string): string {
  const ref = attrs.match(/transition\s*=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}/)
  if (!ref) return attrs
  const block = findConstBlock(source, ref[1])
  return block ? `${attrs}\n${block}` : attrs
}

/** Resolves both `variants={Ref}` and `transition={Ref}` external references. */
function resolvePropRefs(source: string, attrs: string): string {
  return resolveTransitionRef(source, resolveVariantsRef(source, attrs))
}

/**
 * Splits a tag's `variants` object (inline `variants={{ ... }}` or an
 * external ref already inlined by `resolveVariantsRef`) into its named
 * states, e.g. `{ normal: { y: 0 }, firstState: { y: -9 }, secondState: { y: 0 } }`
 * becomes `[{name:"normal",...}, {name:"firstState",...}, {name:"secondState",...}]`.
 * The "normal" (rest) state, if present, is always ordered first so keyframe
 * sequences read start-to-end the way the animation actually plays.
 */
function getVariantsStates(attrs: string): Array<{ name: string; body: string }> | undefined {
  const inline = attrs.match(/variants\s*=\s*\{\s*\{/)
  const block = inline?.index != null ? matchBalancedBraces(attrs, inline.index + inline[0].length - 1) : undefined
  const outer = block ?? findNamedBlock(attrs, "__VARIANTS__")
  if (!outer) return undefined

  const inner = outer.slice(1, -1)
  const states: Array<{ name: string; body: string }> = []
  const re = /([A-Za-z_$][\w$]*)\s*:\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(inner))) {
    const braceStart = m.index + m[0].length - 1
    const body = matchBalancedBraces(inner, braceStart)
    if (body) {
      states.push({ name: m[1], body })
      re.lastIndex = braceStart + body.length
    }
  }
  if (states.length < 2) return undefined
  const normalIdx = states.findIndex((s) => s.name === "normal")
  return normalIdx > 0 ? [states[normalIdx], ...states.filter((_, i) => i !== normalIdx)] : states
}

/**
 * Combines a scalar value spread across sequential variant states (e.g.
 * `normal: { y: 0 }` → `firstState: { y: -9 }` → `secondState: { y: 0 }`)
 * into a single keyframe array, in the order the states are declared (with
 * "normal" first). Requires every state to define the key explicitly — a
 * partial sequence isn't enough to infer the missing values. A two-state
 * toggle (e.g. `normal`/`animate`) that doesn't already return to its start
 * value gets the start value appended so it can loop seamlessly.
 */
function keyframesFromVariantStates(
  states: Array<{ name: string; body: string }>,
  key: string,
): number[] | undefined {
  const vals = states.map((s) => getNumProp(s.body, key))
  if (vals.some((v) => v === undefined)) return undefined
  const nums = vals as number[]
  if (nums.length === 2 && nums[0] !== nums[1]) return [...nums, nums[0]]
  return nums
}

/**
 * Captures an element's built-in animation (motion/react variants) so we can
 * replay the *original* motion. We look for keyframe arrays of `d`, `opacity`,
 * `pathLength`, and/or a translate (`x`/`y`), plus the transition `duration`.
 * Returns undefined for static shapes.
 *
 * `source`/`attrs` are resolved for external `variants`/`transition` refs
 * (see `resolvePropRefs`) — when there's an "animate" sub-block we read the
 * keyframes and duration from there specifically, since the "normal"/rest
 * state's own numbers would otherwise be picked up first. Sequential named
 * states (e.g. `normal`/`firstState`/`secondState`, or `normal`/`animate`)
 * are combined into keyframe arrays by `keyframesFromVariantStates` for
 * attributes — like a `y` translate — that are expressed as a scalar per
 * state rather than an inline `key: [...]` array.
 */
function parseElementAnim(source: string, attrs: string): ElementAnim | undefined {
  const resolved = resolvePropRefs(source, attrs)
  const animateBlock = findNamedBlock(resolved, "animate")
  const primary = animateBlock ?? resolved
  const d = getStringArray(primary, "d") ?? getStringArray(resolved, "d")
  let opacity = getNumberArray(primary, "opacity") ?? getNumberArray(resolved, "opacity")
  let pathLength = getNumberArray(primary, "pathLength") ?? getNumberArray(resolved, "pathLength")
  let x: number[] | undefined
  let y: number[] | undefined

  const states = getVariantsStates(resolved)
  if (states) {
    x = keyframesFromVariantStates(states, "x")
    y = keyframesFromVariantStates(states, "y")
    opacity = opacity ?? keyframesFromVariantStates(states, "opacity")
    pathLength = pathLength ?? keyframesFromVariantStates(states, "pathLength")
  }

  if (!d && !opacity && !pathLength && !x && !y) return undefined
  const duration = resolveDuration(primary, resolved)
  const anim: ElementAnim = { duration }
  if (d) anim.d = d
  if (opacity) anim.opacity = opacity
  if (pathLength) anim.pathLength = pathLength
  if (x) anim.x = x
  if (y) anim.y = y
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
  const resolved = resolvePropRefs(source, attrs)
  const animateBlock = findNamedBlock(resolved, "animate")
  const primary = animateBlock ?? resolved
  let rotate = getNumberArray(primary, "rotate") ?? getNumberArray(resolved, "rotate")

  // Some icons (e.g. Hourglass's `motion.g`) express rotate as a scalar per
  // named state — `normal: { rotate: 0 }` / `animate: { rotate: 180 }` —
  // rather than an inline `rotate: [...]` array.
  if (!rotate) {
    const states = getVariantsStates(resolved)
    if (states) rotate = keyframesFromVariantStates(states, "rotate")
  }

  // Close the loop for 2-state rotate animations (e.g., [0, 180] -> [0, 180, 0])
  if (rotate && rotate.length === 2 && rotate[0] !== rotate[1]) {
    rotate = [...rotate, rotate[0]];
  }

  if (!rotate || rotate.length < 2) return undefined

  const transitionBlock = findNamedBlock(primary, "transition") ?? primary
  let times = getNumberArray(transitionBlock, "times")

  // If we added a 3rd keyframe to rotate but times only has 2, pad times as a safe fallback
  if (times && times.length === 2 && rotate.length === 3) {
    times = [...times, 1];
  }

  const duration = resolveDuration(transitionBlock, primary, resolved)

  // Extract transformOrigin from inline style={{ transformOrigin: "..." }}
  const styleMatch = attrs.match(/style\s*=\s*\{\{\s*.*?transformOrigin\s*:\s*["']([^"']+)["'].*?\s*\}\}/);
  const transformOrigin = styleMatch?.[1] ?? getQuotedProp(attrs, "transformOrigin") ?? getAttr(attrs, "transform-origin") ?? "50% 50%"

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
    const anim = parseElementAnim(source, attrs)
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