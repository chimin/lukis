# Feature: Export as SVG

## Summary
Add a button to export the rendered sequence diagram as an SVG file download.

## Behavior
- "Export SVG" button in header toolbar
- Serializes the rendered SVG element to a string
- Prepends XML declaration and proper SVG namespace
- Triggers browser download as `diagram.svg`

## Implementation
- Create `src/utils/exportSvg.ts`:
  ```typescript
  function exportSvg(svgElement: SVGSVGElement, filename = 'diagram.svg') {
    // Clone SVG, add xmlns + XML declaration
    // Create Blob, trigger download via <a download>
  }
  ```
- Clone the SVG element to avoid mutating the live DOM
- Add `xmlns="http://www.w3.org/2000/svg"` if missing
- Serialize with `XMLSerializer`
- Create `Blob` → `URL.createObjectURL()` → `<a download>` click

## Files Changed
- `src/utils/exportSvg.ts` — new
- `src/App.tsx` — add "Export SVG" button, get ref to SVG element

## Estimated LOC
~40 lines
