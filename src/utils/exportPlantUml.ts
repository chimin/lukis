import type { DiagramData } from '../types';

export function exportPlantUml(data: DiagramData): string {
  const lines: string[] = ['@startuml'];

  if (data.title) {
    lines.push(`title ${data.title}`);
    lines.push('');
  }

  for (const p of data.participants) {
    if (p.alias) {
      lines.push(`participant "${p.name}" as ${p.alias}`);
    } else {
      lines.push(`participant ${p.name}`);
    }
  }
  lines.push('');

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
      const arrow = m.type === 'async' ? ' --> ' : m.type === 'reply' ? ' <-- ' : ' -> ';
      const label = m.label.replace(/\n/g, '\\n');
      lines.push(`${m.from}${arrow}${m.to}: ${label}`);
    } else if (entry.type === 'note') {
      const n = entry.item as { position: string; participant: string; text: string };
      const text = n.text.replace(/\n/g, '\\n');
      lines.push(`note ${n.position} of ${n.participant}: ${text}`);
    } else if (entry.type === 'divider') {
      const d = entry.item as { label: string };
      lines.push(`== ${d.label} ==`);
    } else if (entry.type === 'activation') {
      const a = entry.item as { type: string; participant: string };
      lines.push(`${a.type} ${a.participant}`);
    }
  }

  lines.push('');
  lines.push('@enduml');
  return lines.join('\n');
}
