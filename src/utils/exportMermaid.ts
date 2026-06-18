import type { DiagramData } from '../types';

export function exportMermaid(data: DiagramData): string {
  const lines: string[] = ['sequenceDiagram'];

  if (data.title) {
    lines.push(`    title ${data.title}`);
    lines.push('');
  }

  const aliases = new Map<string, string>();
  for (const p of data.participants) {
    if (p.alias) {
      aliases.set(p.name, p.alias);
    }
  }

  const getName = (n: string) => aliases.get(n) || n;

  type Entry = { type: string; lineIndex: number };
  const sorted: Array<Entry & { item: unknown }> = [
    ...data.messages.map((m) => ({ type: 'message', item: m, lineIndex: m.lineIndex })),
    ...data.notes.map((n) => ({ type: 'note', item: n, lineIndex: n.lineIndex })),
    ...data.dividers.map((d) => ({ type: 'divider', item: d, lineIndex: d.lineIndex })),
    ...data.activations.map((a) => ({ type: 'activation', item: a, lineIndex: a.lineIndex })),
  ].sort((a, b) => a.lineIndex - b.lineIndex);

  for (const entry of sorted) {
    if (entry.type === 'message') {
      const m = entry.item as { from: string; to: string; label: string; type: string };
      const label = m.label.replace(/\n/g, '<br/>');
      if (m.type === 'async') {
        lines.push(`    ${getName(m.from)}->>${getName(m.to)}: ${label}`);
      } else if (m.type === 'reply') {
        lines.push(`    ${getName(m.from)}-->>${getName(m.to)}: ${label}`);
      } else {
        lines.push(`    ${getName(m.from)}->${getName(m.to)}: ${label}`);
      }
    } else if (entry.type === 'note') {
      const n = entry.item as { position: string; participant: string; text: string };
      const text = n.text.replace(/\n/g, '<br/>');
      if (n.position === 'over') {
        lines.push(`    Note over ${getName(n.participant)}: ${text}`);
      } else {
        lines.push(`    Note ${n.position} of ${getName(n.participant)}: ${text}`);
      }
    } else if (entry.type === 'divider') {
      const d = entry.item as { label: string };
      lines.push(`    %% ${d.label}`);
    } else if (entry.type === 'activation') {
      const a = entry.item as { type: string; participant: string };
      lines.push(`    ${a.type} ${getName(a.participant)}`);
    }
  }

  return lines.join('\n');
}
