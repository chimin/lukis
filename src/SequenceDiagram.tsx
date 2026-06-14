import type { DiagramData } from './parser';

interface SequenceDiagramProps {
  data: DiagramData;
  onSelect: (type: 'participant' | 'message', text: string) => void;
}

const PARTICIPANT_WIDTH = 140;
const PARTICIPANT_HEIGHT = 40;
const PARTICIPANT_GAP = 60;
const LINE_HEIGHT = 14;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 60;
const SELF_MESSAGE_WIDTH = 40;
const MIN_LABEL_WIDTH = 100;
const LABEL_PAD_X = 10;
const LABEL_PAD_Y = 6;
const MIN_BOX_HEIGHT = 24;

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
  const { participants, messages } = data;

  if (participants.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Enter sequence diagram syntax to see preview
      </div>
    );
  }

  const diagramWidth = participants.length * PARTICIPANT_WIDTH + (participants.length - 1) * PARTICIPANT_GAP + 80;
  const contentHeight = messages.reduce((sum, m) => sum + getBoxHeight(m.label), 0);
  const diagramHeight = PADDING_TOP + PARTICIPANT_HEIGHT + Math.max(contentHeight, 100) + PADDING_BOTTOM;

  const getParticipantX = (name: string): number => {
    const idx = participants.findIndex(p => p.name === name);
    if (idx === -1) return 40;
    return 40 + idx * (PARTICIPANT_WIDTH + PARTICIPANT_GAP) + PARTICIPANT_WIDTH / 2;
  };

  const getParticipantBoxX = (name: string): number => {
    const idx = participants.findIndex(p => p.name === name);
    if (idx === -1) return 40;
    return 40 + idx * (PARTICIPANT_WIDTH + PARTICIPANT_GAP);
  };

  const lineY = PADDING_TOP + PARTICIPANT_HEIGHT;

  const msgPositions: { midY: number; boxH: number }[] = [];
  let cy = lineY + 30;
  for (const msg of messages) {
    const boxH = getBoxHeight(msg.label);
    msgPositions.push({ midY: cy + boxH / 2, boxH });
    cy += boxH;
  }

  const renderLabel = (label: string, cx: number, topY: number) => {
    const lines = getLabelLines(label);
    const totalH = lines.length * LINE_HEIGHT;
    const startY = topY + (getBoxHeight(label) - totalH) / 2 + LINE_HEIGHT - 2;

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
          <tspan
            key={idx}
            x={cx}
            y={startY + idx * LINE_HEIGHT}
          >
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

      {participants.map((p) => {
        const x = getParticipantBoxX(p.name);
        const displayName = p.alias || p.name;
        return (
          <g key={p.name} onClick={() => onSelect('participant', p.name)} style={{ cursor: 'pointer' }}>
            <rect x={x} y={PADDING_TOP} width={PARTICIPANT_WIDTH} height={PARTICIPANT_HEIGHT} rx={6} fill="#4a90d9" stroke="#357abd" strokeWidth={1} />
            <text x={x + PARTICIPANT_WIDTH / 2} y={PADDING_TOP + PARTICIPANT_HEIGHT / 2 + 5} textAnchor="middle" fill="white" fontSize={14} fontWeight={600}>
              {displayName}
            </text>
            <line x1={x + PARTICIPANT_WIDTH / 2} y1={PADDING_TOP + PARTICIPANT_HEIGHT} x2={x + PARTICIPANT_WIDTH / 2} y2={diagramHeight - 20} stroke="#bbb" strokeWidth={1} strokeDasharray="4 4" />
          </g>
        );
      })}

      {messages.map((msg, i) => {
        const { midY, boxH } = msgPositions[i];
        const fromX = getParticipantX(msg.from);
        const toX = getParticipantX(msg.to);
        const isSelf = msg.from === msg.to;
        const labelWidth = getTextWidth(msg.label);
        const labelH = getLabelHeight(msg.label);

        if (isSelf) {
          const selfX = fromX + SELF_MESSAGE_WIDTH;
          const boxX = fromX + 5;
          const boxY = midY - boxH / 2;
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
        const minX = Math.min(fromX, toX);
        const maxX = Math.max(fromX, toX);
        const boxY = midY - boxH / 2;

        return (
          <g key={i} onClick={() => onSelect('message', msg.label)} style={{ cursor: 'pointer' }}>
            <rect x={minX - 1} y={boxY} width={maxX - minX + 2} height={boxH} rx={4} fill="transparent" />
            <line x1={fromX} y1={midY} x2={toX} y2={midY} stroke="#555" strokeWidth={1.5} strokeDasharray={msg.type === 'reply' ? '5 3' : 'none'} markerEnd={msg.type === 'reply' ? 'url(#arrow-reply-head)' : 'url(#arrow-sync)'} />
            <rect x={midXL - labelWidth / 2 - 5} y={boxY + (boxH - labelH) / 2} width={labelWidth + 10} height={labelH} rx={4} fill="#fff" stroke="#ddd" strokeWidth={0.5} />
            {renderLabel(msg.label, midXL, boxY)}
          </g>
        );
      })}
    </svg>
  );
}
