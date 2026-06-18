import type { DiagramData, Participant, Message, Note, Divider, Activation } from './types';

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
      if (lines[j].includes('"')) break;
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
  const dividers: Divider[] = [];
  const activations: Activation[] = [];
  const participantSet = new Set<string>();
  let title: string | null = null;
  const mergedLines = mergeQuotedLines(input.split('\n'));

  for (const { text: line, originalIndex: i } of mergedLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const titleMatch = trimmed.match(/^title\s+(.+)$/i);
    if (titleMatch && !title) { title = titleMatch[1].trim(); continue; }

    const participantMatch = trimmed.match(/^participant\s+"?([^"\s]+)"?(?:\s+as\s+(\w+))?$/i);
    if (participantMatch) {
      const name = participantMatch[1];
      if (!participantSet.has(name)) {
        participantSet.add(name);
        participants.push({ name, alias: participantMatch[2], lineIndex: i });
      }
      continue;
    }

    const noteMatch = trimmed.match(/^note\s+(left|right|over)\s+(?:of\s+)?(\w+)\s*:\s*(.+)$/i);
    if (noteMatch) {
      notes.push({ position: noteMatch[1] as 'left' | 'right' | 'over', participant: noteMatch[2], text: noteMatch[3], lineIndex: i });
      continue;
    }

    const dividerMatch = trimmed.match(/^==\s*(.+?)\s*==$/);
    if (dividerMatch) { dividers.push({ label: dividerMatch[1].trim(), lineIndex: i }); continue; }

    const activateMatch = trimmed.match(/^activate\s+(\w+)$/i);
    if (activateMatch) { activations.push({ participant: activateMatch[1], lineIndex: i, type: 'activate' }); continue; }

    const deactivateMatch = trimmed.match(/^deactivate\s+(\w+)$/i);
    if (deactivateMatch) { activations.push({ participant: deactivateMatch[1], lineIndex: i, type: 'deactivate' }); continue; }

    for (const { regex, type } of ARROW_PATTERNS) {
      const match = trimmed.match(regex);
      if (!match) continue;
      const from = match[1].trim();
      const to = type === 'self' ? from : match[2].trim();
      let label = (type === 'self' ? match[2] : match[3]).trim();
      if (label.startsWith('"') && label.endsWith('"')) label = label.slice(1, -1);
      if (!participantSet.has(from)) { participantSet.add(from); participants.push({ name: from, lineIndex: i }); }
      if (!participantSet.has(to)) { participantSet.add(to); participants.push({ name: to, lineIndex: i }); }
      messages.push({ from, to, label, type, lineIndex: i, labelStart: line.indexOf(':') + 1, labelEnd: line.indexOf(':') + 1 + label.length, lastLineIndex: i });
      break;
    }
  }

  return { title, participants, messages, notes, dividers, activations };
}
