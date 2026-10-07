import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/http';
import type { DeckId } from '../api/types';
import { Shell } from '../components/Shell';
import { navigate, roomPath } from '../lib/router';
import { sessions } from '../lib/session';
import styles from './Form.module.css';

const DECKS: DeckId[] = ['modified-fibonacci', 'fibonacci', 'tshirt'];

export function CreateRoomPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [deck, setDeck] = useState<DeckId>('modified-fibonacci');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const room = await api.createRoom({ name: name.trim() || undefined, deck, password: password || undefined });
      sessions.setClaim(room.code, room.claimToken);
      navigate(roomPath(room.code));
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'UNKNOWN');
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form className={`card ${styles.form}`} onSubmit={submit}>
        <h1 className={styles.title}>{t('create.title')}</h1>

        <div className="field">
          <label htmlFor="name">
            {t('create.name')} <span className="muted">({t('common.optional')})</span>
          </label>
          <input id="name" className="input" maxLength={60} value={name} placeholder={t('create.namePlaceholder')}
            onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="deck">{t('create.deck')}</label>
          <select id="deck" className="input" value={deck} onChange={(e) => setDeck(e.target.value as DeckId)}>
            {DECKS.map((d) => (
              <option key={d} value={d}>{t(`decks.${d}`)}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="password">
            {t('create.password')} <span className="muted">({t('common.optional')})</span>
          </label>
          <input id="password" className="input" type="password" maxLength={64} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <small>{t('create.passwordHint')}</small>
        </div>

        {error && <p className="error-text">{t(`errors.${error}`)}</p>}

        <div className={styles.buttons}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>{t('common.back')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{t('create.submit')}</button>
        </div>
      </form>
    </Shell>
  );
}
