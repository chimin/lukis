# Feature: Import Mermaid

## Summary
Import sequence diagrams from Mermaid format by parsing and converting to native syntax.

## Supported Constructs

| Mermaid | Native |
|---------|--------|
| `sequenceDiagram` | Stripped (implicit) |
| `participant A as "Alias"` | `participant A as Alias` |
| `A->>B: message` | `A -> B: message` (solid = sync) |
| `A-->>B: message` | `A --> B: message` (dashed = async) |
| `A-xB: message` | `A -> B: message` (lossy) |
| `Note left of A: text` | `note left of A: text` |
| `Note over A,B: text` | `note over A: text` (first participant) |
| `alt`/`else`/`end`, `loop`/`end` | Flattened to dividers + messages |
| `rect rgb(...)` | Discarded (warning) |
| `activate A` / `deactivate A` | `activate A` / `deactivate A` |

## Implementation
- Line-by-line state machine parser in `src/utils/import.ts`
- Strip `sequenceDiagram` declaration
- Convert arrow syntax: `->>` = sync, `-->>` = async, `-x` = sync (lossy)
- Convert note syntax: `Note left of A` → `note left of A`
- Handle `alt`/`else`/`end`/`loop`/`end` same as PlantUML

## Files Changed
- `src/utils/import.ts` — add `parseMermaid(input: string): string`

## Estimated LOC
~120 lines
