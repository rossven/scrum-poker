import { useTranslation } from 'react-i18next';
import { setSoundEnabled, useSoundEnabled } from '../lib/sound';

/** Tek tuşla ses aç/kapa. Varsayılan kapalı. */
export function SoundToggle() {
  const { t } = useTranslation();
  const on = useSoundEnabled();
  const label = on ? t('sound.on') : t('sound.off');
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      aria-pressed={on}
      onClick={() => setSoundEnabled(!on)}
      title={label}
      aria-label={label}
    >
      <span aria-hidden>{on ? '🔔' : '🔕'}</span>
      <span>{t('sound.label')}</span>
    </button>
  );
}
