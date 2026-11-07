import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/themeState';

export default function ThemeToggle({ standalone = false }: { standalone?: boolean }) {
  const { theme, chooseTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', outside);
    container.current?.addEventListener('keydown', escape);
    const element = container.current;
    return () => { document.removeEventListener('mousedown', outside); element?.removeEventListener('keydown', escape); };
  }, [open]);
  const options = <fieldset className="spark-appearance-options"><legend>Color theme</legend>{(['light', 'dark'] as const).map(value => <label key={value} className={theme === value ? 'is-selected' : ''}><input type="radio" name={panelId} value={value} checked={theme === value} onChange={() => chooseTheme(value)} />{value === 'light' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}<span>{value === 'light' ? 'Light' : 'Dark'}</span>{theme === value && <Check size={15} aria-hidden="true" />}</label>)}</fieldset>;
  if (!standalone) return <div className="spark-account-appearance"><p>Appearance</p>{options}</div>;
  return <div ref={container} className="spark-appearance-menu"><button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}><Sun size={17} aria-hidden="true" />Appearance<ChevronDown size={14} aria-hidden="true" /></button>{open && <div id={panelId} className="spark-appearance-panel">{options}</div>}</div>;
}
