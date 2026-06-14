# Feature: Copy Source to Clipboard

## Summary
Add a button to copy the raw editor text to the system clipboard.

## Behavior
- "Copy" button in header toolbar
- Copies the full editor text content
- Shows brief "Copied!" tooltip feedback (auto-dismiss after 2 seconds)

## Implementation
- Use `navigator.clipboard.writeText(text)`
- On success: show tooltip
- On failure (e.g., no clipboard permission): fallback to `document.execCommand('copy')`

## Files Changed
- `src/App.tsx` — add "Copy" button with clipboard logic and tooltip state
- `src/App.css` — tooltip styles (fade in/out animation)

## Estimated LOC
~20 lines
