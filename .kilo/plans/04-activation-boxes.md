# Feature: Activation Boxes

## Summary
Add `activate`/`deactivate` directives that render colored rectangles on participant lifelines to show active processing periods.

## Syntax
```
activate Client
deactivate Client
```

## Behavior
- `activate A` — starts a narrow colored rectangle on participant A's lifeline
- `deactivate A` — ends the most recent activation on participant A
- Multiple activations per participant are supported (stacked with slight vertical offset)
- Color: `#e3f2fd` (light blue), border: `#90caf9`

## Parser Changes (`src/parser.ts`)
- Add `Activation` interface:
  ```typescript
  interface Activation {
    participant: string;
    lineIndex: number;
    type: 'activate' | 'deactivate';
  }
  ```
- Add `activations: Activation[]` to `DiagramData`
- Add parsing rules: `/^activate\s+(\w+)$/i` and `/^deactivate\s+(\w+)$/i`

## Renderer Changes (`src/SequenceDiagram.tsx`)
- Track active state per participant while iterating messages
- Render `<rect>` on lifeline between activate/deactivate points
- Width: 8px, offset 4px from lifeline center
- Handle nested/multiple activations with stacking

## Estimated LOC
~70 lines
