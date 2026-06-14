import { useState, useMemo, useRef, useCallback } from 'react';
import { parseDiagram } from './parser';
import { SequenceDiagram } from './SequenceDiagram';

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

  const diagramData = useMemo(() => parseDiagram(text), [text]);

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
        <h1 style={styles.title}>Sequence Diagram Editor</h1>
        <p style={styles.subtitle}>Write syntax on the left, see the diagram on the right. Click a label or participant in the preview to select its source text.</p>
      </header>
      <div style={styles.editorContainer}>
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
        <div style={styles.divider} />
        <div style={styles.pane}>
          <div style={styles.paneHeader}>
            <span style={styles.paneLabel}>Preview</span>
          </div>
          <div style={styles.preview}>
            <SequenceDiagram data={diagramData} onSelect={handleSelect} />
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
  editorContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  pane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  paneHeader: {
    padding: '10px 16px',
    borderBottom: '1px solid #e8e8e8',
    backgroundColor: '#fafafa',
  },
  paneLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
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
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  preview: {
    flex: 1,
    padding: 16,
    overflow: 'auto',
    backgroundColor: '#fff',
    minHeight: 0,
  },
};

export default App;
