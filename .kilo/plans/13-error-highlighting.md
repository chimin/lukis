# Feature: Error Highlighting

## Summary
Highlight unrecognized lines in the editor with red underlines and show an error count badge.

## Behavior
- Lines that don't match any known pattern (`participant`, `title`, `note`, arrows, `== divider ==`, `activate`/`deactivate`, `# comment`) are flagged
- Red wavy underline appears below the error line
- Error count badge shown in header toolbar (e.g., "3 errors")

## Implementation
- Extend `parseDiagram()` to return warnings:
  ```typescript
  interface ParseResult {
    data: DiagramData;
    warnings: Array<{ lineIndex: number; message: string }>;
  }
  ```
- For each non-blank, non-comment line that doesn't match any pattern, emit a warning
- Render warnings as absolutely positioned `<div>` elements overlaying the textarea
- Count displayed in header toolbar badge

## Files Changed
- `src/parser.ts` — add warning collection during parsing
- `src/types.ts` — add `ParseResult` interface
- `src/App.tsx` — render error underlines and badge
- `src/App.css` — error underline styles (red wavy), badge styles

## Estimated LOC
~60 lines
