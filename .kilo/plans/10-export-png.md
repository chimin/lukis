# Feature: Export as PNG

## Summary
Add a button to export the rendered sequence diagram as a PNG image.

## Behavior
- "Export PNG" button in header toolbar
- Renders SVG to canvas at 2x scale for retina quality
- Triggers browser download as `diagram.png`

## Implementation
- Create `src/utils/exportPng.ts`:
  ```typescript
  async function exportPng(svgElement: SVGSVGElement, filename = 'diagram.png') {
    // 1. Serialize SVG to string
    // 2. Create <img> with SVG data URL
    // 3. Wait for image load
    // 4. Draw to <canvas> at 2x scale
    // 5. canvas.toBlob() → trigger download
  }
  ```
- Uses native browser APIs only (no external library)
- 2x scale for retina/HiDPI displays

## Files Changed
- `src/utils/exportPng.ts` — new
- `src/App.tsx` — add "Export PNG" button

## Estimated LOC
~40 lines
