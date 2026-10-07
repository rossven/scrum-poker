import type { ReactNode } from 'react';
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
  /** Moderatör eylemleri; üzerine gelince/odaklanınca görünür. */
  actions?: ReactNode;
}

/** Masadaki bir koltuk: kart, avatar, isim, rozetler. */
export function Seat({ person, isYou, size, card, actions }: Props) {
  const { t } = useTranslation();
  const status = person.online ? t('room.online') : t('room.offline');
  return (
    <div
      className={`${styles.seat} ${person.online ? '' : styles.away}`}
      title={`${person.nickname} · ${status}`}
      tabIndex={actions ? 0 : undefined}
    >
      {card && <div className={styles.card}>{card}</div>}
      <Avatar seed={person.avatar} size={size} online={person.online} alt={person.nickname} />
      <span className={styles.name}>
        {person.nickname}
        {isYou && <span className={styles.you}> ({t('room.you')})</span>}
      </span>
      <span className={styles.badges}>
        {person.moderator && <span className={styles.badge}>★ {t('room.moderator')}</span>}
        {person.observer && <span className={`${styles.badge} ${styles.observer}`}>{t('room.observer')}</span>}
      </span>
      <span className="visually-hidden">{status}</span>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
