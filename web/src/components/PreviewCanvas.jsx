import { useEffect, useRef, useCallback } from 'react'
import { Badge } from './ui/badge.jsx'

const COLOR_NEW_AREA = '#d8d0c8'   // muted warm — unfilled territory
const COLOR_BORDER   = '#E63946'   // primary red — source boundary
const COLOR_LABEL_BG = 'rgba(253,248,245,0.85)'
const PADDING        = 32

export default function PreviewCanvas({
  srcBitmap, outputBitmap,
  srcDims, targetSize,
  offset, onOffsetChange, outPx,
  unitsPerPixel,
  isRunning, t,
}) {
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)

  // Stores canvas-space geometry so drag handlers don't depend on stale closures
  const drawParamsRef = useRef(null)  // { startX, startY, scale, srcDrawX, srcDrawY, srcDrawW, srcDrawH }

  // Drag state (refs, not state — no re-render needed mid-drag)
  const isDragging   = useRef(false)
  const dragStart    = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  // ── Draw ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    const { width: cw, height: ch } = container.getBoundingClientRect()
    canvas.width  = cw
    canvas.height = ch
    ctx.clearRect(0, 0, cw, ch)

    // ── State 1: no file uploaded ────────────────────────────────────────────
    if (!srcDims && !outputBitmap) {
      drawParamsRef.current = null
      ctx.fillStyle = '#a0988e'
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.previewEmpty, cw / 2, ch / 2)
      return
    }

    const scale  = Math.min(
      (cw - PADDING * 2) / outPx,
      (ch - PADDING * 2) / outPx
    )
    const drawW  = outPx * scale
    const drawH  = outPx * scale
    const startX = Math.round((cw - drawW) / 2)
    const startY = Math.round((ch - drawH) / 2)

    // ── State 3: output ready — show generated image ─────────────────────────
    if (outputBitmap) {
      drawParamsRef.current = null  // no dragging on result view
      ctx.drawImage(outputBitmap, startX, startY, drawW, drawH)

      ctx.strokeStyle = '#b0a898'
      ctx.lineWidth = 1
      ctx.strokeRect(startX, startY, drawW, drawH)

      drawLabel(ctx, `Output: ${outputBitmap.width}×${outputBitmap.height} px`, startX + 6, startY + 6)
      return
    }

    // ── State 2: file uploaded — show source at offset ───────────────────────
    // Background (new/empty area)
    ctx.fillStyle = COLOR_NEW_AREA
    ctx.fillRect(startX, startY, drawW, drawH)

    const srcDrawX = startX + offset.x * scale
    const srcDrawY = startY + offset.y * scale
    const srcDrawW = srcDims.w * scale
    const srcDrawH = srcDims.h * scale

    // Store geometry for drag handlers
    drawParamsRef.current = { startX, startY, scale, srcDrawX, srcDrawY, srcDrawW, srcDrawH }

    if (srcBitmap) {
      ctx.drawImage(srcBitmap, srcDrawX, srcDrawY, srcDrawW, srcDrawH)
    } else {
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

    // Running overlay
    if (isRunning) {
      ctx.fillStyle = 'rgba(253,248,245,0.55)'
      ctx.fillRect(startX, startY, drawW, drawH)
      ctx.fillStyle = '#1A120B'
      ctx.font = 'bold 13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Processing…', startX + drawW / 2, startY + drawH / 2)
    }

  }, [srcBitmap, outputBitmap, srcDims, targetSize, offset, outPx, unitsPerPixel, isRunning, t])

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const hitTestSrc = useCallback((mx, my) => {
    const p = drawParamsRef.current
    if (!p) return false
    return mx >= p.srcDrawX && mx <= p.srcDrawX + p.srcDrawW &&
           my >= p.srcDrawY && my <= p.srcDrawY + p.srcDrawH
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (!drawParamsRef.current || outputBitmap) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (!hitTestSrc(mx, my)) return
    isDragging.current = true
    dragStart.current = { mx, my, ox: offset.x, oy: offset.y }
    e.preventDefault()
  }, [outputBitmap, offset, hitTestSrc])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Update cursor
    if (!isDragging.current) {
      canvas.style.cursor = (drawParamsRef.current && !outputBitmap && hitTestSrc(mx, my))
        ? 'grab'
        : 'default'
      return
    }

    // While dragging
    canvas.style.cursor = 'grabbing'
    const p = drawParamsRef.current
    if (!p || !srcDims) return

    const dx = mx - dragStart.current.mx
    const dy = my - dragStart.current.my
    const newOx = dragStart.current.ox + dx / p.scale
    const newOy = dragStart.current.oy + dy / p.scale

    onOffsetChange({ x: newOx, y: newOy })
  }, [outputBitmap, srcDims, onOffsetChange, hitTestSrc])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">

      <div className="flex items-center px-3 pt-3 pb-2">
        <Badge variant="default" className="text-[14px] tracking-widest uppercase rounded-sm">
          {t.preview}
        </Badge>
        {srcDims && !outputBitmap && (
          <span className="ml-3 text-[11px] text-muted-foreground">
            drag to reposition
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 mx-2 mb-2 rounded-lg border border-border bg-card overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
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
