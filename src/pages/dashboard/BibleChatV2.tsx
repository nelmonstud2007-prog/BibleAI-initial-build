import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Send,
  Sparkles,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export default function BibleChatV2() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [usage, setUsage] = useState({ used: 0, limit: 5, tier: 'free' });
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user?.id) {
      loadSessions();
      loadUsage();
    }
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const loadSessions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadUsage = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('pro_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const isPro = data?.pro_expires_at && new Date(data.pro_expires_at) > new Date();
      setUsage({
        used: 0,
        limit: isPro ? -1 : 5,
        tier: isPro ? 'pro' : 'free',
      });
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  };

  const createNewSession = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          title: `Chat ${new Date().toLocaleDateString()}`,
        })
        .select('id')
        .single();

      if (error) throw error;

      setCurrentSessionId(data.id);
      setMessages([]);
      await loadSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(
        data?.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        })) || []
      );
      setCurrentSessionId(sessionId);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }

      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || !user?.id) return;

    if (usage.tier === 'free' && usage.limit !== -1 && usage.used >= usage.limit) {
      setCooldownSeconds(60);
      return;
    }

    if (!currentSessionId) {
      await createNewSession();
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('bible-chat', {
        body: {
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversation_id: currentSessionId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUsage(data.usage || usage);
    } catch (err) {
      console.error('Chat error:', err);
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

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? 'w-64' : 'w-0'
        } bg-navy-900 border-r border-navy-800 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b border-navy-800">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 rounded-lg cursor-pointer transition-all group ${
                currentSessionId === session.id
                  ? 'bg-gold-400/20 border border-gold-400/50'
                  : 'bg-navy-950 border border-navy-800 hover:border-gold-400/30'
              }`}
              onClick={() => loadSession(session.id)}
            >
              <p className="text-sm font-medium text-white truncate">{session.title}</p>
              <p className="text-xs text-navy-400 mt-1">
                {new Date(session.created_at).toLocaleDateString()}
              </p>
              {currentSessionId === session.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-navy-900 border-b border-navy-800 px-6 flex items-center justify-between">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <div>
              <h2 className="font-bold text-white">Biblical Scholar</h2>
              <p className="text-xs text-navy-400">AI-Powered Insights</p>
            </div>
          </div>

          <div className="w-8" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Sparkles className="w-12 h-12 text-gold-400/30 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Welcome to Bible Chat</h3>
              <p className="text-navy-400 max-w-md">
                Ask questions about Scripture, theology, prayer, or life guidance. Our AI scholar is here to help you
                deepen your faith.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'assistant'
                      ? 'bg-gold-400/10 border border-gold-400/20'
                      : 'bg-navy-800 border border-navy-700'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Sparkles className="w-4 h-4 text-gold-400" />
                  ) : (
                    <span className="text-xs font-bold text-navy-300">You</span>
                  )}
                </div>
                <div
                  className={`max-w-md rounded-lg px-4 py-3 ${
                    msg.role === 'assistant'
                      ? 'bg-navy-900 border border-navy-800 text-navy-100'
                      : 'bg-gold-gradient text-navy-950 font-medium'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gold-400/10 border border-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-gold-400 animate-pulse" />
              </div>
              <div className="bg-navy-900 border border-navy-800 rounded-lg px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-navy-900 border-t border-navy-800 p-4">
          {cooldownSeconds > 0 && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">
                Daily limit reached. Try again in <span className="font-bold">{cooldownSeconds}s</span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
                onKeyDown={handleKeyDown}
                disabled={isTyping || cooldownSeconds > 0}
                placeholder="Ask about Scripture, theology, or prayer..."
                rows={1}
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 resize-none max-h-[100px]"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || cooldownSeconds > 0}
              className="px-4 py-3 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-navy-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {usage.tier === 'free' ? (
                <span>
                  {usage.used}/{usage.limit} messages today
                </span>
              ) : (
                <span>Unlimited messages</span>
              )}
            </div>
            {usage.tier === 'pro' && (
              <span className="text-gold-400 font-medium">Pro Member</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
