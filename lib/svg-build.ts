import type { IconConfig, IconElement } from "./icon-types"

/** Triangle wave: maps a 0..1 loop position to a 0..1..0 ramp for seamless looping. */
function triangle(p: number): number {
  return p < 0.5 ? p * 2 : (1 - p) * 2
}

/** Longest built-in cycle among elements, or 0 if none carry an animation. */
function maxAnimDuration(elements: IconElement[]): number {
  return elements.reduce((m, el) => Math.max(m, el.anim?.duration ?? 0), 0)
}

export function computeLoopDuration(config: IconConfig, elements?: IconElement[]): number {
  // In "original" mode the loop spans the slowest built-in cycle so every
  // element can complete a whole number of its own cycles (seamless loop).
  const base = config.animation === "original" && elements ? maxAnimDuration(elements) || 2 : 2
  return base / Math.max(0.1, config.speed)
}

/** Samples keyframe pair + fraction for `n` evenly-spaced values at loop position `t` (0..1). */
function keyframeAt(n: number, t: number): { i: number; j: number; f: number } {
  if (n <= 1) return { i: 0, j: 0, f: 0 }
  const scaled = Math.min(0.999999, Math.max(0, t)) * (n - 1)
  const i = Math.floor(scaled)
  return { i, j: Math.min(n - 1, i + 1), f: scaled - i }
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

function buildInner(elements: IconElement[], config: IconConfig, progress: number): string {
  const loopMax = config.animation === "original" ? maxAnimDuration(elements) : 0
  return elements
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
          extra = ` opacity="${o.toFixed(3)}"`
        }
        return `<${el.type} ${attrs}${extra} />`
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
}

export interface RenderSvgOptions {
  viewBox: string
  elements: IconElement[]
  config: IconConfig
  size: number
  /** Animation loop position, 0..1. */
  progress: number
}

/**
 * Produces a complete standalone SVG string for a given animation frame.
 * Used by both the live preview and the GIF exporter so they stay identical.
 */
export function renderSvgString({ viewBox, elements, config, size, progress }: RenderSvgOptions): string {
  const opaque = config.background && config.background !== "transparent"
  const bg = opaque
    ? `<rect x="0" y="0" width="100%" height="100%" fill="${config.background}" stroke="none" />`
    : ""
  const inner = buildInner(elements, config, progress)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" ` +
    `fill="none" stroke="${config.color}" stroke-width="${config.strokeWidth}" ` +
    `stroke-linecap="${config.lineCap}" stroke-linejoin="${config.lineJoin}">${bg}${inner}</svg>`
  )
}
