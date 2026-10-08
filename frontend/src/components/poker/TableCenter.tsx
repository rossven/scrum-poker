import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { formatNumber } from '../../lib/deck';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import { Timer } from './Timer';
import styles from './TableCenter.module.css';

interface Props {
  room: RoomState;
  seatedCount: number;
  allVoted: boolean;
  isModerator: boolean;
}

/**
 * Masanın ortası: masadaki ticket ya da (ticket'sız turda) krupiyenin yazdığı konu,
 * tur durumu, zamanlayıcı ve açılınca kısa sonuç.
 */
export function TableCenter({ room, seatedCount, allVoted, isModerator }: Props) {
  const { t } = useTranslation();
  const round = room.round;
  const ticket = room.tickets.find((tk) => tk.id === room.currentTicketId);
  const stats = round.stats;

  let status: string;
  if (round.state === 'VOTING') {
    status = allVoted ? t('poker.everyoneVoted') : t('poker.votedCount', { voted: round.votedIds.length, total: seatedCount });
  } else if (round.state === 'FINALIZED') {
    status = t('poker.finalSaved', { value: round.finalEstimate });
  } else if (stats?.average !== undefined) {
    status = t('poker.revealedAverage', { value: formatNumber(stats.average) });
  } else {
    status = t('poker.revealed');
  }

  return (
    <div className={styles.center}>
      <span className={styles.round}>
        {ticket ? t('poker.roundN', { n: round.number }) : t('poker.freeRoundN', { n: round.number })}
      </span>
      {ticket ? (
        <strong className={styles.ticket}>
          {ticket.link ? <a href={ticket.link} target="_blank" rel="noopener noreferrer">{ticket.title}</a> : ticket.title}
        </strong>
      ) : (
        <Topic topic={round.topic} editable={isModerator} />
      )}
      <span className={styles.status} aria-live="polite">{status}</span>
      {room.timer && <Timer timer={room.timer} />}
    </div>
  );
}

/** Ticket'sız turda "Ne oylanıyor?" konusu. Krupiye tıklayıp yazar (en fazla 120 karakter). */
function Topic({ topic, editable }: { topic?: string; editable: boolean }) {
  const { t } = useTranslation();
  const setTopic = useRoomStore((s) => s.setTopic);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    const save = (e: FormEvent) => {
      e.preventDefault();
      setTopic(text.trim());
      setEditing(false);
    };
    return (
      <form className={styles.topicForm} onSubmit={save}>
        <input
          className={`input ${styles.topicInput}`}
          aria-label={t('poker.topicLabel')}
          placeholder={t('poker.topicPlaceholder')}
          maxLength={120}
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        />
        <button type="submit" className="btn btn-small btn-primary">{t('common.save')}</button>
      </form>
    );
  }

  if (!editable) {
    return <strong className={styles.ticket}>{topic ?? t('poker.noTopic')}</strong>;
  }
  return (
    <button
      type="button"
      className={`${styles.topicButton} ${topic ? '' : styles.placeholder}`}
      onClick={() => {
        setText(topic ?? '');
        setEditing(true);
      }}
      title={t('poker.topicEdit')}
    >
      <strong className={styles.ticket}>{topic ?? t('poker.topicPlaceholder')}</strong>
      <span aria-hidden className={styles.pen}><Icon name="pencil" size={15} /></span>
      <span className="visually-hidden">{t('poker.topicEdit')}</span>
    </button>
  );
}
