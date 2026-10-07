import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoomState, RoundView } from '../../api/types';
import { formatNumber, isSpecialCard } from '../../lib/deck';
import { useRoomStore } from '../../store/roomStore';
import styles from './ResultsPanel.module.css';

interface Props {
  room: RoomState;
  round: RoundView;
  isModerator: boolean;
}

/** Açılan turun analizi: ortalama, medyan, mod, dağılım, uzlaşı, uçlar; moderatöre final onayı. */
export function ResultsPanel({ room, round, isModerator }: Props) {
  const { t } = useTranslation();
  const { finalize, excludeVote } = useRoomStore();
  const stats = round.stats!;
  const votes = round.votes ?? [];
  const nameOf = (id: string) => votes.find((v) => v.participantId === id)?.nickname ?? '?';
  const maxCount = Math.max(1, ...stats.distribution.map((b) => b.count));
  const finalOptions = room.deckCards.filter((c) => !isSpecialCard(c));
  const [choice, setChoice] = useState(stats.suggested ?? finalOptions[0] ?? '');

  // Oylar değişince (ör. biri sayımdan çıkarıldı) öneri güncellenir.
  useEffect(() => {
    if (stats.suggested) setChoice(stats.suggested);
  }, [stats.suggested]);

  const canFinalize = isModerator && round.state === 'REVEALED' && !!room.currentTicketId && finalOptions.length > 0;

  return (
    <section className={`card ${styles.panel}`} aria-label={t('poker.results')}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('poker.results')}</h2>
        <span className={`${styles.consensus} ${styles[stats.consensus.toLowerCase()]}`}>
          {t(`poker.consensus.${stats.consensus}`)}
        </span>
      </div>

      <dl className={styles.numbers}>
        {stats.average !== undefined && (
          <div><dt>{t('poker.average')}</dt><dd>{formatNumber(stats.average)}</dd></div>
        )}
        {stats.median !== undefined && (
          <div><dt>{t('poker.median')}</dt><dd>{formatNumber(stats.median)}</dd></div>
        )}
        <div><dt>{t('poker.mode')}</dt><dd>{stats.modes.length ? stats.modes.join(' / ') : '–'}</dd></div>
        <div><dt>{t('poker.votes')}</dt><dd>{t('poker.counted', { counted: stats.countedCount, total: stats.voteCount })}</dd></div>
      </dl>

      {stats.distribution.length > 0 && (
        <ul className={styles.bars} aria-label={t('poker.distribution')}>
          {stats.distribution.map((b) => (
            <li key={b.card}>
              <span className={styles.barCard}>{b.card}</span>
              <span className={styles.barTrack}>
                <span
                  className={`${styles.barFill} ${isSpecialCard(b.card) ? styles.special : ''}`}
                  style={{ width: `${(b.count / maxCount) * 100}%` }}
                />
              </span>
              <span className={styles.barCount}>{b.count}</span>
              <span className={styles.barNames}>{b.participantIds.map(nameOf).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}

      {(stats.lowestIds.length > 0 || stats.highestIds.length > 0) && (
        <p className={styles.extremes}>
          <span className={styles.low}>▼ {t('poker.lowest')}: {stats.lowestIds.map(nameOf).join(', ')}</span>
          <span className={styles.high}>▲ {t('poker.highest')}: {stats.highestIds.map(nameOf).join(', ')}</span>
        </p>
      )}

      {isModerator && round.state === 'REVEALED' && votes.length > 0 && (
        <details className={styles.excludeBox}>
          <summary>{t('poker.excludeTitle')}</summary>
          <ul>
            {votes.map((v) => (
              <li key={v.participantId}>
                <label>
                  <input
                    type="checkbox"
                    checked={!v.excluded}
                    onChange={(e) => excludeVote(v.participantId, !e.target.checked)}
                  />
                  {v.nickname} · <strong>{v.card}</strong>
                  {v.left && <span className="muted"> ({t('poker.leftRoom')})</span>}
                </label>
              </li>
            ))}
          </ul>
        </details>
      )}

      {round.state === 'FINALIZED' && round.finalEstimate && (
        <p className={styles.final}>✓ {t('poker.finalSaved', { value: round.finalEstimate })}</p>
      )}

      {canFinalize && (
        <form
          className={styles.finalize}
          onSubmit={(e) => {
            e.preventDefault();
            if (choice) finalize(choice);
          }}
        >
          <label htmlFor="final-choice">{t('poker.finalLabel')}</label>
          <select id="final-choice" className="input" value={choice} onChange={(e) => setChoice(e.target.value)}>
            {finalOptions.map((c) => (
              <option key={c} value={c}>
                {c}
                {c === stats.suggested ? ` (${t('poker.suggested')})` : ''}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">{t('poker.finalize')}</button>
        </form>
      )}
      {isModerator && round.state === 'REVEALED' && !room.currentTicketId && (
        <p className="muted">{t('poker.finalNeedsTicket')}</p>
      )}
    </section>
  );
}
