import type { CreateRoomResult, DeckId, JoinResult, RoomInfo } from './types';

/** Sunucunun döndürdüğü hata kodu (çeviri anahtarı: errors.KOD). */
export class ApiError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('NETWORK');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? 'UNKNOWN');
  }
  return (await res.json()) as T;
}

export const api = {
  createRoom(body: { name?: string; deck: DeckId; password?: string }) {
    return request<CreateRoomResult>('/api/rooms', { method: 'POST', body: JSON.stringify(body) });
  },
  roomInfo(code: string) {
    return request<RoomInfo>(`/api/rooms/${encodeURIComponent(code)}`);
  },
  join(
    code: string,
    body: { nickname: string; avatar: string; observer: boolean; password?: string; claimToken?: string },
  ) {
    return request<JoinResult>(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
