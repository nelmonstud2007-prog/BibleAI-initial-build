import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Send,
  MessageSquare,
  Trash2,
  X,
  Sparkles,
  ChevronLeft,
  Loader2,
  Clock,
  Plus,
  Cross,
  ChevronRight,
  User,
  Bot,
  Scroll,
  Heart,
  Landmark,
  ChevronDown
} from 'lucide-react';
import UpgradeModal from '../../components/UpgradeModal';
import { trackEvent } from '../../lib/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

type PersonaType = 'scholar' | 'guide' | 'historian';

interface Persona {
  id: PersonaType;
  name: string;
  tagline: string;
  icon: any;
  color: string;
  bg: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  { 
    id: 'scholar', 
    name: 'Biblical Scholar', 
    tagline: 'Deep Doctrine & Cross-References', 
    icon: Scroll, 
    color: 'text-blue-400', 
    bg: 'bg-blue-400/10',
    description: 'Focuses on theological precision, Greek/Hebrew meanings, and scriptural harmony.'
  },
  { 
    id: 'guide', 
    name: 'Compassionate Guide', 
    tagline: 'Comfort, Healing & Prayer', 
    icon: Heart, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-400/10',
    description: 'Focuses on emotional support, spiritual encouragement, and practical life application.'
  },
  { 
    id: 'historian', 
    name: 'Historical Analyst', 
    tagline: 'Archeology & Ancient Context', 
    icon: Landmark, 
    color: 'text-amber-400', 
    bg: 'bg-amber-400/10',
    description: 'Focuses on cultural background, archeological findings, and the 1st-century world.'
  }
];

const COOLDOWN_SECONDS = 120;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const formatMessageContent = (content: string, onVerseClick?: (ref: string) => void) => {
  const verseRegex = /([1-3]\s+)?[A-Z][a-z]+\s+\d+:\d+(-\d+)?/g;
  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = verseRegex.exec(content)) !== null) {
    result.push(content.substring(lastIndex, match.index));
    const ref = match[0];
    result.push(
      <button
        key={match.index}
        onClick={() => onVerseClick?.(ref)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-400/10 text-gold-400 font-bold border border-gold-400/20 mx-1 text-[11px] align-middle shadow-sm hover:bg-gold-400/20 transition-all active:scale-95"
      >
        <span className="text-[14px]">📖</span> {ref}
      </button>
    );
    lastIndex = verseRegex.lastIndex;
  }
  result.push(content.substring(lastIndex));
  return result;
};

const TypewriterMessage = ({
  content,
  onVerseClick,
  onComplete,
}: {
  content: string;
  onVerseClick?: (ref: string) => void;
  onComplete?: () => void;
}) => {
  const words = useMemo(() => content.split(' '), [content]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < words.length) {
      const timer = setTimeout(() => setIndex((p) => p + 1), 25);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, words, onComplete]);

  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {formatMessageContent(words.slice(0, index).join(' '), onVerseClick)}
      {index < words.length && (
        <span className="inline-block w-1.5 h-4 bg-gold-400/50 ml-1 animate-pulse align-middle rounded-full" />
      )}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function BibleChat() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaType>('scholar');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const [usage, setUsage] = useState<{ used: number; limit: number | null; tier: string }>({
    used: 0,
    limit: 5,
    tier: 'free',
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipFetchRef = useRef(false);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    'Ask about scripture, theology, or prayer...',
    'What does the Bible say about anxiety?',
    'How can I grow in my prayer life?',
    'Explain the meaning of John 3:16',
    'What are some verses about strength?',
    'How do I forgive someone?',
  ];

  const currentPersona = PERSONAS.find(p => p.id === activePersona)!;

  useEffect(() => {
    const interval = setInterval(() => setPlaceholderIndex((p) => (p + 1) % placeholders.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const startCooldown = useCallback((seconds = COOLDOWN_SECONDS) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldownRemaining(seconds);
    setIsCooldownActive(true);
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          setIsCooldownActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchUsage();
    const state = location.state as { initialMessage?: string };
    if (state?.initialMessage) setInput(state.initialMessage);
  }, [user, location.state]);

  useEffect(() => {
    if (activeConversation) {
      if (skipFetchRef.current) {
        skipFetchRef.current = false;
        return;
      }
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation?.id]);

  const fetchConversations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (!error) setConversations(data ?? []);
    setLoadingConversations(false);
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data ?? []);
    setLoadingMessages(false);
  };

  const fetchUsage = async () => {
    if (!user) return;
    if (isPro) {
      setUsage({ used: 0, limit: null, tier: 'pro' });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase
      .from('chat_usage')
      .select('message_count')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    setUsage({ used: usageData?.message_count || 0, limit: 5, tier: 'free' });
  };

  const createConversation = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select('id, title, updated_at')
      .single();
    if (error) return null;
    setConversations((prev) => [data, ...prev]);
    setActiveConversation(data);
    return data.id;
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from('chat_conversations').delete().eq('id', id);
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || isCooldownActive) return;

    if (!isPro && usage.limit !== null && usage.used >= usage.limit) {
      setShowUpgradeModal(true);
      startCooldown(COOLDOWN_SECONDS);
      return;
    }

    const userMessage: Message = { id: `temp-${Date.now()}`, role: 'user', content: text };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      let conversationId = activeConversation?.id;
      if (!conversationId) {
        skipFetchRef.current = true;
        conversationId = await createConversation();
        if (!conversationId) { setIsTyping(false); return; }
      }

      trackEvent('chat_message_sent', { conversation_id: conversationId, persona: activePersona });

      const { data, error } = await supabase.functions.invoke('bible-chat', {
        body: {
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          conversation_id: conversationId,
          persona: activePersona // Edge function needs to handle this
        },
      });

      if (error && error.context?.status === 429) {
        setUsage((prev) => ({ ...prev, used: prev.limit ?? 5 }));
        setShowUpgradeModal(true);
        startCooldown(COOLDOWN_SECONDS);
        return;
      }

      if (error) throw error;

      const assistantMessage: Message = { id: `resp-${Date.now()}`, role: 'assistant', content: data.content };
      setMessages((prev) => [...prev, assistantMessage]);
      if (data.usage) setUsage(data.usage);

      if (messages.length === 0 && conversationId) {
        const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
        await supabase.from('chat_conversations').update({ title }).eq('id', conversationId);
        setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, title } : c)));
      }
    } catch (error) {
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleVerseClick = (reference: string) => {
    const match = reference.match(/^((?:\d\s+)?[A-Z][a-z]+)\s+(\d+):(\d+)/);
    if (match) {
      navigate('/dashboard/bible', { state: { jumpTo: { book: match[1], chapter: parseInt(match[2]), verse: parseInt(match[3]) } } });
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  const usagePercent = usage.limit !== null ? Math.min((usage.used / usage.limit) * 100, 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} limitType="ai_messages" />

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-navy-900 border-r border-white/5 flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/5">
           <button onClick={() => { setActiveConversation(null); setMessages([]); setSidebarOpen(false); }} className="w-full bg-gold-gradient text-navy-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
             <Plus className="w-5 h-5" />
             New Journey
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
          {loadingConversations ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
               <Loader2 className="w-6 h-6 animate-spin text-gold-400" />
               <p className="text-[10px] font-black text-navy-600 uppercase tracking-widest">Opening History</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 px-6 space-y-4">
               <div className="w-16 h-16 bg-navy-950/50 rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-inner">
                  <MessageSquare className="w-6 h-6 text-navy-700" />
               </div>
               <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] italic">Your journey begins with a single question.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} onClick={() => { setActiveConversation(conv); setSidebarOpen(false); }} className={`group p-4 rounded-2xl cursor-pointer transition-all border ${activeConversation?.id === conv.id ? 'bg-white/5 border-white/10 text-white' : 'text-navy-500 border-transparent hover:bg-white/5 hover:text-navy-200'}`}>
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeConversation?.id === conv.id ? 'bg-gold-400/10 text-gold-400' : 'bg-navy-950/50 text-navy-700 group-hover:text-navy-400'}`}>
                      <Scroll className="w-5 h-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{conv.title}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-navy-600 mt-0.5">{new Date(conv.updated_at).toLocaleDateString()}</p>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-navy-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Usage Section */}
        <div className="p-6 border-t border-white/5 bg-navy-950/50">
           {!isPro ? (
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                   <span className="text-navy-500">Daily Presence</span>
                   <span className="text-gold-400">{usage.used}/{usage.limit} Used</span>
                </div>
                <div className="h-1.5 w-full bg-navy-900 rounded-full overflow-hidden">
                   <div className="h-full bg-gold-gradient transition-all duration-1000" style={{ width: `${usagePercent}%` }} />
                </div>
                <button onClick={() => setShowUpgradeModal(true)} className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-gold-400 hover:text-white transition-colors py-2">
                   Upgrade to Unlimited
                </button>
             </div>
           ) : (
             <div className="flex items-center gap-4 bg-gold-400/5 border border-gold-400/10 p-4 rounded-2xl">
                <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20">
                   <Crown className="w-5 h-5 text-navy-950" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-white uppercase tracking-widest">Pro Disciple</p>
                   <p className="text-[8px] font-black text-gold-400/70 uppercase tracking-[0.2em]">Unlimited Insights</p>
                </div>
             </div>
           )}
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-navy-950 relative overflow-hidden">
        
        {/* Header with Persona Selector */}
        <header className="px-6 py-6 border-b border-white/5 bg-navy-950/80 backdrop-blur-2xl flex items-center justify-between z-30">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-navy-500 hover:text-white p-2">
                 <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 ${currentPersona.bg} rounded-2xl flex items-center justify-center shadow-2xl relative group`}>
                    <div className={`absolute inset-0 ${currentPersona.bg} blur-md opacity-50`} />
                    <currentPersona.icon className={`w-6 h-6 ${currentPersona.color} relative z-10`} />
                 </div>
                 <div>
                    <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">{activeConversation?.title || 'Sanctuary Chat'}</h1>
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[9px] font-black text-navy-500 uppercase tracking-[0.2em]">{currentPersona.name} &bull; Online</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Persona Switcher */}
           <div className="relative">
              <button onClick={() => setShowPersonaMenu(!showPersonaMenu)} className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl hover:bg-white/10 transition-all">
                 <div className={`w-5 h-5 ${currentPersona.bg} rounded flex items-center justify-center`}>
                    <currentPersona.icon className={`w-3 h-3 ${currentPersona.color}`} />
                 </div>
                 <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">{currentPersona.name}</span>
                 <ChevronDown className={`w-4 h-4 text-navy-600 transition-transform ${showPersonaMenu ? 'rotate-180' : ''}`} />
              </button>

              {showPersonaMenu && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-navy-900 border border-white/10 rounded-[2rem] shadow-2xl p-3 animate-scale-in z-50">
                   {PERSONAS.map(p => (
                     <button key={p.id} onClick={() => { setActivePersona(p.id); setShowPersonaMenu(false); }} className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all mb-1 ${activePersona === p.id ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}>
                        <div className={`w-10 h-10 ${p.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                           <p.icon className={`w-5 h-5 ${p.color}`} />
                        </div>
                        <div className="text-left min-w-0">
                           <p className="text-xs font-black text-white uppercase tracking-widest">{p.name}</p>
                           <p className="text-[9px] text-navy-500 font-medium leading-relaxed mt-1">{p.description}</p>
                        </div>
                     </button>
                   ))}
                </div>
              )}
           </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-none pb-40 lg:pb-12 px-6 sm:px-12 py-10">
           {messages.length === 0 && !loadingMessages ? (
             <div className="max-w-3xl mx-auto text-center space-y-12 py-20">
                <div className="w-24 h-24 bg-white/2 border border-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto animate-float shadow-2xl">
                   <Sparkles className="w-10 h-10 text-gold-400" />
                </div>
                <div className="space-y-4">
                   <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">Seek & Find</h2>
                   <p className="text-navy-400 text-lg max-w-xl mx-auto">Your personal sanctuary for biblical exploration. Ask about life, faith, or the deep mysteries of the Word.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-left">
                   {[
                     'What does the Bible say about finding peace?',
                     'How do I stay strong in difficult times?',
                     'Explain the concept of Divine Grace',
                     'Give me a morning prayer for my family'
                   ].map((q, i) => (
                     <button key={i} onClick={() => setInput(q)} className="p-6 bg-navy-900/40 border border-white/5 rounded-[2rem] hover:border-gold-400/30 transition-all group flex items-center justify-between">
                        <span className="text-xs font-black text-navy-300 group-hover:text-white uppercase tracking-widest leading-relaxed flex-1">{q}</span>
                        <ChevronRight className="w-4 h-4 text-navy-700 group-hover:text-gold-400 group-hover:translate-x-1 transition-all" />
                     </button>
                   ))}
                </div>
             </div>
           ) : (
             <div className="max-w-4xl mx-auto space-y-12">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-6 animate-slide-up-fade ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl transition-all ${m.role === 'user' ? 'bg-gold-gradient text-navy-950 font-black' : `${currentPersona.bg} border border-white/5`}`}>
                        {m.role === 'user' ? user?.email?.[0]?.toUpperCase() : <currentPersona.icon className={`w-6 h-6 ${currentPersona.color}`} />}
                     </div>
                     <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                        <div className={`p-6 rounded-[2.5rem] text-[15px] leading-relaxed shadow-2xl transition-all ${m.role === 'user' ? 'bg-navy-800 border border-navy-700 text-white rounded-tr-none' : 'bg-navy-900/60 backdrop-blur-md border border-white/5 text-navy-100 rounded-tl-none'}`}>
                           {m.role === 'assistant' && i === messages.length - 1 && !isTyping ? (
                             <TypewriterMessage content={m.content} onVerseClick={handleVerseClick} onComplete={scrollToBottom} />
                           ) : (
                             <div className="whitespace-pre-wrap">{m.role === 'assistant' ? formatMessageContent(m.content, handleVerseClick) : m.content}</div>
                           )}
                        </div>
                        <div className="flex items-center gap-2 mt-3 px-4">
                           <span className="text-[9px] font-black text-navy-600 uppercase tracking-widest">{m.role === 'user' ? 'Disciple' : currentPersona.name}</span>
                           <span className="w-1 h-1 bg-navy-800 rounded-full" />
                           <span className="text-[9px] font-black text-navy-700 uppercase tracking-widest">{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                        </div>
                     </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-6 animate-slide-up-fade">
                     <div className={`w-12 h-12 ${currentPersona.bg} border border-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl`}>
                        <Loader2 className={`w-6 h-6 animate-spin ${currentPersona.color}`} />
                     </div>
                     <div className="bg-navy-900/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] px-8 py-5 rounded-tl-none shadow-2xl flex gap-2">
                        {[1, 2, 3].map(j => <div key={j} className={`w-2 h-2 ${currentPersona.bg.replace('/10', '/40')} rounded-full animate-pulse`} style={{ animationDelay: `${j * 0.2}s` }} />)}
                     </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
             </div>
           )}
        </div>

        {/* Input */}
        <div className="fixed lg:absolute bottom-0 left-0 right-0 p-6 sm:p-10 bg-gradient-to-t from-navy-950 via-navy-950/90 to-transparent z-30">
           <div className="max-w-4xl mx-auto space-y-4">
              {isCooldownActive && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4 flex items-center justify-between animate-slide-up-fade">
                   <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Presence Cooldown: {formatCountdown(cooldownRemaining)}</p>
                   </div>
                   <button onClick={() => setShowUpgradeModal(true)} className="text-[10px] font-black text-white uppercase tracking-widest bg-amber-500 px-4 py-2 rounded-xl">Unlock Pro</button>
                </div>
              )}
              <div className={`bg-navy-900/80 backdrop-blur-3xl border-2 rounded-[2.5rem] p-3 transition-all flex items-end gap-4 shadow-2xl ${isCooldownActive ? 'border-amber-500/20 opacity-50' : 'border-white/5 focus-within:border-gold-400/40'}`}>
                 <textarea ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }} onKeyDown={handleKeyDown} disabled={isTyping || isCooldownActive} placeholder={isCooldownActive ? 'Resting...' : placeholders[placeholderIndex]} className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-navy-700 py-4 pl-6 text-sm resize-none scrollbar-none font-medium" rows={1} />
                 <button onClick={handleSend} disabled={isTyping || isCooldownActive || !input.trim()} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${input.trim() ? 'bg-gold-gradient text-navy-950 hover:scale-110 active:scale-95' : 'bg-navy-800 text-navy-700 cursor-not-allowed'}`}>
                    <Send className="w-6 h-6" />
                 </button>
              </div>
              <p className="text-center text-[9px] font-black text-navy-600 uppercase tracking-[0.4em]">Guided by Wisdom &bull; Steeped in Grace</p>
           </div>
        </div>
      </div>
    </div>
  );
}
