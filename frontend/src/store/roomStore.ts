import { create } from 'zustand';
import { RoomSocket, type SocketStatus } from '../api/socket';
import type { DeckId, PlayableGame, RoomState, ServerEvent, YourVote } from '../api/types';
import { sessions, type StoredSession } from '../lib/session';
import { play } from '../lib/sound';

export type GoneReason = 'not_found' | 'closed_by_moderator' | 'expired' | 'kicked';

export interface Toast {
  id: number;
  key: string; // çeviri anahtarı
  params?: Record<string, string>;
}

/** Masaya fırlatılmış, ekranda uçan bir emoji (kısa süre sonra silinir). */
export interface FlyingEmoji {
  id: number;
  participantId: string;
  emoji: string;
}

interface RoomStore {
  code: string | null;
  youId: string | null;
  room: RoomState | null;
  /** Kendi oyum; yalnızca bana gelir. roundId güncel turla eşleşmiyorsa geçersizdir. */
  yourVote: YourVote | null;
  status: SocketStatus;
  gone: GoneReason | null;
  /** Token geçersiz: kullanıcı katılma formuna döner. */
  needsJoin: boolean;
  toasts: Toast[];
  flyingEmojis: FlyingEmoji[];
  /** Dürtülen koltuklar: katılımcı → sayaç (her dürtmede artar, koltuk titrer). */
  nudges: Record<string, number>;

  connect: (code: string, session: StoredSession) => void;
  disconnect: () => void;
  promote: (participantId: string) => void;
  setPassword: (password: string) => void;
  leave: () => void;
  closeRoom: () => void;
  vote: (card: string | null) => void;
  reveal: () => void;
  newRound: () => void;
  finalize: (value: string) => void;
  excludeVote: (participantId: string, excluded: boolean) => void;
  setDeck: (deck: DeckId, cards?: string[]) => void;
  addTickets: (tickets: { title: string; link?: string; note?: string }[]) => void;
  updateTicket: (ticketId: string, ticket: { title: string; link?: string; note?: string }) => void;
  removeTicket: (ticketId: string) => void;
  moveTicket: (ticketId: string, toIndex: number) => void;
  selectTicket: (ticketId: string) => void;
  nextTicket: () => void;
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  setObserver: (participantId: string | null, observer: boolean) => void;
  setTicketsEnabled: (enabled: boolean) => void;
  setTopic: (topic: string) => void;
  nudge: (participantId: string) => void;
  throwEmoji: (emoji: string) => void;
  kick: (participantId: string) => void;
  startAssignment: (seconds: number) => void;
  setVolunteer: (volunteer: boolean) => void;
  closeVolunteering: () => void;
  setCandidate: (participantId: string, candidate: boolean) => void;
  setFairRotation: (enabled: boolean) => void;
  playGame: (game: PlayableGame) => void;
  undoAssignment: () => void;
  closeAssignment: () => void;
  toast: (key: string, params?: Record<string, string>) => void;
  dismissToast: (id: number) => void;
}

let socket: RoomSocket | null = null;
let toastSeq = 0;
let emojiSeq = 0;

/** Krupiye değişti mi? Değiştiyse yeni krupiyenin adı (ilk durumda ve değişmediyse null). */
function newDealer(prev: RoomState | null, next: RoomState): string | null {
  if (!prev) return null;
  const before = new Set(prev.participants.filter((p) => p.moderator).map((p) => p.id));
  const fresh = next.participants.find((p) => p.moderator && !before.has(p.id));
  return fresh ? fresh.id : null;
}

export const useRoomStore = create<RoomStore>((set, get) => {
  const handleEvent = (event: ServerEvent) => {
    switch (event.type) {
      case 'room.state': {
        const dealerId = newDealer(get().room, event.data);
        set({ room: event.data });
        if (dealerId) {
          const name = event.data.participants.find((p) => p.id === dealerId)?.nickname ?? '';
          if (dealerId === get().youId) get().toast('room.dealerNowYou');
          else get().toast('room.dealerNow', { name });
        }
        break;
      }
      case 'room.state_snapshot':
        set({ room: event.data.room, youId: event.data.youId, yourVote: event.data.yourVote ?? null });
        break;
      case 'poker.your_vote':
        set({ yourVote: event.data });
        break;
      case 'poker.deck_changed':
        get().toast('poker.deckChangedToast', { deck: event.data.deck });
        break;
      case 'poker.nudged': {
        const id = event.data.participantId;
        set((s) => ({ nudges: { ...s.nudges, [id]: (s.nudges[id] ?? 0) + 1 } }));
        if (id === get().youId) {
          get().toast('poker.nudgedYou');
          play('nudge');
        }
        break;
      }
      case 'table.emoji': {
        const item = { id: ++emojiSeq, ...event.data };
        set((s) => ({ flyingEmojis: [...s.flyingEmojis.slice(-19), item] }));
        play('pop');
        setTimeout(() => set((s) => ({ flyingEmojis: s.flyingEmojis.filter((e) => e.id !== item.id) })), 2000);
        break;
      }
      case 'room.participant_joined':
        if (event.data.participantId !== get().youId) get().toast('room.joinedToast');
        break;
      case 'room.participant_left':
        if (event.data.participantId !== get().youId) get().toast('room.leftToast');
        break;
      case 'room.participant_kicked':
        if (event.data.participantId !== get().youId) get().toast('room.kickedToast', { name: event.data.nickname });
        break;
      case 'room.kicked':
        socket?.disconnect();
        socket = null;
        if (get().code) sessions.clear(get().code!);
        set({ gone: 'kicked' });
        break;
      case 'room.closed':
        socket?.disconnect();
        socket = null;
        if (get().code) sessions.clear(get().code!);
        set({ gone: event.data.reason });
        break;
      case 'error':
        get().toast(`errors.${event.data.code}`);
        break;
    }
  };

  return {
    code: null,
    youId: null,
    room: null,
    yourVote: null,
    status: 'connecting',
    gone: null,
    needsJoin: false,
    toasts: [],
    flyingEmojis: [],
    nudges: {},

    connect(code, session) {
      socket?.disconnect();
      set({ code, youId: session.participantId, room: null, yourVote: null, status: 'connecting', gone: null,
        needsJoin: false, flyingEmojis: [], nudges: {} });
      socket = new RoomSocket(code, session.token, {
        onEvent: handleEvent,
        onStatus: (status) => set({ status }),
        onFatal: (error) => {
          socket = null;
          if (error === 'INVALID_TOKEN') {
            sessions.clear(code);
            set({ needsJoin: true });
          } else if (error === 'KICKED') {
            sessions.clear(code);
            set({ gone: 'kicked' });
          } else {
            set({ gone: 'not_found' });
          }
        },
      });
      socket.connect();
    },

    disconnect() {
      socket?.disconnect();
      socket = null;
      set({ code: null, room: null, youId: null });
    },

    promote: (participantId) => socket?.send('room.promote', { participantId }),
    setPassword: (password) => socket?.send('room.set_password', { password }),
    closeRoom: () => socket?.send('room.close'),
    vote(card) {
      // İyimser güncelleme: kart anında masaya düşer, sunucu onayı (your_vote) aynısını getirir.
      const round = get().room?.round;
      if (round) set({ yourVote: { roundId: round.id, card: card ?? undefined } });
      if (card) play('chip');
      socket?.send('poker.vote', { card });
    },
    reveal: () => socket?.send('poker.reveal'),
    newRound: () => socket?.send('poker.new_round'),
    finalize: (value) => socket?.send('poker.finalize', { value }),
    excludeVote: (participantId, excluded) => socket?.send('poker.exclude_vote', { participantId, excluded }),
    setDeck: (deck, cards) => socket?.send('poker.set_deck', { deck, cards }),
    addTickets: (tickets) => socket?.send('ticket.add', { tickets }),
    updateTicket: (ticketId, t) => socket?.send('ticket.update', { ticketId, ...t }),
    removeTicket: (ticketId) => socket?.send('ticket.remove', { ticketId }),
    moveTicket: (ticketId, toIndex) => socket?.send('ticket.move', { ticketId, toIndex }),
    selectTicket: (ticketId) => socket?.send('ticket.select', { ticketId }),
    nextTicket: () => socket?.send('ticket.next'),
    startTimer: (seconds) => socket?.send('timer.start', { seconds }),
    stopTimer: () => socket?.send('timer.stop'),
    setObserver: (participantId, observer) => socket?.send('participant.set_observer', { participantId, observer }),
    setTicketsEnabled: (enabled) => socket?.send('room.set_tickets_enabled', { enabled }),
    setTopic: (topic) => socket?.send('poker.set_topic', { topic }),
    nudge: (participantId) => socket?.send('poker.nudge', { participantId }),
    throwEmoji: (emoji) => socket?.send('table.emoji', { emoji }),
    kick: (participantId) => socket?.send('room.kick', { participantId }),
    startAssignment: (seconds) => socket?.send('assign.start', { seconds }),
    setVolunteer: (volunteer) => socket?.send('assign.volunteer', { volunteer }),
    closeVolunteering: () => socket?.send('assign.close_volunteering'),
    setCandidate: (participantId, candidate) => socket?.send('assign.set_candidate', { participantId, candidate }),
    setFairRotation: (enabled) => socket?.send('assign.set_fair_rotation', { enabled }),
    playGame: (game) => socket?.send('assign.play', { game }),
    undoAssignment: () => socket?.send('assign.undo'),
    closeAssignment: () => socket?.send('assign.close'),

    leave() {
      const { code } = get();
      socket?.send('room.leave');
      // Mesaj gitsin diye kısa bir süre sonra bağlantıyı kapat.
      const s = socket;
      socket = null;
      setTimeout(() => s?.disconnect(), 200);
      if (code) sessions.clear(code);
      set({ code: null, room: null, youId: null, yourVote: null });
    },

    toast(key, params) {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, key, params }] }));
      setTimeout(() => get().dismissToast(id), 3500);
    },

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});
