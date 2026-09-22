"use client"

import { useState } from "react"
import { GIFEncoder, quantize, applyPalette } from "gifenc"

import { AudioLinesIcon } from "@/components/audio-lines"
import { Button } from "@/components/ui/button"

const COLOR = "#fcb8d9"

// Each line is a vertical stroke in the 24x24 viewBox. Animated lines
// interpolate between a base and target state over `dur` seconds. The
// durations are chosen so a 3-second capture loops seamlessly.
type Line = {
  x: number
  base: [y: number, len: number]
  target?: [y: number, len: number]
  dur?: number
}

const LINES: Line[] = [
  { x: 2, base: [10, 3] },
  { x: 6, base: [6, 11], target: [10, 3], dur: 1.5 },
  { x: 10, base: [3, 18], target: [9, 5], dur: 1.0 },
  { x: 14, base: [8, 7], target: [6, 11], dur: 0.75 },
  { x: 18, base: [5, 13], target: [7, 9], dur: 1.5 },
  { x: 22, base: [10, 3] },
]

const LOOP_DURATION = 3 // seconds

function drawFrame(ctx: CanvasRenderingContext2D, size: number, t: number) {
  const scale = size / 24
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.scale(scale, scale)
  ctx.strokeStyle = COLOR
  ctx.lineWidth = 2
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  for (const line of LINES) {
    let [y, len] = line.base
    if (line.target && line.dur) {
      const interp = (1 - Math.cos((2 * Math.PI * t) / line.dur)) / 2
      y = line.base[0] + (line.target[0] - line.base[0]) * interp
      len = line.base[1] + (line.target[1] - line.base[1]) * interp
    }
    ctx.beginPath()
    ctx.moveTo(line.x, y)
    ctx.lineTo(line.x, y + len)
    ctx.stroke()
  }

  ctx.restore()
}

export function IconGifExporter() {
  const [exporting, setExporting] = useState(false)

  async function handleDownload() {
    setExporting(true)
    try {
      const size = 512
      const fps = 25
      const frameCount = fps * LOOP_DURATION
      const delay = 1000 / fps

      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) throw new Error("Canvas 2D context unavailable")

      const gif = GIFEncoder()

      for (let i = 0; i < frameCount; i++) {
        const t = (i / frameCount) * LOOP_DURATION
        drawFrame(ctx, size, t)

        const { data } = ctx.getImageData(0, 0, size, size)
        const format = "rgba4444"
        const palette = quantize(data, 256, { format })
        const index = applyPalette(data, palette, format)
        gif.writeFrame(index, size, size, {
          palette,
          delay,
          transparent: true,
        })

        // Yield periodically so the UI stays responsive.
        if (i % 5 === 0) await new Promise((r) => setTimeout(r))
      }

      gif.finish()
      const blob = new Blob([gif.bytes()], { type: "image/gif" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "audio-lines.gif"
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <AudioLinesIcon size={96} style={{ color: COLOR }} />
      <Button onClick={handleDownload} disabled={exporting}>
        {exporting ? "Generating GIF…" : "Download GIF"}
      </Button>
    </div>
  )
}
