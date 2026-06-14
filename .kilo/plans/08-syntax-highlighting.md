# Feature: Syntax Highlighting

## Summary
Add basic syntax highlighting to the editor using a transparent textarea overlay technique.

## Behavior
- Participant names: blue (`#4a90d9`)
- Arrows (`->`, `-->`, `-->>`, `<--`, `<<--`): gray (`#888`)
- Keywords (`participant`, `note`, `title`, `activate`, `deactivate`): purple (`#aa3bff`)
- Comments (`# ...`): green (`#4caf50`)
- The textarea text is transparent; a `<pre>` behind it shows the highlighted version
- Scroll is synced between textarea and highlight layer

## Implementation
- Create a `<div className="editor-wrapper">` containing:
  1. `<pre className="highlight-layer">` — absolutely positioned, shows highlighted HTML
  2. `<textarea className="editor-input">` — transparent text, same font/size/scroll
- On `onChange` and `onScroll`: re-render highlighted HTML and sync scroll
- Highlighting: split text into tokens, wrap each in `<span class="token-{type}">`

## Files Changed
- `src/App.tsx` — replace plain `<textarea>` with overlay structure
- `src/App.css` — add `.editor-wrapper`, `.highlight-layer`, `.editor-input`, token color classes

## Estimated LOC
~150 lines
