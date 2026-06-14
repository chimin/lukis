# Feature: Duplicate Line

## Summary
Add Ctrl+D shortcut to duplicate the current line (or multiline quoted block) below.

## Behavior
- Ctrl+D: duplicate current line below the cursor
- If the cursor is inside a multiline quoted block, duplicate the entire block
- Preserves cursor position on the new duplicated line

## Implementation
- In `onKeyDown`: intercept Ctrl+D
- Get current line index from cursor position
- Check if current line is part of a quoted block (scan backward for opening `"`, forward for closing `"`)
- If in block: extract the full block text, insert after the closing line
- If not in block: duplicate the single line
- Move cursor to the start of the duplicated line

## Files Changed
- `src/App.tsx` — extend `onKeyDown` handler with Ctrl+D logic

## Estimated LOC
~30 lines
