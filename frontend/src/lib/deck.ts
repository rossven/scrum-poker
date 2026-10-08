// Özel deste kuralları (sunucudaki Deck.custom ile aynı): en fazla 20 kart,
// kart başına en fazla 8 karakter, tekrar yok (büyük/küçük harf duyarsız).

export const CUSTOM_MAX_CARDS = 20;
export const CARD_MAX_CHARS = 8;

export type DeckError = 'empty' | 'tooMany' | 'tooLong' | 'duplicate';

export function parseCustomDeck(text: string): { cards: string[]; error?: DeckError; offending?: string } {
  const cards = text.split(',').map((c) => c.trim()).filter(Boolean);
  if (cards.length === 0) return { cards, error: 'empty' };
  if (cards.length > CUSTOM_MAX_CARDS) return { cards, error: 'tooMany' };
  const long = cards.find((c) => [...c].length > CARD_MAX_CHARS);
  if (long) return { cards, error: 'tooLong', offending: long };
  const seen = new Set<string>();
  for (const c of cards) {
    const key = c.toLowerCase();
    if (seen.has(key)) return { cards, error: 'duplicate', offending: c };
    seen.add(key);
  }
  return { cards };
}

/** "?" ve "☕" sayılır ama hesaba katılmaz; final tahmin olamaz. */
export const isSpecialCard = (card: string) => card === '?' || card === '☕';

/** Ortalama gibi sayıları Türkçe biçimde gösterir: 5.25 → "5,25". */
export function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '–';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

/**
 * Kartın renk tonu: özel olmayan kartlar destedeki sırasına göre 0 (en düşük, mavi) ile 1 (en yüksek, kırmızı)
 * arasında; "?", "☕" ve destede olmayan değerler null (nötr renk).
 */
export function cardTone(deck: string[], card: string): number | null {
  const scored = deck.filter((c) => !isSpecialCard(c));
  const i = scored.indexOf(card);
  if (i < 0) return null;
  return scored.length > 1 ? i / (scored.length - 1) : 0;
}

/**
 * Ton basamakları: mavi → camgöbeği → kehribar → turuncu → kırmızı (önerilen renk yolu).
 * 11 basamak, "modifiye Fibonacci"nin sayısal kartlarıyla birebir; başka desteler arada karışır.
 */
const TONE_STOPS = ['#2f62d8', '#2f74e0', '#2a87e0', '#1c98d4', '#149fb8', '#d49a12', '#e57a12', '#e0581f', '#d63e2e', '#c22e3a', '#a3213a'];

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Tonu (0..1) basamaklı ölçekten bir renge çevirir; nötr kartlar için undefined. */
export function toneColor(tone: number | null | undefined): string | undefined {
  if (tone === null || tone === undefined) return undefined;
  const x = Math.min(1, Math.max(0, tone)) * (TONE_STOPS.length - 1);
  const i = Math.min(TONE_STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(TONE_STOPS[i]);
  const b = hexToRgb(TONE_STOPS[i + 1]);
  return rgbToHex(a.map((v, k) => v + (b[k] - v) * f));
}

/** "ABC-12 Giriş sayfası" → anahtar ve başlık; anahtar yoksa yalnızca başlık. */
export function splitTicketTitle(title: string): { key?: string; text: string } {
  const m = /^([A-Za-z][A-Za-z0-9]*-\d+)\s+(.+)$/.exec(title.trim());
  return m ? { key: m[1].toUpperCase(), text: m[2] } : { text: title };
}
