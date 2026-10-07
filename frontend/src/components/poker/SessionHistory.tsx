import { useTranslation } from 'react-i18next';
import type { SessionRound } from '../../api/types';
import styles from './SessionHistory.module.css';

/** Ticket'sız (serbest) turların kaydı: konu, final ve oylar. En yenisi üstte. */
export function SessionHistory({ rounds }: { rounds: SessionRound[] }) {
  const { t } = useTranslation();
  if (rounds.length === 0) return null;
  return (
    <section className={`card ${styles.panel}`} aria-label={t('session.title')}>
      <h2 className={styles.title}>{t('session.title')}</h2>
      <ol className={styles.list}>
        {[...rounds].reverse().map((r, i) => (
          <li key={rounds.length - i} className={styles.item}>
            <div className={styles.row}>
              <span className={styles.topic}>{r.topic ?? t('session.untitled')}</span>
              {r.finalEstimate && <span className={styles.final} title={t('tickets.final')}>{r.finalEstimate}</span>}
            </div>
            <p className={styles.votes}>
              {t('poker.roundN', { n: r.number })}
              {' · '}
              {r.votes.map((v) => `${v.nickname}: ${v.card}`).join(', ') || t('tickets.noVotes')}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
