import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';

// DiceBear "Lorelei" stili: kod MIT, tasarım CC0 1.0 (bkz. README, Varsayımlar).
const cache = new Map<string, string>();

export function avatarUri(seed: string): string {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(lorelei, { seed, radius: 50, backgroundType: ['solid'], backgroundColor: ['f3e5d0', 'e7efe3', 'e9e4f2', 'f6e0dc', 'dfeaf0'] }).toDataUri();
    cache.set(seed, uri);
  }
  return uri;
}

/** Sunucu kuralıyla uyumlu ([A-Za-z0-9_-]{1,32}) rastgele tohum. Yalnızca görsel çeşitlilik için. */
export function randomSeed(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}
