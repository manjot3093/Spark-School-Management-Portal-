import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext } from './themeState';
import { applyTheme, readTheme, storageKey, type Theme } from '../utils/theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) setTheme(readTheme()); };
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = () => {
      try { if (localStorage.getItem(storageKey)) return; } catch { /* Follow system when storage is unavailable. */ }
      setTheme(media.matches ? 'dark' : 'light');
    };
    window.addEventListener('storage', sync);
    media.addEventListener('change', syncSystem);
    return () => { window.removeEventListener('storage', sync); media.removeEventListener('change', syncSystem); };
  }, []);
  const chooseTheme = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Keep choice for the session. */ }
  };
  return <ThemeContext.Provider value={{ theme, chooseTheme }}>{children}</ThemeContext.Provider>;
}

