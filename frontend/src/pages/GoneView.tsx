import { useTranslation } from 'react-i18next';
import type { GoneReason } from '../store/roomStore';
import { navigate } from '../lib/router';
import styles from './Form.module.css';

export function GoneView({ reason }: { reason: GoneReason }) {
  const { t } = useTranslation();
  if (reason === 'kicked') {
    // Kalıcı engel yok: aynı linkle yeniden katılabilir (token silindi, sayfa yenilenince katılma formu gelir).
    return (
      <div className={`card ${styles.form}`} role="alert">
        <h1 className={styles.title}>{t('gone.kickedTitle')}</h1>
        <p className="muted">{t('gone.kickedBody')}</p>
        <div className={styles.buttons}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>{t('common.back')}</button>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{t('gone.rejoin')}</button>
        </div>
      </div>
    );
  }
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
