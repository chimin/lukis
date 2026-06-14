# Feature: Line Numbers

## Summary
Add a gutter column showing line numbers next to the editor.

## Behavior
- Gutter shows line numbers aligned with each line of text
- Current line number is highlighted
- Clicking a line number selects that entire line in the textarea
- Scroll syncs between gutter and textarea

## Implementation
- Add a `<div className="gutter">` to the left of the textarea
- Render line numbers based on `text.split('\n').length`
- Highlight: compare current line (from `selectionStart`) against gutter line
- Sync scroll: on textarea scroll, set `gutter.scrollTop = textarea.scrollTop`

## Files Changed
- `src/App.tsx` — add gutter div, compute current line from cursor position
- `src/App.css` — gutter styles (fixed width, right-aligned numbers, highlight color)

## Estimated LOC
~70 lines
