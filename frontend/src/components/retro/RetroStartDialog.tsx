import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RETRO_COLUMNS, RETRO_WRITE_CHOICES } from '../../lib/retro';
import { useRoomStore } from '../../store/roomStore';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { SwitchRow } from '../RoomSettings';
import settings from '../RoomSettings.module.css';
import { tone } from './RetroSticky';
import styles from './Retro.module.css';

/** Krupiye retroyu başlatır: pano önizlemesi, yazma süresi, anonimlik. */
export function RetroStartDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const startRetro = useRoomStore((s) => s.startRetro);
  const [anonymous, setAnonymous] = useState(true);
  const [seconds, setSeconds] = useState(480);

  const start = () => {
    startRetro(anonymous, seconds);
    onClose();
  };

  return (
    <Dialog title={t('retro.start')} onClose={onClose}>
      <div className={settings.form}>
        <div className={settings.rows}>
          <div style={{ padding: '4px 24px 18px' }}>
            <p className="muted" style={{ margin: '0 0 12px' }}>{t('retro.startLead')}</p>
            <div className={styles.preview} aria-hidden>
              {RETRO_COLUMNS.map((c) => (
                <div key={c.id} className={styles.previewCol} style={{ ...tone(c.id), ['--t1' as string]: '#159a6e', ['--t2' as string]: '#e08a14', ['--t3' as string]: '#5b63e0' }}>
                  <b><Icon name={c.icon} size={14} />{t(`retro.columns.${c.key}`)}</b>
                  <i /><i />
                </div>
              ))}
            </div>
          </div>
          <div className={settings.row} role="group" aria-label={t('retro.writeTime')}>
            <span className={settings.text}><b>{t('retro.writeTime')}</b><span>{t('retro.writeTimeHint')}</span></span>
            <span className={settings.chips}>
              {RETRO_WRITE_CHOICES.map((s) => (
                <button key={s} type="button" className={`${settings.chip} ${seconds === s ? settings.chipOn : ''}`} aria-pressed={seconds === s} onClick={() => setSeconds(s)}>
                  {s ? t('retro.minutes', { count: s / 60 }) : t('retro.noLimit')}
                </button>
              ))}
            </span>
          </div>
          <SwitchRow title={t('retro.anonymous')} hint={t('retro.anonymousHint')} on={anonymous} onChange={setAnonymous} />
        </div>
        <div className={settings.footer}>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={start}>{t('retro.startButton')}</button>
        </div>
      </div>
    </Dialog>
  );
}
