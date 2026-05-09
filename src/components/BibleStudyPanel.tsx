import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Cross,
  User,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import { trackEvent } from '../lib/analytics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const formatMessageContent = (content: string, onVerseClick?: (ref: string) => void) => {
  const verseRegex = /([1-3]\s+)?[A-Z][a-z]+\s+\d+:\d+(-\d+)?/g;
  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = verseRegex.exec(content)) !== null) {
    result.push(content.substring(lastIndex, match.index));
    const ref = match[0];
    
    if (onVerseClick) {
      result.push(
        <button
          key={match.index}
          onClick={() => onVerseClick(ref)}
          className="inline-block px-2 py-0.5 rounded-md bg-gold-400/10 text-gold-400 font-medium border border-gold-400/20 mx-1 text-[11px] align-middle shadow-sm hover:bg-gold-400/20 transition-colors"
        >
          {ref}
        </button>
      );
    } else {
      result.push(
        <span
          key={match.index}
          className="inline-block px-2 py-0.5 rounded-md bg-gold-400/10 text-gold-400 font-medium border border-gold-400/20 mx-1 text-[11px] align-middle shadow-sm"
        >
          {ref}
        </span>
      );
    }
    lastIndex = verseRegex.lastIndex;
  }
  result.push(content.substring(lastIndex));
  return result;
};

const TypewriterMessage = ({ content, onComplete, onVerseClick }: { content: string; onComplete?: () => void; onVerseClick?: (ref: string) => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);
  const CHUNK_SIZE = 8;

  useEffect(() => {
    if (index < content.length) {
      const timer = setTimeout(() => {
        const nextIndex = Math.min(index + CHUNK_SIZE, content.length);
        setDisplayedText(content.substring(0, nextIndex));
        setIndex(nextIndex);
      }, 15);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, content, onComplete]);

  const isComplete = index >= content.length;

  return (
    <div className="whitespace-pre-wrap break-words">
      {isComplete ? formatMessageContent(content, onVerseClick) : displayedText}
      {!isComplete && (
        <span className="inline-block w-1.5 h-4 bg-gold-400/50 ml-1 animate-pulse align-middle" />
      )}
    </div>
  );
};

interface BibleStudyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialVerse: {
    reference: string;
    text: string;
  } | null;
  onVerseClick?: (ref: string) => void;
}

export default function BibleStudyPanel({ isOpen, onClose, initialVerse }: BibleStudyPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number | null; tier: string }>({
    used: 0,
    limit: 5,
    tier: 'free',
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen, scrollToBottom]);

  // Handle initial verse
  useEffect(() => {
    if (isOpen && initialVerse && !conversationId) {
      startStudy();
    }
  }, [isOpen, initialVerse]);

  const startStudy = async () => {
    if (!user || !initialVerse) return;

    // Create conversation
    const title = `Bible Study: ${initialVerse.reference}`;
    const { data: conv, error: convError } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title })
      .select('id')
      .single();

    if (convError) {
      console.error('Failed to create study conversation:', convError);
      return;
    }

    setConversationId(conv.id);

    // Prepare initial message
    const initialText = `I am studying ${initialVerse.reference}: "${initialVerse.text}". Can you give me Bible verses and guidance about this?`;
    const userMessage: Message = {
      id: `initial-user-${Date.now()}`,
      role: 'user',
      content: initialText,
    };

    setMessages([userMessage]);
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('bible-chat', {
        body: {
          messages: [{ role: 'user', content: initialText }],
          conversation_id: conv.id,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `initial-resp-${Date.now()}`,
        role: 'assistant',
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      console.error('Study error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || !conversationId) return;

    if (usage.tier === 'free' && usage.limit !== null && usage.used >= usage.limit) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsTyping(true);

    if (inputRef.current) inputRef.current.style.height = 'auto';

    try {
      const { data, error } = await supabase.functions.invoke('bible-chat', {
        body: {
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          conversation_id: conversationId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (data.usage) setUsage(data.usage);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[40%] bg-navy-950 border-l border-gold-400/20 z-[70] flex flex-col shadow-2xl animate-slide-in-right sm:animate-slide-in-right animate-slide-in-bottom sm:bottom-auto bottom-0 max-sm:h-[80vh] max-sm:rounded-t-3xl">
        {/* Header */}
        <div className="p-4 border-b border-gold-400/10 flex items-center justify-between bg-navy-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold-400/10 rounded-lg flex items-center justify-center border border-gold-400/20">
              <Cross className="w-4 h-4 text-gold-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Bible Study</h2>
              <p className="text-[10px] text-gold-400/80 font-medium uppercase tracking-wider">
                {initialVerse?.reference}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-navy-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bible-scrollbar">
          {messages.map((m, i) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                m.role === 'assistant' ? 'bg-navy-950 border-gold-400/20' : 'bg-gold-400/10 border-navy-700'
              }`}>
                {m.role === 'assistant' ? <Cross className="w-4 h-4 text-gold-400" /> : <User className="w-4 h-4 text-navy-300" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                m.role === 'assistant' ? 'bg-navy-900/90 text-navy-100 border border-navy-800' : 'bg-gold-gradient text-navy-950 font-medium border border-gold-500/20'
              }`}>
                {m.role === 'assistant' && i === messages.length - 1 && isTyping === false ? (
                  <TypewriterMessage content={m.content} onComplete={scrollToBottom} onVerseClick={onVerseClick} />
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {m.role === 'assistant' ? formatMessageContent(m.content, onVerseClick) : m.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-navy-950 border border-gold-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Cross className="w-4 h-4 text-gold-400" />
              </div>
              <div className="bg-navy-900/90 border border-navy-800 rounded-2xl px-4 py-3 shadow-lg">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-pulse-typing" />
                  <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-pulse-typing" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 bg-gold-400/60 rounded-full animate-pulse-typing" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gold-400/10 bg-navy-950/80">
          <div className="relative flex items-end gap-2 bg-navy-900 border border-navy-800 rounded-2xl px-4 py-2 focus-within:border-gold-400/30 transition-all shadow-inner">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder="Ask a follow up..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-navy-500 focus:outline-none resize-none py-2 max-h-[120px]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-gold-gradient text-navy-950 p-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex-shrink-0 mb-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1 text-[10px] text-navy-500 font-medium">
              <Sparkles className="w-3 h-3 text-gold-400/60" />
              <span>AI Study Scholar</span>
            </div>
            {usage.tier === 'free' && (
              <span className="text-[10px] text-navy-400">
                {usage.used}/{usage.limit} daily left
              </span>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="ai_messages"
        limitDetail={`${usage.used} of ${usage.limit} daily messages used`}
      />
    </>
  );
}
