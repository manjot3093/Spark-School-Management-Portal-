import { FormEvent, useEffect, useRef, useState } from 'react';
import { Mic, Send, Trash2, Volume2 } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

type Message = { role: 'user' | 'assistant'; content: string; createdAt?: string };
type Recognition = { start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('school_token');
  const response = await fetch(`${API_BASE_URL}/assistant${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}`, ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Assistant request failed');
  return result;
}

export default function Assistant({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const voiceAvailable = typeof window !== 'undefined' && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);

  useEffect(() => {
    request('/conversation').then(data => setMessages(data.messages || [])).catch(err => setError(err.message));
    request('/status').then(data => setConfigured(Boolean(data.configured))).catch(err => setError(err.message));
    return () => { recognition.current?.stop(); window.speechSynthesis?.cancel(); };
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy || configured === false) return;
    setDraft(''); setError(''); setBusy(true);
    setMessages(previous => [...previous, { role: 'user', content }]);
    try {
      const result = await request('/message', { method: 'POST', body: JSON.stringify({ content }) });
      setMessages(result.messages);
    } catch (err) {
      setMessages(previous => previous.slice(0, -1));
      setDraft(content);
      setError(err instanceof Error ? err.message : 'Assistant request failed');
    } finally { setBusy(false); }
  }

  function toggleVoice() {
    if (listening) { recognition.current?.stop(); return; }
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const instance = new SpeechRecognition();
    instance.onresult = event => setDraft(event.results[0][0].transcript);
    instance.onerror = () => { setError('Microphone input failed. You can type your message.'); setListening(false); };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setListening(true);
    instance.start();
  }

  async function clear() {
    try { await request('/conversation', { method: 'DELETE' }); setMessages([]); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not clear conversation'); }
  }

  return <section aria-label="Portal assistant" className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'h-full w-full' : 'mx-auto h-[calc(100vh-8rem)] max-w-5xl'}`}>
    <header className={`flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 ${compact ? 'pr-12' : ''}`}>
      <div><h1 className="text-xl font-bold text-[#1d3568]">Portal assistant</h1><p className="text-sm text-slate-600">Ask about information available to your account.</p></div>
      <button type="button" aria-label="Clear history" onClick={clear} disabled={!messages.length || busy} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#235b88] disabled:opacity-50"><Trash2 size={16}/>{!compact && ' Clear history'}</button>
    </header>
    <div aria-label="Conversation" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#edf3ff]/40 p-5">
      {!messages.length && <p className="max-w-lg rounded-xl bg-white p-4 text-slate-700">Your conversation will appear here. Ask about your school’s students, teachers, classes, or schedule.</p>}
      {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`max-w-[85%] rounded-xl p-4 text-sm leading-relaxed ${message.role === 'user' ? 'ml-auto bg-[#1d3568] text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
        <p className="mb-1 text-xs font-bold">{message.role === 'user' ? 'You' : 'Assistant'}</p><p className="whitespace-pre-wrap">{message.content}</p>
        {message.role === 'assistant' && 'speechSynthesis' in window && <button type="button" aria-label="Read answer aloud" onClick={() => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(message.content)); }} className="mt-2 rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#235b88]"><Volume2 size={16}/></button>}
      </div>)}
      {busy && <p className="text-sm text-slate-600">Assistant is thinking…</p>}<div ref={bottom}/>
    </div>
    {configured === false && <p role="status" className="border-t border-amber-100 bg-amber-50 px-5 py-2 text-sm text-amber-900">Chat is unavailable until the school configures its AI provider. Your saved conversation is still available.</p>}
    {error && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2 text-sm text-red-800">{error}</p>}
    <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 p-4">
      <label className="sr-only" htmlFor="assistant-message">Message</label>
      <textarea id="assistant-message" rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 focus:outline-[#235b88]" placeholder="Ask a portal question"/>
      {voiceAvailable && <button type="button" onClick={toggleVoice} aria-label={listening ? 'Stop microphone' : 'Speak message'} aria-pressed={listening} className="rounded-xl border border-slate-300 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#235b88]"><Mic size={20}/></button>}
      <button type="submit" disabled={busy || configured === false || !draft.trim()} aria-label="Send message" className="rounded-xl bg-[#1d3568] p-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ee742b] disabled:opacity-50"><Send size={20}/></button>
    </form>
  </section>;
}
