import { useTranslation } from 'react-i18next';
import { useLanguage, setLanguage } from '../lib/language';
import { navigate, useRoute } from '../lib/router';

/** Dil düğmesi: etkin dilin değil, geçilecek dilin kodunu gösterir (TR iken "EN"). */
export function LanguageToggle() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const route = useRoute();
  const next = lang === 'tr' ? 'en' : 'tr';
  const label = t('language.switchTo', { name: t(`language.${next}`, { lng: next }) });
  const toggle = () => {
    setLanguage(next);
    // Ana sayfanın adresi dili taşır (/ ve /en); diğer sayfalarda adres aynı kalır.
    if (route.name === 'home') navigate(next === 'en' ? '/en' : '/');
  };
  return (
    <button type="button" className="ib" onClick={toggle} title={label} aria-label={label} lang={next}>
      <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>{next.toUpperCase()}</span>
    </button>
  );
}
