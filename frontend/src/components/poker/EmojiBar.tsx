import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import styles from './EmojiBar.module.css';

/** Sunucudaki izinli listeyle aynı (Validation.TABLE_EMOJIS). */
export const TABLE_EMOJIS = ['👍', '🎉', '🤔', '😂', '😮', '👏', '🔥', '☕'];

/** Masaya emoji fırlatma. Sunucu kişi başına hız sınırı uygular; burada da kısa bir bekleme var. */
export function EmojiBar() {
  const { t } = useTranslation();
  const throwEmoji = useRoomStore((s) => s.throwEmoji);
  const [cooling, setCooling] = useState(false);

  const send = (emoji: string) => {
    if (cooling) return;
    throwEmoji(emoji);
    setCooling(true);
    setTimeout(() => setCooling(false), 700);
  };

  return (
    <div className={styles.bar} role="group" aria-label={t('emoji.title')}>
      <span className={styles.label}>{t('emoji.title')}</span>
      {TABLE_EMOJIS.map((e) => (
        <button key={e} type="button" className={styles.button} disabled={cooling} onClick={() => send(e)}
          aria-label={t('emoji.throw', { emoji: e })}>
          {e}
        </button>
      ))}
    </div>
  );
}
