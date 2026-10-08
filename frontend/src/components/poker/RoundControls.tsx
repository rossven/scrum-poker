import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import { Menu, MenuItem, MenuLabel } from '../Menu';
import styles from './RoundControls.module.css';

const TIMER_PRESETS = [60, 120, 300];
const NUDGE_INTERVAL_MS = 30_000;

/**
 * Krupiyenin araç çubuğu, masanın hemen altında: asıl işlem masanın ortasında ("Kartları aç"),
 * burada küçük ve ikincil olanlar durur: dürt, tekrar oyla, Kim alacak?, "Daha fazla" menüsü.
 */
export function RoundControls({ room, youId, hasPending }: { room: RoomState; youId: string | null; hasPending: boolean }) {
  const { t } = useTranslation();
  const { newRound, nextTicket, startTimer, stopTimer, nudge, startAssignment } = useRoomStore();
  const round = room.round;
  const voting = round.state === 'VOTING';
  const freeFinalized = round.state === 'FINALIZED' && !round.ticketId;

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
  const waitingNames = waiting.map((p) => p.nickname);

  return (
    <div className={styles.bar} role="toolbar" aria-label={t('poker.dealerTray')}>
      {voting && waiting.length > 0 && round.votedIds.length > 0 && (
        <button type="button" className={styles.tool} onClick={nudgeWaiting}>
          <Icon name="nudge" size={16} />
          {t('poker.nudge')}
          <small>{waitingNames.length > 2 ? `${waitingNames.slice(0, 2).join(', ')} +${waitingNames.length - 2}` : waitingNames.join(', ')}</small>
        </button>
      )}
      {!voting && (
        freeFinalized ? (
          <button type="button" className={styles.tool} onClick={newRound}><Icon name="cards" size={16} />{t('poker.newRound')}</button>
        ) : (
          <button type="button" className={styles.tool} onClick={newRound}><Icon name="refresh" size={16} />{t('poker.revote')}</button>
        )
      )}
      {!room.assignment && (
        <button type="button" className={styles.tool} onClick={() => startAssignment()}>
          <Icon name="hand" size={16} />{t('assign.startButton')}
        </button>
      )}
      <Menu label={t('poker.more')} align="end" triggerClassName={styles.tool}
        trigger={<><Icon name="more" size={16} />{t('poker.more')}</>}>
        {voting && round.votedIds.length > 0 && (
          <MenuItem icon="undo" onClick={newRound}>{t('poker.resetVotes')}</MenuItem>
        )}
        {hasPending && <MenuItem icon="arrowRight" onClick={nextTicket}>{t('poker.nextTicket')}</MenuItem>}
        {room.timer ? (
          <MenuItem icon="timer" onClick={stopTimer}>{t('poker.timerStop')}</MenuItem>
        ) : (
          <>
            <MenuLabel>{t('poker.timer')}</MenuLabel>
            {TIMER_PRESETS.map((s) => (
              <MenuItem key={s} icon="timer" onClick={() => startTimer(s)}>{t('poker.minutes', { count: s / 60 })}</MenuItem>
            ))}
          </>
        )}
      </Menu>
    </div>
  );
}
