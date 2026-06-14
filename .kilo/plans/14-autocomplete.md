# Feature: Participant Autocomplete

## Summary
Show a dropdown of known participant names when typing in the editor.

## Behavior
- When the user starts typing a word that matches a known participant name, show a dropdown
- Click or press Tab to insert the selected name
- Participants are collected from `participant` declarations and message `from`/`to` fields
- Dropdown appears at the current cursor position

## Implementation
- On `onChange`: get the word at cursor position
- If the word partially matches any participant, show dropdown overlay
- Overlay: `<div>` positioned using cursor coordinates (approximate via line height × char width)
- On click/Tab: replace the partial word with the full participant name

## Files Changed
- `src/App.tsx` — add autocomplete state, dropdown overlay component
- `src/App.css` — dropdown styles (border, shadow, hover highlight)

## Estimated LOC
~100 lines
