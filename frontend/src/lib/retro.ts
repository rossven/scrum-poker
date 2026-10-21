import type { RetroCardView, RetroColumn, RetroView } from '../api/types';
import type { IconName } from '../components/Icon';

/** Pano sütunları: yazma ve konuşma soldan sağa bu sırayla gider. */
export const RETRO_COLUMNS: { id: RetroColumn; key: 'well' | 'improve' | 'actions'; icon: IconName }[] = [
  { id: 0, key: 'well', icon: 'sun' },
  { id: 1, key: 'improve', icon: 'trend' },
  { id: 2, key: 'actions', icon: 'flag' },
];

export const RETRO_TEXT_MAX = 200;
export const RETRO_DUE_MAX = 30;
/** Yazma süresi seçenekleri (sn); 0 = süresiz. */
export const RETRO_WRITE_CHOICES = [300, 480, 600, 900, 0];

function tokens(text: string): string[] {
  return text
    .toLocaleLowerCase('tr')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3)
    .map((w) => w.slice(0, 5));
}

/**
 * Yazılan metne benzeyen kartlar (aynı sütunda): ortak kök sayısı kısa olanın en az %60'ı ve en az 2,
 * ya da iki metin de tek kelimeyse aynı kök. Türkçe ekleri tolere etmek için kelimeler ilk 5 harfe kısaltılır.
 */
export function similarCards(text: string, cards: RetroCardView[], column: RetroColumn, limit = 2): RetroCardView[] {
  const mine = new Set(tokens(text));
  if (text.trim().length < 8 || mine.size === 0) return [];
  const scored = cards
    .filter((c) => c.column === column)
    .map((c) => {
      const other = new Set(tokens(c.text));
      let shared = 0;
      mine.forEach((w) => other.has(w) && shared++);
      const smaller = Math.min(mine.size, other.size);
      const similar = smaller > 0 && ((shared >= 2 && shared / smaller >= 0.6) || (smaller === 1 && mine.size === 1 && other.size === 1 && shared === 1));
      return { c, shared, similar };
    })
    .filter((x) => x.similar)
    .sort((a, b) => b.shared - a.shared || b.c.likes - a.c.likes);
  return scored.slice(0, limit).map((x) => x.c);
}

/** Konuşma sırasına göre kartlar (özet ve dışa aktarma için); sıra yoksa yazılış sırası. */
export function orderedCards(retro: RetroView): RetroCardView[] {
  if (!retro.order) return retro.cards;
  const byId = new Map(retro.cards.map((c) => [c.id, c]));
  return retro.order.map((id) => byId.get(id)).filter((c): c is RetroCardView => !!c);
}

export interface ExportLabels {
  title: string;
  columns: [string, string, string];
  likes: (n: number) => string;
  noOwner: string;
  from: string;
  date: string;
}

/** Bir kartın dışa aktarmadaki hücre metni: aksiyonda sahip ve bitiş, diğerlerinde beğeni ve (anonim değilse) yazan. */
function cellText(c: RetroCardView, labels: ExportLabels): string {
  const text = c.text.replace(/\s*\n+\s*/g, ' ');
  if (c.column === 2) {
    const owner = c.owner ? c.owner.nickname : labels.noOwner;
    const src = c.sourceText ? ` (${labels.from}: ${c.sourceText.replace(/\s*\n+\s*/g, ' ')})` : '';
    return `${text} (${[owner, c.due].filter(Boolean).join(', ')})${src}`;
  }
  return `${text} (${labels.likes(c.likes)}${c.author ? `, ${c.author.nickname}` : ''})`;
}

/** Pano görünümü: her pano sütunu bir tablo sütunu, her kart bir satır (sütun içinde konuşma sırasıyla). */
function boardRows(retro: RetroView, labels: ExportLabels): string[][] {
  const cards = orderedCards(retro);
  const cols = RETRO_COLUMNS.map((col) => cards.filter((c) => c.column === col.id).map((c) => cellText(c, labels)));
  const height = Math.max(1, ...cols.map((c) => c.length));
  return Array.from({ length: height }, (_, i) => cols.map((c) => c[i] ?? ''));
}

export function toMarkdown(retro: RetroView, labels: ExportLabels): string {
  const cell = (v: string) => v.replace(/\|/g, '\\|');
  const line = (cells: string[]) => `| ${cells.map(cell).join(' | ')} |`;
  return [
    `# ${labels.title}`,
    '',
    labels.date,
    '',
    line([...labels.columns]),
    line(labels.columns.map(() => '---')),
    ...boardRows(retro, labels).map(line),
    '',
  ].join('\n');
}

function csvCell(v: string) {
  // Tablo programlarında formül olarak çalışmasın.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /["\n\r;,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Pano görünümünde CSV: her pano sütunu bir sütun. Ayırıcı Türkçe Excel'in beklediği `;` (virgül verilirse her şey
 * tek sütuna düşer); diğer dillerde `,`.
 */
export function toCsv(retro: RetroView, labels: ExportLabels, delimiter: ',' | ';'): string {
  const rows = [[...labels.columns], ...boardRows(retro, labels)];
  // UTF-8 BOM: Excel Türkçe karakterleri doğru açsın.
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(delimiter)).join('\r\n')}\r\n`;
}

export function downloadText(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function clock(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}
