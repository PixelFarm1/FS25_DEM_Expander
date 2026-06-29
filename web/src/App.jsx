import { useState, useRef, useEffect, useCallback } from 'react'
import LogPanel from './components/LogPanel.jsx'
import ControlsPanel from './components/ControlsPanel.jsx'
import PreviewCanvas from './components/PreviewCanvas.jsx'
import { Badge } from './components/ui/badge.jsx'
import { translations } from './i18n.js'

// Compute pixel offset for a named preset
function computePresetOffset(preset, srcW, srcH, outPx) {
  switch (preset) {
    case 'center':       return { x: Math.round((outPx - srcW) / 2), y: Math.round((outPx - srcH) / 2) }
    case 'top-left':     return { x: 0,           y: 0            }
    case 'top-right':    return { x: outPx - srcW, y: 0            }
    case 'bottom-left':  return { x: 0,           y: outPx - srcH }
    case 'bottom-right': return { x: outPx - srcW, y: outPx - srcH }
    default:             return { x: 0,           y: 0            }
  }
}

export default function App() {
  const [file,           setFile]           = useState(null)
  const [targetSize,     setTargetSize]     = useState(4096)
  const [activePreset,   setActivePreset]   = useState('center')  // null when free-placed
  const [offset,         setOffset]         = useState({ x: 0, y: 0 })
  const [fillMode,       setFillMode]       = useState('flat')
  const [fillElevation,  setFillElevation]  = useState(0)
  const [heightScale,    setHeightScale]    = useState(300)
  const [unitsPerPixel,  setUnitsPerPixel]  = useState(2)
  const [lang,           setLang]           = useState('en')

  const [logs,         setLogs]         = useState([])
  const [isRunning,    setIsRunning]    = useState(false)
  const [zipBuffer,    setZipBuffer]    = useState(null)
  const [srcDims,      setSrcDims]      = useState(null)   // { w, h }
  const [srcBitmap,    setSrcBitmap]    = useState(null)   // ImageBitmap of uploaded file
  const [outputBitmap, setOutputBitmap] = useState(null)   // ImageBitmap of generated output

  const workerRef = useRef(null)
  const t = translations[lang]

  // Derived: output pixel size
  const outPx = Math.round(targetSize / unitsPerPixel) + 1

  // When a preset is active, recompute offset whenever srcDims / outPx changes
  useEffect(() => {
    if (!activePreset || !srcDims) return
    setOffset(computePresetOffset(activePreset, srcDims.w, srcDims.h, outPx))
  }, [activePreset, srcDims, outPx])

  function handlePresetClick(preset) {
    setActivePreset(preset)
    if (srcDims) setOffset(computePresetOffset(preset, srcDims.w, srcDims.h, outPx))
  }

  function handleOffsetChange(newOffset) {
    // Clamp to valid range
    const maxX = srcDims ? Math.max(0, outPx - srcDims.w) : 0
    const maxY = srcDims ? Math.max(0, outPx - srcDims.h) : 0
    setOffset({ x: Math.max(0, Math.min(maxX, newOffset.x)), y: Math.max(0, Math.min(maxY, newOffset.y)) })
    setActivePreset(null)  // free placement — clear preset highlight
  }

  const appendLog = useCallback((msg) => setLogs(prev => [...prev, msg]), [])

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })

    workerRef.current.onmessage = async (e) => {
      const { type, message, zipBuffer: zb, outPngBuffer } = e.data
      if (type === 'LOG') {
        appendLog(message)
      } else if (type === 'DONE') {
        setZipBuffer(zb)
        setIsRunning(false)
        appendLog('✓ Done — ready to download.')
        // Create a preview bitmap from the output PNG
        if (outPngBuffer) {
          const blob = new Blob([outPngBuffer], { type: 'image/png' })
          const bmp  = await createImageBitmap(blob)
          setOutputBitmap(bmp)
        }
      } else if (type === 'ERROR') {
        appendLog(`ERROR: ${message}`)
        setIsRunning(false)
      }
    }

    workerRef.current.onerror = (e) => {
      appendLog(`Worker error: ${e.message}`)
      setIsRunning(false)
    }

    return () => workerRef.current?.terminate()
  }, [appendLog])

  // When file changes: read dimensions and create a preview bitmap
  useEffect(() => {
    if (!file) {
      setSrcDims(null)
      setSrcBitmap(null)
      setOutputBitmap(null)
      return
    }

    setOutputBitmap(null)
    setZipBuffer(null)

    // Read dims and bitmap together so PreviewCanvas never sees one without the other
    const dimsPromise = file.arrayBuffer().then(buf => {
      const view = new DataView(buf)
      return { w: view.getUint32(16), h: view.getUint32(20) }
    })

    // createImageBitmap may reject for 16-bit grayscale in some browsers — fall back gracefully
    const bitmapPromise = createImageBitmap(file).catch(() => null)

    Promise.all([dimsPromise, bitmapPromise]).then(([dims, bmp]) => {
      setSrcDims(dims)
      setSrcBitmap(bmp)  // may be null if browser can't bitmap a 16-bit PNG
      // Recompute offset for the active preset with the new dims
      if (activePreset) {
        const newOutPx = Math.round(targetSize / unitsPerPixel) + 1
        setOffset(computePresetOffset(activePreset, dims.w, dims.h, newOutPx))
      }
    }).catch(err => {
      console.error('Failed to read DEM file:', err)
    })
  }, [file]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRun() {
    if (!file || isRunning) return
    setIsRunning(true)
    setZipBuffer(null)
    setOutputBitmap(null)
    setLogs([])
    appendLog('Starting...')

    const imageBuffer = await file.arrayBuffer()
    workerRef.current.postMessage(
      { type: 'RUN', payload: { imageBuffer, targetSize, offset, fillMode, fillElevation, heightScale, unitsPerPixel } },
      [imageBuffer]
    )
  }

  function handleDownload() {
    if (!zipBuffer) return
    const url = URL.createObjectURL(new Blob([zipBuffer], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'DEM_expanded.zip'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col w-screen h-screen bg-background overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-[9px] bg-secondary flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.20)]">
        <span className="text-[14px] font-bold text-secondary-foreground tracking-tight">
          {t.appTitle}
        </span>
        <Badge variant="outline" className="ml-1 border-[#3D8B67] text-[#52B788] bg-transparent text-[14px] px-2">
          v0.1.0 - web
        </Badge>

        <div className="ml-auto flex gap-1">
          {['en', 'de'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={[
                'text-[13px] font-medium px-2 py-[2px] rounded border transition-colors uppercase tracking-wide',
                lang === l
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
              ].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">

        <div className="w-1/4 flex flex-col min-h-0 border-r border-border">
          <LogPanel logs={logs} t={t} />
        </div>

        <div className="w-1/4 flex flex-col min-h-0 border-r border-border">
          <ControlsPanel
            file={file} onFile={setFile}
            targetSize={targetSize} setTargetSize={setTargetSize}
            activePreset={activePreset} onPresetClick={handlePresetClick}
            offset={offset} onOffsetChange={handleOffsetChange}
            srcDims={srcDims} outPx={outPx}
            fillMode={fillMode} setFillMode={setFillMode}
            fillElevation={fillElevation} setFillElevation={setFillElevation}
            heightScale={heightScale} setHeightScale={setHeightScale}
            unitsPerPixel={unitsPerPixel} setUnitsPerPixel={setUnitsPerPixel}
            onRun={handleRun}
            onDownload={handleDownload}
            isRunning={isRunning}
            hasResult={!!zipBuffer}
            t={t}
          />
        </div>

        <div className="w-1/2 flex flex-col min-h-0">
          <PreviewCanvas
            srcBitmap={srcBitmap}
            outputBitmap={outputBitmap}
            srcDims={srcDims}
            targetSize={targetSize}
            offset={offset}
            onOffsetChange={handleOffsetChange}
            outPx={outPx}
            unitsPerPixel={unitsPerPixel}
            isRunning={isRunning}
            t={t}
          />
        </div>

      </div>
    </div>
  )
}
