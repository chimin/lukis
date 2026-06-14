export interface Participant {
  name: string;
  alias?: string;
  lineIndex: number;
}

export interface Message {
  from: string;
  to: string;
  label: string;
  type: 'sync' | 'async' | 'reply' | 'self';
  lineIndex: number;
  labelStart: number;
  labelEnd: number;
  lastLineIndex: number;
}

export interface Note {
  position: 'left' | 'right' | 'over';
  participant: string;
  text: string;
  lineIndex: number;
}

export interface DiagramData {
  title: string | null;
  participants: Participant[];
  messages: Message[];
  notes: Note[];
}

const ARROW_PATTERNS: { regex: RegExp; type: Message['type'] }[] = [
  { regex: /^([\s\S]+?)\s*-->\s*([\s\S]+?)\s*:\s*([\s\S]+)$/, type: 'async' },
  { regex: /^([\s\S]+?)\s*->>\s*([\s\S]+?)\s*:\s*([\s\S]+)$/, type: 'async' },
  { regex: /^([\s\S]+?)\s*<--\s*([\s\S]+?)\s*:\s*([\s\S]+)$/, type: 'reply' },
  { regex: /^([\s\S]+?)\s*<<--\s*([\s\S]+?)\s*:\s*([\s\S]+)$/, type: 'reply' },
  { regex: /^([\s\S]+?)\s*->\s*([\s\S]+?)\s*:\s*([\s\S]+)$/, type: 'sync' },
  { regex: /^(\w+)\s*:\s*([\s\S]+)$/, type: 'self' },
];

function mergeQuotedLines(lines: string[]): { text: string; originalIndex: number; lastOriginalIndex: number }[] {
  const result: { text: string; originalIndex: number; lastOriginalIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed.includes('"')) {
      result.push({ text: line, originalIndex: i, lastOriginalIndex: i });
      continue;
    }

    const quoteCount = (trimmed.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      result.push({ text: line, originalIndex: i, lastOriginalIndex: i });
      continue;
    }

    let merged = line;
    let lastIdx = i;
    for (let j = i + 1; j < lines.length; j++) {
      merged += '\n' + lines[j];
      lastIdx = j;
      const closeCount = (lines[j].match(/"/g) || []).length;
      if (closeCount > 0) {
        break;
      }
    }
    result.push({ text: merged, originalIndex: i, lastOriginalIndex: lastIdx });
    i = lastIdx;
  }

  return result;
}

export function parseDiagram(input: string): DiagramData {
  const participants: Participant[] = [];
  const messages: Message[] = [];
  const notes: Note[] = [];
  const participantSet = new Set<string>();
  let title: string | null = null;
  const rawLines = input.split('\n');
  const mergedLines = mergeQuotedLines(rawLines);

  for (const { text: line, originalIndex: i, lastOriginalIndex } of mergedLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const titleMatch = trimmed.match(/^title\s+(.+)$/i);
    if (titleMatch && !title) {
      title = titleMatch[1].trim();
      continue;
    }

    const participantMatch = trimmed.match(/^participant\s+"?([^"\s]+)"?(?:\s+as\s+(\w+))?$/i);
    if (participantMatch) {
      const name = participantMatch[1];
      const alias = participantMatch[2];
      if (!participantSet.has(name)) {
        participantSet.add(name);
        participants.push({ name, alias, lineIndex: i });
      }
      continue;
    }

    const noteMatch = trimmed.match(/^note\s+(left|right|over)\s+(?:of\s+)?(\w+)\s*:\s*(.+)$/i);
    if (noteMatch) {
      notes.push({
        position: noteMatch[1] as 'left' | 'right' | 'over',
        participant: noteMatch[2],
        text: noteMatch[3],
        lineIndex: i,
      });
      continue;
    }

    for (const { regex, type } of ARROW_PATTERNS) {
      const match = trimmed.match(regex);
      if (match) {
        let from: string, to: string, label: string;

        if (type === 'self') {
          from = match[1].trim();
          to = from;
          label = match[2].trim();
        } else {
          from = match[1].trim();
          to = match[2].trim();
          label = match[3].trim();
        }

        if (label.startsWith('"') && label.endsWith('"')) {
          label = label.slice(1, -1);
        }

        if (!participantSet.has(from)) {
          participantSet.add(from);
          participants.push({ name: from, lineIndex: i });
        }
        if (!participantSet.has(to)) {
          participantSet.add(to);
          participants.push({ name: to, lineIndex: i });
        }

        const colonIdx = line.indexOf(':');
        const labelStart = colonIdx + 1;
        const labelEnd = labelStart + label.length;

        messages.push({
          from, to, label, type, lineIndex: i,
          labelStart, labelEnd, lastLineIndex: lastOriginalIndex,
        });
        break;
      }
    }
  }

  return { title, participants, messages, notes };
}
