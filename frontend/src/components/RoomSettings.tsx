import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../store/roomStore';
import styles from './RoomSettings.module.css';

/** Moderatör paneli: şifre değiştir/kaldır, odayı kapat. */
export function RoomSettings({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const setPassword = useRoomStore((s) => s.setPassword);
  const closeRoom = useRoomStore((s) => s.closeRoom);
  const toast = useRoomStore((s) => s.toast);
  const [password, setPw] = useState('');

  const save = (e: FormEvent) => {
    e.preventDefault();
    setPassword(password);
    setPw('');
    toast('room.passwordSaved');
    onClose();
  };

  const close = () => {
    if (window.confirm(t('room.closeConfirm'))) closeRoom();
  };

  return (
    <div className={`card ${styles.panel}`}>
      <h2 className={styles.title}>{t('room.settings')}</h2>
      <form onSubmit={save} className="field">
        <label htmlFor="new-password">{t('room.newPassword')}</label>
        <div className={styles.row}>
          <input id="new-password" type="password" className="input" maxLength={64} autoComplete="new-password"
            value={password} onChange={(e) => setPw(e.target.value)} />
          <button type="submit" className="btn">{t('common.save')}</button>
        </div>
      </form>
      <div className={styles.footer}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-danger" onClick={close}>{t('room.closeRoom')}</button>
      </div>
    </div>
  );
}
