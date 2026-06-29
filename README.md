# FS25 DEM Expander

A free, browser-based tool for expanding a Farming Simulator 25 terrain heightmap (DEM) from 2× to 4×, 8×, or 16× map size. No installation required — runs entirely in your browser.

**[Try it here → https://pixelfarm1.github.io/FS25_DEM_Expander/](https://pixelfarm1.github.io/FS25_DEM_Expander/)**

---

## What it does

Upload a 16-bit grayscale DEM PNG and the tool places it as-is into a larger canvas at your chosen position. The surrounding new area is filled using one of three modes. Download the result as a `.zip` containing the expanded `DEM_expanded.png` and a `config_summary.txt` with the correct Giants Editor settings.

The source DEM pixels are never scaled or resampled — only copied. Precision is fully preserved.

## What a correct DEM looks like

- **Format:** PNG, 16-bit grayscale (UInt16), single channel
- **Size:** `(mapSizeMeters / unitsPerPixel) + 1` — e.g. a standard 2× map is 2049×2049 px
- **Values:** 0 = lowest point, 65535 = highest point

If your file is not 16-bit the tool will warn you and proceed, scaling 8-bit values up to the 16-bit range.

---

## How to use

### 1 — Upload your source DEM

Drop your `DEM.png` onto the upload zone or click to browse. The preview immediately shows the source image placed at the selected position within the target canvas.

### 2 — Configure the expansion

| Setting | What it controls |
|---|---|
| **Target map size** | Output canvas: 4× (4096 m), 8× (8192 m), or 16× (16384 m) |
| **Placement** | Where the source DEM sits — center, or any corner |
| **New area fill** | How the surrounding new pixels are filled |
| **Fill value** | Raw 16-bit pixel value for flat fill (0–65535). Only shown when fill mode is Flat. |
| **Units per pixel** | Meters per heightmap pixel — must match your source map (default 2) |

**Fill modes:**
- **Flat** — every new pixel is set to the same value (good for sea-level or flat surrounding terrain)
- **Edge Extend** — new pixels inherit the nearest edge pixel of the source
- **Mirror** — source terrain is reflected outward at each edge

### 3 — Run and download

Press **Run**. The preview updates to show the generated output. Press **Download .zip** to get:

- `DEM_expanded.png` — the new 16-bit heightmap, ready to replace your existing `DEM.png`
- `config_summary.txt` — the `unitsPerPixel` and `map width/height` values to set in Giants Editor and `mapUS.xml`

---

## After importing into Giants Editor

1. Replace your map's `DEM.png` with `DEM_expanded.png`
2. Open `mapUS.i3d` and update `unitsPerPixel` to match (see `config_summary.txt`)
3. Open `mapUS.xml` and update `map width` and `map height`
4. Your `heightScale` is **unchanged** — it describes your elevation range and has nothing to do with map size

---

## Development

```bash
cd web
npm install
npm run dev      # local dev server
npm run build    # production build → web/dist/
```

Built with React, Vite, and Tailwind CSS. PNG processing uses [fast-png](https://github.com/image-js/fast-png) in a Web Worker so the UI never blocks. Deploys automatically to GitHub Pages via GitHub Actions on every push to `main`.

---

## License

[MIT](LICENSE)
