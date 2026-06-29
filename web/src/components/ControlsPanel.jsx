import { useState, useCallback } from 'react'
import PlacementGrid from './PlacementGrid.jsx'
import { Button } from './ui/button.jsx'

const TARGET_SIZES = [
  { label: '4×  (4096 m)', value: 4096 },
  { label: '8×  (8192 m)', value: 8192 },
  { label: '16× (16384 m)', value: 16384 },
]

const FILL_MODES = [
  { key: 'flat',        labelKey: 'fillFlat'  },
  { key: 'edge-extend', labelKey: 'fillEdge'  },
  { key: 'mirror',      labelKey: 'fillMirror'},
]

const UPP_OPTIONS = [1, 2, 4]

export default function ControlsPanel({
  file, onFile,
  targetSize, setTargetSize,
  placement, setPlacement,
  fillMode, setFillMode,
  fillElevation, setFillElevation,
  heightScale, setHeightScale,
  unitsPerPixel, setUnitsPerPixel,
  onRun, onDownload,
  isRunning, hasResult,
  t,
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true) }, [])
  const handleDragLeave = useCallback(() => setDragOver(false), [])

  return (
    <div className="flex flex-col h-full bg-background px-3 py-3 gap-4 overflow-y-auto">

      {/* DEM PNG upload */}
      <section>
        <SectionLabel>{t.demPng}</SectionLabel>
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-4 cursor-pointer transition-colors text-center',
            dragOver
              ? 'border-primary bg-accent'
              : 'border-border hover:border-muted-foreground',
          ].join(' ')}
        >
          <input
            type="file"
            accept=".png,image/png"
            className="sr-only"
            onChange={e => e.target.files[0] && onFile(e.target.files[0])}
          />
          <UploadIcon />
          <span className="text-[13px] text-muted-foreground leading-snug">
            {file ? file.name : t.dropZone}
          </span>
        </label>
      </section>

      {/* Target map size */}
      <section>
        <SectionLabel>{t.targetSize}</SectionLabel>
        <div className="flex flex-col gap-1">
          {TARGET_SIZES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTargetSize(value)}
              className={[
                'text-[13px] py-[5px] px-3 rounded border text-left transition-colors',
                targetSize === value
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Placement */}
      <section>
        <SectionLabel tooltip={t.placementTooltip}>{t.placement}</SectionLabel>
        <PlacementGrid value={placement} onChange={setPlacement} />
      </section>

      {/* Fill mode */}
      <section className="rounded-lg border border-border bg-card px-3 pt-3 pb-3">
        <SectionLabel tooltip={t.fillModeTooltip}>{t.fillMode}</SectionLabel>
        <div className="flex gap-1 mb-3">
          {FILL_MODES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setFillMode(key)}
              className={[
                'flex-1 text-[12px] py-[4px] rounded border transition-colors',
                fillMode === key
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
              ].join(' ')}
            >
              {t[labelKey]}
            </button>
          ))}
        </div>

        {fillMode === 'flat' && (
          <NumberInput
            label={t.fillElevation}
            tooltip={t.fillElevTooltip}
            value={fillElevation}
            onChange={setFillElevation}
            min={0}
            step={1}
          />
        )}
      </section>

      {/* Height scale */}
      <section>
        <SectionLabel tooltip={t.heightScaleTooltip}>{t.heightScale}</SectionLabel>
        <NumberInput
          value={heightScale}
          onChange={setHeightScale}
          min={1}
          step={10}
        />
      </section>

      {/* Units per pixel */}
      <section>
        <SectionLabel tooltip={t.uppTooltip}>{t.unitsPerPixel}</SectionLabel>
        <div className="flex gap-1">
          {UPP_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => setUnitsPerPixel(v)}
              className={[
                'flex-1 text-[13px] py-[5px] rounded border transition-colors',
                unitsPerPixel === v
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
              ].join(' ')}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-1.5 pt-2">
        <Button onClick={onRun} disabled={!file || isRunning} className="w-full">
          {isRunning ? <><SpinIcon /> {t.running}</> : <><PlayIcon /> {t.run}</>}
        </Button>
        <Button
          onClick={onDownload}
          disabled={!hasResult}
          variant="secondary"
          size="sm"
          className="w-full text-[14px]"
        >
          <DownloadIcon /> {t.downloadZip}
        </Button>
      </div>

    </div>
  )
}

function SectionLabel({ children, tooltip }) {
  return (
    <p
      className="text-[11px] text-muted-foreground uppercase tracking-widest mb-[6px] font-medium"
      title={tooltip}
    >
      {children}
    </p>
  )
}

function NumberInput({ label, tooltip, value, onChange, min = 0, step = 1 }) {
  return (
    <div className="flex items-center gap-2" title={tooltip}>
      {label && <span className="text-[13px] text-foreground flex-1">{label}</span>}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        className="w-[80px] text-[13px] text-right border border-input rounded px-2 py-[3px] bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function PlayIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
}

function SpinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
