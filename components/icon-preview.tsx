"use client"

import { useEffect, useRef } from "react"

import type { IconConfig, IconElement } from "@/lib/icon-types"
import { computeLoopDuration, renderSvgString } from "@/lib/svg-build"

interface IconPreviewProps {
  viewBox: string
  elements: IconElement[]
  config: IconConfig
  label: string
}

/**
 * Renders the icon by rewriting the SVG markup every animation frame. This uses
 * the exact same `renderSvgString` the GIF exporter uses, so the preview is a
 * true 1:1 reflection of what gets downloaded.
 */
export function IconPreview({ viewBox, elements, config, label }: IconPreviewProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const loop = computeLoopDuration(config, elements)
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const progress = config.animation === "none" ? 0 : ((now - start) / 1000 / loop) % 1
      node.innerHTML = renderSvgString({ viewBox, elements, config, size: config.size, progress })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [viewBox, elements, config])

  return <div ref={ref} role="img" aria-label={label} className="flex items-center justify-center" />
}
