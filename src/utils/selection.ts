import type { SelectType, SelectionMatch } from '../types';

export function scrollToLine(
  textarea: HTMLTextAreaElement,
  lines: string[],
  lineIdx: number,
  selStart: number,
  selEnd: number
) {
  const lineStart = lines.slice(0, lineIdx).reduce((sum, l) => sum + l.length + 1, 0);
  textarea.focus();
  textarea.setSelectionRange(lineStart + selStart, lineStart + selEnd);
  const lineHeight = 22;
  textarea.scrollTop = Math.max(0, lineIdx * lineHeight - textarea.clientHeight / 2 + lineHeight);
}

export function findQuotedBlock(
  fullText: string,
  startLineIdx: number,
  labelText: string
): SelectionMatch | null {
  const lines = fullText.split('\n');
  const startLine = lines[startLineIdx];
  const quoteStart = startLine.indexOf('"');
  if (quoteStart === -1) return null;

  let lastLineIdx = startLineIdx;
  let collected = '';
  for (let i = startLineIdx; i < lines.length; i++) {
    const from = i === startLineIdx ? quoteStart + 1 : 0;
    const slice = lines[i].slice(from);
    collected += (i > startLineIdx ? '\n' : '') + slice;
    if (i > startLineIdx && lines[i].includes('"')) {
      const closeIdx = lines[i].indexOf('"');
      collected = collected.slice(0, collected.length - (slice.length - closeIdx));
      lastLineIdx = i;
      break;
    }
    lastLineIdx = i;
  }

  if (collected.trim() !== labelText) return null;

  const lineStart = lines.slice(0, startLineIdx).reduce((sum, l) => sum + l.length + 1, 0);
  const lastLineStart = lines.slice(0, lastLineIdx).reduce((sum, l) => sum + l.length + 1, 0);
  return {
    startLine: startLineIdx,
    startChar: lineStart + quoteStart,
    endChar: lastLineStart + lines[lastLineIdx].length,
  };
}

export function isCursorInsideQuotes(
  allLines: string[],
  lineIdx: number,
  colIdx: number
): boolean {
  let text = '';
  for (let i = 0; i < lineIdx; i++) text += allLines[i] + '\n';
  text += allLines[lineIdx].substring(0, colIdx);
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') inString = !inString;
  }
  return inString;
}

const ARROW_PATTERNS: RegExp[] = [
  /^(.+?)\s*-->\s*(.+?)\s*:\s*(.+)$/,
  /^(.+?)\s*->>\s*(.+?)\s*:\s*(.+)$/,
  /^(.+?)\s*<--\s*(.+?)\s*:\s*(.+)$/,
  /^(.+?)\s*<<--\s*(.+?)\s*:\s*(.+)$/,
  /^(.+?)\s*->\s*(.+?)\s*:\s*(.+)$/,
  /^(\w+)\s*:\s*(.+)$/,
];

export function matchSelect(
  textarea: HTMLTextAreaElement,
  lines: string[],
  type: SelectType,
  text: string,
  lineIndex?: number
): SelectionMatch | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (type === 'participant') {
      const m = trimmed.match(/^participant\s+"?([^"\s]+)"?(?:\s+as\s+\w+)?$/i);
      if (m && m[1] === text) {
        const nameStart = line.indexOf(m[1]);
        return { startLine: i, startChar: nameStart, endChar: nameStart + m[1].length };
      }
      continue;
    }

    if (type === 'divider') {
      const m = trimmed.match(/^==\s*(.+?)\s*==$/);
      if (m && m[1].trim() === text) {
        const labelStart = line.indexOf(m[1].trim());
        return { startLine: i, startChar: labelStart, endChar: labelStart + m[1].trim().length };
      }
      continue;
    }

    // type === 'message'
    if (text.includes('\n') && lineIndex !== undefined) {
      const targetLine = lines[lineIndex];
      const colonIdx = targetLine.indexOf(':');
      const quoteStart = targetLine.indexOf('"', colonIdx);
      if (quoteStart !== -1) {
        const firstLine = text.split('\n')[0];
        const labelStartInLine = targetLine.indexOf(firstLine, quoteStart + 1);
        if (labelStartInLine !== -1) {
          return { startLine: lineIndex, startChar: labelStartInLine, endChar: labelStartInLine + text.length };
        }
      }
      return { startLine: lineIndex, startChar: 0, endChar: targetLine.length };
    }

    if (text.includes('\n')) {
      const block = findQuotedBlock(textarea.value, i, text);
      if (block) return block;
      continue;
    }

    const noteMatch = trimmed.match(/^note\s+(?:left|right|over)\s+(?:of\s+)?\w+\s*:\s*(.+)$/i);
    if (noteMatch && noteMatch[1].trim() === text) {
      const labelStart = line.indexOf(noteMatch[1].trim(), line.indexOf(':'));
      return { startLine: i, startChar: labelStart, endChar: labelStart + noteMatch[1].trim().length };
    }

    const titleMatch = trimmed.match(/^title\s+(.+)$/i);
    if (titleMatch && titleMatch[1].trim() === text) {
      const labelStart = line.indexOf(titleMatch[1].trim());
      return { startLine: i, startChar: labelStart, endChar: labelStart + titleMatch[1].trim().length };
    }

    for (const regex of ARROW_PATTERNS) {
      const match = trimmed.match(regex);
      if (match) {
        const rawLabel = match[3] ? match[3] : match[2];
        const label = rawLabel.trim();
        if (label === text) {
          const labelStart = line.indexOf(label, line.indexOf(':'));
          return { startLine: i, startChar: labelStart, endChar: labelStart + label.length };
        }
        if (rawLabel.trim().startsWith('"')) {
          const block = findQuotedBlock(textarea.value, i, text);
          if (block) return block;
        }
        break;
      }
    }
  }
  return null;
}
