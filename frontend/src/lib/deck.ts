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
