import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import styles from './Dialog.module.css';

interface Props {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  /** Geniş (Kim alacak?) ya da dar (ayarlar) panel. */
  size?: 'wide' | 'narrow';
  /** Başlık çubuğunu gizle (içerik kendi başlığını çizer). */
  bare?: boolean;
}

/** Perde üstünde panel: Esc ile kapanır (kapatılabilirse), açılınca odak panele gider. Telefonda alttan açılır. */
export function Dialog({ title, onClose, children, size = 'narrow', bare }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`${styles.dialog} ${size === 'wide' ? styles.wide : styles.narrow}`}>
        {!bare && (
          <div className={styles.head}>
            <h1 className={styles.title}>{title}</h1>
            {onClose && (
              <button type="button" className={styles.close} aria-label={t('common.close')} onClick={onClose}><Icon name="close" size={20} /></button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
