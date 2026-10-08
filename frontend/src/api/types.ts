// Sunucu şemaları: docs/events.md ile aynı tutulmalı.

export type DeckId = 'modified-fibonacci' | 'fibonacci' | 'tshirt' | 'custom';
export const PRESET_DECKS: DeckId[] = ['modified-fibonacci', 'fibonacci', 'tshirt'];

export interface ParticipantView {
  id: string;
  nickname: string;
  avatar: string;
  moderator: boolean;
  observer: boolean;
  online: boolean;
}

export type Consensus = 'NONE' | 'UNANIMOUS' | 'CLOSE' | 'SPREAD';

export interface VoteStats {
  voteCount: number;
  countedCount: number;
  average?: number;
  median?: number;
  modes: string[];
  distribution: { card: string; count: number; participantIds: string[] }[];
  lowestIds: string[];
  highestIds: string[];
  consensus: Consensus;
  suggested?: string;
}

export interface VoteView {
  participantId: string;
  nickname: string;
  avatar: string;
  card: string;
  excluded: boolean;
  /** Oy verdikten sonra odadan ayrıldı. */
  left: boolean;
}

export type RoundState = 'VOTING' | 'REVEALED' | 'FINALIZED';

/** VOTING durumunda votes ve stats hiç gelmez: sunucu açılmamış oyları göndermez. */
export interface RoundView {
  id: number;
  number: number;
  ticketId?: string;
  /** Ticket'sız turun konusu ("Ne oylanıyor?"). */
  topic?: string;
  state: RoundState;
  votedIds: string[];
  votes?: VoteView[];
  stats?: VoteStats;
  finalEstimate?: string;
}

export interface RoundRecord {
  number: number;
  votes: VoteView[];
  stats: VoteStats;
  finalEstimate?: string;
}

/** Oturum geçmişindeki ticket'sız (serbest) tur. */
export interface SessionRound {
  topic?: string;
  number: number;
  votes: VoteView[];
  stats: VoteStats;
  finalEstimate?: string;
}

export interface TicketView {
  id: string;
  title: string;
  link?: string;
  note?: string;
  status: 'PENDING' | 'ESTIMATED';
  finalEstimate?: string;
  history: RoundRecord[];
  /** "Kim alacak?" sonucunda işi alan kişi (M3). */
  assignee?: PersonView;
}

/** Bir kişinin o anki adı ve avatarı (geçmişte saklanır; kişi sonradan çıksa da görünür). */
export interface PersonView {
  participantId: string;
  nickname: string;
  avatar: string;
}

/** horse/wheel: oyunla; volunteer: tek gönüllü; direct: tek aday kaldı. */
export type AssignmentGame = 'horse' | 'wheel' | 'volunteer' | 'direct';
export const PLAYABLE_GAMES = ['horse', 'wheel'] as const;
export type PlayableGame = (typeof PLAYABLE_GAMES)[number];

export interface AssignmentRecord {
  id: string;
  ticketId?: string;
  title?: string;
  game: AssignmentGame;
  winner: PersonView;
  ranking: PersonView[];
  candidates: PersonView[];
  weighted: boolean;
  /** Sunucu zaman damgası (ISO-8601). */
  at: string;
  undone: boolean;
}

export interface HorseAnimation {
  /** Katılımcı → eşit aralıklı ara noktalardaki ilerleme (0..1); son nokta bitiş konumu. */
  tracks: Record<string, number[]>;
}

export interface WheelAnimation {
  slices: string[];
  winnerSlice: number;
  turns: number;
  /** Kazananın dilimi içinde durma noktası (0..1). */
  offset: number;
}

/** startsInMs: gönderim anından başlamaya kalan süre (negatifse başlayalı geçen süre). */
export interface GameView {
  type: PlayableGame;
  startsInMs: number;
  durationMs: number;
  animation: HorseAnimation | WheelAnimation;
}

export type AssignmentPhase = 'VOLUNTEERING' | 'CANDIDATES' | 'RESULT';

export interface AssignmentView {
  id: string;
  phase: AssignmentPhase;
  ticketId?: string;
  title?: string;
  volunteerSeconds: number;
  volunteerRemainingMs?: number;
  volunteers: string[];
  /** Gönüllü turunda "pas" diyenler. */
  passes?: string[];
  candidates: string[];
  result?: AssignmentRecord;
  game?: GameView;
}

export interface TimerView {
  durationSeconds: number;
  remainingMs: number;
}

export interface RoomState {
  code: string;
  name?: string;
  deck: DeckId;
  deckCards: string[];
  customDeck?: string[];
  passwordProtected: boolean;
  maxParticipants: number;
  participants: ParticipantView[];
  /** Ticket listesi isteğe bağlı; kapalıyken tickets boş gelir. */
  ticketsEnabled: boolean;
  tickets: TicketView[];
  currentTicketId?: string;
  round: RoundView;
  timer?: TimerView;
  sessionHistory: SessionRound[];
  /** Dönüşümlü adalet modu (M3). */
  fairRotation: boolean;
  assignment?: AssignmentView;
  assignmentHistory: AssignmentRecord[];
  /** Otomatik aç: bağlı herkes oy verince kartlar kendiliğinden açılır. */
  autoReveal: boolean;
  /** "Kim alacak?" gönüllü süresi oda ayarı (sn; 0 = süresiz). */
  volunteerSeconds: number;
}

/** Kişinin kendi oyu; yalnızca ona gelir. card yoksa oy geri çekildi. */
export interface YourVote {
  roundId: number;
  card?: string;
}

export interface RoomSnapshot {
  youId: string;
  room: RoomState;
  yourVote?: YourVote;
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
  /** Aynı isimli çevrimdışı koltuk devralındı. */
  takenOver: boolean;
}

export type ServerEvent =
  | { type: 'room.state'; v: number; data: RoomState }
  | { type: 'room.state_snapshot'; v: number; data: RoomSnapshot }
  | { type: 'room.participant_joined'; v: number; data: { participantId: string } }
  | { type: 'room.participant_left'; v: number; data: { participantId: string } }
  | { type: 'poker.your_vote'; v: number; data: YourVote }
  | { type: 'poker.deck_changed'; v: number; data: { deck: DeckId } }
  | { type: 'poker.nudged'; v: number; data: { participantId: string } }
  | { type: 'table.emoji'; v: number; data: { participantId: string; emoji: string } }
  | { type: 'room.participant_kicked'; v: number; data: { participantId: string; nickname: string } }
  | { type: 'room.kicked'; v: number; data: Record<string, never> }
  | { type: 'room.closed'; v: number; data: { reason: 'closed_by_moderator' | 'expired' } }
  | { type: 'error'; v: number; data: { code: string } };
