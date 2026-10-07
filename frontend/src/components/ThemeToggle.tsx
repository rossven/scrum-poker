import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeChoice } from '../lib/theme';

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];
const ICON: Record<ThemeChoice, string> = { system: '🖥️', light: '☀️', dark: '🌙' };

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      onClick={() => setTheme(next)}
      title={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
      aria-label={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
    >
      <span aria-hidden>{ICON[theme]}</span>
      <span>{t(`theme.${theme}`)}</span>
    </button>
  );
}
