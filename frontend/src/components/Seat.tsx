import { useTranslation } from 'react-i18next';
import type { ParticipantView } from '../api/types';
import { Avatar } from './Avatar';
import styles from './Seat.module.css';

interface Props {
  person: ParticipantView;
  isYou: boolean;
  size: number;
  canPromote: boolean;
  onPromote: () => void;
}

/** Masadaki bir koltuk: avatar, isim, rozetler. */
export function Seat({ person, isYou, size, canPromote, onPromote }: Props) {
  const { t } = useTranslation();
  const status = person.online ? t('room.online') : t('room.offline');
  return (
    <div
      className={`${styles.seat} ${person.online ? '' : styles.away}`}
      title={`${person.nickname} · ${status}`}
      tabIndex={canPromote && !person.moderator ? 0 : undefined}
    >
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
      {canPromote && !person.moderator && (
        <button type="button" className={`btn btn-ghost btn-small ${styles.promote}`} onClick={onPromote}>
          {t('room.makeModerator')}
        </button>
      )}
    </div>
  );
}
