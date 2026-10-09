import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/Icon';
import { Shell } from '../components/Shell';
import { CardFace } from '../components/poker/CardFace';
import { cardTone } from '../lib/deck';
import { SITE_PAGES, useLanguage } from '../lib/language';
import { navigate, roomPath } from '../lib/router';
import styles from './HomePage.module.css';

const HERO_CARDS = ['1', '3', '8', '13'];

const FEATURES: { key: string; icon: IconName }[] = [
  { key: 'cards', icon: 'cards' },
  { key: 'assign', icon: 'horse' },
  { key: 'tickets', icon: 'ticket' },
];

export function HomePage() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const pages = SITE_PAGES[lang];
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
            <span className={styles.dot} aria-hidden />
            {t('home.eyebrow')}
          </p>
          <h1 className={styles.title}>{t('app.name')}</h1>
          <p className={styles.tagline}>{t('app.tagline')}</p>

          <div className={`card ${styles.actions}`}>
            <button type="button" className={`btn btn-primary ${styles.create}`} onClick={() => navigate('/yeni')}>
              <Icon name="plus" size={20} />
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
                {HERO_CARDS.map((v, i) => (
                  <span key={v} className={styles.card} style={{ rotate: `${(i - 1.5) * 8}deg`, translate: `0 ${Math.abs(i - 1.5) * 6}px` }}>
                    <CardFace value={v} tone={cardTone(HERO_CARDS, v)} compact />
                  </span>
                ))}
              </div>
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

      {/* Gerçek bağlantılar: rehber ve gizlilik sayfaları sunucudan gelir, tam sayfa yüklenir. */}
      <nav className={styles.links} aria-label="SprintMasası">
        <a href={pages.guide}>{t('footer.guide')}</a>
        <a href={pages.storyPoints}>{t('footer.storyPoints')}</a>
        <a href={pages.privacy}>{t('footer.privacy')}</a>
        <a href="https://github.com/rossven/scrum-poker" target="_blank" rel="noopener noreferrer">{t('footer.source')}</a>
      </nav>
    </Shell>
  );
}
