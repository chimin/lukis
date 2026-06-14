import { useState, useMemo } from 'react';
import { parseDiagram } from './parser';
import { SequenceDiagram } from './SequenceDiagram';

const DEFAULT_TEXT = `# Sequence Diagram Editor
# Syntax:
#   participant Name [as Alias]
#   A -> B: message       (sync call)
#   A --> B: message      (async call)
#   A -->> B: message     (async call)
#   A <-- B: message      (return)
#   A <<-- B: message     (return)
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

function App() {
  const [text, setText] = useState(DEFAULT_TEXT);

  const diagramData = useMemo(() => parseDiagram(text), [text]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Sequence Diagram Editor</h1>
        <p style={styles.subtitle}>Write syntax on the left, see the diagram on the right</p>
      </header>
      <div style={styles.editorContainer}>
        <div style={styles.pane}>
          <div style={styles.paneHeader}>
            <span style={styles.paneLabel}>Editor</span>
          </div>
          <textarea
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
            <SequenceDiagram data={diagramData} />
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
