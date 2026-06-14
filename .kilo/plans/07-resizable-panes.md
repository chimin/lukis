# Feature: Resizable Panes

## Summary
Allow dragging the divider between editor and preview to resize the split ratio.

## Behavior
- Divider has `cursor: col-resize` on hover
- Dragging left/right resizes the editor/preview ratio
- Min 20% / max 80% for each pane
- Ratio is persisted to `localStorage` and restored on page load

## Implementation
- On divider `mousedown`: start tracking drag
- On `mousemove`: calculate new ratio from mouse position relative to container
- On `mouseup`: stop tracking, save ratio to `localStorage`
- Use CSS `flex-basis` or CSS Grid `grid-template-columns` for the split

## Files Changed
- `src/App.tsx` — add drag handlers to divider, use dynamic width for panes
- `src/App.css` — add `cursor: col-resize` on divider, transition for smooth resize

## Estimated LOC
~50 lines
