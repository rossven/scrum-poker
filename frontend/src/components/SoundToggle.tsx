import { useTranslation } from 'react-i18next';
import { setSoundEnabled, useSoundEnabled } from '../lib/sound';
import { Icon } from './Icon';

/** Tek tuşla ses aç/kapa (simge düğmesi). Varsayılan kapalı. */
export function SoundToggle() {
  const { t } = useTranslation();
  const on = useSoundEnabled();
  const label = on ? t('sound.on') : t('sound.off');
  return (
    <button type="button" className="ib" aria-pressed={on} onClick={() => setSoundEnabled(!on)} title={label} aria-label={label}>
      <Icon name={on ? 'bell' : 'bellOff'} size={18} />
    </button>
  );
}
