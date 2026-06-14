# Feature: Find & Replace

## Summary
Add Ctrl+F / Ctrl+H shortcuts to open a find & replace bar above the editor.

## Behavior
- `Ctrl+F`: opens find bar (input field for search term)
- `Ctrl+H`: opens find+replace bar (search + replace input fields)
- All matches are highlighted in the editor overlay
- Navigate between matches with Enter (next) / Shift+Enter (previous)
- "Replace" replaces current match, "Replace All" replaces all matches
- Bar closes on Escape

## Implementation
- Add find bar UI: `<div className="find-bar">` with `<input>` fields
- On search input change: find all matches, highlight in overlay
- Track current match index, scroll to it
- Replace: modify text at match position, re-parse
- Replace All: use `text.replaceAll()` or regex global replace

## Files Changed
- `src/App.tsx` — add find bar component, keyboard shortcuts, match highlighting
- `src/App.css` — find bar styles, match highlight color

## Estimated LOC
~100 lines
