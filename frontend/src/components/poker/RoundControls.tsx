import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { useRoomStore } from '../../store/roomStore';
import styles from './RoundControls.module.css';

const TIMER_PRESETS = [60, 120, 300];
const NUDGE_INTERVAL_MS = 30_000;

/** Krupiyenin tur düğmeleri: aç, tekrar oyla / yeni tur, sıradaki ticket, bekleyenleri dürt, zamanlayıcı. */
export function RoundControls({ room, allVoted, youId }: { room: RoomState; allVoted: boolean; youId: string | null }) {
  const { t } = useTranslation();
  const { reveal, newRound, nextTicket, startTimer, stopTimer, nudge } = useRoomStore();
  const round = room.round;
  const voting = round.state === 'VOTING';
  const freeFinalized = round.state === 'FINALIZED' && !round.ticketId;
  const hasPending = room.ticketsEnabled
    && room.tickets.some((tk) => tk.status === 'PENDING' && tk.id !== room.currentTicketId);

  // Oy vermemiş, bağlı katılımcılar (krupiye hariç). Sunucu kişi başına 30 sn sınırı uygular;
  // burada da hatırlanır ki düğme art arda basılınca hata yağmasın.
  const lastNudged = useRef<Record<string, number>>({});
  const waiting = room.participants.filter(
    (p) => !p.observer && p.online && p.id !== youId && !round.votedIds.includes(p.id),
  );
  const nudgeWaiting = () => {
    const now = Date.now();
    waiting.forEach((p) => {
      if (now - (lastNudged.current[p.id] ?? 0) < NUDGE_INTERVAL_MS) return;
      lastNudged.current[p.id] = now;
      nudge(p.id);
    });
  };

  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        {voting ? (
          <button
            type="button"
            className={`btn ${allVoted ? 'btn-primary' : ''}`}
            onClick={reveal}
            disabled={round.votedIds.length === 0}
            title={round.votedIds.length === 0 ? t('poker.noVotesYet') : allVoted ? t('poker.everyoneVoted') : undefined}
          >
            🂠 {t('poker.reveal')}
          </button>
        ) : freeFinalized ? (
          <button type="button" className="btn btn-primary" onClick={newRound}>🂠 {t('poker.newRound')}</button>
        ) : (
          <button type="button" className="btn" onClick={newRound}>↻ {t('poker.revote')}</button>
        )}
        {voting && round.votedIds.length > 0 && (
          <button type="button" className="btn btn-ghost btn-small" onClick={newRound}>{t('poker.resetVotes')}</button>
        )}
        {voting && waiting.length > 0 && round.votedIds.length > 0 && (
          <button type="button" className="btn btn-ghost btn-small" onClick={nudgeWaiting}>👉 {t('poker.nudgeAll')}</button>
        )}
        {hasPending && (
          <button type="button" className={`btn ${round.state === 'FINALIZED' ? 'btn-primary' : 'btn-ghost'}`} onClick={nextTicket}>
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
