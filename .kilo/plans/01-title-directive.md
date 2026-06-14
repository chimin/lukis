# Feature: Title Directive

## Summary
Add a `title` directive that renders a title above the sequence diagram.

## Syntax
```
title My Sequence Diagram
```

## Behavior
- The title is displayed centered above the diagram in the preview area
- Clicking the title in the preview selects the `title` line in the editor
- Only the first title directive is used; subsequent ones are ignored

## Parser Changes (`src/parser.ts`)
- Add `title: string | null` field to `DiagramData`
- Add parsing rule: `/^title\s+(.+)$/i`
- Set `title` to the captured text on first match

## Type Changes (`src/types.ts`)
```typescript
interface DiagramData {
  title: string | null;
  // ...existing fields
}
```

## Renderer Changes (`src/SequenceDiagram.tsx`)
- Accept `DiagramData` with `title` field
- Render `<text>` element centered at top of SVG (above participant boxes)
- Font: 16px, bold, color `#1a1a2e`
- onClick: call `onSelect({ type: 'message', label: data.title })`

## Estimated LOC
~40 lines
