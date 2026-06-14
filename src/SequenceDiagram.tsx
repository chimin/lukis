import type { DiagramData } from './parser';

interface SequenceDiagramProps {
  data: DiagramData;
  onSelect: (type: 'participant' | 'message', text: string) => void;
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

export function SequenceDiagram({ data, onSelect }: SequenceDiagramProps) {
  const { participants, messages, title } = data;

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

  const diagramWidth = participantBoxX[participantBoxX.length - 1] + PARTICIPANT_WIDTH + 40;

  const msgPositions: { midY: number; boxH: number }[] = [];
  let cy = PADDING_TOP + PARTICIPANT_HEIGHT + 30 + titleHeight;
  for (const msg of messages) {
    const boxH = getBoxHeight(msg.label);
    msgPositions.push({ midY: cy + boxH / 2, boxH });
    cy += boxH;
  }
  const diagramHeight = cy + PADDING_BOTTOM;

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
      width="100%"
      height="100%"
      viewBox={`0 0 ${diagramWidth} ${diagramHeight}`}
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

      {title && (
        <text
          x={diagramWidth / 2}
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
            <g key={i} onClick={() => onSelect('message', msg.label)} style={{ cursor: 'pointer' }}>
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
          <g key={i} onClick={() => onSelect('message', msg.label)} style={{ cursor: 'pointer' }}>
            <rect x={Math.min(fromX, toX) - 1} y={boxY} width={Math.abs(toX - fromX) + 2} height={boxH} rx={4} fill="transparent" />
            <line x1={fromX} y1={midY} x2={toX} y2={midY} stroke="#555" strokeWidth={1.5} strokeDasharray={msg.type === 'reply' ? '5 3' : 'none'} markerEnd={msg.type === 'reply' ? 'url(#arrow-reply-head)' : 'url(#arrow-sync)'} />
            <rect x={midXL - labelWidth / 2 - 5} y={boxY + (boxH - labelH) / 2} width={labelWidth + 10} height={labelH} rx={4} fill="#fff" stroke="#ddd" strokeWidth={0.5} />
            {renderLabel(msg.label, midXL, boxY)}
          </g>
        );
      })}
    </svg>
  );
}
