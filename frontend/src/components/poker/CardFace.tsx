import { useTranslation } from 'react-i18next';
import { toneColor } from '../../lib/deck';
import { SprintEmblem } from '../brand/Logo';
import styles from './CardFace.module.css';

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
  /** 0 (en düşük) – 1 (en yüksek); renk mavi → camgöbeği → kehribar → turuncu → kırmızı. null: nötr ("?", "☕"). */
  tone?: number | null;
  /** Küçük (masadaki) kart: köşe rakamları ve amblem yok, ortada tek büyük rakam. */
  compact?: boolean;
}

/**
 * Kartın ön yüzü. Elindeki (büyük) kartta rakam sağ üstte ve sol altta (alttaki ters, iskambil gibi),
 * ortada sprint döngüsü, üst kenarda ton şeridi. Masadaki küçük kartta tek büyük rakam yeter.
 * "?" soru işareti, "☕" Mola (fincan). Uzun değerlerde (4+ karakter) değer ortada da yazılır.
 */
export function CardFace({ value, tone, compact }: Props) {
  const { t } = useTranslation();
  const unsure = value === '?';
  const coffee = value === '☕';
  const long = [...value].length >= 4;
  const ink = toneColor(tone);
  const style = ink ? ({ '--ink': ink } as React.CSSProperties) : undefined;
  const special = unsure || coffee;
  const faceClass = `${styles.face} ${unsure ? styles.unsureTone : coffee ? styles.coffeeTone : ''}`;

  if (compact) {
    return (
      <span className={faceClass} style={style}>
        <span className={styles.band} aria-hidden />
        <span className={styles.single} style={{ fontSize: `calc(var(--corner) * ${special ? 1 : 1.5 * cornerScale(value)})` }}>
          {unsure ? <UnsureArt /> : coffee ? <CoffeeArt /> : value}
        </span>
      </span>
    );
  }

  const corner = (
    <span className={styles.cornerValue} style={{ fontSize: `calc(var(--corner) * ${cornerScale(value)})` }}>
      {value}
    </span>
  );
  return (
    <span className={faceClass} style={style}>
      <span className={styles.band} aria-hidden />
      <span className={`${styles.corner} ${styles.tr}`}>{corner}</span>
      <span className={`${styles.middle} ${special ? styles.special : ''}`}>
        {unsure ? <UnsureArt /> : coffee ? <CoffeeArt /> : long ? <span className={styles.longValue}>{value}</span> : <SprintEmblem color="var(--ink)" />}
        {special && <span className={styles.caption}>{unsure ? t('poker.joker') : t('poker.break')}</span>}
      </span>
      <span className={`${styles.corner} ${styles.bl}`}>{corner}</span>
    </span>
  );
}

/** Kartın arka yüzü: turuncu-kırmızı zemin, beyaz kenar, ortada beyaz sprint döngüsü. */
export function CardBack() {
  return (
    <span className={styles.back}>
      <span className={styles.backEmblem}><SprintEmblem color="rgba(255,255,255,0.85)" /></span>
    </span>
  );
}

function UnsureArt() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="4 3.4" />
      <path d="M15.5 16a4.6 4.6 0 1 1 6.6 4.1c-1.4.7-2.1 1.6-2.1 3.1v.8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="28.6" r="1.9" fill="currentColor" />
    </svg>
  );
}

function CoffeeArt() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <path d="M15 6 C13 9 17 10 15 13 M20 5 C18 8 22 9 20 12 M25 6 C23 9 27 10 25 13" stroke="#8a6b52" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M8 16 H30 V24 C30 30 25 33 19 33 C13 33 8 30 8 24 Z" fill="#ffffff" stroke="#5b3a26" strokeWidth="2" />
      <path d="M30 18 C35 18 35 26 30 26" fill="none" stroke="#5b3a26" strokeWidth="2" />
      <ellipse cx="19" cy="17" rx="10" ry="1.8" fill="#6b3d22" />
    </svg>
  );
}
