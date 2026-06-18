import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { parseDiagram } from './parser';
import { SequenceDiagram } from './SequenceDiagram';
import { useZoomPan } from './hooks/useZoomPan';
import { matchSelect, isCursorInsideQuotes } from './utils/selection';
import { scrollToLine } from './utils/selection';
import { ExportDropdown } from './components/ExportDropdown';
import { PreviewModal } from './components/PreviewModal';
import { exportPlantUml } from './utils/exportPlantUml';
import { exportMermaid } from './utils/exportMermaid';
import type { SelectType } from './types';
import './App.css';

const DEFAULT_TEXT = `# Sequence Diagram Editor
# Syntax:
#   participant Name [as Alias]
#   A -> B: message       (sync call)
#   A --> B: message      (async call)
#   A <-- B: message      (return)
#   A: message              (self-message)
#   A -> B: "multiline
#     description"
#   note left/right/over A: text
#   == Section ==
#   activate/deactivate A

title User Registration Flow

participant Client
participant Server
participant Database
participant Cache

Client -> Server: "POST /api/users
  Content-Type: application/json
  { name, email }"
activate Server
Server: "validate input
  and check permissions"
note left of Client: User waits for response
Server -> Cache: check cache
note right of Server: Validates before querying
Cache --> Server: cache miss
== Database Query ==
activate Database
Server -> Database: "SELECT * FROM users
  WHERE email = ?
  LIMIT 1"
Database --> Server: return row
deactivate Database
== Cache Update ==
activate Cache
Server -> Cache: "SET user:123
  EX 3600"
Cache --> Server: OK
deactivate Cache
== Response ==
Server --> Client: "201 Created
  { id: 123, name, email }"
deactivate Server
note over Server,Database: Registration complete`;

export default function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem('pane-split');
    return saved ? parseFloat(saved) : 0.5;
  });
  const isDragging = useRef(false);

  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const diagramData = useMemo(() => parseDiagram(text), [text]);
  const zoomPan = useZoomPan(previewRef);

  const handlePreview = useCallback((format: 'puml' | 'mmd') => {
    const text = format === 'puml' ? exportPlantUml(diagramData) : exportMermaid(diagramData);
    setPreviewTitle(format === 'puml' ? 'PlantUML Preview' : 'Mermaid Preview');
    setPreviewText(text);
  }, [diagramData]);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // Resizable panes
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitRatio(Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width)));
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        localStorage.setItem('pane-split', String(splitRatio));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [splitRatio]);

  // Click-to-select
  const handleSelect = useCallback((type: SelectType, text: string, lineIndex?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const match = matchSelect(textarea, textarea.value.split('\n'), type, text, lineIndex);
    if (match) scrollToLine(textarea, textarea.value.split('\n'), match.startLine, match.startChar, match.endChar);
  }, []);

  // Auto-prepend on Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const allLines = ta.value.split('\n');
    const linesBefore = ta.value.substring(0, pos).split('\n');
    const curLineIdx = linesBefore.length - 1;
    const curColIdx = linesBefore[curLineIdx].length;
    const currentLine = linesBefore[curLineIdx];

    if (isCursorInsideQuotes(allLines, curLineIdx, curColIdx)) return;

    const selfMatch = currentLine.match(/^\s*(\w+)\s*:\s*(.*)$/);
    if (selfMatch) {
      e.preventDefault();
      insertPrefix(ta, pos, selfMatch[1] + ': ');
      return;
    }

    const arrowMatch = currentLine.match(/^\s*(\w+)\s*(--?>?>?|<<?--?)\s*(\w+)\s*:\s*(.*)$/);
    if (arrowMatch) {
      e.preventDefault();
      insertPrefix(ta, pos, arrowMatch[3] + ': ');
      return;
    }

    // Multiline block continuation
    let blockTarget = '';
    const quoteLines: number[] = [];
    for (let i = curLineIdx; i >= 0; i--) {
      if (allLines[i].includes('"')) quoteLines.unshift(i);
    }
    for (const idx of quoteLines) {
      const startLine = allLines[idx];
      const startSelf = startLine.match(/^\s*(\w+)\s*:/);
      const startArrow = startLine.match(/^\s*(\w+)\s*(?:--?>?>?|<<?--?)\s*(\w+)\s*:/);
      if (startSelf) blockTarget = startSelf[1];
      else if (startArrow) blockTarget = startArrow[2];
      if (blockTarget) break;
    }
    if (blockTarget) {
      e.preventDefault();
      insertPrefix(ta, pos, blockTarget + ': ');
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1 className="header-title">Sequence Diagram Editor</h1>
            <p className="header-subtitle">Write syntax on the left, see the diagram on the right.</p>
          </div>
          <ExportDropdown svgRef={svgRef} diagramData={diagramData} showToast={showToast} onPreview={handlePreview} />
        </div>
      </header>

      <div
        className="editor-container"
        ref={containerRef}
        style={{ gridTemplateColumns: `${splitRatio}fr auto ${1 - splitRatio}fr` }}
      >
        <div className="pane">
          <div className="pane-header">
            <span className="pane-label">Editor</span>
          </div>
          <textarea
            ref={textareaRef}
            className="textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="Enter sequence diagram syntax..."
          />
        </div>
        <div className="divider" onMouseDown={() => { isDragging.current = true; }} />
        <div className="pane">
          <div className="pane-header">
            <span className="pane-label">Preview</span>
            <div className="zoom-controls">
              <button onClick={() => zoomPan.zoomOut()} className="zoom-btn" title="Zoom out">−</button>
              <span className="zoom-indicator">{Math.round(zoomPan.scale * 100)}%</span>
              <button onClick={() => zoomPan.zoomIn()} className="zoom-btn" title="Zoom in">+</button>
              <button onClick={zoomPan.reset} className="zoom-btn" title="Fit to view">Fit</button>
            </div>
          </div>
          <div
            ref={previewRef}
            className="preview"
            onMouseDown={zoomPan.handlers.handleMouseDown}
            onMouseMove={zoomPan.handlers.handleMouseMove}
            onMouseUp={zoomPan.handlers.handleMouseUp}
            onMouseLeave={zoomPan.handlers.handleMouseUp}
          >
            <div
              className="preview-inner"
              style={{ transform: `translate(${zoomPan.offsetX}px, ${zoomPan.offsetY}px) scale(${zoomPan.scale})` }}
            >
              <SequenceDiagram data={diagramData} onSelect={handleSelect} svgRef={svgRef} />
            </div>
          </div>
        </div>
      </div>

      {previewText && (
        <PreviewModal
          text={previewText}
          title={previewTitle}
          onClose={() => setPreviewText(null)}
          onCopy={() => { navigator.clipboard.writeText(previewText); showToast('Copied to clipboard'); }}
          onDownload={() => setPreviewText(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function insertPrefix(ta: HTMLTextAreaElement, pos: number, prefix: string) {
  const value = ta.value;
  const newValue = value.substring(0, pos) + '\n' + prefix + value.substring(ta.selectionEnd);
  ta.value = newValue;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + prefix.length + 1; }, 0);
}
