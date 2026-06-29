import { useEffect, useRef } from 'react'
import { Badge } from './ui/badge.jsx'

// Colours matching Watermelon UI palette
const COLOR_OUTPUT_BG = '#e8e0d8'   // warm muted — new empty area
const COLOR_SOURCE    = '#c8d8b8'   // soft green — existing DEM
const COLOR_BORDER    = '#E63946'   // primary red — source boundary
const COLOR_LABEL     = '#1A120B'   // foreground

function getOffset(placement, srcW, srcH, outW, outH) {
  switch (placement) {
    case 'center':       return { ox: Math.round((outW - srcW) / 2), oy: Math.round((outH - srcH) / 2) }
    case 'top-left':     return { ox: 0, oy: 0 }
    case 'top-right':    return { ox: outW - srcW, oy: 0 }
    case 'bottom-left':  return { ox: 0, oy: outH - srcH }
    case 'bottom-right': return { ox: outW - srcW, oy: outH - srcH }
    default:             return { ox: 0, oy: 0 }
  }
}

export default function PreviewCanvas({ srcDims, targetSize, placement, unitsPerPixel, t }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    const { width: cw, height: ch } = container.getBoundingClientRect()
    canvas.width  = cw
    canvas.height = ch
    ctx.clearRect(0, 0, cw, ch)

    if (!srcDims) {
      // Empty state
      ctx.fillStyle = '#c8c0b8'
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t.previewEmpty, cw / 2, ch / 2)
      return
    }

    const outPx = Math.round(targetSize / unitsPerPixel) + 1
    const padding = 32

    const scale = Math.min(
      (cw - padding * 2) / outPx,
      (ch - padding * 2) / outPx
    )

    const drawW = outPx * scale
    const drawH = outPx * scale
    const startX = Math.round((cw - drawW) / 2)
    const startY = Math.round((ch - drawH) / 2)

    // Output canvas background
    ctx.fillStyle = COLOR_OUTPUT_BG
    ctx.fillRect(startX, startY, drawW, drawH)

    // Source DEM rect
    const { ox, oy } = getOffset(placement, srcDims.w, srcDims.h, outPx, outPx)
    const srcDrawX = startX + ox * scale
    const srcDrawY = startY + oy * scale
    const srcDrawW = srcDims.w * scale
    const srcDrawH = srcDims.h * scale

    ctx.fillStyle = COLOR_SOURCE
    ctx.fillRect(srcDrawX, srcDrawY, srcDrawW, srcDrawH)

    // Red border around source
    ctx.strokeStyle = COLOR_BORDER
    ctx.lineWidth = 2
    ctx.strokeRect(srcDrawX, srcDrawY, srcDrawW, srcDrawH)

    // Outer border
    ctx.strokeStyle = '#b0a898'
    ctx.lineWidth = 1
    ctx.strokeRect(startX, startY, drawW, drawH)

    // Labels
    ctx.fillStyle = COLOR_LABEL
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.textAlign = 'left'

    const outSizeLabel = `${outPx}×${outPx} px  (${targetSize}m)`
    ctx.fillText(outSizeLabel, startX + 6, startY + 14)

    ctx.fillStyle = '#1B4332'
    ctx.font = '10px Inter, sans-serif'
    const srcLabel = `Source: ${srcDims.w}×${srcDims.h} px`
    // Place label near the source rect, avoiding clipping
    const labelY = Math.max(srcDrawY + 14, startY + 28)
    ctx.fillText(srcLabel, Math.max(srcDrawX + 4, startX + 4), labelY)

  }, [srcDims, targetSize, placement, unitsPerPixel, t])

  return (
    <div className="flex flex-col h-full bg-background">

      <div className="flex items-center px-3 pt-3 pb-2">
        <Badge variant="default" className="text-[14px] tracking-widest uppercase rounded-sm">
          {t.preview}
        </Badge>
      </div>

      <div ref={containerRef} className="flex-1 mx-2 mb-2 rounded-lg border border-border bg-card overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

    </div>
  )
}
