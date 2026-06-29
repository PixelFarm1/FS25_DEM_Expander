import { useEffect, useRef } from 'react'
import { Badge } from './ui/badge.jsx'

const COLOR_NEW_AREA = '#d8d0c8'   // muted warm — unfilled territory
const COLOR_BORDER   = '#E63946'   // primary red — source boundary
const COLOR_LABEL_BG = 'rgba(253,248,245,0.85)'
const PADDING        = 32

function getOffset(placement, srcW, srcH, outW, outH) {
  switch (placement) {
    case 'center':       return { ox: Math.round((outW - srcW) / 2), oy: Math.round((outH - srcH) / 2) }
    case 'top-left':     return { ox: 0,          oy: 0           }
    case 'top-right':    return { ox: outW - srcW, oy: 0           }
    case 'bottom-left':  return { ox: 0,          oy: outH - srcH }
    case 'bottom-right': return { ox: outW - srcW, oy: outH - srcH }
    default:             return { ox: 0,          oy: 0           }
  }
}

export default function PreviewCanvas({
  srcBitmap, outputBitmap,
  srcDims, targetSize, placement, unitsPerPixel,
  isRunning, t,
}) {
  const canvasRef   = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    const { width: cw, height: ch } = container.getBoundingClientRect()
    canvas.width  = cw
    canvas.height = ch
    ctx.clearRect(0, 0, cw, ch)

    // ── State 1: no file uploaded (or still loading) ──────────────────────
    if (!srcDims && !outputBitmap) {
      ctx.fillStyle = '#a0988e'
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.previewEmpty, cw / 2, ch / 2)
      return
    }

    const outPx = Math.round(targetSize / unitsPerPixel) + 1
    const scale  = Math.min(
      (cw - PADDING * 2) / outPx,
      (ch - PADDING * 2) / outPx
    )
    const drawW  = outPx * scale
    const drawH  = outPx * scale
    const startX = Math.round((cw - drawW) / 2)
    const startY = Math.round((ch - drawH) / 2)

    // ── State 3: output ready — show generated image ───────────────────────
    if (outputBitmap) {
      ctx.drawImage(outputBitmap, startX, startY, drawW, drawH)

      // Outer border
      ctx.strokeStyle = '#b0a898'
      ctx.lineWidth = 1
      ctx.strokeRect(startX, startY, drawW, drawH)

      // Label
      drawLabel(ctx, `Output: ${outputBitmap.width}×${outputBitmap.height} px`, startX + 6, startY + 6)
      return
    }

    // ── State 2: file uploaded — show source in position ───────────────────
    // Background (new/empty area)
    ctx.fillStyle = COLOR_NEW_AREA
    ctx.fillRect(startX, startY, drawW, drawH)

    // Source DEM at the chosen placement
    const { ox, oy } = getOffset(placement, srcDims.w, srcDims.h, outPx, outPx)
    const srcDrawX = startX + ox * scale
    const srcDrawY = startY + oy * scale
    const srcDrawW = srcDims.w * scale
    const srcDrawH = srcDims.h * scale

    if (srcBitmap) {
      ctx.drawImage(srcBitmap, srcDrawX, srcDrawY, srcDrawW, srcDrawH)
    } else {
      // Browser couldn't create a bitmap (common for 16-bit PNGs) — draw a labelled placeholder
      ctx.fillStyle = '#b8c8a8'
      ctx.fillRect(srcDrawX, srcDrawY, srcDrawW, srcDrawH)
    }

    // Red border around source
    ctx.strokeStyle = COLOR_BORDER
    ctx.lineWidth = 2
    ctx.strokeRect(srcDrawX + 1, srcDrawY + 1, srcDrawW - 2, srcDrawH - 2)

    // Outer border
    ctx.strokeStyle = '#b0a898'
    ctx.lineWidth = 1
    ctx.strokeRect(startX, startY, drawW, drawH)

    // Labels
    drawLabel(ctx, `Output canvas: ${outPx}×${outPx} px  (${targetSize}m)`, startX + 6, startY + 6)
    drawLabel(ctx, `Source: ${srcDims.w}×${srcDims.h} px`, srcDrawX + 4, srcDrawY + 4, COLOR_BORDER)

    // Running spinner overlay
    if (isRunning) {
      ctx.fillStyle = 'rgba(253,248,245,0.55)'
      ctx.fillRect(startX, startY, drawW, drawH)
      ctx.fillStyle = '#1A120B'
      ctx.font = 'bold 13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Processing…', startX + drawW / 2, startY + drawH / 2)
    }

  }, [srcBitmap, outputBitmap, srcDims, targetSize, placement, unitsPerPixel, isRunning, t])

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

function drawLabel(ctx, text, x, y, color = '#1A120B') {
  ctx.font = 'bold 11px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const metrics = ctx.measureText(text)
  const pad = 3
  ctx.fillStyle = COLOR_LABEL_BG
  ctx.fillRect(x - pad, y - pad, metrics.width + pad * 2, 14 + pad * 2)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}
