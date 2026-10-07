import { create } from 'zustand';
import { RoomSocket, type SocketStatus } from '../api/socket';
import type { RoomState, ServerEvent } from '../api/types';
import { sessions, type StoredSession } from '../lib/session';

export type GoneReason = 'not_found' | 'closed_by_moderator' | 'expired';

export interface Toast {
  id: number;
  key: string; // çeviri anahtarı
  params?: Record<string, string>;
}

interface RoomStore {
  code: string | null;
  youId: string | null;
  room: RoomState | null;
  status: SocketStatus;
  gone: GoneReason | null;
  /** Token geçersiz: kullanıcı katılma formuna döner. */
  needsJoin: boolean;
  toasts: Toast[];

  connect: (code: string, session: StoredSession) => void;
  disconnect: () => void;
  promote: (participantId: string) => void;
  setPassword: (password: string) => void;
  leave: () => void;
  closeRoom: () => void;
  toast: (key: string, params?: Record<string, string>) => void;
  dismissToast: (id: number) => void;
}

let socket: RoomSocket | null = null;
let toastSeq = 0;

export const useRoomStore = create<RoomStore>((set, get) => {
  const handleEvent = (event: ServerEvent) => {
    switch (event.type) {
      case 'room.state':
        set({ room: event.data });
        break;
      case 'room.state_snapshot':
        set({ room: event.data.room, youId: event.data.youId });
        break;
      case 'room.participant_joined':
        if (event.data.participantId !== get().youId) get().toast('room.joinedToast');
        break;
      case 'room.participant_left':
        if (event.data.participantId !== get().youId) get().toast('room.leftToast');
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
    status: 'connecting',
    gone: null,
    needsJoin: false,
    toasts: [],

    connect(code, session) {
      socket?.disconnect();
      set({ code, youId: session.participantId, room: null, status: 'connecting', gone: null, needsJoin: false });
      socket = new RoomSocket(code, session.token, {
        onEvent: handleEvent,
        onStatus: (status) => set({ status }),
        onFatal: (error) => {
          socket = null;
          if (error === 'INVALID_TOKEN') {
            sessions.clear(code);
            set({ needsJoin: true });
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

    leave() {
      const { code } = get();
      socket?.send('room.leave');
      // Mesaj gitsin diye kısa bir süre sonra bağlantıyı kapat.
      const s = socket;
      socket = null;
      setTimeout(() => s?.disconnect(), 200);
      if (code) sessions.clear(code);
      set({ code: null, room: null, youId: null });
    },

    toast(key, params) {
      const id = ++toastSeq;
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, key, params }] }));
      setTimeout(() => get().dismissToast(id), 3500);
    },

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});
