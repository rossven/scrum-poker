import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { Icon, type IconName } from './Icon';

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];
const ICON: Record<ThemeChoice, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      className="ib"
      onClick={() => setTheme(next)}
      title={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
      aria-label={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
    >
      <Icon name={ICON[theme]} size={18} />
    </button>
  );
}
