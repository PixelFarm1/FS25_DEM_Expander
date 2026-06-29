import { decode, encode } from 'fast-png'
import JSZip from 'jszip'

self.onmessage = async (e) => {
  const { type, payload } = e.data
  if (type !== 'RUN') return

  try {
    const {
      imageBuffer,
      targetSize,
      placement,
      fillMode,
      fillElevation,
      heightScale,
      unitsPerPixel,
    } = payload

    // ── 1. Decode source PNG ──────────────────────────────────────────────────
    log('Decoding source DEM...')
    const src = decode(imageBuffer)
    const { width: srcW, height: srcH, depth, channels } = src

    if (depth !== 16) log(`Warning: source is ${depth}-bit, not 16-bit. Precision may be lost.`)
    if (channels !== 1) log(`Warning: source has ${channels} channels. Expected grayscale (1).`)

    // ── 2. Read source pixels as Uint16 ──────────────────────────────────────
    // fast-png returns Uint8Array with 2 bytes per pixel for 16-bit grayscale (big-endian)
    const bytesPerPx = (depth === 16) ? 2 : 1
    const srcPixels  = new Uint16Array(srcW * srcH)

    for (let i = 0; i < srcW * srcH; i++) {
      if (bytesPerPx === 2) {
        srcPixels[i] = (src.data[i * 2] << 8) | src.data[i * 2 + 1]
      } else {
        srcPixels[i] = src.data[i] * 257  // scale 8-bit → 16-bit
      }
    }

    // ── 3. Output dimensions ─────────────────────────────────────────────────
    const outSize = Math.round(targetSize / unitsPerPixel) + 1
    log(`Source: ${srcW}×${srcH} px  |  Output: ${outSize}×${outSize} px`)

    // ── 4. Placement offset ───────────────────────────────────────────────────
    const { ox, oy } = getOffset(placement, srcW, srcH, outSize, outSize)
    log(`Placement: ${placement}  →  offset (${ox}, ${oy})`)

    // ── 5. Allocate output buffer ─────────────────────────────────────────────
    const outPixels = new Uint16Array(outSize * outSize)

    // ── 6. Initial fill ───────────────────────────────────────────────────────
    if (fillMode === 'flat') {
      const flatValue = Math.round((fillElevation / heightScale) * 65535)
      const clamped   = Math.max(0, Math.min(65535, flatValue))
      outPixels.fill(clamped)
      log(`Flat fill: ${fillElevation}m → pixel value ${clamped}`)
    }
    // edge-extend and mirror are filled per-pixel after source placement

    // ── 7. Place source pixels ────────────────────────────────────────────────
    log('Placing source DEM...')
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const dstX = ox + x
        const dstY = oy + y
        if (dstX >= 0 && dstX < outSize && dstY >= 0 && dstY < outSize) {
          outPixels[dstY * outSize + dstX] = srcPixels[y * srcW + x]
        }
      }
    }

    // ── 8. Fill surrounding area (edge-extend / mirror) ───────────────────────
    if (fillMode === 'edge-extend' || fillMode === 'mirror') {
      log(`Filling new area (${fillMode})...`)
      for (let y = 0; y < outSize; y++) {
        for (let x = 0; x < outSize; x++) {
          const srcX = x - ox
          const srcY = y - oy
          // Skip pixels that already have source data
          if (srcX >= 0 && srcX < srcW && srcY >= 0 && srcY < srcH) continue

          let sampX, sampY
          if (fillMode === 'edge-extend') {
            sampX = Math.max(0, Math.min(srcW - 1, srcX))
            sampY = Math.max(0, Math.min(srcH - 1, srcY))
          } else {
            // mirror
            sampX = mirrorCoord(srcX, srcW)
            sampY = mirrorCoord(srcY, srcH)
          }
          outPixels[y * outSize + x] = srcPixels[sampY * srcW + sampX]
        }
      }
    }

    // ── 9. Encode output as 16-bit grayscale PNG ──────────────────────────────
    log('Encoding output PNG...')
    const outData = new Uint8Array(outSize * outSize * 2)
    for (let i = 0; i < outPixels.length; i++) {
      outData[i * 2]     = (outPixels[i] >> 8) & 0xFF
      outData[i * 2 + 1] =  outPixels[i]       & 0xFF
    }
    const outPng = encode({ width: outSize, height: outSize, data: outData, depth: 16, channels: 1 })

    // ── 10. Build summary text ─────────────────────────────────────────────────
    const summary = buildSummary({ srcW, srcH, outSize, targetSize, heightScale, unitsPerPixel, placement, fillMode, fillElevation })

    // ── 11. Create ZIP ────────────────────────────────────────────────────────
    log('Creating ZIP...')
    const zip = new JSZip()
    zip.file('DEM_expanded.png', outPng)
    zip.file('config_summary.txt', summary)
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })

    self.postMessage({ type: 'DONE', zipBuffer }, [zipBuffer])

  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  self.postMessage({ type: 'LOG', message: msg })
}

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

function mirrorCoord(c, size) {
  if (size <= 0) return 0
  if (c < 0)     return Math.min(-c, size - 1)
  if (c >= size) return Math.max(0, 2 * (size - 1) - c)
  return c
}

function buildSummary({ srcW, srcH, outSize, targetSize, heightScale, unitsPerPixel, placement, fillMode, fillElevation }) {
  const lines = [
    '=== FS25 DEM Expander — Output Summary ===',
    '',
    `Source DEM:        ${srcW}×${srcH} px`,
    `Output DEM:        ${outSize}×${outSize} px`,
    `Target map size:   ${targetSize}m × ${targetSize}m`,
    `Placement:         ${placement}`,
    `Fill mode:         ${fillMode}${fillMode === 'flat' ? ` (${fillElevation}m)` : ''}`,
    '',
    '--- Giants Editor (terrain properties) ---',
    `heightScale:       ${heightScale}`,
    `unitsPerPixel:     ${unitsPerPixel}`,
    '',
    '--- mapUS.xml ---',
    `map width:         ${targetSize}`,
    `map height:        ${targetSize}`,
    '',
    'Replace your existing DEM.png with DEM_expanded.png.',
    'Set heightScale and unitsPerPixel in Giants Editor to match the values above.',
  ]
  return lines.join('\n')
}
