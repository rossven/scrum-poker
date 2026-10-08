import { useTranslation } from 'react-i18next';
import { CardEmblem } from '../brand/Logo';
import styles from './CardFace.module.css';

export const SUITS = ['♠', '♥', '♦', '♣'] as const;

/** Sembol deste sırasına göre dönüşümlü verilir: ♠ ♥ ♦ ♣ (♥ ♦ kırmızı). */
export function suitFor(index: number) {
  const suit = SUITS[((index % 4) + 4) % 4];
  return { suit, red: suit === '♥' || suit === '♦' };
}

/** Uzun değerlerde köşe yazısı küçülür (8 karaktere kadar sığsın). */
function cornerScale(value: string) {
  const len = [...value].length;
  if (len <= 2) return 1;
  if (len === 3) return 0.78;
  if (len <= 5) return 0.58;
  return 0.46;
}

interface Props {
  value: string;
  /** Destedeki sırası; sembolü belirler. */
  index: number;
  /** Küçük (masadaki) kart: Joker/Mola alt yazısı gösterilmez. */
  compact?: boolean;
}

/**
 * Kartın ön yüzü: değer + sembol sol üst ve sağ alt köşede (sağ alttaki ters), ortada logo.
 * "?" Joker (şapkalı joker), "☕" Mola (fincan). Uzun değerlerde (4+ karakter) değer ortada da yazılır.
 */
export function CardFace({ value, index, compact }: Props) {
  const { t } = useTranslation();
  const joker = value === '?';
  const coffee = value === '☕';
  const { suit, red } = suitFor(index);
  const long = [...value].length >= 4;
  const tone = joker ? styles.jokerTone : coffee ? styles.coffeeTone : red ? styles.red : '';
  const corner = (
    <>
      <span className={styles.cornerValue} style={{ fontSize: `calc(var(--corner) * ${cornerScale(value)})` }}>
        {joker ? '★' : value}
      </span>
      {!joker && !coffee && <span className={styles.cornerSuit}>{suit}</span>}
      {joker && <span className={styles.cornerSuit}>J</span>}
    </>
  );
  return (
    <span className={`${styles.face} ${tone}`}>
      <span className={`${styles.corner} ${styles.tl}`}>{corner}</span>
      <span className={`${styles.middle} ${joker || coffee ? styles.special : ''}`}>
        {joker ? <JokerArt /> : coffee ? <CoffeeArt /> : long ? <span className={styles.longValue}>{value}</span> : <CardEmblem />}
        {(joker || coffee) && !compact && <span className={styles.caption}>{joker ? t('poker.joker') : t('poker.break')}</span>}
      </span>
      <span className={`${styles.corner} ${styles.br}`}>{corner}</span>
    </span>
  );
}

/** Kartın arka yüzü: bordo zemin, altın kafes deseni, ortada küçük amblem. */
export function CardBack() {
  return (
    <span className={styles.back}>
      <span className={styles.backInner}>
        <span className={styles.backEmblem}><CardEmblem /></span>
      </span>
    </span>
  );
}

function JokerArt() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      {/* üç uçlu joker şapkası */}
      <path d="M6 24 C8 14 12 9 16 7 C15 13 17 17 20 20 C23 17 25 13 24 7 C28 9 32 14 34 24 Z" fill="#7a1f2b" />
      <path d="M20 20 C18 14 18 9 20 4 C22 9 22 14 20 20 Z" fill="#1c6b46" />
      <circle cx="16" cy="7" r="2.4" fill="#c9a24a" />
      <circle cx="24" cy="7" r="2.4" fill="#c9a24a" />
      <circle cx="20" cy="4" r="2.4" fill="#c9a24a" />
      <rect x="6" y="23" width="28" height="4" rx="2" fill="#c9a24a" />
      {/* yüz */}
      <circle cx="20" cy="31" r="7" fill="#f6d7b8" />
      <circle cx="17.6" cy="30" r="1" fill="#1b1b1b" />
      <circle cx="22.4" cy="30" r="1" fill="#1b1b1b" />
      <path d="M16.5 33 Q20 36.5 23.5 33" stroke="#b3202e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CoffeeArt() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <path d="M15 6 C13 9 17 10 15 13 M20 5 C18 8 22 9 20 12 M25 6 C23 9 27 10 25 13" stroke="#8a6b52" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M8 16 H30 V24 C30 30 25 33 19 33 C13 33 8 30 8 24 Z" fill="#fffdf7" stroke="#5b2e1d" strokeWidth="1.8" />
      <path d="M30 18 C35 18 35 26 30 26" fill="none" stroke="#5b2e1d" strokeWidth="1.8" />
      <ellipse cx="19" cy="17" rx="10" ry="1.8" fill="#6b3d22" />
      <ellipse cx="19" cy="35" rx="14" ry="2" fill="#c9a24a" />
    </svg>
  );
}
