import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Copy,
  Check,
  Key,
  Bot,
  AlertCircle,
  Briefcase,
  Target,
  Coins,
  ChevronDown,
} from 'lucide-react';
import type { ResumeData } from '../../types/resume';
import type { JobApplication } from '../../types/tracker';
import {
  sendAiChatMessage,
  type ChatMessage,
} from '../../utils/aiChatService';
import MarkdownRenderer from '../Common/MarkdownRenderer';
import { apiService } from '../../utils/apiService';

interface Props {
  resumeData: ResumeData;
  selectedApplication?: JobApplication | null;
  onOpenSettings?: () => void;
}

const STORAGE_KEY = 'ats_ai_chat_session_history';

export default function AIChatWidget({
  resumeData,
  selectedApplication,
  onOpenSettings,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved chat messages:', e);
    }
    return [];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync API Key from localStorage
  useEffect(() => {
    const syncKey = () => {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
    };
    window.addEventListener('storage', syncKey);
    return () => window.removeEventListener('storage', syncKey);
  }, []);

  // Save messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not save chat messages to sessionStorage:', e);
    }
  }, [messages]);

  // Scroll to bottom when messages update or widget opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const hasApiKey = Boolean(apiKey.trim()) || apiService.isLoggedIn();

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || loading) return;

    if (!hasApiKey) {
      setShowKeyInput(true);
      setError('Veuillez renseigner votre clé API Gemini pour démarrer le chat.');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setError(null);
    setLoading(true);

    try {
      const isCloud = apiService.isLoggedIn();
      const reply = await sendAiChatMessage({
        resumeData,
        application: selectedApplication,
        history: messages,
        userMessage: textToSend,
        apiKey: apiKey.trim(),
        isCloudConnected: isCloud,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...newHistory, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'appel IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Effacer tout l’historique de cette discussion ?')) {
      setMessages([]);
      setError(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveInlineApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyDraft.trim()) return;
    localStorage.setItem('gemini_api_key', keyDraft.trim());
    setApiKey(keyDraft.trim());
    setShowKeyInput(false);
    setKeyDraft('');
    setError(null);
  };

  // Quick suggestion prompts
  const suggestions = [
    {
      icon: <Target size={13} className="text-indigo-500" />,
      label: 'Compétences à ajouter',
      prompt: 'Quelles compétences clés me manquent ou devrais-je valoriser davantage pour correspondre à cette offre ou ce poste ?',
    },
    {
      icon: <Coins size={13} className="text-emerald-500" />,
      label: 'Estimer salaire / TJM',
      prompt: 'Peux-tu estimer mon salaire de marché réaliste (en CDI brut/net) et mon TJM freelance pour ce profil et cette offre en 2026, avec des arguments de négociation ?',
    },
    {
      icon: <Sparkles size={13} className="text-amber-500" />,
      label: 'Forces & Faiblesses',
      prompt: 'Fais une analyse rapide de mes points forts et axes d’amélioration par rapport à cette offre/ce rôle.',
    },
    {
      icon: <Briefcase size={13} className="text-purple-500" />,
      label: 'Arguments d’entretien',
      prompt: 'Quels sont les 3 meilleurs arguments concrets (réalisations chiffrées de mon CV) à préparer pour l’entretien d’embauche ?',
    },
  ];

  // Context subtitle
  const contextBadge = selectedApplication
    ? `Candidature : ${selectedApplication.companyName || 'En cours'}`
    : resumeData.targetJobDescription
    ? 'Offre ciblée définie'
    : `CV : ${resumeData.personalInfo.fullName || 'Profil général'}`;

  return (
    <>
      {/* Floating Action Button (Info-Bulle) */}
      <div className="fixed bottom-16 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white pl-3.5 pr-4 py-2.5 rounded-full shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            title="Ouvrir l'assistant IA Carrière"
            aria-label="Assistant IA Carrière"
          >
            <div className="relative">
              <Sparkles size={18} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-900" />
            </div>
            <span className="text-xs font-semibold tracking-wide hidden sm:inline">
              Assistant IA
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm">
              {selectedApplication ? 'Candidature' : 'CV'}
            </span>
          </button>
        )}
      </div>

      {/* Chat Window Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Assistant IA Carrière"
          className="fixed bottom-16 right-3 sm:right-6 lg:bottom-6 z-40 w-[calc(100vw-24px)] sm:w-[420px] md:w-[460px] h-[540px] max-h-[82vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-white/15 rounded-lg shrink-0">
                <Bot size={18} className="text-indigo-100" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs text-white truncate">
                    Coach & Assistant IA
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                </div>
                <p className="text-[10px] text-indigo-100/80 truncate">
                  {contextBadge}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Effacer la discussion"
                  className="p-1.5 rounded-lg text-indigo-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  else setShowKeyInput(prev => !prev);
                }}
                title="Clé API Gemini"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  hasApiKey
                    ? 'text-indigo-100 hover:text-white hover:bg-white/10'
                    : 'text-amber-200 bg-amber-500/20 hover:bg-amber-500/30'
                }`}
              >
                <Key size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Réduire le chat"
                className="p-1.5 rounded-lg text-indigo-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronDown size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Fermer"
                className="p-1.5 rounded-lg text-indigo-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Inline Key Configuration Alert */}
          {(showKeyInput || !hasApiKey) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shrink-0">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">Clé API requise :</span> Pour discuter avec l'assistant, renseignez votre clé Google Gemini.
                </div>
              </div>
              <form onSubmit={handleSaveInlineApiKey} className="flex gap-2">
                <input
                  type="password"
                  placeholder="Collez votre clé API Gemini (AIzaSy...)"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-xs transition-colors cursor-pointer"
                >
                  Valider
                </button>
              </form>
            </div>
          )}

          {/* Quick Suggestions Pills */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(sug.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {sug.icon}
                <span>{sug.label}</span>
              </button>
            ))}
          </div>

          {/* Message History */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-gray-50/30 dark:bg-gray-950/30">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500 dark:text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                  <Sparkles size={24} />
                </div>
                <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-1">
                  Posez vos questions à l'IA
                </h4>
                <p className="text-[11px] leading-relaxed max-w-xs mb-3">
                  Interrogez l'assistant sur l'adéquation de votre CV avec l'offre ciblée, vos compétences ou une estimation de salaire / TJM.
                </p>
                <div className="grid grid-cols-1 gap-1.5 w-full max-w-xs text-left">
                  {suggestions.slice(0, 2).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(s.prompt)}
                      className="text-[11px] p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      {s.icon}
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                    }`}
                  >
                    {!isUser ? (
                      <div>
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-100 dark:border-gray-800/80 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                            <Bot size={12} />
                            Assistant IA
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            title="Copier la réponse"
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer p-0.5"
                          >
                            {copiedId === msg.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs shadow-sm flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    L'IA analyse le CV et le marché...
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer / Input Area */}
          <div className="p-2.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
            <div className="relative flex items-center">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question sur votre CV, compétences, salaire..."
                disabled={loading}
                className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-24 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Envoyer (Entrée)"
              >
                <Send size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-gray-400 dark:text-gray-500 select-none">
              <span>Entrée pour envoyer, Maj+Entrée saut de ligne</span>
              <span>Modèle Gemini 2.5</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
