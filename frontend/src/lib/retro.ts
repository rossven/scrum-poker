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

export function toMarkdown(retro: RetroView, labels: ExportLabels): string {
  const cards = orderedCards(retro);
  const lines = [`# ${labels.title}`, '', labels.date, ''];
  for (const col of RETRO_COLUMNS) {
    lines.push(`## ${labels.columns[col.id]}`, '');
    const inCol = cards.filter((c) => c.column === col.id);
    if (inCol.length === 0) lines.push('-', '');
    for (const c of inCol) {
      const text = c.text.replace(/\n+/g, ' ');
      if (col.id === 2) {
        const owner = c.owner ? c.owner.nickname : labels.noOwner;
        const due = c.due ? `, ${c.due}` : '';
        const src = c.sourceText ? ` (${labels.from}: ${c.sourceText.replace(/\n+/g, ' ')})` : '';
        lines.push(`- [ ] ${text} (${owner}${due})${src}`);
      } else {
        const by = c.author ? ` (${c.author.nickname})` : '';
        lines.push(`- ${text} (${labels.likes(c.likes)})${by}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function csvCell(v: string | number | undefined) {
  const s = v === undefined ? '' : String(v);
  // Tablo programlarında formül olarak çalışmasın.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(retro: RetroView, labels: ExportLabels & { header: string[] }): string {
  const rows = [labels.header.map(csvCell).join(',')];
  for (const c of orderedCards(retro)) {
    rows.push([labels.columns[c.column], c.text, c.likes, c.author?.nickname, c.owner?.nickname, c.due, c.sourceText].map(csvCell).join(','));
  }
  // UTF-8 BOM: Excel Türkçe karakterleri doğru açsın.
  return `﻿${rows.join('\r\n')}\r\n`;
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
