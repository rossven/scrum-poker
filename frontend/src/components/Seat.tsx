import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParticipantView } from '../api/types';
import { Avatar } from './Avatar';
import styles from './Seat.module.css';

interface Props {
  person: ParticipantView;
  isYou: boolean;
  size: number;
  /** Kişinin önündeki kart (kapalı, açık ya da boş yer). */
  card?: ReactNode;
  /** Krupiye eylemleri; üzerine gelince/odaklanınca görünür. */
  actions?: ReactNode;
  /** Dürtme sayacı: arttıkça koltuk kısa bir süre titrer. */
  nudge?: number;
  /** Koltuğun altındaki kısa durum (ör. "düşünüyor"). */
  status?: ReactNode;
}

const SHAKE: Keyframe[] = [0, -7, 7, -5, 5, -2, 0].map((x) => ({ transform: `translateX(${x}px)` }));

/** Masadaki bir koltuk: kart, avatar, isim, rozetler. Krupiyenin önünde "D" düğmesi durur. */
export function Seat({ person, isYou, size, card, actions, nudge = 0, status }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const online = person.online ? t('room.online') : t('room.offline');

  const seen = useRef(nudge);
  useEffect(() => {
    if (nudge === seen.current) return;
    seen.current = nudge;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate?.(SHAKE, { duration: 520, easing: 'ease-in-out' });
  }, [nudge]);

  return (
    <div
      ref={ref}
      className={`${styles.seat} ${person.online ? '' : styles.away} ${status ? styles.waiting : ''}`}
      title={`${person.nickname} · ${online}`}
      tabIndex={actions ? 0 : undefined}
    >
      {card && <div className={styles.card}>{card}</div>}
      <span className={styles.avatar}>
        <Avatar seed={person.avatar} size={size} online={person.online} alt={person.nickname} dealer={person.moderator} />
        {person.moderator && (
          <span className={styles.dealerButton} title={t('room.dealerButton')} aria-hidden>K</span>
        )}
      </span>
      <span className={styles.name}>
        {person.nickname}
        {isYou && <span className={styles.you}> {t('room.you')}</span>}
      </span>
      {status && <span className={styles.status}>{status}</span>}
      <span className={styles.badges}>
        {person.observer && <span className={`${styles.badge} ${styles.observer}`}>{t('room.observer')}</span>}
      </span>
      <span className="visually-hidden">{online}{person.moderator ? `, ${t('room.moderator')}` : ''}</span>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
