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

export interface Divider {
  label: string;
  lineIndex: number;
}

export interface Activation {
  participant: string;
  lineIndex: number;
  type: 'activate' | 'deactivate';
}

export interface DiagramData {
  title: string | null;
  participants: Participant[];
  messages: Message[];
  notes: Note[];
  dividers: Divider[];
  activations: Activation[];
}

export interface SelectionMatch {
  startLine: number;
  startChar: number;
  endChar: number;
}

export type SelectType = 'participant' | 'message' | 'divider';
