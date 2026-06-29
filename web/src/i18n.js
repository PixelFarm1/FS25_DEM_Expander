export const translations = {
  en: {
    appTitle: 'FS25 DEM Expander',

    // Controls
    demPng:          'DEM PNG',
    dropZone:        'Drop 16-bit PNG or click to browse',
    targetSize:      'Target map size',
    placement:       'Placement',
    placementTooltip:'Where the source DEM is placed within the new larger canvas.',
    fillMode:        'New area fill',
    fillModeTooltip: 'How to fill the canvas outside the original DEM.',
    fillFlat:        'Flat',
    fillEdge:        'Edge Extend',
    fillMirror:      'Mirror',
    heightScale:        'Height scale (m)',
    heightScaleTooltip: 'Total elevation range your DEM encodes — black=0m, white=this value. Must match your Giants Editor heightScale.',
    fillElevation:      'Fill elevation (m)',
    fillElevTooltip:    'Elevation in meters to use for flat fill. Converted to a pixel value using the height scale above.',
    unitsPerPixel:   'Units per pixel',
    uppTooltip:      'Meters of terrain per heightmap pixel. Must match your source map.',

    xOffset:         'X offset (px)',
    yOffset:         'Y offset (px)',
    offsetTooltip:   'Pixel offset of the source DEM within the output canvas. Drag the preview or type values directly.',

    run:         'Run',
    running:     'Running...',
    downloadZip: 'Download .zip',

    // Log
    activity: 'Activity',
    logEmpty: 'Run to see activity here.',

    // Preview
    preview:       'Preview',
    previewEmpty:  'Upload a DEM PNG to see a placement preview.',
  },

  de: {
    appTitle: 'FS25 DEM Expander',

    demPng:          'DEM PNG',
    dropZone:        '16-Bit PNG ablegen oder klicken',
    targetSize:      'Zielkartengröße',
    placement:       'Platzierung',
    placementTooltip:'Wo das Quell-DEM auf der neuen Leinwand platziert wird.',
    fillMode:        'Füllung neuer Bereiche',
    fillModeTooltip: 'Wie der Bereich außerhalb des Original-DEM gefüllt wird.',
    fillFlat:        'Flach',
    fillEdge:        'Kante verlängern',
    fillMirror:      'Spiegeln',
    heightScale:        'Höhenskala (m)',
    heightScaleTooltip: 'Gesamter Höhenbereich des DEM — schwarz=0m, weiß=dieser Wert. Muss mit dem Giants Editor heightScale übereinstimmen.',
    fillElevation:      'Füllhöhe (m)',
    fillElevTooltip:    'Höhe in Metern für flache Füllung. Wird anhand der Höhenskala in einen Pixelwert umgerechnet.',
    unitsPerPixel:   'Einheiten pro Pixel',
    uppTooltip:      'Meter Gelände pro Heightmap-Pixel.',

    xOffset:         'X-Versatz (px)',
    yOffset:         'Y-Versatz (px)',
    offsetTooltip:   'Pixelversatz des Quell-DEM auf der Ausgabeleinwand. Vorschau ziehen oder Werte eingeben.',

    run:         'Starten',
    running:     'Läuft...',
    downloadZip: '.zip herunterladen',

    activity: 'Aktivität',
    logEmpty: 'Starten um Aktivität zu sehen.',

    preview:      'Vorschau',
    previewEmpty: 'DEM PNG hochladen für Vorschau.',
  },
}
