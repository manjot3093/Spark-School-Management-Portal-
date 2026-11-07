import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Copy,
  CheckCircle,
  Clock,
  ExternalLink,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BroadcastMessage {
  id: string;
  subject: string;
  body: string;
  date: string;
  targetType: 'group' | 'community' | 'general';
}

const WhatsAppWebSMSIntegration: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'group' | 'community' | 'general'>('group');
  const [groupLink, setGroupLink] = useState('');

  const [history, setHistory] = useState<BroadcastMessage[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('broadcast_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse broadcast history', e);
      }
    }
  }, []);

  const saveToHistory = (msg: BroadcastMessage) => {
    const newHistory = [msg, ...history].slice(0, 20); // Keep last 20
    setHistory(newHistory);
    localStorage.setItem('broadcast_history', JSON.stringify(newHistory));
  };

  const constructMessage = () => {
    const header = subject ? `*${subject.toUpperCase()}*\n\n` : '';
    return `${header}${message}`;
  };

  const handleOpenAndShare = async () => {
    if (!message.trim()) {
      toast.error('Please write a message first.');
      return;
    }

    const fullMessage = constructMessage();

    try {
      const newMsg: BroadcastMessage = {
        id: Date.now().toString(),
        subject,
        body: message,
        date: new Date().toISOString(),
        targetType: 'general'
      };
      saveToHistory(newMsg);

      const wappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
      window.open(wappUrl, '_blank');

      setSubject('');
      setMessage('');
    } catch (err) {
      toast.error('Failed to open WhatsApp.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#20386b] px-6 py-8 text-white shadow-[0_20px_50px_#243d711f] md:px-9 md:py-10">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[34px] border-[#f57a3224]" aria-hidden="true" />
        <p className="relative mb-4 text-xs font-bold uppercase tracking-[.18em] text-[#ffad72]">Community / messages</p>
        <h1 className="relative font-['Manrope'] text-3xl font-extrabold tracking-[-.05em] md:text-[40px]">Communication broadcast</h1>
        <p className="relative mt-2 max-w-2xl text-sm text-[#d9e3f5]">Compose an announcement and share it with your school community through WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Composer Area */}
        <div className="overflow-hidden rounded-[24px] border border-[#e0e7f2] bg-white shadow-[0_18px_50px_#2038630c] lg:col-span-2">
          <div className="flex items-center gap-4 border-b border-[#e7ecf5] bg-[#fbfcff] p-6">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Message Composer</h2>
              <p className="text-sm text-gray-500">Write your school announcement here</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Subject (Optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Update: School Holiday"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Message Body <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder="Write your announcement details here..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all resize-none"
              />
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <p>Formatting: *bold* _italic_ ~strikethrough~</p>
                <p>{message.length} characters</p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                onClick={handleOpenAndShare}
                disabled={!message.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4782e] py-3.5 text-lg font-bold text-white shadow-md shadow-[#f4782e30] transition-shadow hover:bg-[#db6222] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                Open & Share on WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">

          {/* Instructions Card */}
          <div className="rounded-2xl border border-[#dfe6f2] bg-[#eef3fb] p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span className="p-1 bg-blue-200 rounded-md"><MessageSquare className="h-4 w-4 text-blue-700" /></span>
              How it works
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 leading-relaxed">
              <li>Draft your message in the composer.</li>
              <li>Include an optional subject.</li>
              <li>Click <b>Open & Share on WhatsApp</b>.</li>
              <li>WhatsApp will open with your drafted message.</li>
              <li>Select the contacts or groups to broadcast to!</li>
            </ol>
          </div>

          {/* History Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
              <History className="h-5 w-5 text-gray-400" />
              Recent Broadcasts
            </h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-8">No recent broadcasts found.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="group border border-gray-100 rounded-xl p-4 hover:border-orange-200 hover:bg-orange-50/30 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.subject || 'No Subject'}</p>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                        {item.targetType === 'group' ? 'Group' : 'Direct'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                      {item.body}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(item.date)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubject(item.subject);
                          setMessage(item.body);
                        }}
                        className="text-orange-600 hover:text-orange-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Reuse Draft
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WhatsAppWebSMSIntegration;
