import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CardFace } from './CardFace';
import styles from './CardHand.module.css';
import { cardTone, toneColor } from '../../lib/deck';

interface Props {
  cards: string[];
  selected: string | null;
  disabled: boolean;
  onVote: (card: string | null) => void;
  /** Değişince (yeni tur) kartlar krupiyeden ele yeniden dağıtılır. */
  dealKey?: number;
}

/** Ekran okuyucu için kart adı: ½, ? ve ☕ okunur bir ad alır. */
function cardName(card: string, t: (k: string, o?: Record<string, string>) => string) {
  if (card === '½') return t('poker.cardHalf');
  if (card === '?') return t('poker.cardUnsure');
  if (card === '☕') return t('poker.cardBreak');
  return t('poker.cardLabel', { card });
}

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

/**
 * Alt kısımdaki kart eli. Tıkla: oy ver; seçili karta tekrar tıkla: oyu geri çek.
 * Klavye: ←/→ ya da sayı tuşları kartı işaretler, Enter onaylar, Esc oyu geri çeker.
 */
export function CardHand({ cards, selected, disabled, onVote, dealKey }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // İlk açılışta dağıtma yok; yalnızca sonraki turlarda.
  const firstDeal = useRef(dealKey);
  const animateDeal = !reduceMotion && dealKey !== firstDeal.current;
  const [cursor, setCursor] = useState<number>(-1);
  const typed = useRef({ text: '', at: 0 });

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
        setCursor((c) =>
          e.key === 'ArrowRight' ? Math.min(cards.length - 1, c + 1) : Math.max(0, c < 0 ? 0 : c - 1),
        );
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

  return (
    <div className={styles.dock}>
      <div className={styles.hand} role="group" aria-label={t('poker.yourCards')} key={dealKey}>
        {cards.map((card, i) => {
          const isSelected = card === selected;
          return (
            // Dağıtma animasyonu dış sarmalayıcıda; seçilince kalkma (transform) düğmenin kendisinde.
            <motion.span
              key={card}
              className={styles.slot}
              initial={animateDeal ? { opacity: 0, y: -60, rotate: -12 } : false}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: animateDeal ? i * 0.035 : 0, duration: 0.32, ease: 'easeOut' }}
            >
              <button
                type="button"
                className={`${styles.card} ${isSelected ? styles.selected : ''} ${i === cursor ? styles.cursor : ''}`}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={cardName(card, t)}
                style={isSelected ? ({ '--ink-ring': toneColor(cardTone(cards, card)) ?? 'var(--accent)' } as React.CSSProperties) : undefined}
                onClick={() => onVote(isSelected ? null : card)}
              >
                <CardFace value={card} tone={cardTone(cards, card)} />
              </button>
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
