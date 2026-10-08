import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState } from '../api/types';
import { splitTicketTitle } from '../lib/deck';
import { AssignmentHistory } from './assign/AssignmentHistory';
import { SessionHistory } from './poker/SessionHistory';
import { TicketQueue } from './poker/TicketQueue';
import styles from './Sidebar.module.css';

/**
 * Yan panel: "Kuyruk" (ticket listesi) ve "Geçmiş" (tur geçmişi, atamalar, izleyiciler) sekmeleri.
 * Ticket listesi kapalıysa yalnızca geçmiş gösterilir.
 */
export function Sidebar({ room, isModerator, hiddenResultId, observers }: {
  room: RoomState;
  isModerator: boolean;
  hiddenResultId: string | null;
  observers: ReactNode;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'queue' | 'history'>('queue');
  const showQueue = room.ticketsEnabled;
  const active = showQueue ? tab : 'history';
  const estimated = room.tickets.filter((tk) => tk.status === 'ESTIMATED').length;
  const doneTickets = room.tickets.filter((tk) => tk.history.length > 0 || tk.status === 'ESTIMATED');

  return (
    <div className={styles.side}>
      <div className={styles.head}>
        <b className={styles.title}>{showQueue ? t('tickets.title') : t('sidebar.history')}</b>
        {showQueue && room.tickets.length > 0 && <span className={styles.progress}>{t('tickets.progress', { done: estimated, total: room.tickets.length })}</span>}
      </div>
      {showQueue && (
        <div className={styles.tabs} role="tablist">
          {(['queue', 'history'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={active === k} className={active === k ? styles.on : ''} onClick={() => setTab(k)}>
              {t(`sidebar.${k}`)}
            </button>
          ))}
        </div>
      )}
      {active === 'queue' ? (
        <TicketQueue room={room} isModerator={isModerator} hiddenResultId={hiddenResultId} />
      ) : (
        <div className={styles.hist}>
          {doneTickets.length > 0 && (
            <section aria-label={t('sidebar.ticketRounds')}>
              <h2 className={styles.h2}>{t('sidebar.ticketRounds')}</h2>
              <ol className={styles.rounds}>
                {doneTickets.map((tk) => (
                  <li key={tk.id}>
                    <div className={styles.roundHead}>
                      <span>{splitTicketTitle(tk.title).text}</span>
                      {tk.finalEstimate && <b className={styles.final} title={t('tickets.final')}>{tk.finalEstimate}</b>}
                    </div>
                    <p>{tk.history.map((r) => `${t('poker.roundN', { n: r.number })}: ${r.votes.map((v) => `${v.nickname} ${v.card}`).join(', ') || t('tickets.noVotes')}`).join(' · ')}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <SessionHistory rounds={room.sessionHistory} />
          <AssignmentHistory records={room.assignmentHistory} hiddenId={hiddenResultId} />
          {observers}
          {doneTickets.length === 0 && room.sessionHistory.length === 0 && room.assignmentHistory.length === 0 && !observers && (
            <p className="muted">{t('sidebar.emptyHistory')}</p>
          )}
        </div>
      )}
    </div>
  );
}
