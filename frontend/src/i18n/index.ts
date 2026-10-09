import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectLanguage } from './detect';
import en from './locales/en.json';
import tr from './locales/tr.json';

// Yeni dil eklemek: locales/<kod>.json oluştur, aşağıya ve i18n/detect.ts'teki LANGUAGES listesine ekle.
const lng = detectLanguage();
document.documentElement.lang = lng;

void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en } },
  lng,
  fallbackLng: 'tr',
  interpolation: { escapeValue: false }, // React zaten kaçışlar
});

export default i18n;
