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

    window.gtag?.('event', 'run_processing', { target_size: targetSize, fill_mode: fillMode })

    const imageBuffer = await file.arrayBuffer()
    workerRef.current.postMessage(
      { type: 'RUN', payload: { imageBuffer, targetSize, offset, fillMode, fillElevation, heightScale, unitsPerPixel } },
      [imageBuffer]
    )
  }

  function handleDownload() {
    if (!zipBuffer) return
    window.gtag?.('event', 'download_zip')
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

        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://github.com/PixelFarm1/FS25_DEM_Expander"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary-foreground opacity-60 hover:opacity-100 transition-opacity"
            title="View on GitHub"
          >
            <GitHubIcon />
          </a>
          <div className="flex gap-1">
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

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  )
}
