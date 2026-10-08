import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { formatNumber } from '../../lib/deck';
import { Timer } from './Timer';
import styles from './TableCenter.module.css';

interface Props {
  room: RoomState;
  seatedCount: number;
  allVoted: boolean;
}

/**
 * Masanın ortası: ticket listesi açıksa masadaki ticket, tur durumu, zamanlayıcı ve açılınca kısa sonuç.
 * Ticket'sız turda başlık yok (ekip çoğunlukla yalnızca puanlıyor); konu krupiye tepsisinden isteğe bağlı yazılır.
 */
export function TableCenter({ room, seatedCount, allVoted }: Props) {
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
      {ticket && (
        <strong className={styles.ticket}>
          {ticket.link ? <a href={ticket.link} target="_blank" rel="noopener noreferrer">{ticket.title}</a> : ticket.title}
        </strong>
      )}
      <span className={styles.status} aria-live="polite">{status}</span>
      {room.timer && <Timer timer={room.timer} />}
    </div>
  );
}
