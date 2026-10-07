import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CardHand.module.css';

interface Props {
  cards: string[];
  selected: string | null;
  disabled: boolean;
  onVote: (card: string | null) => void;
}

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

/**
 * Alt kısımdaki kart eli. Tıkla: oy ver; seçili karta tekrar tıkla: oyu geri çek.
 * Klavye: ←/→ ya da sayı tuşları kartı işaretler, Enter onaylar, Esc oyu geri çeker.
 */
export function CardHand({ cards, selected, disabled, onVote }: Props) {
  const { t } = useTranslation();
  const [cursor, setCursor] = useState<number>(-1);
  const typed = useRef({ text: '', at: 0 });
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Seçim değişince (ör. yeni tur) imleç seçili karta gelsin.
  useEffect(() => {
    setCursor(selected ? cards.indexOf(selected) : -1);
  }, [selected, cards]);

  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(document.activeElement)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursor((c) => {
          const next = e.key === 'ArrowRight' ? Math.min(cards.length - 1, c + 1) : Math.max(0, c < 0 ? 0 : c - 1);
          refs.current[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          return next;
        });
      } else if (e.key === 'Enter') {
        // Odak bir düğmedeyse tarayıcı zaten tıklatır.
        if (document.activeElement?.tagName === 'BUTTON') return;
        if (cursor >= 0) onVote(cards[cursor]);
      } else if (e.key === 'Escape') {
        if (selected) onVote(null);
      } else if (e.key.length === 1) {
        // "1" sonra "3" → 13; kısa sürede yazılan karakterler birleşir.
        const now = Date.now();
        const text = (now - typed.current.at < 800 ? typed.current.text : '') + e.key;
        typed.current = { text, at: now };
        const lower = (s: string) => s.toLowerCase();
        let idx = cards.findIndex((c) => lower(c) === lower(text));
        if (idx < 0) idx = cards.findIndex((c) => lower(c) === lower(e.key));
        if (idx < 0 && (e.key === '.' || e.key === ',')) idx = cards.findIndex((c) => c === '½');
        if (idx >= 0) setCursor(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards, cursor, disabled, onVote, selected]);

  const mid = (cards.length - 1) / 2;
  return (
    <div className={`${styles.dock} ${disabled ? styles.idle : ''}`}>
      <p className={styles.hint}>{disabled ? t('poker.handLocked') : t('poker.handHint')}</p>
      <div className={styles.hand} role="group" aria-label={t('poker.yourCards')}>
        {cards.map((card, i) => {
          const isSelected = card === selected;
          const offset = i - mid;
          return (
            <button
              key={card}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className={`${styles.card} ${isSelected ? styles.selected : ''} ${i === cursor ? styles.cursor : ''}`}
              style={{ '--rot': `${offset * 2.2}deg`, '--drop': `${Math.abs(offset) * Math.abs(offset) * 0.6}px` } as CSSProperties}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={t('poker.cardLabel', { card })}
              onClick={() => onVote(isSelected ? null : card)}
            >
              {card}
            </button>
          );
        })}
      </div>
    </div>
  );
}
