import { useState, useMemo, useRef, useCallback } from 'react';
import { parseDiagram } from './parser';
import { SequenceDiagram } from './SequenceDiagram';

const DEFAULT_TEXT = `# Sequence Diagram Editor
# Syntax:
#   participant Name [as Alias]
#   A -> B: message       (sync call)
#   A --> B: message      (async call)
#   A <-- B: message      (return)
#   note left of A: text
#   note right of B: text
#   note over A: text

participant Client
participant Server
participant Database

Client -> Server: send API request
Server -> Database: query data
Database --> Server: return results
Server --> Client: send response
note right of Server: Processes the request`;

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

function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const diagramData = useMemo(() => parseDiagram(text), [text]);

  const handleSelect = useCallback((type: 'participant' | 'message' | 'note', text: string) => {
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
        for (const regex of [
          /^(.+?)\s*-->\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*->>\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*<--\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*<<--\s*(.+?)\s*:\s*(.+)$/,
          /^(.+?)\s*->\s*(.+?)\s*:\s*(.+)$/,
        ]) {
          const match = trimmed.match(regex);
          if (match) {
            const label = match[3].trim();
            if (label === text) {
              const labelStart = line.indexOf(label, line.indexOf(':'));
              selectAndScroll(textarea, lines, i, labelStart, labelStart + label.length);
              return;
            }
            break;
          }
        }
        continue;
      }

      if (type === 'note') {
        const noteMatch = trimmed.match(/^note\s+(left|right|over)\s+(?:of\s+)?(\w+)\s*:\s*(.+)$/i);
        if (noteMatch) {
          const noteText = noteMatch[3].trim();
          if (noteText === text) {
            const textStart = line.indexOf(noteText, line.indexOf(':'));
            selectAndScroll(textarea, lines, i, textStart, textStart + noteText.length);
            return;
          }
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
