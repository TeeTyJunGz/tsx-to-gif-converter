/**
 * The icon's own built-in animation, captured from the source when available
 * (e.g. a motion/react per-element morph). This lets us replay the *original*
 * motion instead of the generic draw/pulse effects.
 */
export interface ElementAnim {
  /** Keyframe values for the `d` attribute (path morph). */
  d?: string[]
  /** Keyframe values for the `opacity` attribute. */
  opacity?: number[]
  /** Keyframe values for the `pathLength` attribute (draw-in effect). */
  pathLength?: number[]
  /** Keyframe values for a horizontal translate, in SVG user units. */
  x?: number[]
  /** Keyframe values for a vertical translate, in SVG user units. */
  y?: number[]
  /** One full cycle duration in seconds (at speed 1). */
  duration: number
}

type IconElementBase =
  | { type: "path"; d: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number }
  | { type: "polyline"; points: string }
  | { type: "polygon"; points: string }

export type IconElement = IconElementBase & { anim?: ElementAnim }

/**
 * A whole-icon transform animation captured from an outer `<motion.svg>` or
 * `<motion.g>` wrapper (e.g. a swinging/rotating icon like Lucide's Hammer),
 * as opposed to `ElementAnim` which morphs a single shape's own attributes.
 */
export interface GroupAnim {
  /** Keyframe values for a `rotate` transform, in degrees. */
  rotate: number[]
  /** Normalized (0..1) keyframe timing positions; defaults to evenly spaced. */
  times?: number[]
  /** CSS `transform-origin`, e.g. "0% 100%", so rotation swings from the right pivot. */
  transformOrigin: string
  /** One full cycle duration in seconds (at speed 1). */
  duration: number
}

export type AnimationType = "none" | "draw" | "pulse" | "original"

/** True when the icon carries a captured original animation, per-element or whole-group. */
export function hasOriginalAnimation(elements: IconElement[], groupAnim?: GroupAnim): boolean {
  return groupAnim != null || elements.some((el) => el.anim != null)
}
export type LineCap = "round" | "butt" | "square"
export type LineJoin = "round" | "bevel" | "miter"

export interface IconConfig {
  /** Stroke color. */
  color: string
  /** Background color, or the literal "transparent". */
  background: string
  strokeWidth: number
  /** On-screen preview size in px. */
  size: number
  /** Animation speed multiplier (1 = base). */
  speed: number
  animation: AnimationType
  lineCap: LineCap
  lineJoin: LineJoin
  /** Pixel dimensions of the exported GIF (square). */
  exportSize: number
}

export interface IconRecord {
  slug: string
  name: string
  viewBox: string
  elements: IconElement[]
  /** Whole-icon rotate/transform animation, if the source had one (see `GroupAnim`). */
  groupAnim?: GroupAnim
  config: IconConfig
}

export const DEFAULT_CONFIG: IconConfig = {
  color: "#fcb8d9",
  background: "transparent",
  strokeWidth: 2,
  size: 96,
  speed: 1,
  animation: "draw",
  lineCap: "round",
  lineJoin: "round",
  exportSize: 512,
}

export const EXPORT_SIZES = [64, 128, 256, 512] as const
