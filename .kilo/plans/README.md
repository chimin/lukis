# Sequence Diagram Editor — Feature Plans

> **Note:** Each feature has its own plan file. Implement in numbered order.

## Current Project State

```
src/
  parser.ts           — parsing logic (participants, messages, multiline quotes)
  SequenceDiagram.tsx — SVG renderer (participants, lifelines, messages, dynamic gaps)
  App.tsx             — editor UI (split-pane, click-to-select, auto-prepend on Enter)
  index.css           — global reset
  main.tsx            — React entry point
```

React 19 + Vite 8 + TypeScript.

---

## All Features (implement in order)

| # | Feature | File | Est. LOC |
|---|---------|------|----------|
| 1 | Title Directive | [01-title-directive.md](./01-title-directive.md) | ~40 |
| 2 | Notes | [02-notes.md](./02-notes.md) | ~80 |
| 3 | Divider / Section | [03-divider.md](./03-divider.md) | ~40 |
| 4 | Activation Boxes | [04-activation-boxes.md](./04-activation-boxes.md) | ~70 |
| 5 | Undo/Redo | [05-undo-redo.md](./05-undo-redo.md) | ~80 |
| 6 | Zoom & Pan | [06-zoom-pan.md](./06-zoom-pan.md) | ~100 |
| 7 | Resizable Panes | [07-resizable-panes.md](./07-resizable-panes.md) | ~50 |
| 8 | Syntax Highlighting | [08-syntax-highlighting.md](./08-syntax-highlighting.md) | ~150 |
| 9 | Export SVG | [09-export-svg.md](./09-export-svg.md) | ~40 |
| 10 | Export PNG | [10-export-png.md](./10-export-png.md) | ~40 |
| 11 | Copy to Clipboard | [11-copy-clipboard.md](./11-copy-clipboard.md) | ~20 |
| 12 | Line Numbers | [12-line-numbers.md](./12-line-numbers.md) | ~70 |
| 13 | Error Highlighting | [13-error-highlighting.md](./13-error-highlighting.md) | ~60 |
| 14 | Autocomplete | [14-autocomplete.md](./14-autocomplete.md) | ~100 |
| 15 | Duplicate Line | [15-duplicate-line.md](./15-duplicate-line.md) | ~30 |
| 16 | Find & Replace | [16-find-replace.md](./16-find-replace.md) | ~100 |
| 17 | Auto-Indent | [17-auto-indent.md](./17-auto-indent.md) | ~30 |
| 18 | Import PlantUML | [18-import-plantuml.md](./18-import-plantuml.md) | ~150 |
| 19 | Import Mermaid | [19-import-mermaid.md](./19-import-mermaid.md) | ~120 |
| 20 | Import Modal | [20-import-modal.md](./20-import-modal.md) | ~120 |

**Total estimated: ~1,490 new/changed LOC**

---

## Target File Structure

```
src/
  types.ts                    — all shared interfaces
  parser.ts                   — parseDiagram (extended with title, notes, dividers, activations, warnings)
  SequenceDiagram.tsx         — extended renderer (notes, dividers, activations, title, zoom/pan wrapper)
  App.tsx                     — composition root (~120 lines)
  App.css                     — all styles
  hooks/
    useHistory.ts             — undo/redo state management
    useZoomPan.ts             — zoom/pan state for preview
  utils/
    exportSvg.ts              — SVG serialization + download
    exportPng.ts              — PNG rasterization + download
    import.ts                 — PlantUML + Mermaid parsers
  components/
    ImportModal.tsx           — import modal with textarea + preview
```

---

## Key Technical Decisions

1. **No external state library** — React `useState` + custom hooks
2. **SVG export via outerHTML** — no additional SVG library
3. **PNG via `canvas`** — native browser API
4. **No Monaco/CodeMirror** — custom overlay technique for syntax highlighting
5. **Parser extends existing `DiagramData`** — backward-compatible select logic

---

## Out of Scope

- Test framework
- Dark mode
- Local auto-save
- Keyboard shortcuts help modal
- Shareable URL / LZ-string compression
- Outline panel
- Go to participant definition
- Real-time collaboration (WebSocket backend)
- Server-side rendering
- Plugin system
- Animation of message flow
- Sequence diagram → code generation
