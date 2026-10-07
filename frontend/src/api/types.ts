// Sunucu şemaları: docs/events.md ile aynı tutulmalı.

export type DeckId = 'modified-fibonacci' | 'fibonacci' | 'tshirt';

export interface ParticipantView {
  id: string;
  nickname: string;
  avatar: string;
  moderator: boolean;
  observer: boolean;
  online: boolean;
}

export interface RoomState {
  code: string;
  name?: string;
  deck: DeckId;
  passwordProtected: boolean;
  maxParticipants: number;
  participants: ParticipantView[];
}

export interface RoomSnapshot {
  youId: string;
  room: RoomState;
}

export interface RoomInfo {
  code: string;
  name?: string;
  passwordProtected: boolean;
}

export interface CreateRoomResult {
  code: string;
  claimToken: string;
}

export interface JoinResult {
  code: string;
  participantId: string;
  token: string;
  nickname: string;
  rejoined: boolean;
}

export type ServerEvent =
  | { type: 'room.state'; v: number; data: RoomState }
  | { type: 'room.state_snapshot'; v: number; data: RoomSnapshot }
  | { type: 'room.participant_joined'; v: number; data: { participantId: string } }
  | { type: 'room.participant_left'; v: number; data: { participantId: string } }
  | { type: 'room.closed'; v: number; data: { reason: 'closed_by_moderator' | 'expired' } }
  | { type: 'error'; v: number; data: { code: string } };
