import { useEffect, useState } from 'react';
import { preferences } from './session';

export type ThemeChoice = 'system' | 'light' | 'dark';

/** Tema: varsayılan sistem tercihi; elle seçilirse <html data-theme> ile zorlanır. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(() => preferences.get<ThemeChoice>('theme', 'system'));
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    preferences.set('theme', theme);
  }, [theme]);
  return [theme, setTheme] as const;
}
