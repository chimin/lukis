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
}

export interface Note {
  position: 'left' | 'right' | 'over';
  participant: string;
  text: string;
  lineIndex: number;
  textStart: number;
  textEnd: number;
}

export interface DiagramData {
  participants: Participant[];
  messages: Message[];
  notes: Note[];
}

const ARROW_PATTERNS: { regex: RegExp; type: Message['type'] }[] = [
  { regex: /^(.+?)\s*-->\s*(.+?)\s*:\s*(.+)$/, type: 'async' },
  { regex: /^(.+?)\s*->>\s*(.+?)\s*:\s*(.+)$/, type: 'async' },
  { regex: /^(.+?)\s*<--\s*(.+?)\s*:\s*(.+)$/, type: 'reply' },
  { regex: /^(.+?)\s*<<--\s*(.+?)\s*:\s*(.+)$/, type: 'reply' },
  { regex: /^(.+?)\s*->\s*(.+?)\s*:\s*(.+)$/, type: 'sync' },
];

export function parseDiagram(input: string): DiagramData {
  const participants: Participant[] = [];
  const messages: Message[] = [];
  const notes: Note[] = [];
  const participantSet = new Set<string>();
  const lines = input.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const participantMatch = line.match(/^participant\s+"?([^"\s]+)"?(?:\s+as\s+(\w+))?$/i);
    if (participantMatch) {
      const name = participantMatch[1];
      const alias = participantMatch[2];
      if (!participantSet.has(name)) {
        participantSet.add(name);
        participants.push({ name, alias, lineIndex: i });
      }
      continue;
    }

    const noteMatch = line.match(/^note\s+(left|right|over)\s+(?:of\s+)?(\w+)\s*:\s*(.+)$/i);
    if (noteMatch) {
      const colonIdx = line.indexOf(':');
      notes.push({
        position: noteMatch[1] as 'left' | 'right' | 'over',
        participant: noteMatch[2],
        text: noteMatch[3],
        lineIndex: i,
        textStart: colonIdx + 1,
        textEnd: line.length,
      });
      continue;
    }

    for (const { regex, type } of ARROW_PATTERNS) {
      const match = line.match(regex);
      if (match) {
        const from = match[1].trim();
        const to = match[2].trim();
        const label = match[3].trim();

        if (!participantSet.has(from)) {
          participantSet.add(from);
          participants.push({ name: from, lineIndex: i });
        }
        if (!participantSet.has(to)) {
          participantSet.add(to);
          participants.push({ name: to, lineIndex: i });
        }

        const colonIdx = line.indexOf(':');
        const msgType = from === to ? 'self' : type;
        messages.push({
          from, to, label, type: msgType, lineIndex: i,
          labelStart: colonIdx + 1,
          labelEnd: line.length,
        });
        break;
      }
    }
  }

  return { participants, messages, notes };
}
