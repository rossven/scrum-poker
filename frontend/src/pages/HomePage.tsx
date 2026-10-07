import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Shell } from '../components/Shell';
import { navigate, roomPath } from '../lib/router';
import styles from './HomePage.module.css';

export function HomePage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');

  const join = (e: FormEvent) => {
    e.preventDefault();
    // Link yapıştırılırsa kodu ayıkla.
    const clean = code.trim().split('/').pop()?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ?? '';
    if (clean) navigate(roomPath(clean));
  };

  return (
    <Shell>
      <section className={styles.hero}>
        <div className={styles.table} aria-hidden>
          <div className={styles.tableTop}>
            {['3', '5', '8'].map((v, i) => (
              <span key={v} className={styles.card} style={{ rotate: `${(i - 1) * 9}deg` }}>
                {v}
              </span>
            ))}
          </div>
        </div>
        <h1 className={styles.title}>{t('app.name')}</h1>
        <p className={styles.tagline}>{t('app.tagline')}</p>

        <div className={`card ${styles.actions}`}>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/yeni')}>
            {t('home.create')}
          </button>
          <div className={styles.or}>
            <span>{t('home.or')}</span>
          </div>
          <form className={styles.joinForm} onSubmit={join}>
            <label htmlFor="code" className="visually-hidden">
              {t('home.codePlaceholder')}
            </label>
            <input
              id="code"
              className={`input ${styles.codeInput}`}
              placeholder={t('home.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button type="submit" className="btn" disabled={!code.trim()}>
              {t('home.join')}
            </button>
          </form>
        </div>
      </section>
    </Shell>
  );
}
