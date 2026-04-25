import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, X, Sparkles, ArrowRight, MapPin } from 'lucide-react';
import { useCopilot } from '@/hooks/useCopilot';
import { useAuth } from '@/context/AuthContext';

function formatSourcePreview(ragContent) {
  if (!ragContent) return '';
  return ragContent.length > 150 ? ragContent.substring(0, 150) + '...' : ragContent;
}

const suggestions = [
  'What congestion patterns occurred today?',
  'Show me all ambulance detections from last week',
  'Summarize critical incidents from the past 24 hours',
  'Which streams had the highest vehicle density?'
];

const loadingSteps = [
  { icon: '🔍', text: 'Searching incident logs...' },
  { icon: '📊', text: 'Analyzing congestion patterns...' },
  { icon: '🚑', text: 'Cross-referencing detections...' },
  { icon: '✨', text: 'Generating response...' }
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function CopilotAvatar({ state }) {
  return (
    <div className="relative flex items-center justify-center w-5 h-5">
      <div className={`w-5 h-5 rounded bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-sm transition-all duration-500 ${state === 'thinking' ? 'animate-avatar-thinking' : state === 'responding' ? 'animate-pulse' : 'animate-avatar-idle'}`}>
        <Sparkles className="w-2.5 h-2.5 text-white" />
      </div>
      {state === 'thinking' && (
        <div className="absolute -inset-0.5 rounded bg-gradient-to-br from-rose-500/30 to-red-600/30 blur-sm animate-pulse" />
      )}
    </div>
  );
}

export default function Copilot() {
  const { mutate, isPending, reset } = useCopilot();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const [loadingStep, setLoadingStep] = useState(0);
  const [sendMorph, setSendMorph] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending, loadingStep]);

  useEffect(() => {
    if (isPending) {
      setLoadingStep(0);
      const intervals = loadingSteps.map((_, i) => {
        return setTimeout(() => setLoadingStep(i + 1), (i + 1) * 800);
      });
      return () => intervals.forEach(clearTimeout);
    }
  }, [isPending]);

  const handleSend = () => {
    const question = input.trim();
    if (!question || isPending) return;

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setExpandedSources({});
    setIsUserTyping(false);
    setSendMorph(true);
    setTimeout(() => setSendMorph(false), 400);

    mutate(
      { question, messages },
      {
        onSuccess: (result) => {
          setMessages(prev => [
            ...prev,
            {
              role: 'copilot',
              content: result.answer,
              sources: result.sources || [],
              contextCount: result.contextCount || 0
            }
          ]);
        },
        onError: (err) => {
          setMessages(prev => [
            ...prev,
            {
              role: 'copilot',
              content: `I encountered an error: ${err.message}. Please try again.`,
              sources: [],
              isError: true
            }
          ]);
        }
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsUserTyping(true);
    typingTimeoutRef.current = setTimeout(() => setIsUserTyping(false), 1500);

    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 120);
    e.target.style.height = newHeight + 'px';
  };

  const clearChat = () => {
    setMessages([]);
    reset();
  };

  const toggleSource = (idx) => {
    setExpandedSources(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const hasMessages = messages.length > 0;
  const userName = user?.name || 'there';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-[#0a0a12] relative overflow-hidden">
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-rose-500/8 to-transparent dark:from-rose-500/[0.04] rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-violet-500/8 to-transparent dark:from-violet-500/[0.04] rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Header */}
      <div className="relative flex-none flex items-center justify-between px-8 py-4 border-b border-gray-200/80 dark:border-white/[0.06] glass-strong z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1
              className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Traffic Intelligence Copilot
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-[0.15em] uppercase mt-0.5">
              Powered by AI · Retrieval-Augmented Generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasMessages && (
            <button
              onClick={clearChat}
              className="group flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 border border-gray-200/80 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] rounded-lg transition-all duration-200"
            >
              <X size={11} className="group-hover:rotate-90 transition-transform duration-300" />
              Clear
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200/80 dark:border-emerald-500/[0.15] rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold tracking-wide">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="relative flex-1 overflow-y-auto copilot-scroll z-10">
        {/* Empty State */}
        {!hasMessages && !isPending && (
          <div className="flex flex-col items-center justify-center px-8 py-16 min-h-full">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-12 animate-fade-in-down">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-white/[0.08] flex items-center justify-center shadow-xl dark:shadow-2xl relative z-10">
                    <Sparkles size={24} className="text-gray-600 dark:text-slate-300" />
                  </div>
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-rose-500/10 to-violet-500/10 dark:from-rose-500/[0.06] dark:to-violet-500/[0.06] blur-xl animate-pulse-glow -z-0" />
                </div>

                <h2
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {getGreeting()}, <span className="text-gradient-rose">{userName}</span>
                </h2>
                <p className="text-gray-500 dark:text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Ask me anything about your traffic operations.
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
                {suggestions.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(text); inputRef.current?.focus(); }}
                    className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800/40 border border-gray-200/80 dark:border-white/[0.06] hover:border-rose-300/60 dark:hover:border-rose-500/30 rounded-xl text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${i * 80 + 200}ms` }}
                  >
                    <span>{text}</span>
                    <ArrowRight size={12} className="text-gray-300 dark:text-slate-600 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-all duration-200 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {hasMessages && (
          <div className="px-8 py-8 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`space-y-3 ${msg.role === 'user' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[65%] px-5 py-3 bg-gradient-to-r from-rose-500 to-red-600 rounded-2xl rounded-br-md shadow-lg shadow-rose-500/15">
                      <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] px-6 py-5 bg-white dark:bg-slate-800/50 border border-gray-200/80 dark:border-white/[0.06] border-l-2 border-l-rose-500 rounded-2xl rounded-tl-md shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <CopilotAvatar state="responding" />
                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Copilot</span>
                        {msg.contextCount !== undefined && msg.contextCount > 0 && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-600 font-mono">
                            · {msg.contextCount} source{msg.contextCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                          <button
                            onClick={() => toggleSource(idx)}
                            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors group"
                          >
                            {expandedSources[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            <span className="group-hover:underline">View sources</span>
                            <span className="text-[10px] bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full">{msg.sources.length}</span>
                          </button>
                          {expandedSources[idx] && (
                            <div className="mt-3 space-y-2 animate-fade-in-up">
                              {msg.sources.map((src) => (
                                <div
                                  key={src.id}
                                  className="text-xs p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-lg"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-gray-400 dark:text-slate-600 text-[10px]">
                                      {src.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <MapPin size={10} className="text-gray-300 dark:text-slate-600" />
                                  </div>
                                  <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
                                    {formatSourcePreview(src.preview)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {msg.isError && (
                        <div className="mt-4 px-3 py-2 bg-red-50 dark:bg-red-500/[0.08] border border-red-200/80 dark:border-red-500/[0.15] rounded-lg">
                          <p className="text-xs text-red-600 dark:text-red-400">System error — please retry</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading State */}
            {isPending && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[75%] px-6 py-5 bg-white dark:bg-slate-800/50 border border-gray-200/80 dark:border-white/[0.06] border-l-2 border-l-rose-500 rounded-2xl rounded-tl-md shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CopilotAvatar state="thinking" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Copilot</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">thinking...</span>
                  </div>
                  <div className="space-y-3">
                    {loadingSteps.map((step, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 transition-all duration-300 ${i < loadingStep ? 'opacity-40' : i === loadingStep ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
                      >
                        <span className="text-xs">{step.icon}</span>
                        <span className={`text-xs ${i < loadingStep ? 'text-gray-400 dark:text-slate-500' : 'text-gray-600 dark:text-slate-300'}`}>
                          {step.text}
                        </span>
                        {i === loadingStep && <span className="animate-typing-cursor text-rose-500">▎</span>}
                      </div>
                    ))}
                    <div className="w-full h-1 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(loadingStep / loadingSteps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Prominent Input Bar */}
      <div className="relative flex-none px-8 py-6 border-t border-gray-200/80 dark:border-white/[0.06] glass-strong z-20">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about traffic incidents, patterns, or events..."
              disabled={isPending}
              rows={1}
              className="w-full px-5 py-4 bg-white dark:bg-slate-800/50 border border-gray-200/80 dark:border-white/[0.08] focus:border-rose-400 dark:focus:border-rose-500/40 focus:ring-2 focus:ring-rose-500/[0.08] focus:outline-none rounded-2xl text-[15px] text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 transition-all duration-200 disabled:opacity-50 resize-none overflow-hidden shadow-sm"
              style={{ minHeight: '52px', maxHeight: '120px' }}
            />
            {/* Typing indicator */}
            {isUserTyping && (
              <div className="absolute bottom-3.5 right-4 flex items-center gap-1.5 animate-fade-in">
                <div className="flex gap-0.5">
                  <span className="typing-dot bg-rose-400/60 dark:bg-rose-500/40" />
                  <span className="typing-dot bg-rose-400/60 dark:bg-rose-500/40" />
                  <span className="typing-dot bg-rose-400/60 dark:bg-rose-500/40" />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className={`flex items-center justify-center w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-500 hover:to-red-600 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 flex-shrink-0 group ${sendMorph ? 'animate-morph-send' : ''}`}
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} className="text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between max-w-3xl mx-auto mt-3">
          <p className="text-[10px] text-gray-400 dark:text-slate-600 font-mono">
            AI responses generated from incident logs. Verify critical info independently.
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-600 font-mono hidden sm:block">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.06] rounded text-[9px]">Enter</kbd>
            {' '}to send · <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/[0.06] rounded text-[9px]">Shift+Enter</kbd>
            {' '}new line
          </p>
        </div>
      </div>
    </div>
  );
}
