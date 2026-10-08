import { useTranslation } from 'react-i18next';
import type { AssignmentRecord } from '../../api/types';
import styles from './AssignmentHistory.module.css';
import { Icon } from '../Icon';

/** Oturumdaki atama sonuçları, en yenisi üstte. Geri alınanlar üstü çizili kalır. */
export function AssignmentHistory({ records, hiddenId }: { records: AssignmentRecord[]; hiddenId?: string | null }) {
  const { t } = useTranslation();
  // Oyun sürerken sonucu ele vermemek için o kayıt gizlenir.
  const shown = records.filter((r) => r.id !== hiddenId);
  if (shown.length === 0) return null;
  return (
    <section className={`card ${styles.panel}`} aria-label={t('assign.history')}>
      <h2 className={`panel-title ${styles.title}`}><Icon name="trophy" size={17} />{t('assign.history')}</h2>
      <ol className={styles.list}>
        {[...shown].reverse().map((r) => (
          <li key={r.id} className={`${styles.item} ${r.undone ? styles.undone : ''}`}>
            <div className={styles.row}>
              <span className={styles.subject}>{r.title ?? t('session.untitled')}</span>
              <strong className={styles.winner}>{r.winner.nickname}</strong>
            </div>
            <p className={styles.meta}>
              {t(`assign.games.${r.game}`)}
              {' · '}
              <time dateTime={r.at}>{new Date(r.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</time>
              {r.weighted && <> · <Icon name="scale" size={13} /></>}
              {r.candidates.length > 1 && <> · {t('assign.amongN', { count: r.candidates.length })}</>}
              {r.undone && <> · {t('assign.undone')}</>}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
