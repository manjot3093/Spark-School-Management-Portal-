import { createContext, useContext } from 'react';
import type { Theme } from '../utils/theme';

export const ThemeContext = createContext<{ theme: Theme; chooseTheme: (theme: Theme) => void } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Theme controls require ThemeProvider');
  return context;
}
