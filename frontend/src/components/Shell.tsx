import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '../lib/router';
import { Logo } from './brand/Logo';
import { ThemeToggle } from './ThemeToggle';
import styles from './Shell.module.css';

/** Ortak sayfa çerçevesi: üstte marka ve tema düğmesi. */
export function Shell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.brand} onClick={() => navigate('/')}>
          <Logo size={30} />
          <span>{t('app.name')}</span>
        </button>
        <div className={styles.actions}>
          {actions}
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
