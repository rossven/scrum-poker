import { useTranslation } from 'react-i18next';
import type { GoneReason } from '../store/roomStore';
import { navigate } from '../lib/router';
import styles from './Form.module.css';

export function GoneView({ reason }: { reason: GoneReason }) {
  const { t } = useTranslation();
  const title = reason === 'closed_by_moderator' ? t('gone.closedTitle') : t('gone.notFoundTitle');
  const body =
    reason === 'closed_by_moderator' ? t('gone.closedBody') : reason === 'expired' ? t('gone.expiredBody') : t('gone.notFoundBody');
  return (
    <div className={`card ${styles.form}`} role="alert">
      <h1 className={styles.title}>{title}</h1>
      <p className="muted">{body}</p>
      <div className={styles.buttons}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>{t('common.back')}</button>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/yeni')}>{t('gone.newRoom')}</button>
      </div>
    </div>
  );
}
