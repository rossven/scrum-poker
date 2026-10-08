import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/http';
import type { JoinResult, RoomInfo } from '../api/types';
import { AvatarPicker } from '../components/AvatarPicker';
import { isValidAvatar, randomAvatar } from '../lib/avatar';
import { navigate } from '../lib/router';
import { preferences, sessions } from '../lib/session';
import styles from './Form.module.css';

interface Props {
  info: RoomInfo;
  onJoined: (result: JoinResult) => void;
}

export function JoinForm({ info, onJoined }: Props) {
  const { t } = useTranslation();
  // Önceki odalarda kullanılan isim/avatar hatırlanır (yalnızca bu tarayıcıda).
  const [nickname, setNickname] = useState(() => preferences.get('nickname', ''));
  const [avatar, setAvatar] = useState(() => {
    const saved = preferences.get('avatar', '');
    return isValidAvatar(saved) ? saved : randomAvatar();
  });
  const [observer, setObserver] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Aynı isimde çevrimdışı bir koltuk var: "Bu koltuk senin mi?" sorusu.
  const [askTakeover, setAskTakeover] = useState(false);

  const trimmed = nickname.trim();
  const valid = [...trimmed].length >= 1 && [...trimmed].length <= 24;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError('INVALID_NICKNAME');
      return;
    }
    void send(undefined);
  };

  const send = async (takeover: boolean | undefined) => {
    setBusy(true);
    setError(null);
    setAskTakeover(false);
    try {
      const result = await api.join(info.code, {
        takeover,
        nickname: trimmed,
        avatar,
        observer,
        password: info.passwordProtected ? password : undefined,
        claimToken: sessions.getClaim(info.code) ?? undefined,
      });
      sessions.clearClaim(info.code);
      preferences.set('nickname', trimmed);
      preferences.set('avatar', avatar);
      onJoined(result);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'UNKNOWN';
      if (code === 'SEAT_TAKEOVER') setAskTakeover(true);
      else setError(code);
      setBusy(false);
    }
  };

  return (
    <form className={`card ${styles.form}`} onSubmit={submit}>
      <h1 className={styles.title}>{info.name ?? t('join.title')}</h1>
      <p className={styles.subtitle}>
        {t('room.code')}: <strong>{info.code}</strong>
        {info.passwordProtected && <> · 🔒 {t('room.passwordProtected')}</>}
      </p>

      <div className="field">
        <label htmlFor="nickname">{t('join.nickname')}</label>
        <input id="nickname" className="input" value={nickname} maxLength={48} autoFocus
          placeholder={t('join.nicknamePlaceholder')} onChange={(e) => setNickname(e.target.value)} />
      </div>

      <div className="field">
        <span className="label">{t('join.avatar')}</span>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>

      {info.passwordProtected && (
        <div className="field">
          <label htmlFor="room-password">{t('join.password')}</label>
          <input id="room-password" className="input" type="password" maxLength={64} value={password}
            autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}

      <label className={styles.checkbox}>
        <input type="checkbox" checked={observer} onChange={(e) => setObserver(e.target.checked)} />
        <span>{t('join.observer')}</span>
      </label>

      {error && <p className="error-text">{t(`errors.${error}`)}</p>}

      {askTakeover && (
        <div className={styles.takeover} role="alertdialog" aria-labelledby="takeover-q">
          <p id="takeover-q"><strong>{t('join.takeoverQuestion', { name: trimmed })}</strong></p>
          <p className="muted">{t('join.takeoverHint')}</p>
          <div className={styles.buttons}>
            <button type="button" className="btn" onClick={() => void send(false)}>{t('join.newSeat')}</button>
            <button type="button" className="btn btn-primary" onClick={() => void send(true)}>{t('join.takeover')}</button>
          </div>
        </div>
      )}

      <div className={styles.buttons}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>{t('common.back')}</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !valid}>{t('join.submit')}</button>
      </div>
    </form>
  );
}
