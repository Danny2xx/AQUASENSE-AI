'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Send, Loader, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'What is the current compliance status?',
  'Why is COD high and what should I do?',
  'Explain the active alerts',
  'What does AMBER status mean?',
];

function AssistantMessage({ content, streaming }: { content: string; streaming: boolean }) {
  if (!content && streaming) {
    return (
      <span className="inline-flex items-center gap-1 px-1 py-0.5">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    );
  }
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-slate-200">{children}</li>,
        code: ({ children }) => <code className="bg-slate-700 text-blue-300 px-1 rounded text-xs font-mono">{children}</code>,
        h3: ({ children }) => <h3 className="font-bold text-white mb-1 mt-2">{children}</h3>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your **AquaSense AI** assistant. Ask me about current sensor readings, compliance status, alerts, or wastewater treatment guidance." },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(-10) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Chat unavailable' }));
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `**Error:** ${err.error}` }]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { token, error } = JSON.parse(payload);
            if (error) {
              setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: `**Error:** ${error}` }]);
              return;
            }
            if (token) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), { ...last, content: last.content + token }];
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Connection error — is the backend running?' }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-[200] rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
        style={{ width: 54, height: 54 }}
        title="AquaSense AI Chat"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[200] w-[380px] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-600 shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">AquaSense Assistant</div>
              <div className="text-xs text-blue-200">Wastewater compliance AI</div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-blue-200 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant'
                    ? <AssistantMessage content={m.content} streaming={streaming && i === messages.length - 1} />
                    : m.content
                  }
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} disabled={streaming}
                  className="text-xs bg-slate-800 hover:bg-blue-900/50 text-slate-300 hover:text-blue-300 px-2.5 py-1.5 rounded-full border border-slate-700 hover:border-blue-700 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-700/50 bg-slate-900 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about sensors, alerts, compliance…"
              disabled={streaming}
              className="flex-1 bg-slate-800 text-slate-200 text-sm rounded-xl px-3.5 py-2 outline-none border border-slate-700 focus:border-blue-500 disabled:opacity-60 placeholder-slate-500 transition-colors"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
            >
              {streaming
                ? <Loader size={15} className="animate-spin text-white" />
                : <Send size={15} className="text-white" />
              }
            </button>
          </div>
        </div>
      )}
    </>
  );
}
