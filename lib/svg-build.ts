import type { IconConfig, IconElement } from "./icon-types"

/** Triangle wave: maps a 0..1 loop position to a 0..1..0 ramp for seamless looping. */
function triangle(p: number): number {
  return p < 0.5 ? p * 2 : (1 - p) * 2
}

export function computeLoopDuration(config: IconConfig): number {
  const base = 2 // seconds at speed 1
  return base / Math.max(0.1, config.speed)
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
  return elements
    .map((el, i) => {
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
