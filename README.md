# Sequence Diagram Editor

A live sequence diagram editor with real-time preview. Write diagram syntax on the left, see the rendered diagram on the right.

## Features

- **Live preview** — diagrams render as you type
- **Syntax highlighting** — participants, arrows, and keywords are color-coded
- **Click-to-select** — click any label or participant in the preview to select its source line
- **Auto-prepend** — press Enter after a message line to auto-fill the target participant
- **Zoom & pan** — pinch-to-zoom or Ctrl+wheel to zoom, two-finger drag to pan
- **Resizable panes** — drag the divider to resize editor/preview
- **Diagram syntax** — supports participants, 5 message types, notes, dividers, and activation boxes

## Syntax

```
participant Client
participant Server

Client -> Server: send request          (sync)
Client --> Server: send request         (async)
Server <-- Client: return               (reply)
Server: do something                    (self-message)
Client -> A: "multiline
  message"                              (multiline)
note left of A: some note              (note)
== Section ==                           (divider)
activate Client                         (activation box)
deactivate Client                      (deactivation)
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

Pushes to `main` are automatically built and deployed to GitHub Pages via GitHub Actions.
