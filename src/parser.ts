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

export interface DiagramData {
  participants: Participant[];
  messages: Message[];
}

const ARROW_PATTERNS: { regex: RegExp; type: Message['type'] }[] = [
  { regex: /^(.+?)\s*-->\s*(.+?)\s*:\s*(.+)$/, type: 'async' },
  { regex: /^(.+?)\s*->>\s*(.+?)\s*:\s*(.+)$/, type: 'async' },
  { regex: /^(.+?)\s*<--\s*(.+?)\s*:\s*(.+)$/, type: 'reply' },
  { regex: /^(.+?)\s*<<--\s*(.+?)\s*:\s*(.+)$/, type: 'reply' },
  { regex: /^(.+?)\s*->\s*(.+?)\s*:\s*(.+)$/, type: 'sync' },
  { regex: /^(\w+)\s*:\s*(.+)$/, type: 'self' },
];

export function parseDiagram(input: string): DiagramData {
  const participants: Participant[] = [];
  const messages: Message[] = [];
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

    for (const { regex, type } of ARROW_PATTERNS) {
      const match = line.match(regex);
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

        if (!participantSet.has(from)) {
          participantSet.add(from);
          participants.push({ name: from, lineIndex: i });
        }
        if (!participantSet.has(to)) {
          participantSet.add(to);
          participants.push({ name: to, lineIndex: i });
        }

        const colonIdx = line.indexOf(':');
        messages.push({
          from, to, label, type, lineIndex: i,
          labelStart: colonIdx + 1,
          labelEnd: line.length,
        });
        break;
      }
    }
  }

  return { participants, messages };
}
