import type { DiagramData } from './parser';

interface SequenceDiagramProps {
  data: DiagramData;
  onSelect: (type: 'participant' | 'message' | 'note', text: string) => void;
}

const PARTICIPANT_WIDTH = 140;
const PARTICIPANT_HEIGHT = 40;
const PARTICIPANT_GAP = 60;
const MESSAGE_GAP = 50;
const NOTE_HEIGHT = 36;
const NOTE_WIDTH = 120;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 60;
const SELF_MESSAGE_WIDTH = 40;

function getTextWidth(text: string): number {
  return text.length * 7.5 + 20;
}

export function SequenceDiagram({ data, onSelect }: SequenceDiagramProps) {
  const { participants, messages, notes } = data;

  if (participants.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Enter sequence diagram syntax to see preview
      </div>
    );
  }

  const diagramWidth = participants.length * PARTICIPANT_WIDTH + (participants.length - 1) * PARTICIPANT_GAP + 80;
  const contentHeight = messages.length * MESSAGE_GAP + notes.length * (NOTE_HEIGHT + 10);
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
        <marker id="arrow-async" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
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
            <rect
              x={x}
              y={PADDING_TOP}
              width={PARTICIPANT_WIDTH}
              height={PARTICIPANT_HEIGHT}
              rx={6}
              fill="#4a90d9"
              stroke="#357abd"
              strokeWidth={1}
            />
            <text
              x={x + PARTICIPANT_WIDTH / 2}
              y={PADDING_TOP + PARTICIPANT_HEIGHT / 2 + 5}
              textAnchor="middle"
              fill="white"
              fontSize={14}
              fontWeight={600}
            >
              {displayName}
            </text>
            <line
              x1={x + PARTICIPANT_WIDTH / 2}
              y1={PADDING_TOP + PARTICIPANT_HEIGHT}
              x2={x + PARTICIPANT_WIDTH / 2}
              y2={diagramHeight - 20}
              stroke="#bbb"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </g>
        );
      })}

      {messages.map((msg, i) => {
        const y = lineY + 30 + i * MESSAGE_GAP;
        const fromX = getParticipantX(msg.from);
        const toX = getParticipantX(msg.to);
        const isSelf = msg.from === msg.to;

        if (isSelf) {
          const selfX = fromX + SELF_MESSAGE_WIDTH;
          const labelWidth = getTextWidth(msg.label);
          return (
            <g key={i} onClick={() => onSelect('message', msg.label)} style={{ cursor: 'pointer' }}>
              <rect
                x={fromX - 1}
                y={y - 14}
                width={labelWidth + SELF_MESSAGE_WIDTH + 12}
                height={42}
                rx={4}
                fill="transparent"
              />
              <polyline
                points={`${fromX},${y} ${selfX},${y} ${selfX},${y + 25} ${fromX},${y + 25}`}
                fill="none"
                stroke="#555"
                strokeWidth={1.5}
                markerEnd={msg.type === 'reply' ? 'url(#arrow-reply-head)' : 'url(#arrow-sync)'}
              />
              <rect
                x={fromX + 5}
                y={y - 10}
                width={labelWidth}
                height={18}
                rx={4}
                fill="#fff"
                stroke="#ddd"
                strokeWidth={0.5}
              />
              <text
                x={fromX + 5 + labelWidth / 2}
                y={y + 3}
                textAnchor="middle"
                fill="#333"
                fontSize={12}
              >
                {msg.label}
              </text>
            </g>
          );
        }

        const labelWidth = getTextWidth(msg.label);
        const midX = (fromX + toX) / 2;
        const minX = Math.min(fromX, toX);
        const maxX = Math.max(fromX, toX);

        return (
          <g key={i} onClick={() => onSelect('message', msg.label)} style={{ cursor: 'pointer' }}>
            <rect
              x={minX - 1}
              y={y - 14}
              width={maxX - minX + 2}
              height={28}
              rx={4}
              fill="transparent"
            />
            <line
              x1={fromX}
              y1={y}
              x2={toX}
              y2={y}
              stroke="#555"
              strokeWidth={1.5}
              strokeDasharray={msg.type === 'reply' ? '5 3' : 'none'}
              markerEnd={msg.type === 'reply' ? 'url(#arrow-reply-head)' : 'url(#arrow-sync)'}
            />
            <rect
              x={midX - labelWidth / 2 - 5}
              y={y - 10}
              width={labelWidth + 10}
              height={18}
              rx={4}
              fill="#fff"
              stroke="#ddd"
              strokeWidth={0.5}
            />
            <text
              x={midX}
              y={y + 3}
              textAnchor="middle"
              fill="#333"
              fontSize={12}
            >
              {msg.label}
            </text>
          </g>
        );
      })}

      {notes.map((note, i) => {
        const participantX = getParticipantBoxX(note.participant);
        const msgY = lineY + 30 + (messages.length > 0 ? (i * Math.max(1, Math.floor(messages.length / Math.max(notes.length, 1))) * MESSAGE_GAP) : i * (NOTE_HEIGHT + 10));

        let noteX: number;
        if (note.position === 'left') {
          noteX = participantX - NOTE_WIDTH - 10;
        } else if (note.position === 'right') {
          noteX = participantX + PARTICIPANT_WIDTH + 10;
        } else {
          noteX = participantX + (PARTICIPANT_WIDTH - NOTE_WIDTH) / 2;
        }

        return (
          <g key={`note-${i}`} onClick={() => onSelect('note', note.text)} style={{ cursor: 'pointer' }}>
            <rect
              x={noteX - 4}
              y={msgY - 4}
              width={NOTE_WIDTH + 8}
              height={NOTE_HEIGHT + 8}
              rx={4}
              fill="transparent"
            />
            <rect
              x={noteX}
              y={msgY}
              width={NOTE_WIDTH}
              height={NOTE_HEIGHT}
              rx={4}
              fill="#fff9c4"
              stroke="#f0c040"
              strokeWidth={1}
            />
            <text
              x={noteX + NOTE_WIDTH / 2}
              y={msgY + NOTE_HEIGHT / 2 + 4}
              textAnchor="middle"
              fill="#666"
              fontSize={11}
            >
              {note.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
