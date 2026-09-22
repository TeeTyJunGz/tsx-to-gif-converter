"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { GIFEncoder, quantize, applyPalette } from "gifenc"

import type { IconConfig, IconElement } from "@/lib/icon-types"
import { computeLoopDuration, renderSvgString } from "@/lib/svg-build"
import { Button } from "@/components/ui/button"

interface GifDownloadButtonProps {
  name: string
  slug: string
  viewBox: string
  elements: IconElement[]
  config: IconConfig
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to rasterize SVG frame"))
    img.src = src
  })
}

export function GifDownloadButton({ name, slug, viewBox, elements, config }: GifDownloadButtonProps) {
  const [exporting, setExporting] = useState(false)

  async function handleDownload() {
    setExporting(true)
    try {
      const size = config.exportSize
      const fps = 25
      const animated = config.animation !== "none"
      const loop = animated ? computeLoopDuration(config) : 1
      const frameCount = animated ? Math.max(1, Math.round(fps * loop)) : 1
      const delay = 1000 / fps
      const transparent = !config.background || config.background === "transparent"

      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) throw new Error("Canvas 2D context unavailable")

      const gif = GIFEncoder()

      for (let i = 0; i < frameCount; i++) {
        const progress = frameCount === 1 ? 0 : i / frameCount
        const svg = renderSvgString({ viewBox, elements, config, size, progress })
        const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg))

        ctx.clearRect(0, 0, size, size)
        if (!transparent) {
          ctx.fillStyle = config.background
          ctx.fillRect(0, 0, size, size)
        }
        ctx.drawImage(img, 0, 0, size, size)

        const { data } = ctx.getImageData(0, 0, size, size)
        const format = "rgba4444"
        const palette = quantize(data, 256, { format })
        const index = applyPalette(data, palette, format)
        gif.writeFrame(index, size, size, { palette, delay, transparent })

        if (i % 5 === 0) await new Promise((r) => setTimeout(r))
      }

      gif.finish()
      const blob = new Blob([gif.bytes() as BlobPart], { type: "image/gif" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${slug || "icon"}.gif`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={exporting} className="gap-2">
      <Download className="size-4" aria-hidden />
      {exporting ? "Generating GIF…" : `Download GIF (${config.exportSize}px)`}
    </Button>
  )
}
