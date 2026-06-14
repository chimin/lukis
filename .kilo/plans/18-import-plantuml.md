# Feature: Import PlantUML

## Summary
Import sequence diagrams from PlantUML format by parsing and converting to native syntax.

## Supported Constructs

| PlantUML | Native |
|----------|--------|
| `participant "Name" as Alias` | `participant "Name" as Alias` |
| `A -> B: message` | `A -> B: message` |
| `A --> B: message` | `A --> B: message` |
| `A ->> B: message` | `A -->> B: message` |
| `note left of A: text` | `note left of A: text` |
| `title My Title` | `title My Title` |
| `== Section ==` | `== Section ==` |
| `activate A` / `deactivate A` | `activate A` / `deactivate A` |
| `alt`/`else`/`end`, `loop`/`end`, `opt`/`end` | Flattened to dividers + messages |
| `box "Name" ... end` | Participants extracted, box discarded (warning) |

## Implementation
- Line-by-line state machine parser in `src/utils/import.ts`
- States: `idle`, `inAlt`, `inLoop`, `inOpt`, `inBox`
- On `alt`/`loop`/`opt`: emit divider with label, push state
- On `else`: emit divider with "else" label
- On `end`: pop state
- On `box`: push state, extract participants
- On `participant`/`A -> B: note`: direct mapping with arrow conversion

## Files Changed
- `src/utils/import.ts` — add `parsePlantUml(input: string): string`

## Estimated LOC
~150 lines
