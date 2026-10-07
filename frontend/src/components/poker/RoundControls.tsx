import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { useRoomStore } from '../../store/roomStore';
import styles from './RoundControls.module.css';

const TIMER_PRESETS = [60, 120, 300];

/** Moderatörün tur düğmeleri: aç, tekrar oyla, sıradaki ticket, zamanlayıcı. */
export function RoundControls({ room, allVoted }: { room: RoomState; allVoted: boolean }) {
  const { t } = useTranslation();
  const { reveal, newRound, nextTicket, startTimer, stopTimer } = useRoomStore();
  const voting = room.round.state === 'VOTING';
  const hasPending = room.tickets.some((tk) => tk.status === 'PENDING' && tk.id !== room.currentTicketId);

  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        {voting ? (
          <button
            type="button"
            className={`btn ${allVoted ? 'btn-primary' : ''}`}
            onClick={reveal}
            title={allVoted ? t('poker.everyoneVoted') : undefined}
          >
            🂠 {t('poker.reveal')}
          </button>
        ) : (
          <button type="button" className="btn" onClick={newRound}>↻ {t('poker.revote')}</button>
        )}
        {voting && room.round.votedIds.length > 0 && (
          <button type="button" className="btn btn-ghost btn-small" onClick={newRound}>{t('poker.resetVotes')}</button>
        )}
        {hasPending && (
          <button type="button" className={`btn ${room.round.state === 'FINALIZED' ? 'btn-primary' : 'btn-ghost'}`} onClick={nextTicket}>
            {t('poker.nextTicket')} →
          </button>
        )}
      </div>
      <div className={styles.group} aria-label={t('poker.timer')}>
        {room.timer ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={stopTimer}>{t('poker.timerStop')}</button>
        ) : (
          <>
            <span className={styles.label}>⏱ {t('poker.timer')}</span>
            {TIMER_PRESETS.map((s) => (
              <button key={s} type="button" className="btn btn-ghost btn-small" onClick={() => startTimer(s)}>
                {t('poker.minutes', { count: s / 60 })}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
