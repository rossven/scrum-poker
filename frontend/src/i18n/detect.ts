import { preferences } from '../lib/session';

export type Lang = 'tr' | 'en';
export const LANGUAGES: Lang[] = ['tr', 'en'];

export const isLang = (v: unknown): v is Lang => v === 'tr' || v === 'en';

/** Arama motoru ve link önizleme botları sade bir ana sayfa görsün: kök adres onlara hep Türkçe. */
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse/i;

/**
 * Açılış dili, sırayla:
 * 1. /en adresi İngilizce'dir (aramadan gelen İngilizce ziyaretçi).
 * 2. ?lang=tr|en (rehber sayfalarındaki "Oda oluştur" bağlantıları dili taşır); tercih olarak da kaydedilir.
 * 3. Kaydedilmiş tercih.
 * 4. Tarayıcı dili: ilk Türkçe ya da İngilizce tercih; ikisi de yoksa İngilizce.
 */
export function detectLanguage(): Lang {
  try {
    const path = window.location.pathname;
    if (path === '/en' || path.startsWith('/en/')) return 'en';
    const query = new URLSearchParams(window.location.search).get('lang');
    if (isLang(query)) {
      preferences.set('lang', query);
      return query;
    }
    const stored = preferences.get<string>('lang', '');
    if (isLang(stored)) return stored;
    if (BOT.test(navigator.userAgent)) return 'tr';
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const l of preferred) {
      const code = (l ?? '').toLowerCase();
      if (code.startsWith('tr')) return 'tr';
      if (code.startsWith('en')) return 'en';
    }
    return preferred.some(Boolean) ? 'en' : 'tr';
  } catch {
    return 'tr';
  }
}
