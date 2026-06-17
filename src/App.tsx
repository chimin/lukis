import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { parseDiagram } from './parser';
import { SequenceDiagram } from './SequenceDiagram';
import { useZoomPan } from './hooks/useZoomPan';
import { exportPng } from './utils/exportPng';
import { exportSvg } from './utils/exportSvg';

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

function selectAndScroll(
  textarea: HTMLTextAreaElement,
  lines: string[],
  lineIdx: number,
  selStart: number,
  selEnd: number
) {
  const lineStart = lines.slice(0, lineIdx).reduce((sum, l) => sum + l.length + 1, 0);
  const absStart = lineStart + selStart;
  const absEnd = lineStart + selEnd;

  textarea.focus();
  textarea.setSelectionRange(absStart, absEnd);

  const lineHeight = 22;
  const scrollTarget = lineIdx * lineHeight - textarea.clientHeight / 2 + lineHeight;
  textarea.scrollTop = Math.max(0, scrollTarget);
}

function findQuotedBlock(fullText: string, startLineIdx: number, labelText: string) {
  const lines = fullText.split('\n');
  const startLine = lines[startLineIdx];
  const quoteStart = startLine.indexOf('"');
  if (quoteStart === -1) return null;

  let lastLineIdx = startLineIdx;
  let collected = '';
  for (let i = startLineIdx; i < lines.length; i++) {
    const line = lines[i];
    const from = i === startLineIdx ? quoteStart + 1 : 0;
    const slice = line.slice(from);
    collected += (i > startLineIdx ? '\n' : '') + slice;
    if (i > startLineIdx && line.includes('"')) {
      const closeIdx = line.indexOf('"');
      collected = collected.slice(0, collected.length - (slice.length - closeIdx));
      lastLineIdx = i;
      break;
    }
    lastLineIdx = i;
  }

  if (collected.trim() === labelText) {
    const lineStart = lines.slice(0, startLineIdx).reduce((sum, l) => sum + l.length + 1, 0);
    const absStart = lineStart + quoteStart;
    const lastLineStart = lines.slice(0, lastLineIdx).reduce((sum, l) => sum + l.length + 1, 0);
    const lastLineEnd = lastLineStart + lines[lastLineIdx].length;
    return { startLine: startLineIdx, startChar: absStart, endChar: lastLineEnd };
  }
  return null;
}

function isCursorInsideQuotes(allLines: string[], lineIdx: number, colIdx: number) {
  let textBeforeCursor = '';
  for (let i = 0; i < lineIdx; i++) {
    textBeforeCursor += allLines[i] + '\n';
  }
  textBeforeCursor += allLines[lineIdx].substring(0, colIdx);

  let inString = false;
  for (let i = 0; i < textBeforeCursor.length; i++) {
    if (textBeforeCursor[i] === '"') {
      inString = !inString;
    }
  }
  return inString;
}

function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleExport = useCallback(async (format: 'svg' | 'png', action: 'download' | 'copy') => {
    if (!svgRef.current) return;
    if (action === 'copy') {
      try {
        const cloned = svgRef.current.cloneNode(true) as SVGSVGElement;
        if (!cloned.getAttribute('xmlns')) {
          cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }
        const serializer = new XMLSerializer();
        const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(cloned);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const rect = svgRef.current.getBBox();
        const w = (rect.width || svgRef.current.clientWidth || 800) + 80;
        const h = (rect.height || svgRef.current.clientHeight || 600) + 80;
        const canvas = document.createElement('canvas');
        canvas.width = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 40, 40, w, h);
        URL.revokeObjectURL(url);
        const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (pngBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        }
      } catch {
        if (format === 'svg') exportSvg(svgRef.current);
        else exportPng(svgRef.current);
      }
    } else if (format === 'svg') {
      exportSvg(svgRef.current);
    } else {
      exportPng(svgRef.current);
    }
    setExportOpen(false);
  }, []);
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem('pane-split');
    return saved ? parseFloat(saved) : 0.5;
  });
  const isDragging = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        localStorage.setItem('pane-split', String(splitRatio));
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [splitRatio]);

  const diagramData = useMemo(() => parseDiagram(text), [text]);
  const zoomPan = useZoomPan(previewRef);

  const handleSelect = useCallback((type: 'participant' | 'message' | 'divider', text: string, lineIndex?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lines = textarea.value.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (type === 'participant') {
        const participantMatch = trimmed.match(/^participant\s+"?([^"\s]+)"?(?:\s+as\s+(\w+))?$/i);
        if (participantMatch) {
          const name = participantMatch[1];
          if (name === text) {
            const nameStart = line.indexOf(name);
            selectAndScroll(textarea, lines, i, nameStart, nameStart + name.length);
            return;
          }
        }
        continue;
      }

      if (type === 'message') {
        if (text.includes('\n') && lineIndex !== undefined) {
          const line = lines[lineIndex];
          const colonIdx = line.indexOf(':');
          const quoteStart = line.indexOf('"', colonIdx);
          if (quoteStart !== -1) {
            const labelText = text;
            const labelStartInLine = line.indexOf(labelText.split('\n')[0], quoteStart + 1);
            if (labelStartInLine !== -1) {
              selectAndScroll(textarea, lines, lineIndex, labelStartInLine, labelStartInLine + labelText.length);
              return;
            }
          }
          selectAndScroll(textarea, lines, lineIndex, 0, line.length);
          return;
        }

        if (text.includes('\n')) {
          for (let j = 0; j < lines.length; j++) {
            if (!lines[j].includes('"')) continue;
            const block = findQuotedBlock(textarea.value, j, text);
            if (block) {
              selectAndScroll(textarea, lines, block.startLine, block.startChar, block.endChar);
              return;
            }
          }
          console.warn('No multiline block found for:', JSON.stringify(text));
          return;
        }

        const noteMatch = trimmed.match(/^note\s+(?:left|right|over)\s+(?:of\s+)?\w+\s*:\s*(.+)$/i);
        if (noteMatch && noteMatch[1].trim() === text) {
          const labelStart = lines[i].indexOf(noteMatch[1].trim(), lines[i].indexOf(':'));
          selectAndScroll(textarea, lines, i, labelStart, labelStart + noteMatch[1].trim().length);
          return;
        }

        const titleMatch = trimmed.match(/^title\s+(.+)$/i);
        if (titleMatch && titleMatch[1].trim() === text) {
          const labelStart = lines[i].indexOf(titleMatch[1].trim());
          selectAndScroll(textarea, lines, i, labelStart, labelStart + titleMatch[1].trim().length);
          return;
        }

        if (text.includes('\n')) {
          for (let j = 0; j < lines.length; j++) {
            const block = findQuotedBlock(textarea.value, j, text);
            if (block) {
              selectAndScroll(textarea, lines, block.startLine, block.startChar, block.endChar);
              return;
            }
          }
          continue;
        }

        for (const regex of [
          /^(.+?)\s*-->\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*->>\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*<--\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*<<--\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*->\s*(.+?)\s*:\s*(.+)$/,
          /^(\w+)\s*:\s*(.+)$/,
        ]) {
          const match = trimmed.match(regex);
          if (match) {
            const rawLabel = match[3] ? match[3] : match[2];
            const label = rawLabel.trim();
            if (label === text) {
              const labelStart = line.indexOf(label, line.indexOf(':'));
              selectAndScroll(textarea, lines, i, labelStart, labelStart + label.length);
              return;
            }
            if (rawLabel.trim().startsWith('"')) {
              const block = findQuotedBlock(textarea.value, i, text);
              if (block) {
                selectAndScroll(textarea, lines, block.startLine, block.startChar, block.endChar);
                return;
              }
            }
            break;
          }
        }
        continue;
      }

      if (type === 'divider') {
        const dividerMatch = trimmed.match(/^==\s*(.+?)\s*==$/);
        if (dividerMatch && dividerMatch[1].trim() === text) {
          const labelStart = lines[i].indexOf(dividerMatch[1].trim());
          selectAndScroll(textarea, lines, i, labelStart, labelStart + dividerMatch[1].trim().length);
          return;
        }
        continue;
      }
    }
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={styles.title}>Sequence Diagram Editor</h1>
            <p style={styles.subtitle}>Write syntax on the left, see the diagram on the right.</p>
          </div>
          <div style={{ position: 'relative' }} ref={exportRef}>
            <button onClick={() => setExportOpen((o) => !o)} style={styles.exportBtn} title="Export diagram">
              Export ▾
            </button>
            {exportOpen && (
              <div style={styles.exportDropdown}>
                <div style={styles.exportRow}>
                  <span style={styles.exportLabel}>SVG</span>
                  <button onClick={() => handleExport('svg', 'download')} style={styles.exportIconBtn} className="export-icon-btn" title="Download SVG">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button onClick={() => handleExport('svg', 'copy')} style={styles.exportIconBtn} className="export-icon-btn" title="Copy SVG">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
                <div style={styles.exportRow}>
                  <span style={styles.exportLabel}>PNG</span>
                  <button onClick={() => handleExport('png', 'download')} style={styles.exportIconBtn} className="export-icon-btn" title="Download PNG">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button onClick={() => handleExport('png', 'copy')} style={styles.exportIconBtn} className="export-icon-btn" title="Copy PNG">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <div style={{ ...styles.editorContainer, gridTemplateColumns: `${splitRatio}fr auto ${(1 - splitRatio)}fr` }} ref={containerRef}>
        <div style={styles.pane}>
          <div style={styles.paneHeader}>
            <span style={styles.paneLabel}>Editor</span>
          </div>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const ta = textareaRef.current;
              if (!ta) return;
              const pos = ta.selectionStart;
              const allLines = ta.value.split('\n');
              const textBeforeCursor = ta.value.substring(0, pos);
              const linesBeforeCursor = textBeforeCursor.split('\n');
              const curLineIdx = linesBeforeCursor.length - 1;
              const curColIdx = linesBeforeCursor[curLineIdx].length;
              const currentLine = linesBeforeCursor[curLineIdx];
              const inQuotes = isCursorInsideQuotes(allLines, curLineIdx, curColIdx);

              const selfMatch = currentLine.match(/^\s*(\w+)\s*:\s*(.*)$/);
              if (selfMatch) {
                if (inQuotes) return;
                e.preventDefault();
                const prefix = '\n' + selfMatch[1] + ': ';
                const newValue = ta.value.substring(0, pos) + prefix + ta.value.substring(ta.selectionEnd);
                setText(newValue);
                setTimeout(() => {
                  ta.selectionStart = ta.selectionEnd = pos + prefix.length;
                }, 0);
                return;
              }

              const arrowMatch = currentLine.match(/^\s*(\w+)\s*(--?>?>?|<<?--?)\s*(\w+)\s*:\s*(.*)$/);
              if (arrowMatch) {
                if (inQuotes) return;
                e.preventDefault();
                const prefix = '\n' + arrowMatch[3] + ': ';
                const newValue = ta.value.substring(0, pos) + prefix + ta.value.substring(ta.selectionEnd);
                setText(newValue);
                setTimeout(() => {
                  ta.selectionStart = ta.selectionEnd = pos + prefix.length;
                }, 0);
                return;
              }

              let blockTarget = '';
              {
                const quoteLines: number[] = [];
                for (let i = curLineIdx; i >= 0; i--) {
                  if (allLines[i].includes('"')) quoteLines.unshift(i);
                }
                for (let k = 0; k < quoteLines.length; k++) {
                  const i = quoteLines[k];
                  const startLine = allLines[i];
                  const startSelf = startLine.match(/^\s*(\w+)\s*:/);
                  const startArrow = startLine.match(/^\s*(\w+)\s*(?:--?>?>?|<<?--?)\s*(\w+)\s*:/);
                  let target = '';
                  if (startSelf) target = startSelf[1];
                  else if (startArrow) target = startArrow[2];
                  if (target) {
                    blockTarget = target;
                    break;
                  }
                }
              }
              if (blockTarget) {
                e.preventDefault();
                const prefix = '\n' + blockTarget + ': ';
                const newValue = ta.value.substring(0, pos) + prefix + ta.value.substring(ta.selectionEnd);
                setText(newValue);
                setTimeout(() => {
                  ta.selectionStart = ta.selectionEnd = pos + prefix.length;
                }, 0);
              }
            }}
            spellCheck={false}
            placeholder="Enter sequence diagram syntax..."
          />
        </div>
        <div
          style={styles.divider}
          onMouseDown={() => { isDragging.current = true; }}
        />
        <div style={styles.pane}>
          <div style={styles.paneHeader}>
            <span style={styles.paneLabel}>Preview</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => zoomPan.zoomOut()} style={styles.zoomBtn} title="Zoom out">−</button>
              <span style={{ fontSize: 12, color: '#888', minWidth: 40, textAlign: 'center' }}>{Math.round(zoomPan.scale * 100)}%</span>
              <button onClick={() => zoomPan.zoomIn()} style={styles.zoomBtn} title="Zoom in">+</button>
              <button onClick={zoomPan.reset} style={styles.zoomBtn} title="Fit to view">Fit</button>
            </div>
          </div>
          <div
            ref={previewRef}
            style={styles.preview}
            onMouseDown={zoomPan.handlers.handleMouseDown}
            onMouseMove={zoomPan.handlers.handleMouseMove}
            onMouseUp={zoomPan.handlers.handleMouseUp}
            onMouseLeave={zoomPan.handlers.handleMouseUp}
          >
            <div style={{ transform: `translate(${zoomPan.offsetX}px, ${zoomPan.offsetY}px) scale(${zoomPan.scale})`, transformOrigin: '0 0' }}>
              <SequenceDiagram data={diagramData} onSelect={handleSelect} svgRef={svgRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 14,
    color: '#666',
  },
  exportBtn: {
    padding: '6px 14px',
    border: '1px solid #ddd',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    color: '#333',
  },
  exportDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 100,
    overflow: 'hidden',
    padding: '4px 0',
  },
  exportRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    gap: 8,
  },
  exportLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    minWidth: 32,
  },
  exportIconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    cursor: 'pointer',
    color: '#666',
    padding: 0,
  },
  exportOption: {
    display: 'block',
    width: '100%',
    padding: '8px 16px',
    border: 'none',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    color: '#333',
    textAlign: 'left',
  },
  editorContainer: {
    display: 'grid',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  divider: {
    width: 4,
    backgroundColor: '#e0e0e0',
    cursor: 'col-resize',
    userSelect: 'none',
  },
  pane: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  paneHeader: {
    padding: '10px 16px',
    borderBottom: '1px solid #e8e8e8',
    backgroundColor: '#fafafa',
    flexShrink: 0,
  },
  paneLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
  },
  zoomBtn: {
    padding: '2px 6px',
    border: '1px solid #ddd',
    borderRadius: 3,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    color: '#666',
    minWidth: 24,
    textAlign: 'center',
  },
  preview: {
    flex: 1,
    padding: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    minHeight: 0,
    position: 'relative',
    cursor: 'grab',
  },
  textarea: {
    flex: 1,
    padding: 16,
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
    fontSize: 14,
    lineHeight: 1.6,
    color: '#333',
    backgroundColor: '#fdfdfd',
    tabSize: 2,
  },
};

export default App;
