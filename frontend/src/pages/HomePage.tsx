import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../components/brand/Chip';
import { Icon, SuitRow, type IconName } from '../components/Icon';
import { Shell } from '../components/Shell';
import { CardFace } from '../components/poker/CardFace';
import { navigate, roomPath } from '../lib/router';
import styles from './HomePage.module.css';

const FEATURES: { key: string; icon: IconName }[] = [
  { key: 'cards', icon: 'cards' },
  { key: 'assign', icon: 'horse' },
  { key: 'tickets', icon: 'ticket' },
];

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
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <SuitRow size={11} />
            <span>{t('home.eyebrow')}</span>
          </p>
          <h1 className={styles.title}>{t('app.name')}</h1>
          <p className={styles.tagline}>{t('app.tagline')}</p>

          <div className={`card ${styles.actions}`}>
            <button type="button" className={`btn btn-primary ${styles.create}`} onClick={() => navigate('/yeni')}>
              <Icon name="chip" size={20} />
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
                <Icon name="arrowRight" size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className={styles.stage} aria-hidden>
          <div className={styles.table}>
            <div className={styles.tableTop}>
              <div className={styles.fan}>
                {['?', '5', '8', '13'].map((v, i) => (
                  <span key={v} className={styles.card} style={{ rotate: `${(i - 1.5) * 9}deg`, translate: `0 ${Math.abs(i - 1.5) * 5}px` }}>
                    <CardFace value={v} index={i} compact />
                  </span>
                ))}
              </div>
              <Chip tone="red" size={42} className={`${styles.chip} ${styles.chipA}`} />
              <Chip tone="black" size={38} className={`${styles.chip} ${styles.chipB}`} />
              <Chip tone="cream" size={34} className={`${styles.chip} ${styles.chipC}`} />
              <Chip tone="green" size={36} className={`${styles.chip} ${styles.chipD}`} />
              <span className={styles.dealer}>D</span>
            </div>
          </div>
        </div>
      </section>

      <ul className={styles.features}>
        {FEATURES.map((f) => (
          <li key={f.key} className={styles.feature}>
            <span className={styles.featureIcon}><Icon name={f.icon} size={22} /></span>
            <div>
              <h2 className={styles.featureTitle}>{t(`home.features.${f.key}.title`)}</h2>
              <p className={styles.featureText}>{t(`home.features.${f.key}.text`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
