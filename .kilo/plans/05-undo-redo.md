# Feature: Undo/Redo

## Summary
Add undo/redo functionality with Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts.

## Behavior
- Maintains a history stack of editor states (max 100 entries)
- Ctrl+Z: undo (pop history, restore previous state)
- Ctrl+Shift+Z: redo (move forward in history)
- History is updated on text change (debounced 500ms)
- New edits after undo truncate the redo stack

## Implementation
- Create `src/hooks/useHistory.ts`:
  ```typescript
  function useHistory(initialState: string, maxEntries = 100) {
    // Returns { state, setState, undo, redo, canUndo, canRedo }
  }
  ```
- Internal structure: `{ past: string[], present: string, future: string[] }`
- Replace `useState(text)` in App.tsx with `useHistory(DEFAULT_TEXT)`

## Keyboard Handling
- `onKeyDown`: intercept Ctrl+Z → call `undo()`, Ctrl+Shift+Z → call `redo()`
- Prevent default browser behavior for these shortcuts

## Files Changed
- `src/hooks/useHistory.ts` — new
- `src/App.tsx` — replace `useState` with `useHistory`, add keyboard handler

## Estimated LOC
~80 lines
