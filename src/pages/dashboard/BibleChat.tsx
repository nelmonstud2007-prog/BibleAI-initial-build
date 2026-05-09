import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Send,
  Bot,
  User,
  Cross,
  Plus,
  MessageSquare,
  Trash2,
  X,
  Sparkles,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import UpgradeModal from '../../components/UpgradeModal';
import { trackEvent } from '../../lib/analytics';

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

const SYSTEM_PROMPT =
  'You are a knowledgeable and compassionate Bible scholar. Answer all questions using scripture references. Always cite specific Bible verses (book, chapter, verse). Be warm, encouraging, and faith-centered.';

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
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold-400/10 text-gold-400 font-bold border border-gold-400/20 mx-1 text-[11px] align-middle shadow-sm hover:bg-gold-400/20 transition-colors"
      >
        📖 {ref}
      </button>
    );
    lastIndex = verseRegex.lastIndex;
  }
  result.push(content.substring(lastIndex));
  return result;
};

const TypewriterMessage = ({ content, onVerseClick, onComplete }: { content: string; onVerseClick?: (ref: string) => void; onComplete?: () => void }) => {
  const words = useMemo(() => content.split(' '), [content]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < words.length) {
      const timer = setTimeout(() => {
        setIndex((prev) => prev + 1);
      }, 30);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, words, onComplete]);

  return (
    <div className="whitespace-pre-wrap break-words">
      {formatMessageContent(words.slice(0, index).join(' '), onVerseClick)}
      {index < words.length && (
        <span className="inline-block w-1.5 h-4 bg-gold-400/50 ml-1 animate-pulse align-middle" />
      )}
    </div>
  );
};

export default function BibleChat() {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number | null; tier: string }>({
    used: 0,
    limit: 5,
    tier: 'free',
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipFetchRef = useRef(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "Ask about scripture, theology, or prayer...",
    "What does the Bible say about anxiety?",
    "How can I grow in my prayer life?",
    "Explain the meaning of John 3:16",
    "What are some verses about strength?",
    "How do I forgive someone?"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleVerseClick = (reference: string) => {
    const match = reference.match(/^((?:\d\s+)?[A-Z][a-z]+)\s+(\d+):(\d+)/);
    if (match) {
      navigate('/dashboard/bible', { 
        state: { 
          jumpTo: {
            book: match[1],
            chapter: parseInt(match[2]),
            verse: parseInt(match[3])
          }
        } 
      });
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchUsage();

    // Check for initial message from navigation state (e.g., from Bible page)
    const state = location.state as { initialMessage?: string };
    if (state?.initialMessage) {
      setInput(state.initialMessage);
      // We don't auto-send to allow user to edit, or we could auto-send.
      // User requested "Ask AI" which usually implies sending.
      // I'll set the input and let the user click send, or I could trigger handleSend.
      // Given the "Ask AI" intent, I'll trigger it if input is set this way.
    }
  }, [user, location.state]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      if (skipFetchRef.current) {
        skipFetchRef.current = false;
        return;
      }
      fetchMessages(activeConversation.id);
    }
    // Removed else { setMessages([]) } to prevent optimistic messages from being cleared
  }, [activeConversation?.id]);

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
      setLoadingConversations(false);
      return;
    }
    setConversations(data ?? []);
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
      setLoadingMessages(false);
      return;
    }
    setMessages(data ?? []);
    setLoadingMessages(false);
  };

  const fetchUsage = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      console.error('Failed to fetch usage profile:', profileError);
      return;
    }

    const tier = profile?.subscription_tier || 'free';

    if (tier === 'free') {
      const { data: usageData, error: usageError } = await supabase
        .from('chat_usage')
        .select('message_count')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      if (usageError) {
        console.error('Failed to fetch chat usage:', usageError);
      }
      setUsage({ used: usageData?.message_count || 0, limit: 5, tier });
    } else {
      setUsage({ used: 0, limit: null, tier });
    }
  };

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
      setConversations([data, ...conversations]);
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
    setConversations(conversations.filter((c) => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    // Check limit for free users
    if (usage.tier === 'free' && usage.limit !== null && usage.used >= usage.limit) {
      setShowUpgradeModal(true);
      return;
    }

    // Add user message to UI immediately for instant feedback
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsTyping(true);

    // Auto-resize textarea back
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      let conversationId = activeConversation?.id;

      // Create conversation if none active
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
        // Check if it's a Groq rate limit or daily limit
        const errBody = error.context as { error?: string; rate_limited?: boolean } | null;
        if (errBody?.rate_limited) {
          // Groq rate limit - show friendly message in chat
          const rateLimitMsg: Message = {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: "I'm receiving too many requests right now. Please wait a moment and try again. 🙏",
          };
          setMessages((prev) => [...prev, rateLimitMsg]);
        } else {
          // Daily limit reached - show upgrade modal
          setShowUpgradeModal(true);
          setUsage((prev) => ({ ...prev, used: prev.limit ?? 5 }));
        }
        return;
      }

      if (error) {
        const errData = error.context && typeof error.context === 'object' ? error.context : null;
        throw new Error((errData as { error?: string } | null)?.error || error.message || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update usage
      if (data.usage) {
        setUsage(data.usage);
      }

      // Update conversation title from first message
      if (messages.length === 0 && conversationId) {
        const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
        await supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', conversationId);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c))
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
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  };

  const startNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setSidebarOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const selectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setSidebarOpen(false);
  };

  const usagePercent =
    usage.limit !== null ? Math.min((usage.used / usage.limit) * 100, 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile conversation sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-navy-900 border-r border-navy-800 flex flex-col transform transition-transform duration-200 ease-in-out lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* New chat button */}
        <div className="p-3 border-b border-navy-800">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 bg-gold-400/10 border border-gold-400/20 text-gold-400 font-medium px-4 py-2.5 rounded-xl hover:bg-gold-400/20 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-navy-600 mx-auto mb-2" />
              <p className="text-xs text-navy-400">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex flex-col gap-1 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
                  activeConversation?.id === conv.id
                    ? 'bg-gold-400/10 border-gold-400/20 text-gold-400 shadow-lg shadow-gold-400/5'
                    : 'text-navy-300 border-transparent hover:bg-navy-800/50 hover:text-white'
                }`}
                onClick={() => selectConversation(conv)}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1 font-medium">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-navy-500 pl-6">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Usage counter */}
        <div className="p-3 border-t border-navy-800">
          {usage.tier === 'free' && usage.limit !== null ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-navy-400">Daily Messages</span>
                <span className="text-xs font-medium text-navy-200">
                  {usage.used}/{usage.limit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-navy-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usagePercent >= 100
                      ? 'bg-red-400'
                      : usagePercent >= 80
                        ? 'bg-amber-400'
                        : 'bg-gold-400'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {usage.used >= usage.limit && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="mt-2 w-full text-xs text-gold-400 hover:text-gold-300 font-medium transition-colors"
                >
                  Upgrade for unlimited messages
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-medium">Pro - Unlimited</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-gold-400/20 bg-navy-950/80 backdrop-blur-md relative z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-navy-300 hover:text-white p-1 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-gold-400/10 rounded-xl flex items-center justify-center border border-gold-400/20 shadow-lg shadow-gold-400/5">
            <Cross className="w-5 h-5 text-gold-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">
              {activeConversation?.title || 'Bible Chat'}
            </h1>
            <p className="text-[11px] text-navy-400 flex items-center gap-1.5 uppercase tracking-wider font-medium">
              {isTyping && <Loader2 className="w-3 h-3 animate-spin text-gold-400" />}
              {isTyping ? 'BibleAI is preparing a response...' : 'Pro Bible Scholar'}
            </p>
          </div>
          {/* Mobile usage badge */}
          {usage.tier === 'free' && usage.limit !== null && (
            <div
              className={`sm:hidden px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                usage.used >= usage.limit
                  ? 'bg-red-400/10 text-red-400 border-red-400/20'
                  : 'bg-navy-800 text-navy-300 border-navy-700'
              }`}
            >
              {usage.used}/{usage.limit}
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto pb-36 lg:pb-0">
          {messages.length === 0 && !loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-12 animate-fade-in-up">
              <div className="w-20 h-20 bg-gold-400/10 rounded-3xl flex items-center justify-center mb-6 border border-gold-400/20 shadow-2xl shadow-gold-400/5">
                <Cross className="w-10 h-10 text-gold-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Faith Journey Begins</h2>
              <p className="text-sm text-navy-300 text-center max-w-md mb-10 leading-relaxed">
                Ask anything about scripture, theology, prayer, or how to apply God&apos;s Word to
                your life today.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                {[
                  'What does the Bible say about anxiety?',
                  'How do I forgive someone?',
                  'What is the meaning of John 3:16?',
                  'How can I grow in my prayer life?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-left bg-navy-900/40 border border-navy-800 rounded-2xl px-5 py-4 text-sm text-navy-200 hover:text-white hover:border-gold-400/30 hover:bg-navy-900/60 hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-black/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8 space-y-8">
              {messages.map((message, idx) => {
                const isAI = message.role === 'assistant';
                const userName = user?.user_metadata?.full_name || user?.email || 'User';
                const userInitial = userName.charAt(0).toUpperCase();

                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 animate-fade-in-up group ${!isAI ? 'flex-row-reverse' : ''}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-md transition-transform group-hover:scale-110 ${
                        isAI 
                          ? 'bg-navy-950 border-gold-400/30 text-xl' 
                          : 'bg-gold-400 text-navy-950 font-bold border-gold-300'
                      }`}
                    >
                      {isAI ? '📖' : userInitial}
                    </div>
                    <div className={`flex flex-col ${!isAI ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                      <div
                        className={`relative rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-xl transition-all ${
                          isAI
                            ? 'bg-navy-900/90 border border-gold-400/10 text-navy-100 rounded-tl-none'
                            : 'bg-gold-gradient border border-gold-500/30 text-navy-950 font-medium rounded-tr-none'
                        }`}
                      >
                        {isAI && idx === messages.length - 1 && isTyping === false ? (
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
                      <span className="mt-1.5 text-[10px] text-navy-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-4 animate-fade-in-up">
                  <div className="w-10 h-10 bg-navy-950 border border-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <Cross className="w-5 h-5 text-gold-400" />
                  </div>
                  <div className="bg-navy-900/90 border border-navy-800 rounded-2xl px-5 py-4 shadow-xl">
                    <div className="flex gap-2">
                      <span className="w-2 h-2 bg-gold-400/60 rounded-full animate-pulse-typing" />
                      <span className="w-2 h-2 bg-gold-400/60 rounded-full animate-pulse-typing" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-gold-400/60 rounded-full animate-pulse-typing" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="fixed lg:static bottom-0 left-0 right-0 z-30 border-t border-gold-400/10 bg-navy-950/95 backdrop-blur-md px-4 sm:px-6 py-4 lg:py-6 pb-[calc(env(safe-area-inset-bottom)+16px)] lg:pb-8">
          <div className="max-w-3xl mx-auto relative">
            <div className="flex items-center gap-3 bg-navy-900 border border-navy-800 rounded-full pl-6 pr-2 py-2 focus-within:border-gold-400/40 focus-within:ring-1 focus-within:ring-gold-400/20 transition-all duration-300 shadow-2xl shadow-black/40">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder={placeholders[placeholderIndex]}
                rows={1}
                maxLength={1000}
                className="flex-1 bg-transparent text-[15px] text-white placeholder-navy-500 focus:outline-none resize-none max-h-40 leading-relaxed disabled:opacity-60 py-2"
              />
              <div className="flex items-center gap-3 pr-1">
                {input.length > 200 && (
                  <span className={`text-[10px] font-bold transition-colors tabular-nums ${input.length > 900 ? 'text-amber-400' : 'text-navy-500'}`}>
                    {input.length}/1000
                  </span>
                )}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-gold-gradient text-navy-950 p-3 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed flex-shrink-0 shadow-lg shadow-gold-400/20"
                >
                  {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-navy-500 mt-3 text-center font-medium">
              <Sparkles className="w-3 h-3 inline-block mr-1 text-gold-400/60" />
              BibleAI provides faith-centered guidance. Verify with your personal study.
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="ai_messages"
        limitDetail={`${usage.used} of ${usage.limit} daily messages used`}
      />
    </div>
  );
}
