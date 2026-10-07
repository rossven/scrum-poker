import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../store/roomStore';
import styles from './Toasts.module.css';

export function Toasts() {
  const { t } = useTranslation();
  const toasts = useRoomStore((s) => s.toasts);
  const dismiss = useRoomStore((s) => s.dismissToast);
  return (
    <div className={styles.stack} aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            className={styles.toast}
            onClick={() => dismiss(toast.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {t(toast.key, toast.params)}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
