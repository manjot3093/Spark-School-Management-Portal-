import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import Assistant from '../../pages/Assistant/Assistant';

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); requestAnimationFrame(() => button.current?.focus()); }
    };
    document.addEventListener('keydown', onKeyDown);
    panel.current?.querySelector<HTMLElement>('textarea')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <>
    {open && <div ref={panel} id="portal-assistant-panel" role="region" aria-label="Portal assistant chat"
      className="fixed bottom-36 left-3 right-3 z-[70] h-[min(70vh,600px)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#1d3568]/20 sm:bottom-24 sm:left-auto sm:right-6 sm:w-[390px]">
      <button type="button" aria-label="Close assistant" onClick={() => { setOpen(false); requestAnimationFrame(() => button.current?.focus()); }}
        className="absolute right-2 top-2 z-10 rounded-lg bg-white p-2 text-[#1d3568] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ee742b]"><X size={18}/></button>
      <Assistant compact />
    </div>}
    <button ref={button} type="button" aria-label={open ? 'Close portal assistant' : 'Open portal assistant'}
      aria-expanded={open} aria-controls="portal-assistant-panel" onClick={() => setOpen(value => !value)}
      className="fixed bottom-20 right-4 z-[70] flex h-12 w-12 sm:h-14 sm:w-14 sm:bottom-6 sm:right-6 items-center justify-center rounded-full bg-[#1d3568] text-white shadow-xl hover:shadow-2xl transition-all hover:bg-[#235b88] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ee742b] motion-reduce:transition-none">
      {open ? <X size={22} className="sm:w-6 sm:h-6" aria-hidden="true"/> : <MessageCircle size={22} className="sm:w-6 sm:h-6" aria-hidden="true"/>}
    </button>
  </>;
}
