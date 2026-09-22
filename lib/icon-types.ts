export type IconElement =
  | { type: "path"; d: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number }
  | { type: "polyline"; points: string }
  | { type: "polygon"; points: string }

export type AnimationType = "none" | "draw" | "pulse"
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
