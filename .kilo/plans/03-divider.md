# Feature: Divider / Section

## Summary
Add divider syntax that renders a horizontal line with a centered label across the diagram width.

## Syntax
```
== Section Name ==
```

## Behavior
- Renders a dashed horizontal line spanning the full diagram width
- Displays the section label centered on the line
- Used to visually separate phases of the sequence diagram
- Multiple dividers can appear throughout the document

## Parser Changes (`src/parser.ts`)
- Add `Divider` interface:
  ```typescript
  interface Divider {
    label: string;
    lineIndex: number;
  }
  ```
- Add `dividers: Divider[]` to `DiagramData`
- Add parsing rule: `/^==\s*(.+?)\s*==$/`

## Renderer Changes (`src/SequenceDiagram.tsx`)
- Render each divider as a `<line>` (dashed, color `#bbb`) spanning full width with `<text>` centered
- Place vertically at the message index where the divider appears in source order
- Label font: 12px, color `#888`

## Estimated LOC
~40 lines
