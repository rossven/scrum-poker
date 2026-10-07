import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/http';
import { DeckPicker, deckChoiceCards, deckChoiceValid, type DeckChoice } from '../components/DeckPicker';
import { Shell } from '../components/Shell';
import { navigate, roomPath } from '../lib/router';
import { sessions } from '../lib/session';
import styles from './Form.module.css';

export function CreateRoomPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [deck, setDeck] = useState<DeckChoice>({ deck: 'modified-fibonacci', customText: '' });
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!deckChoiceValid(deck)) return;
    setBusy(true);
    setError(null);
    try {
      const room = await api.createRoom({
        name: name.trim() || undefined,
        deck: deck.deck,
        customDeck: deckChoiceCards(deck),
        password: password || undefined,
      });
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
          <DeckPicker id="deck" value={deck} onChange={setDeck} />
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
          <button type="submit" className="btn btn-primary" disabled={busy || !deckChoiceValid(deck)}>{t('create.submit')}</button>
        </div>
      </form>
    </Shell>
  );
}
