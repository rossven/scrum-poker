import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import { Icon } from '../Icon';
import { Menu } from '../Menu';
import styles from './EmojiBar.module.css';

/** Sunucudaki izinli listeyle aynı (Validation.TABLE_EMOJIS). */
export const TABLE_EMOJIS = ['👍', '🎉', '🤔', '😂', '😮', '👏', '🔥', '☕'];

/**
 * Tek "Tepki" düğmesi; açılınca emojiler. Masaya fırlatılan emoji herkeste uçar.
 * Sunucu kişi başına hız sınırı uygular; burada da kısa bir bekleme var.
 */
export function EmojiBar({ iconOnly }: { iconOnly?: boolean }) {
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
    <Menu label={t('emoji.title')} up align="end" triggerClassName={styles.trigger}
      trigger={<><Icon name="smile" size={16} />{!iconOnly && <span>{t('emoji.react')}</span>}</>}>
      <div className={styles.grid} role="group" aria-label={t('emoji.title')}>
        {TABLE_EMOJIS.map((e) => (
          <button key={e} type="button" className={styles.button} disabled={cooling} onClick={() => send(e)}
            aria-label={t('emoji.throw', { emoji: e })}>
            {e}
          </button>
        ))}
      </div>
    </Menu>
  );
}
