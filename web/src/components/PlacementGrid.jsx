// 3×3 grid — only 5 positions are active (corners + centre)
// Inactive cells (top-centre, mid-left, mid-right, bottom-centre) are hidden gaps.

const POSITIONS = [
  ['top-left',    'top-right'   ],  // row 0: corners
  ['center'                     ],  // row 1: centre only
  ['bottom-left', 'bottom-right'],  // row 2: corners
]

const LABELS = {
  'top-left':     '↖',
  'top-right':    '↗',
  'center':       '·',
  'bottom-left':  '↙',
  'bottom-right': '↘',
}

export default function PlacementGrid({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-fit">
      {/* Row 0 */}
      <Cell pos="top-left"    value={value} onChange={onChange} />
      <div />  {/* empty centre-top */}
      <Cell pos="top-right"   value={value} onChange={onChange} />

      {/* Row 1 */}
      <div />  {/* empty mid-left */}
      <Cell pos="center"      value={value} onChange={onChange} />
      <div />  {/* empty mid-right */}

      {/* Row 2 */}
      <Cell pos="bottom-left"  value={value} onChange={onChange} />
      <div />  {/* empty centre-bottom */}
      <Cell pos="bottom-right" value={value} onChange={onChange} />
    </div>
  )
}

function Cell({ pos, value, onChange }) {
  const active = value === pos
  return (
    <button
      title={pos.replace('-', ' ')}
      onClick={() => onChange(pos)}
      className={[
        'w-9 h-9 rounded border text-[18px] transition-colors flex items-center justify-center',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {LABELS[pos]}
    </button>
  )
}
