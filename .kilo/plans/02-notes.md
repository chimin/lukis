# Feature: Notes

## Summary
Add `note` directives that render colored note boxes next to participants in the diagram.

## Syntax
```
note left of A: text
note right of B: text
note over A: text
```

## Behavior
- `note left of A` — renders a colored rect positioned to the left of participant A's lifeline
- `note right of B` — renders a colored rect positioned to the right of participant B's lifeline
- `note over A` — renders a colored rect centered over participant A's lifeline
- Clicking note text in the preview selects the note line in the editor

## Parser Changes (`src/parser.ts`)
- Add `Note` interface:
  ```typescript
  interface Note {
    position: 'left' | 'right' | 'over';
    participant: string;
    text: string;
    lineIndex: number;
  }
  ```
- Add `notes: Note[]` to `DiagramData`
- Add parsing rule: `/^note\s+(left|right|over)\s+(?:of\s+)?(\w+)\s*:\s*(.+)$/i`

## Renderer Changes (`src/SequenceDiagram.tsx`)
- Render each note as a `<rect>` (fill: `#fff9c4`, stroke: `#f0c040`) with `<text>` inside
- Position: left = participantX - NOTE_WIDTH - 10, right = participantX + PARTICIPANT_WIDTH + 10, over = centered
- Place vertically at the message index where the note appears in source order
- onClick: call `onSelect({ type: 'message', label: note.text })`

## Estimated LOC
~80 lines
