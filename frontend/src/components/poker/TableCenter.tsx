import { useTranslation } from 'react-i18next';
import type { RoomState } from '../../api/types';
import { formatNumber } from '../../lib/deck';
import { useRoomStore } from '../../store/roomStore';
import styles from './TableCenter.module.css';

interface Props {
  room: RoomState;
  seatedCount: number;
  allVoted: boolean;
  isModerator: boolean;
}

/**
 * Masanın ortası, tek ana işlem: oy verirken krupiyede "Kartları aç 3 / 5", diğerlerinde oy sayacı;
 * kartlar açılınca büyük öneri; final kaydedilince final tahmin. Ticket başlığı masada değil, masanın üstündedir.
 */
export function TableCenter({ room, seatedCount, allVoted, isModerator }: Props) {
  const { t } = useTranslation();
  const reveal = useRoomStore((s) => s.reveal);
  const round = room.round;
  const stats = round.stats;
  const voted = round.votedIds.length;

  if (round.state === 'VOTING') {
    const progress = `${voted} / ${seatedCount}`;
    return (
      <div className={styles.center}>
        {isModerator ? (
          <button type="button" className={styles.reveal} onClick={reveal} disabled={voted === 0}
            title={voted === 0 ? t('poker.noVotesYet') : allVoted ? t('poker.everyoneVoted') : undefined}>
            {t('poker.reveal')} <span>{progress}</span>
          </button>
        ) : (
          <span className={styles.status} aria-live="polite">
            {allVoted ? t('poker.everyoneVoted') : t('poker.votedCount', { voted, total: seatedCount })}
          </span>
        )}
        {isModerator && allVoted && !room.autoReveal && <span className={styles.hint} aria-live="polite">{t('poker.everyoneVoted')}</span>}
        {!isModerator && <span className={styles.hint}>{t('poker.waitingDealer')}</span>}
      </div>
    );
  }

  if (round.state === 'FINALIZED') {
    return (
      <div className={styles.center} aria-live="polite">
        <span className={styles.eyebrow}>{t('poker.finalLabel')}</span>
        <span className={styles.big}>{round.finalEstimate}</span>
      </div>
    );
  }

  const suggested = stats?.suggested;
  return (
    <div className={styles.center} aria-live="polite">
      {suggested ? (
        <>
          <span className={styles.eyebrow}>{t('poker.suggestionTitle')}</span>
          <span className={styles.big}>{suggested}</span>
        </>
      ) : (
        <span className={styles.status}>
          {stats?.average !== undefined ? t('poker.revealedAverage', { value: formatNumber(stats.average) }) : t('poker.revealed')}
        </span>
      )}
    </div>
  );
}
