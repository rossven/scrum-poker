import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { formatNumber } from '../../lib/deck';
import { Timer } from './Timer';
import styles from './TableCenter.module.css';

/** Masanın ortası: masadaki ticket, tur durumu, zamanlayıcı ve açılınca kısa sonuç. */
export function TableCenter({ room, seatedCount, allVoted }: { room: RoomState; seatedCount: number; allVoted: boolean }) {
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
        {ticket ? t('poker.roundN', { n: round.number }) : t('poker.freeRound')}
      </span>
      <strong className={styles.ticket}>
        {ticket ? (
          ticket.link ? <a href={ticket.link} target="_blank" rel="noopener noreferrer">{ticket.title}</a> : ticket.title
        ) : (
          t('poker.noTicket')
        )}
      </strong>
      <span className={styles.status} aria-live="polite">{status}</span>
      {room.timer && <Timer timer={room.timer} />}
    </div>
  );
}
