import type { GroupAnim, IconConfig, IconElement } from "./icon-types"

/** Triangle wave: maps a 0..1 loop position to a 0..1..0 ramp for seamless looping. */
function triangle(p: number): number {
  return p < 0.5 ? p * 2 : (1 - p) * 2
}

/** Longest built-in cycle among elements and the whole-icon group animation, or 0 if none. */
function maxAnimDuration(elements: IconElement[], groupAnim?: GroupAnim): number {
  const elementsMax = elements.reduce((m, el) => Math.max(m, el.anim?.duration ?? 0), 0)
  return Math.max(elementsMax, groupAnim?.duration ?? 0)
}

export function computeLoopDuration(config: IconConfig, elements?: IconElement[], groupAnim?: GroupAnim): number {
  // In "original" mode the loop spans the slowest built-in cycle so every
  // element (and the whole-icon rotate, if any) can complete a whole number
  // of its own cycles (seamless loop).
  const base = config.animation === "original" && elements ? maxAnimDuration(elements, groupAnim) || 2 : 2
  return base / Math.max(0.1, config.speed)
}

/** Samples keyframe pair + fraction for `n` evenly-spaced values at loop position `t` (0..1). */
function keyframeAt(n: number, t: number): { i: number; j: number; f: number } {
  if (n <= 1) return { i: 0, j: 0, f: 0 }
  const scaled = Math.min(0.999999, Math.max(0, t)) * (n - 1)
  const i = Math.floor(scaled)
  return { i, j: Math.min(n - 1, i + 1), f: scaled - i }
}

/** Samples keyframe pair + fraction for non-uniform `times` positions at loop position `t` (0..1). */
function keyframeAtTimes(times: number[], t: number): { i: number; j: number; f: number } {
  const n = times.length
  if (n <= 1) return { i: 0, j: 0, f: 0 }
  const tt = Math.min(0.999999, Math.max(0, t))
  let i = 0
  while (i < n - 2 && tt >= times[i + 1]) i++
  const j = Math.min(n - 1, i + 1)
  const span = times[j] - times[i]
  const f = span > 0 ? (tt - times[i]) / span : 0
  return { i, j, f }
}

/** Interpolates a numeric keyframe array at loop position `t` (0..1). */
function sampleKeyframes(values: number[], t: number): number {
  const { i, j, f } = keyframeAt(values.length, t)
  return values[i] + (values[j] - values[i]) * f
}

function trimNum(v: number): string {
  return Number.parseFloat(v.toFixed(3)).toString()
}

const NUM_RE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi

/** Interpolates two path `d` strings token-wise; falls back to a swap if shapes differ. */
function lerpPathD(a: string, b: string, f: number): string {
  const bNums = b.match(NUM_RE)
  if (!bNums) return a
  let k = 0
  const out = a.replace(NUM_RE, (m) => {
    const bv = bNums[k] != null ? Number.parseFloat(bNums[k]) : Number.parseFloat(m)
    k++
    const av = Number.parseFloat(m)
    return trimNum(av + (bv - av) * f)
  })
  return k === bNums.length ? out : f < 0.5 ? a : b
}

function baseAttrs(el: IconElement): string {
  switch (el.type) {
    case "path":
      return `d="${el.d}"`
    case "line":
      return `x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}"`
    case "circle":
      return `cx="${el.cx}" cy="${el.cy}" r="${el.r}"`
    case "ellipse":
      return `cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}"`
    case "rect":
      return `x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}"${
        el.rx != null ? ` rx="${el.rx}"` : ""
      }${el.ry != null ? ` ry="${el.ry}"` : ""}`
    case "polyline":
    case "polygon":
      return `points="${el.points}"`
  }
}

function buildInner(elements: IconElement[], config: IconConfig, progress: number, groupAnim?: GroupAnim): string {
  const loopMax = config.animation === "original" ? maxAnimDuration(elements, groupAnim) : 0
  const shapes = elements
    .map((el, i) => {
      if (config.animation === "original") {
        // Replay the element's own captured motion. Each element runs a whole
        // number of its cycles inside the shared loop, so the loop stays seamless
        // while faster bars still visibly move faster.
        const anim = el.anim
        if (!anim || loopMax <= 0) return `<${el.type} ${baseAttrs(el)} />`
        const cycles = Math.max(1, Math.round(loopMax / anim.duration))
        const local = (progress * cycles) % 1
        let attrs = baseAttrs(el)
        let extra = ""
        if (anim.d && anim.d.length > 1 && el.type === "path") {
          const { i: ki, j: kj, f } = keyframeAt(anim.d.length, local)
          attrs = `d="${lerpPathD(anim.d[ki], anim.d[kj], f)}"`
        }
        if (anim.opacity && anim.opacity.length > 1) {
          const { i: ki, j: kj, f } = keyframeAt(anim.opacity.length, local)
          const o = anim.opacity[ki] + (anim.opacity[kj] - anim.opacity[ki]) * f
          extra += ` opacity="${o.toFixed(3)}"`
        }
        if (anim.pathLength && anim.pathLength.length > 1) {
          // pathLength keyframes describe a draw-in fraction (0..1). Normalize the
          // path to length 1 and drive the dash offset from that fraction so the
          // same "grows from nothing" motion Lucide's `pathLength` produces shows
          // up here too, without relying on framer-motion at render time.
          const { i: ki, j: kj, f } = keyframeAt(anim.pathLength.length, local)
          const pl = anim.pathLength[ki] + (anim.pathLength[kj] - anim.pathLength[ki]) * f
          extra += ` pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - pl).toFixed(4)}"`
        }
        const shape = `<${el.type} ${attrs}${extra} />`

        // A captured `x`/`y` translate (e.g. LayersIcon's bars sliding up and
        // back) is applied as a wrapping `<g>` transform rather than an
        // attribute on the shape itself, matching how motion/react animates
        // `x`/`y` via a transform under the hood.
        const hasX = anim.x && anim.x.length > 1
        const hasY = anim.y && anim.y.length > 1
        if (!hasX && !hasY) return shape
        const tx = hasX ? sampleKeyframes(anim.x!, local) : 0
        const ty = hasY ? sampleKeyframes(anim.y!, local) : 0
        return `<g transform="translate(${tx.toFixed(3)},${ty.toFixed(3)})">${shape}</g>`
      }

      let extra = ""
      if (config.animation === "draw") {
        // pathLength="1" normalizes every shape so a single dash covers it fully,
        // regardless of its real geometric length.
        const offset = 1 - triangle(progress)
        extra = ` pathLength="1" stroke-dasharray="1" stroke-dashoffset="${offset.toFixed(4)}"`
      } else if (config.animation === "pulse") {
        const staggered = (progress + i * 0.12) % 1
        const opacity = 0.35 + 0.65 * triangle(staggered)
        extra = ` opacity="${opacity.toFixed(3)}"`
      }
      return `<${el.type} ${baseAttrs(el)}${extra} />`
    })
    .join("")

  // Replay a whole-icon rotate (e.g. Hammer's swing) by wrapping every shape in
  // a `<g>` rotated to the current keyframe angle, pivoting around the same
  // transform-origin the original motion component used.
  if (config.animation === "original" && groupAnim && loopMax > 0) {
    const cycles = Math.max(1, Math.round(loopMax / groupAnim.duration))
    const local = (progress * cycles) % 1
    const useTimes = groupAnim.times && groupAnim.times.length === groupAnim.rotate.length
    const { i, j, f } = useTimes
      ? keyframeAtTimes(groupAnim.times!, local)
      : keyframeAt(groupAnim.rotate.length, local)
    const deg = groupAnim.rotate[i] + (groupAnim.rotate[j] - groupAnim.rotate[i]) * f
    return `<g transform="rotate(${deg.toFixed(2)})" style="transform-origin:${groupAnim.transformOrigin};transform-box:fill-box">${shapes}</g>`
  }

  return shapes
}

export interface RenderSvgOptions {
  viewBox: string
  elements: IconElement[]
  config: IconConfig
  size: number
  /** Animation loop position, 0..1. */
  progress: number
  /** Whole-icon rotate animation, if the source icon had one (see `GroupAnim`). */
  groupAnim?: GroupAnim
}

/**
 * Produces a complete standalone SVG string for a given animation frame.
 * Used by both the live preview and the GIF exporter so they stay identical.
 */
export function renderSvgString({ viewBox, elements, config, size, progress, groupAnim }: RenderSvgOptions): string {
  const opaque = config.background && config.background !== "transparent"
  const bg = opaque
    ? `<rect x="0" y="0" width="100%" height="100%" fill="${config.background}" stroke="none" />`
    : ""
  const inner = buildInner(elements, config, progress, groupAnim)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" ` +
    `fill="none" stroke="${config.color}" stroke-width="${config.strokeWidth}" ` +
    `stroke-linecap="${config.lineCap}" stroke-linejoin="${config.lineJoin}">${bg}${inner}</svg>`
  )
}
