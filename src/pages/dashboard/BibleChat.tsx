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
  Bot
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Cooldown duration in seconds after daily limit is exhausted (free tier). */
const COOLDOWN_SECONDS = 120;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
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

// ─── TypewriterMessage ────────────────────────────────────────────────────────

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
      const timer = setTimeout(() => setIndex((p) => p + 1), 30);
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

  // Conversation / message state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Usage / limit state
  const [usage, setUsage] = useState<{ used: number; limit: number | null; tier: string }>({
    used: 0,
    limit: 5,
    tier: 'free',
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── Cooldown state ────────────────────────────────────────────────────────
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipFetchRef = useRef(false);

  // Placeholder cycling
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    'Ask about scripture, theology, or prayer...',
    'What does the Bible say about anxiety?',
    'How can I grow in my prayer life?',
    'Explain the meaning of John 3:16',
    'What are some verses about strength?',
    'How do I forgive someone?',
  ];
  useEffect(() => {
    const interval = setInterval(
      () => setPlaceholderIndex((p) => (p + 1) % placeholders.length),
      4000,
    );
    return () => clearInterval(interval);
  }, []);

  // ── Cooldown helpers ──────────────────────────────────────────────────────

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
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const handleVerseClick = (reference: string) => {
    const match = reference.match(/^((?:\d\s+)?[A-Z][a-z]+)\s+(\d+):(\d+)/);
    if (match) {
      navigate('/dashboard/bible', {
        state: {
          jumpTo: {
            book: match[1],
            chapter: parseInt(match[2]),
            verse: parseInt(match[3]),
          },
        },
      });
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // ── Fetch on mount ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchUsage();

    const state = location.state as { initialMessage?: string };
    if (state?.initialMessage) {
      setInput(state.initialMessage);
    }
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

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchConversations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    } else {
      setConversations(data ?? []);
    }
    setLoadingConversations(false);
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
    } else {
      setMessages(data ?? []);
    }
    setLoadingMessages(false);
  };

  const fetchUsage = async () => {
    if (!user) return;
    if (isPro) {
      setUsage({ used: 0, limit: null, tier: 'pro' });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const tier = profile?.subscription_tier || 'free';
    const isPaidTier = tier === 'pro_monthly' || tier === 'pro_yearly' || tier === 'pro';

    if (isPaidTier) {
      setUsage({ used: 0, limit: null, tier });
    } else {
      const { data: usageData } = await supabase
        .from('chat_usage')
        .select('message_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      setUsage({ used: usageData?.message_count || 0, limit: 5, tier });
    }
  };

  // ── Conversation management ───────────────────────────────────────────────

  const createConversation = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select('id, title, updated_at')
      .single();
    if (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
    if (data) {
      setConversations((prev) => [data, ...prev]);
      setActiveConversation(data);
      return data.id;
    }
    return null;
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from('chat_conversations').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete conversation:', error);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
      setMessages([]);
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

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsTyping(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      let conversationId = activeConversation?.id;
      if (!conversationId) {
        skipFetchRef.current = true;
        conversationId = await createConversation();
        if (!conversationId) {
          setIsTyping(false);
          return;
        }
      }

      trackEvent('chat_message_sent', { conversation_id: conversationId });

      const { data, error } = await supabase.functions.invoke('bible-chat', {
        body: {
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          conversation_id: conversationId,
        },
      });

      if (error && error.context?.status === 429) {
        setIsTyping(false);
        const errBody = error.context as { error?: string; rate_limited?: boolean } | null;
        if (errBody?.rate_limited) {
          const rateLimitMsg: Message = {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: "I'm receiving too many requests right now. Please wait a moment and try again. 🙏",
          };
          setMessages((prev) => [...prev, rateLimitMsg]);
        } else {
          setUsage((prev) => ({ ...prev, used: prev.limit ?? 5 }));
          setShowUpgradeModal(true);
          startCooldown(COOLDOWN_SECONDS);
        }
        return;
      }

      if (error) {
        const errData = error.context && typeof error.context === 'object' ? error.context : null;
        throw new Error(
          (errData as { error?: string } | null)?.error || error.message || 'Failed to get response',
        );
      }

      const assistantMessage: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: data.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.usage) {
        setUsage(data.usage);
        if (data.usage.limit !== null && data.usage.used >= data.usage.limit && !isPro) {
          startCooldown(COOLDOWN_SECONDS);
        }
      }

      if (messages.length === 0 && conversationId) {
        const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
        await supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', conversationId);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
        );
        if (activeConversation?.id === conversationId) {
          setActiveConversation((prev) => (prev ? { ...prev, title } : prev));
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  };

  const startNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setSidebarOpen(false);
  };

  const usagePercent =
    usage.limit !== null ? Math.min((usage.used / usage.limit) * 100, 100) : 0;

  const inputDisabled = isTyping || isCooldownActive;

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-navy-900 border-r border-navy-800/50 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-navy-800/50">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-bold px-4 py-3 rounded-2xl hover:bg-gold-300 transition-all shadow-lg shadow-gold-400/10 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Journey
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingConversations ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-gold-400" />
              <span className="text-xs text-navy-500 font-medium tracking-widest uppercase">Loading history</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 bg-navy-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-navy-600" />
              </div>
              <p className="text-xs text-navy-400 leading-relaxed font-medium">Your spiritual conversations will appear here.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex flex-col gap-1 px-4 py-3.5 rounded-2xl cursor-pointer transition-all border ${
                  activeConversation?.id === conv.id
                    ? 'bg-navy-800 border-gold-400/30 text-white shadow-xl shadow-black/20'
                    : 'text-navy-400 border-transparent hover:bg-navy-800/40 hover:text-navy-200'
                }`}
                onClick={() => selectConversation(conv)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    activeConversation?.id === conv.id ? 'bg-gold-400/10 text-gold-400' : 'bg-navy-800/50 text-navy-600'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-sm truncate flex-1 font-semibold">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition-all hover:bg-red-400/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-11">
                  <Clock className="w-3 h-3 text-navy-600" />
                  <span className="text-[10px] text-navy-600 font-bold uppercase tracking-wider">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Usage section */}
        <div className="p-5 border-t border-navy-800/50 bg-navy-900/50">
          {!isPro && usage.limit !== null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  <span className="text-xs font-bold text-navy-300 uppercase tracking-wider">Usage</span>
                </div>
                <span className="text-xs font-bold text-white">
                  {usage.used} <span className="text-navy-500">/</span> {usage.limit}
                </span>
              </div>
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden p-[2px]">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(251,191,36,0.2)] ${
                    usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-gold-gradient'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full bg-navy-800 border border-gold-400/20 text-gold-400 text-[11px] font-bold py-2.5 rounded-xl hover:bg-gold-400 hover:text-navy-950 transition-all uppercase tracking-widest"
              >
                Go Unlimited
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gold-400/5 border border-gold-400/20 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20">
                  <Sparkles className="w-5 h-5 text-navy-950" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Pro Status</p>
                  <p className="text-[10px] font-medium text-gold-400 uppercase tracking-widest">Unlimited Chat</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-5 border-b border-navy-800/50 bg-navy-950/80 backdrop-blur-xl relative z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-navy-400 hover:text-white p-2 hover:bg-navy-800 rounded-xl transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="w-12 h-12 bg-navy-900 border border-gold-400/30 rounded-2xl flex items-center justify-center shadow-2xl relative group">
             <div className="absolute inset-0 bg-gold-400/10 rounded-2xl blur-md group-hover:bg-gold-400/20 transition-all" />
             <Cross className="w-6 h-6 text-gold-400 relative z-10" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate tracking-tight">
              {activeConversation?.title || 'Bible Chat'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-gold-400 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-[11px] font-bold text-navy-400 uppercase tracking-widest">
                {isTyping ? 'Thinking...' : 'AI Bible Scholar'}
              </span>
            </div>
          </div>
        </header>

        {/* Messages Content */}
        <div className="flex-1 overflow-y-auto pb-40 lg:pb-8">
          {messages.length === 0 && !loadingMessages ? (
            <div className="max-w-2xl mx-auto px-6 pt-12 lg:pt-20 text-center animate-slide-up-fade">
              <div className="w-24 h-24 bg-gold-400/5 border border-gold-400/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl animate-float">
                <Bot className="w-12 h-12 text-gold-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Spirit-Led Conversations</h2>
              <p className="text-navy-300 text-lg mb-12 leading-relaxed">
                Explore the depth of scripture, find comfort in God&apos;s promises, and grow in your spiritual walk through AI-guided biblical insights.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {[
                  { icon: '🙏', text: 'How do I deepen my prayer life?' },
                  { icon: '💡', text: 'Explain the concept of grace' },
                  { icon: '🌊', text: 'Verses for finding peace' },
                  { icon: '✨', text: 'Meaning of John 3:16' }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(item.text); inputRef.current?.focus(); }}
                    className="group bg-navy-900/40 border border-navy-800/50 rounded-2xl p-5 hover:bg-navy-800/60 hover:border-gold-400/30 transition-all duration-300 flex items-center gap-4 shadow-xl shadow-black/20"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <span className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-300">{item.icon}</span>
                    <span className="text-sm font-semibold text-navy-200 group-hover:text-white transition-colors">{item.text}</span>
                    <ChevronRight className="w-4 h-4 text-navy-600 ml-auto group-hover:text-gold-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
              {messages.map((message, idx) => {
                const isAI = message.role === 'assistant';
                const userName = user?.user_metadata?.full_name || user?.email || 'Disciple';
                const userInitial = userName.charAt(0).toUpperCase();

                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 sm:gap-6 animate-slide-up-fade ${!isAI ? 'flex-row-reverse' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 shadow-2xl transition-all duration-500 group ${
                      isAI ? 'bg-navy-900 border-gold-400/20' : 'bg-gold-gradient border-gold-300 text-navy-950 font-bold'
                    }`}>
                      {isAI ? <Bot className="w-6 h-6 text-gold-400" /> : <span className="text-xl">{userInitial}</span>}
                    </div>

                    {/* Bubble */}
                    <div className={`flex flex-col ${!isAI ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                      <div className={`relative px-6 py-5 rounded-[2rem] text-[15px] leading-relaxed shadow-2xl transition-all duration-500 ${
                        isAI 
                          ? 'bg-navy-900/60 backdrop-blur-md border border-white/5 text-navy-100 rounded-tl-none' 
                          : 'bg-navy-800 border border-navy-700 text-white rounded-tr-none'
                      }`}>
                        {isAI && idx === messages.length - 1 && !isTyping ? (
                          <TypewriterMessage
                            content={message.content}
                            onVerseClick={handleVerseClick}
                            onComplete={scrollToBottom}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">
                            {isAI ? formatMessageContent(message.content, handleVerseClick) : message.content}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 px-2">
                        <span className="text-[10px] font-bold text-navy-600 uppercase tracking-widest">
                          {isAI ? 'Bible Scholar' : userName.split(' ')[0]}
                        </span>
                        <span className="w-1 h-1 bg-navy-800 rounded-full" />
                        <span className="text-[10px] font-bold text-navy-700 uppercase tracking-widest">
                          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-4 sm:gap-6 animate-slide-up-fade">
                  <div className="w-12 h-12 bg-navy-900 border border-gold-400/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl">
                    <Loader2 className="w-6 h-6 animate-spin text-gold-400" />
                  </div>
                  <div className="bg-navy-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] px-8 py-5 shadow-2xl rounded-tl-none">
                    <div className="flex gap-2">
                      <div className="w-2.5 h-2.5 bg-gold-400 rounded-full animate-pulse-typing" />
                      <div className="w-2.5 h-2.5 bg-gold-400 rounded-full animate-pulse-typing [animation-delay:0.2s]" />
                      <div className="w-2.5 h-2.5 bg-gold-400 rounded-full animate-pulse-typing [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input Bar ── */}
        <div className="fixed lg:absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 lg:p-8 bg-gradient-to-t from-navy-950 via-navy-950/90 to-transparent">
          <div className="max-w-4xl mx-auto">
            
            {isCooldownActive && (
              <div className="mb-4 flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-6 py-3.5 animate-slide-up-fade shadow-xl">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center animate-glow-pulse">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-200 font-bold tracking-tight">Daily message limit reached</p>
                  <p className="text-[11px] text-amber-500/80 font-bold uppercase tracking-wider">Cooldown: {formatCountdown(cooldownRemaining)} remaining</p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-amber-500 text-navy-950 text-xs font-black px-4 py-2 rounded-xl hover:bg-amber-400 transition-all uppercase tracking-tighter"
                >
                  Upgrade Now
                </button>
              </div>
            )}

            <div className={`flex items-end gap-3 bg-navy-900/80 backdrop-blur-2xl border-2 rounded-[2.5rem] p-3 transition-all duration-500 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] ${
              isCooldownActive ? 'border-amber-500/20 opacity-50' : 'border-white/5 focus-within:border-gold-400/40 focus-within:shadow-[0_0_40px_rgba(251,191,36,0.1)]'
            }`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={inputDisabled}
                placeholder={isCooldownActive ? 'Wait for cooldown...' : placeholders[placeholderIndex]}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-navy-600 py-3 pl-4 pr-2 text-[15px] resize-none max-h-40 font-medium scrollbar-none"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={inputDisabled || !input.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                  input.trim() && !inputDisabled
                    ? 'bg-gold-gradient text-navy-950 hover:scale-110 rotate-0'
                    : 'bg-navy-800 text-navy-600 -rotate-45'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-center text-[10px] text-navy-600 mt-4 font-bold uppercase tracking-widest">
              Guided by Scripture &bull; Compassionate Wisdom
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal 
        open={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        limitType="ai_messages"
      />
    </div>
  );
}
