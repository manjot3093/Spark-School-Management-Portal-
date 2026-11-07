import { Chart } from 'chart.js';

export type Theme = 'light' | 'dark';
export const storageKey = 'spark-theme';

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Theme remains available when storage is blocked. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const chartText = theme === 'dark' ? '#b6c6df' : '#61738b';
  Chart.defaults.color = chartText;
  Chart.defaults.borderColor = theme === 'dark' ? '#36465e' : '#e2e8f0';
  Object.values(Chart.instances).forEach(chart => {
    chart.options.color = chartText;
    chart.update('none');
  });
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101827' : '#f3f6fc');
}

