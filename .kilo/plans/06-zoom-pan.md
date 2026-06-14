# Feature: Zoom & Pan (Preview)

## Summary
Add mouse wheel zoom and click-drag pan to the diagram preview area.

## Behavior
- Mouse wheel over preview: zooms in/out (range: 0.5x to 3x)
- Click+drag over preview: pans the view
- "Fit to view" button in toolbar resets zoom to 1x and centers the diagram
- Zoom level indicator shows current percentage (e.g., "100%")

## Implementation
- Create `src/hooks/useZoomPan.ts`:
  ```typescript
  function useZoomPan() {
    // Returns { scale, offsetX, offsetY, handlers, reset }
  }
  ```
- Wrap the SVG in a `<div>` with `transform: scale(...) translate(...)`
- Wheel handler: adjust scale (clamp 0.5–3.0)
- MouseDown/Move/Up handlers: track drag position, update offset
- Reset handler: scale=1, offset=0

## Files Changed
- `src/hooks/useZoomPan.ts` — new
- `src/SequenceDiagram.tsx` — wrap SVG output in zoom/pan container div
- `src/App.tsx` — add "Fit to view" button and zoom indicator in preview toolbar

## Estimated LOC
~100 lines
