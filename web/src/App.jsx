import { useState, useRef, useEffect, useCallback } from 'react'
import LogPanel from './components/LogPanel.jsx'
import ControlsPanel from './components/ControlsPanel.jsx'
import PreviewCanvas from './components/PreviewCanvas.jsx'
import { Badge } from './components/ui/badge.jsx'
import { translations } from './i18n.js'

export default function App() {
  const [file,           setFile]           = useState(null)
  const [targetSize,     setTargetSize]     = useState(4096)
  const [placement,      setPlacement]      = useState('center')
  const [fillMode,       setFillMode]       = useState('flat')
  const [fillElevation,  setFillElevation]  = useState(0)
  const [heightScale,    setHeightScale]    = useState(300)
  const [unitsPerPixel,  setUnitsPerPixel]  = useState(2)
  const [lang,           setLang]           = useState('en')

  const [logs,       setLogs]       = useState([])
  const [isRunning,  setIsRunning]  = useState(false)
  const [zipBuffer,  setZipBuffer]  = useState(null)
  const [srcDims,    setSrcDims]    = useState(null) // { w, h } of uploaded PNG

  const workerRef = useRef(null)
  const t = translations[lang]

  const appendLog = useCallback((msg) => setLogs(prev => [...prev, msg]), [])

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })

    workerRef.current.onmessage = (e) => {
      const { type, message, zipBuffer: zb } = e.data
      if (type === 'LOG') {
        appendLog(message)
      } else if (type === 'DONE') {
        setZipBuffer(zb)
        setIsRunning(false)
        appendLog('✓ Done — ready to download.')
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

  // Read source image dimensions whenever file changes
  useEffect(() => {
    if (!file) { setSrcDims(null); return }
    file.arrayBuffer().then(buf => {
      // Parse PNG dimensions from IHDR (bytes 16-23)
      const view = new DataView(buf)
      const w = view.getUint32(16)
      const h = view.getUint32(20)
      setSrcDims({ w, h })
    })
  }, [file])

  async function handleRun() {
    if (!file || isRunning) return
    setIsRunning(true)
    setZipBuffer(null)
    setLogs([])
    appendLog('Starting...')

    const imageBuffer = await file.arrayBuffer()
    workerRef.current.postMessage(
      { type: 'RUN', payload: { imageBuffer, targetSize, placement, fillMode, fillElevation, heightScale, unitsPerPixel } },
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
            placement={placement} setPlacement={setPlacement}
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
            srcDims={srcDims}
            targetSize={targetSize}
            placement={placement}
            unitsPerPixel={unitsPerPixel}
            t={t}
          />
        </div>

      </div>
    </div>
  )
}
