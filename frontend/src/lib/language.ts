import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import type { Lang } from '../i18n/detect';
import { preferences } from './session';

export function setLanguage(lang: Lang) {
  preferences.set('lang', lang);
  document.documentElement.lang = lang;
  void i18n.changeLanguage(lang);
}

export function useLanguage(): Lang {
  const { i18n: instance } = useTranslation();
  return instance.language === 'en' ? 'en' : 'tr';
}

/** Sayı ve saat biçimleri için yerel ayar. */
export const currentLocale = () => (i18n.language === 'en' ? 'en-US' : 'tr-TR');

/** Statik içerik sayfaları (sunucudan gelir, SPA dışı): tam sayfa yüklemesiyle açılır. */
export const SITE_PAGES: Record<Lang, { guide: string; storyPoints: string; privacy: string; home: string }> = {
  tr: { guide: '/planning-poker-nedir', storyPoints: '/story-point-nedir', privacy: '/gizlilik', home: '/' },
  en: { guide: '/en/what-is-planning-poker', storyPoints: '/en/story-points-guide', privacy: '/en/privacy', home: '/en' },
};
