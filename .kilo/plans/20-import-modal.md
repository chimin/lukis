# Feature: Import Modal

## Summary
Shared UI component for importing diagrams from PlantUML and Mermaid formats.

## Behavior
- "Import" button in header toolbar opens a dropdown: "From PlantUML" / "From Mermaid"
- Opens a modal with a large textarea for pasting source
- Shows a preview of the converted native syntax before confirming
- On confirm: replaces editor content (undo history preserved via history stack)
- On cancel: closes modal without changes
- Shows parse errors with line numbers if conversion fails
- Shows warnings for unsupported constructs

## Implementation
- Create `src/components/ImportModal.tsx`:
  ```typescript
  interface ImportModalProps {
    isOpen: boolean;
    format: 'puml' | 'mermaid';
    onClose: () => void;
    onConfirm: (text: string) => void;
  }
  ```
- Layout: `<div className="modal-overlay">` → `<div className="modal">` with:
  - Header: "Import from PlantUML"
  - Body: `<textarea>` for source input
  - Preview section: read-only `<pre>` showing converted output
  - Footer: "Cancel" / "Import" buttons
- On source change: call `parsePlantUml()` or `parseMermaid()`, show result or error

## Files Changed
- `src/components/ImportModal.tsx` — new
- `src/App.tsx` — add "Import" button, modal state management
- `src/App.css` — modal overlay, modal container, preview styles

## Estimated LOC
~120 lines
