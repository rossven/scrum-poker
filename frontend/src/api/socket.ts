import { Client, ReconnectionTimeMode, type IMessage } from '@stomp/stompjs';
import type { ServerEvent } from './types';

export type SocketStatus = 'connecting' | 'online' | 'reconnecting';

export interface RoomSocketHandlers {
  onEvent: (event: ServerEvent) => void;
  onStatus: (status: SocketStatus) => void;
  /** Sunucu bağlantıyı reddetti (ör. ROOM_NOT_FOUND, INVALID_TOKEN); yeniden deneme durur. */
  onFatal: (code: string) => void;
}

const FATAL_CODES = new Set(['ROOM_NOT_FOUND', 'INVALID_TOKEN']);

/**
 * Bir odaya STOMP bağlantısı. Bağlantı koparsa üstel bekleme ile tekrar dener;
 * her bağlanışta room.sync göndererek tam durumu (state_snapshot) yeniden alır.
 */
export class RoomSocket {
  private client: Client;

  constructor(code: string, token: string, handlers: RoomSocketHandlers) {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let everConnected = false;

    this.client = new Client({
      brokerURL: `${scheme}://${window.location.host}/ws`,
      connectHeaders: { room: code, token },
      reconnectDelay: 1000,
      maxReconnectDelay: 15000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    const handle = (msg: IMessage) => handlers.onEvent(JSON.parse(msg.body) as ServerEvent);

    this.client.onConnect = () => {
      everConnected = true;
      this.client.subscribe(`/topic/room/${code}`, handle);
      this.client.subscribe('/user/queue/room', handle);
      this.client.subscribe('/user/queue/errors', handle);
      this.send('room.sync');
      handlers.onStatus('online');
    };
    this.client.onStompError = (frame) => {
      const code = frame.headers['message'] ?? 'UNKNOWN';
      if (FATAL_CODES.has(code)) {
        void this.client.deactivate();
        handlers.onFatal(code);
      }
    };
    this.client.onWebSocketClose = () => {
      if (this.client.active) {
        handlers.onStatus(everConnected ? 'reconnecting' : 'connecting');
      }
    };
  }

  connect() {
    this.client.activate();
  }

  send(event: string, payload: object = {}) {
    if (this.client.connected) {
      this.client.publish({ destination: `/app/${event}`, body: JSON.stringify(payload) });
    }
  }

  disconnect() {
    void this.client.deactivate();
  }
}
