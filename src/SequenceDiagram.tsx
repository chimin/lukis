import type { DiagramData, SelectType } from './types';

interface SequenceDiagramProps {
  data: DiagramData;
  onSelect: (type: SelectType, text: string, lineIndex?: number) => void;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

const PARTICIPANT_WIDTH = 140;
const PARTICIPANT_HEIGHT = 40;
const BASE_GAP = 60;
const LINE_HEIGHT = 14;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 60;
const SELF_MESSAGE_WIDTH = 40;
const MIN_LABEL_WIDTH = 100;
const LABEL_PAD_X = 10;
const LABEL_PAD_Y = 6;
const MIN_BOX_HEIGHT = 24;
const ARROW_HEAD = 16;

function getTextWidth(text: string): number {
  const maxLine = text.split('\n').reduce((max, l) => Math.max(max, l.length), 0);
  return Math.max(maxLine * 7 + LABEL_PAD_X * 2, MIN_LABEL_WIDTH);
}

function getLabelLines(label: string): string[] {
  return label.split('\n');
}

function getLabelHeight(label: string): number {
  return getLabelLines(label).length * LINE_HEIGHT;
}

function getBoxHeight(label: string): number {
  return Math.max(getLabelHeight(label) + LABEL_PAD_Y * 2, MIN_BOX_HEIGHT);
}

const NOTE_WIDTH = 140;
const NOTE_HEIGHT = 28;
const NOTE_PAD_Y = 2;
const MARGIN = 20;

interface RenderItem {
  lineIndex: number;
  type: 'message' | 'note' | 'divider';
  msgIdx?: number;
  noteIdx?: number;
  dividerIdx?: number;
}

export function SequenceDiagram({ data, onSelect, svgRef }: SequenceDiagramProps) {
  const { participants, messages, title, notes, dividers, activations } = data;

  if (participants.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Enter sequence diagram syntax to see preview
      </div>
    );
  }

  const titleHeight = title ? 40 : 0;
  const vOffset = titleHeight; // shift everything down when title is present

  const getParticipantIdx = (name: string) => participants.findIndex(p => p.name === name);

  const gaps: number[] = [];
  for (let i = 0; i < participants.length - 1; i++) {
    let gap = BASE_GAP;
    for (const msg of messages) {
      if (msg.from === msg.to) continue;
      const fromIdx = getParticipantIdx(msg.from);
      const toIdx = getParticipantIdx(msg.to);
      if (fromIdx === -1 || toIdx === -1) continue;
      const minIdx = Math.min(fromIdx, toIdx);
      const maxIdx = Math.max(fromIdx, toIdx);
      if (minIdx > i || maxIdx < i + 1) continue;
      const labelW = getTextWidth(msg.label);
      const minSpace = labelW + ARROW_HEAD * 2 + 10;
      const minGap = minSpace - PARTICIPANT_WIDTH;
      if (minGap > gap) {
        gap = minGap;
      }
    }
    gaps.push(gap);
  }

  const participantX: number[] = [];
  let px = 40;
  for (let i = 0; i < participants.length; i++) {
    participantX.push(px + PARTICIPANT_WIDTH / 2);
    px += PARTICIPANT_WIDTH + (gaps[i] ?? BASE_GAP);
  }

  const participantBoxX: number[] = [];
  let bx = 40;
  for (let i = 0; i < participants.length; i++) {
    participantBoxX.push(bx);
    bx += PARTICIPANT_WIDTH + (gaps[i] ?? BASE_GAP);
  }

  let diagramWidth = participantBoxX[participantBoxX.length - 1] + PARTICIPANT_WIDTH + 40;
  let minX = 0;
  for (const note of notes) {
    const pIdx = getParticipantIdx(note.participant);
    const pCenterX = pIdx >= 0 ? participantX[pIdx] : diagramWidth / 2;
    if (note.position === 'left') {
      minX = Math.min(minX, pCenterX - NOTE_WIDTH - NOTE_PAD_Y);
    } else if (note.position === 'right') {
      diagramWidth = Math.max(diagramWidth, pCenterX + NOTE_PAD_Y + NOTE_WIDTH);
    }
  }
  const viewBoxX = minX - MARGIN;
  const viewBoxWidth = diagramWidth - minX + MARGIN * 2;

  const renderItems: RenderItem[] = [];
  let msgIdx = 0;
  let noteIdx = 0;
  let divIdx = 0;
  while (msgIdx < messages.length || noteIdx < notes.length || divIdx < dividers.length) {
    const msgLine = msgIdx < messages.length ? messages[msgIdx].lineIndex : Infinity;
    const noteLine = noteIdx < notes.length ? notes[noteIdx].lineIndex : Infinity;
    const divLine = divIdx < dividers.length ? dividers[divIdx].lineIndex : Infinity;
    if (msgLine <= noteLine && msgLine <= divLine) {
      renderItems.push({ lineIndex: msgLine, type: 'message', msgIdx });
      msgIdx++;
    } else if (noteLine <= msgLine && noteLine <= divLine) {
      renderItems.push({ lineIndex: noteLine, type: 'note', noteIdx });
      noteIdx++;
    } else {
      renderItems.push({ lineIndex: divLine, type: 'divider', dividerIdx: divIdx });
      divIdx++;
    }
  }

  const msgPositions: { midY: number; boxH: number }[] = [];
  const notePositions: { y: number; height: number }[] = [];
  const dividerPositions: { y: number }[] = [];
  const DIVIDER_HEIGHT = 30;
  let cy = PADDING_TOP + PARTICIPANT_HEIGHT + 30 + titleHeight;
  for (const item of renderItems) {
    if (item.type === 'message') {
      const boxH = getBoxHeight(messages[item.msgIdx!].label);
      msgPositions[item.msgIdx!] = { midY: cy + boxH / 2, boxH };
      cy += boxH;
    } else if (item.type === 'note') {
      notePositions[item.noteIdx!] = { y: cy, height: NOTE_HEIGHT };
      cy += NOTE_HEIGHT + NOTE_PAD_Y;
    } else {
      dividerPositions[item.dividerIdx!] = { y: cy + DIVIDER_HEIGHT / 2 };
      cy += DIVIDER_HEIGHT;
    }
  }
  const diagramHeight = cy + PADDING_BOTTOM;

  const activationBoxes: Array<{ participantIdx: number; startY: number; endY: number; stack: number }> = [];
  const activeState = new Map<string, { startY: number; stack: number }>();
  let cyAct = PADDING_TOP + vOffset + PARTICIPANT_HEIGHT + 30 + titleHeight;
  let ri = 0;
  let ai = 0;
  const sortedActs = [...activations].sort((a, b) => a.lineIndex - b.lineIndex);
  while (ri < renderItems.length || ai < sortedActs.length) {
    const riLine = ri < renderItems.length ? renderItems[ri].lineIndex : Infinity;
    const actLine = ai < sortedActs.length ? sortedActs[ai].lineIndex : Infinity;
    if (actLine <= riLine) {
      const act = sortedActs[ai];
      if (act.type === 'activate') {
        const existing = activeState.get(act.participant);
        if (existing) {
          existing.stack++;
        } else {
          activeState.set(act.participant, { startY: cyAct, stack: 0 });
        }
      } else {
        const state = activeState.get(act.participant);
        if (state) {
          const pIdx = participants.findIndex(p => p.name === act.participant);
          activationBoxes.push({ participantIdx: pIdx, startY: state.startY, endY: cyAct, stack: state.stack });
          activeState.delete(act.participant);
        }
      }
      ai++;
    } else {
      const item = renderItems[ri];
      if (item.type === 'message') {
        cyAct += getBoxHeight(messages[item.msgIdx!].label);
      } else if (item.type === 'note') {
        cyAct += NOTE_HEIGHT + NOTE_PAD_Y;
      } else {
        cyAct += DIVIDER_HEIGHT;
      }
      ri++;
    }
  }
  for (const [participant, state] of activeState) {
    const pIdx = participants.findIndex(p => p.name === participant);
    activationBoxes.push({ participantIdx: pIdx, startY: state.startY, endY: cyAct, stack: state.stack });
  }

  const renderLabel = (label: string, cx: number, boxY: number) => {
    const lines = getLabelLines(label);
    const totalH = lines.length * LINE_HEIGHT;
    const boxH = getBoxHeight(label);
    const startY = boxY + (boxH - totalH) / 2 + LINE_HEIGHT - 2;

    if (lines.length === 1) {
      return (
        <text x={cx} y={startY} textAnchor="middle" fill="#333" fontSize={12}>
          {lines[0]}
        </text>
      );
    }
    return (
      <text x={cx} textAnchor="middle" fill="#333" fontSize={12}>
        {lines.map((l, idx) => (
          <tspan key={idx} x={cx} y={startY + idx * LINE_HEIGHT}>
            {l}
          </tspan>
        ))}
      </text>
    );
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`${viewBoxX} 0 ${viewBoxWidth} ${diagramHeight}`}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <defs>
        <marker id="arrow-sync" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#555" />
        </marker>
        <marker id="arrow-reply-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#555" strokeWidth="1.5" />
        </marker>
      </defs>

      {activationBoxes.map((box, i) => {
        if (box.participantIdx < 0) return null;
        const lx = participantX[box.participantIdx];
        const stackOffset = box.stack * 3;
        return (
          <rect
            key={`act-${i}`}
            x={lx - 4 + stackOffset}
            y={box.startY}
            width={8}
            height={box.endY - box.startY}
            rx={2}
            fill="#e3f2fd"
            stroke="#90caf9"
            strokeWidth={1}
          />
        );
      })}

      {title && (
        <text
          x={(minX + diagramWidth) / 2}
          y={PADDING_TOP + 20}
          textAnchor="middle"
          fill="#1a1a2e"
          fontSize={16}
          fontWeight={700}
          style={{ cursor: 'pointer' }}
          onClick={() => onSelect('message', title)}
        >
          {title}
        </text>
      )}

      {participants.map((p, i) => {
        const x = participantBoxX[i];
        const displayName = p.alias || p.name;
        return (
          <g key={p.name} onClick={() => onSelect('participant', p.name)} style={{ cursor: 'pointer' }}>
            <rect x={x} y={PADDING_TOP + vOffset} width={PARTICIPANT_WIDTH} height={PARTICIPANT_HEIGHT} rx={6} fill="#4a90d9" stroke="#357abd" strokeWidth={1} />
            <text x={x + PARTICIPANT_WIDTH / 2} y={PADDING_TOP + vOffset + PARTICIPANT_HEIGHT / 2 + 5} textAnchor="middle" fill="white" fontSize={14} fontWeight={600}>
              {displayName}
            </text>
            <line x1={participantX[i]} y1={PADDING_TOP + vOffset + PARTICIPANT_HEIGHT} x2={participantX[i]} y2={diagramHeight - 20} stroke="#bbb" strokeWidth={1} strokeDasharray="4 4" />
          </g>
        );
      })}

      {messages.map((msg, i) => {
        const { midY, boxH } = msgPositions[i];
        const fromX = participantX[getParticipantIdx(msg.from)];
        const toX = participantX[getParticipantIdx(msg.to)];
        const isSelf = msg.from === msg.to;
        const labelWidth = getTextWidth(msg.label);
        const labelH = getLabelHeight(msg.label);
        const boxY = midY - boxH / 2;

        if (isSelf) {
          const selfX = fromX + SELF_MESSAGE_WIDTH;
          const boxX = fromX + 5;
          return (
            <g key={i} onClick={() => onSelect('message', msg.label, msg.lineIndex)} style={{ cursor: 'pointer' }}>
              <rect x={fromX - 1} y={boxY} width={labelWidth + SELF_MESSAGE_WIDTH + 12} height={boxH} rx={4} fill="transparent" />
              <polyline
                points={`${fromX},${midY} ${selfX},${midY} ${selfX},${midY + 25} ${fromX},${midY + 25}`}
                fill="none" stroke="#555" strokeWidth={1.5}
                markerEnd={msg.type === 'reply' ? 'url(#arrow-reply-head)' : 'url(#arrow-sync)'}
              />
              <rect x={boxX} y={boxY + (boxH - labelH) / 2} width={labelWidth} height={labelH} rx={4} fill="#fff" stroke="#ddd" strokeWidth={0.5} />
              {renderLabel(msg.label, boxX + labelWidth / 2, boxY)}
            </g>
          );
        }

        const midXL = (fromX + toX) / 2;

        return (
          <g key={i} onClick={() => onSelect('message', msg.label, msg.lineIndex)} style={{ cursor: 'pointer' }}>
            <rect x={Math.min(fromX, toX) - 1} y={boxY} width={Math.abs(toX - fromX) + 2} height={boxH} rx={4} fill="transparent" />
            <line x1={fromX} y1={midY} x2={toX} y2={midY} stroke="#555" strokeWidth={1.5} strokeDasharray={msg.type === 'reply' ? '5 3' : 'none'} markerEnd={msg.type === 'reply' ? 'url(#arrow-reply-head)' : 'url(#arrow-sync)'} />
            <rect x={midXL - labelWidth / 2 - 5} y={boxY + (boxH - labelH) / 2} width={labelWidth + 10} height={labelH} rx={4} fill="#fff" stroke="#ddd" strokeWidth={0.5} />
            {renderLabel(msg.label, midXL, boxY)}
          </g>
        );
      })}

      {notes.map((note, i) => {
        const { y: noteY } = notePositions[i];
        const pIdx = getParticipantIdx(note.participant);
         const pCenterX = pIdx >= 0 ? participantX[pIdx] : diagramWidth / 2;

         let noteX: number;
        if (note.position === 'left') {
          noteX = pCenterX - NOTE_WIDTH - NOTE_PAD_Y;
        } else if (note.position === 'right') {
          noteX = pCenterX + NOTE_PAD_Y;
        } else {
          noteX = pCenterX - NOTE_WIDTH / 2;
        }

        return (
          <g key={`note-${i}`} onClick={() => onSelect('message', note.text)} style={{ cursor: 'pointer' }}>
            <rect x={noteX} y={noteY} width={NOTE_WIDTH} height={NOTE_HEIGHT} rx={4} fill="#fff9c4" stroke="#f0c040" strokeWidth={1} />
            <text x={noteX + NOTE_WIDTH / 2} y={noteY + NOTE_HEIGHT / 2 + 4} textAnchor="middle" fill="#666" fontSize={11}>
              {note.text}
            </text>
          </g>
        );
      })}
      {dividers.map((divider, i) => {
        const { y: divY } = dividerPositions[i];
        return (
          <g key={`divider-${i}`} onClick={() => onSelect('divider', divider.label)} style={{ cursor: 'pointer' }}>
            <line x1={minX} y1={divY} x2={diagramWidth} y2={divY} stroke="#bbb" strokeWidth={1} strokeDasharray="6 4" />
            <rect x={(minX + diagramWidth) / 2 - 40} y={divY - 10} width={80} height={20} rx={4} fill="#f5f5f5" />
            <text x={(minX + diagramWidth) / 2} y={divY + 4} textAnchor="middle" fill="#888" fontSize={12}>
              {divider.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
