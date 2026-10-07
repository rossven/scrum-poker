// Tarayıcıda saklanan oturum bilgisi: aynı kişi yenileyince aynı koltuğa döner.

export interface StoredSession {
  participantId: string;
  token: string;
}

const sessionKey = (code: string) => `sm.session.${code}`;
const claimKey = (code: string) => `sm.claim.${code}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Gizli pencere vb.: oturum yalnızca bu sekmede yaşar.
  }
}

export const sessions = {
  get: (code: string) => read<StoredSession>(sessionKey(code)),
  set: (code: string, s: StoredSession) => write(sessionKey(code), s),
  clear: (code: string) => write(sessionKey(code), null),
  /** Odayı açan kişinin tek kullanımlık moderatör anahtarı. */
  getClaim: (code: string) => read<string>(claimKey(code)),
  setClaim: (code: string, claim: string) => write(claimKey(code), claim),
  clearClaim: (code: string) => write(claimKey(code), null),
};

export const preferences = {
  get: <T,>(key: string, fallback: T): T => read<T>(`sm.pref.${key}`) ?? fallback,
  set: (key: string, value: unknown) => write(`sm.pref.${key}`, value),
};
