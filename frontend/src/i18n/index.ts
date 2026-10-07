import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from './locales/tr.json';

// Yeni dil eklemek: locales/en.json oluştur ve aşağıdaki resources'a ekle.
void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr } },
  lng: 'tr',
  fallbackLng: 'tr',
  interpolation: { escapeValue: false }, // React zaten kaçışlar
});

export default i18n;
