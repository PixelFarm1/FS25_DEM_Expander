# FS25 Map Expander – Project Instructions

## Purpose
Web service to expand an FS25 terrain DEM from 2x (2048m) to 4x (4096m) or larger. The source DEM is placed as-is into a larger canvas — no scaling or resampling of existing terrain. The surrounding new area is filled separately.

---

## DEM Format Rules (non-negotiable)
- **Format**: PNG, 16-bit UInt16, single-channel grayscale
- **Size formula**: `(mapSizeMeters / unitsPerPixel) + 1`
  - 2x default: 2049×2049 (2048m at uPP=2)
  - 4x default: 4097×4097 (4096m at uPP=2)
- **Value range**: 0 (black = lowest) – 65535 (white = highest)
- **heightScale**: total elevation range in meters (black→white); set manually in Giants Editor after import

---

## User-Controlled Settings

### 1. Target Map Size
- **Options**: 4x (4096m), 8x (8192m), 16x (16384m)
- **Effect**: Sets output canvas dimensions
- **Default**: 4x

### 2. Placement of Source Map
- **Options**: Center, Top-Left, Top-Right, Bottom-Left, Bottom-Right
- **Effect**: Where the 2x DEM is placed within the 4x canvas; determines which sides get new terrain
- **Default**: Center

### 3. New Area Fill Mode
- **What it is**: How to fill canvas pixels not covered by the source DEM
- **Options**:
  - `Flat` – fill with a fixed elevation value (user specifies in meters)
  - `Edge Extend` – each new pixel inherits the nearest edge pixel of the source
  - `Mirror` – reflect source terrain outward at each edge
- **Default**: Flat
- **If Flat**: user provides a fill elevation in meters (converted to 0–65535 using heightScale)

### 4. heightScale
- **What it is**: Meters of elevation represented by the full 0–65535 pixel range
- **User input**: Numeric field in meters (e.g. 300)
- **Why it matters**: Required to convert a flat-fill elevation in meters to the correct pixel value, and to document the correct GE setting
- **Default**: 300m (user must verify against their source map)

### 5. unitsPerPixel (uPP)
- **What it is**: Meters of terrain per heightmap pixel
- **Options**: 1, 2 (default), 4
- **Note**: Source and output must use the same uPP — this service does not resample. Output canvas size is calculated from target map size and this value.
- **Default**: 2

---

## Output
- 16-bit grayscale PNG at correct dimensions for the target map size
- A summary text file with:
  - Output dimensions (px)
  - `heightScale` to set in Giants Editor
  - `unitsPerPixel` to set in mapUS.i3d
  - `map width` / `map height` values for mapUS.xml

---

## UX Design

### Design System — "Watermelon UI"
Match the existing FS25 ImageToFields tool exactly.

**Palette**
- Background: `#FDF8F5` (warm cream)
- Foreground: `#1A120B` (dark seed)
- Primary / CTA: `#E63946` (watermelon red) — buttons, active states, slider thumbs
- Secondary / header: `#1B4332` (rind green)
- Accent: `#FFE8EB` (pale pink) — hover fills, badges
- Border: `hsl(14 30% 88%)` — panel dividers, input borders
- Card: `#FFFFFF`

**Typography**: Inter (variable), `font-family: 'Inter Variable', 'Inter', sans-serif`

**Border radius**: `0.5rem` throughout

### Layout
Full-screen, no page scroll. Three vertical columns separated by `border-r`:

| Column | Width | Content |
|---|---|---|
| Log / Activity | 25% | Scrollable log output, monospace lines |
| Controls | 25% | All user inputs, Run button, Download |
| Preview | 50% | Visual canvas showing placement result |

**Header** (full width, `bg-secondary`): App title in white bold + version badge (outline, green tint) on the left. Language toggle (EN/DE pill buttons) on the right.

### Controls Panel — Input Components
Each setting group has an uppercase section label, followed by its control:

- **Target Map Size** → segmented button group (4x / 8x / 16x), primary color on active
- **Placement** → 3×3 visual grid widget: 5 clickable positions (corners + center), inactive cells dimmed, active cell filled with primary red
- **Fill Mode** → three toggle buttons (Flat / Edge Extend / Mirror), one active at a time
- **Fill Elevation** → number input (meters), visible only when Fill Mode = Flat
- **heightScale** → number input (meters)
- **unitsPerPixel** → segmented button group (1 / 2 / 4)

**Upload zone**: dashed border, centered label "Drop 16-bit PNG or click to browse", turns solid primary border on drag-over.

**Run button**: full-width, `bg-primary text-white`, disabled + spinner while processing.

**Download button**: full-width outline style, visible only after successful run.

### Preview Canvas
Renders the output footprint to scale: dark fill for new empty area, lighter fill for the placed source DEM, with a thin red border marking the source boundary. Updates live as placement or fill mode changes (no Run required for preview).

### Tone & Copy
- Section labels: ALL CAPS, small, muted color
- Tooltips on each setting (hover): one plain-English sentence explaining what it does
- Log panel lines: monospace, timestamped, errors in red

---

## Out of Scope (v1)
- Density maps, infolayers, weight maps (heightmap only)
- Terrain smoothing or blending at source/fill boundary
- Changing unitsPerPixel between source and output
