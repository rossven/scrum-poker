import { useTranslation } from 'react-i18next';
import type { SocketStatus } from '../api/socket';
import styles from './ConnectionBanner.module.css';

export function ConnectionBanner({ status }: { status: SocketStatus }) {
  const { t } = useTranslation();
  if (status === 'online') return null;
  return (
    <div className={styles.banner} role="status">
      <span className={styles.spinner} aria-hidden />
      {t(`status.${status}`)}
    </div>
  );
}
