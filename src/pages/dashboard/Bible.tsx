import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Book as BookIcon,
  ChevronRight,
  Play,
  Pause,
  Square,
  Highlighter,
  MessageSquare,
  Loader2,
  ChevronLeft,
  Settings2,
  ArrowUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface Highlight {
  id: string;
  verse_number: number;
  content: string;
}

const BOOKS = [
  { name: 'Genesis', chapters: 50 }, { name: 'Exodus', chapters: 40 }, { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 }, { name: 'Deuteronomy', chapters: 34 }, { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 }, { name: 'Ruth', chapters: 4 }, { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 }, { name: '1 Kings', chapters: 22 }, { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 }, { name: '2 Chronicles', chapters: 36 }, { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 }, { name: 'Esther', chapters: 10 }, { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 }, { name: 'Proverbs', chapters: 31 }, { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 }, { name: 'Isaiah', chapters: 66 }, { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 }, { name: 'Ezekiel', chapters: 48 }, { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 }, { name: 'Joel', chapters: 3 }, { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 }, { name: 'Jonah', chapters: 4 }, { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 }, { name: 'Habakkuk', chapters: 3 }, { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 }, { name: 'Zechariah', chapters: 14 }, { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 }, { name: 'Mark', chapters: 16 }, { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 }, { name: 'Acts', chapters: 28 }, { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 }, { name: '2 Corinthians', chapters: 13 }, { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 }, { name: 'Philippians', chapters: 4 }, { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 }, { name: '2 Thessalonians', chapters: 3 }, { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 }, { name: 'Titus', chapters: 3 }, { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 }, { name: 'James', chapters: 5 }, { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 }, { name: '1 John', chapters: 5 }, { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 }, { name: 'Jude', chapters: 1 }, { name: 'Revelation', chapters: 22 }
];

export default function Bible() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState('Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selection, setSelection] = useState<{ text: string; verse: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowBackToTop(e.currentTarget.scrollTop > 400);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchChapter = useCallback(async (book: string, chapter: number) => {
    setLoading(true);
    try {
      const response = await fetch(`https://bible-api.com/${book}+${chapter}?translation=kjv`);
      const data = await response.json();
      if (data.verses) {
        setVerses(data.verses);
      }
    } catch (err) {
      console.error('Failed to fetch Bible text:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHighlights = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('id, verse_number, content')
      .eq('user_id', user.id)
      .eq('book', selectedBook)
      .eq('chapter', selectedChapter);
    
    if (!error && data) {
      setHighlights(data);
    }
  }, [user, selectedBook, selectedChapter]);

  useEffect(() => {
    fetchChapter(selectedBook, selectedChapter);
    fetchHighlights();
  }, [selectedBook, selectedChapter, fetchChapter, fetchHighlights]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(`https://bible-api.com/search?q=${searchQuery}&translation=kjv`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const jumpToVerse = (book: string, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      setMenuPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Find which verse was selected
    let node = range.startContainer.parentElement;
    while (node && !node.dataset.verse) {
      node = node.parentElement;
    }

    if (node && node.dataset.verse) {
      setSelection({
        text: sel.toString().trim(),
        verse: parseInt(node.dataset.verse),
      });
      setMenuPos({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 10,
      });
    }
  };

  const saveHighlight = async () => {
    if (!user || !selection) return;
    const { error } = await supabase.from('bible_highlights').insert({
      user_id: user.id,
      book: selectedBook,
      chapter: selectedChapter,
      verse_number: selection.verse,
      content: selection.text,
    });

    if (!error) {
      fetchHighlights();
      setSelection(null);
      setMenuPos(null);
    }
  };

  const askAI = () => {
    if (!selection) return;
    const prompt = `I am studying ${selectedBook} ${selectedChapter}:${selection.verse}. The text is: "${selection.text}". Can you explain this verse to me?`;
    navigate('/dashboard/bible-chat', { state: { initialMessage: prompt } });
  };

  // Audio Logic
  const playChapter = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    const text = verses.map(v => v.text).join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackSpeed;
    utteranceRef.current = utterance;

    let verseStartIndices: number[] = [];
    let currentPos = 0;
    verses.forEach(v => {
      verseStartIndices.push(currentPos);
      currentPos += v.text.length + 1; // +1 for space
    });

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        // Find which verse this charIndex belongs to
        const vIdx = verseStartIndices.findIndex((start, i) => {
          const nextStart = verseStartIndices[i + 1] || Infinity;
          return charIndex >= start && charIndex < nextStart;
        });
        
        if (vIdx !== -1) {
          setCurrentVerseIndex(vIdx);
          // Simple word highlighting within verse
          const verseText = verses[vIdx].text;
          const relativePos = charIndex - verseStartIndices[vIdx];
          const words = verseText.split(/\s+/);
          let wordPos = 0;
          const wordIdx = words.findIndex((w, i) => {
            const start = verseText.indexOf(w, wordPos);
            wordPos = start + w.length;
            return relativePos >= start && relativePos <= start + w.length;
          });
          setCurrentWordIndex(wordIdx);
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentVerseIndex(null);
      setCurrentWordIndex(null);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const pauseChapter = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const stopChapter = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentVerseIndex(null);
    setCurrentWordIndex(null);
  };

  const currentBookData = BOOKS.find(b => b.name === selectedBook);

  return (
    <div className="flex flex-col h-full bg-navy-950 overflow-hidden" onMouseUp={handleTextSelection}>
      {/* Header / Navigation */}
      <div className="bg-navy-900/50 border-b border-navy-800 p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-xl px-3 py-2">
            <BookIcon className="w-4 h-4 text-gold-400" />
            <select
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value);
                setSelectedChapter(1);
              }}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
            >
              {BOOKS.map(b => (
                <option key={b.name} value={b.name} className="bg-navy-900">{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-xl px-3 py-2">
            <span className="text-xs text-navy-400 font-medium uppercase tracking-wider">Chapter</span>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer min-w-[3rem]"
            >
              {Array.from({ length: currentBookData?.chapters || 1 }, (_, i) => i + 1).map(c => (
                <option key={c} value={c} className="bg-navy-900">{c}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-xl px-4 py-2 focus-within:border-gold-400/50 transition-colors">
              <Search className="w-4 h-4 text-navy-500" />
              <input
                type="text"
                placeholder="Search Bible..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-transparent text-sm text-white placeholder-navy-500 focus:outline-none w-full"
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin text-gold-400" />}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-navy-900 border border-navy-800 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto p-2">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => jumpToVerse(res.book_name, res.chapter)}
                    className="w-full text-left p-3 hover:bg-navy-800 rounded-xl transition-colors group"
                  >
                    <p className="text-xs font-bold text-gold-400 mb-1 flex items-center gap-1">
                      {res.book_name} {res.chapter}:{res.verse}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-sm text-navy-200 line-clamp-2 leading-relaxed">
                      {res.text}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-2 bg-navy-800/50 border border-navy-700 rounded-xl p-1">
            <button
              onClick={isPlaying ? pauseChapter : playChapter}
              className="p-2 text-gold-400 hover:bg-gold-400/10 rounded-lg transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            {(isPlaying || isPaused) && (
              <button
                onClick={stopChapter}
                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            )}
            <div className="h-4 w-px bg-navy-700 mx-1" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-[10px] font-bold text-navy-300 focus:outline-none cursor-pointer pr-2"
            >
              <option value="0.75" className="bg-navy-900">0.75x</option>
              <option value="1" className="bg-navy-900">1.0x</option>
              <option value="1.25" className="bg-navy-900">1.25x</option>
              <option value="1.5" className="bg-navy-900">1.5x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reading Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 sm:p-12 relative select-text scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white mb-4 tracking-tight">
              {selectedBook} {selectedChapter}
            </h2>
            <div className="w-24 h-1 bg-gold-400/30 mx-auto rounded-full" />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
              <p className="text-sm text-navy-400 animate-pulse">Lifting the veil of scripture...</p>
            </div>
          ) : (
            <div className="space-y-6 text-lg sm:text-xl text-navy-100 leading-relaxed font-serif">
              {verses.map((verse, vIdx) => {
                const isVerseSpoken = currentVerseIndex === vIdx;
                const highlight = highlights.find(h => h.verse_number === verse.verse);
                
                return (
                  <div
                    key={verse.verse}
                    data-verse={verse.verse}
                    className={`group relative transition-all duration-300 rounded-lg p-2 -mx-2 ${
                      isVerseSpoken ? 'bg-gold-400/5' : ''
                    }`}
                  >
                    <span className="inline-block text-gold-400 font-bold text-sm mr-3 align-top mt-1.5 select-none w-6 text-right">
                      {verse.verse}
                    </span>
                    <span className="inline">
                      {verse.text.split(/\s+/).map((word, wIdx) => {
                        const isWordSpoken = isVerseSpoken && currentWordIndex === wIdx;
                        const isHighlighted = highlight && highlight.content.includes(word);
                        
                        return (
                          <span
                            key={wIdx}
                            className={`inline transition-colors duration-200 ${
                              isWordSpoken ? 'text-gold-400 font-bold bg-gold-400/20 rounded px-0.5' : 
                              isHighlighted ? 'text-gold-400 bg-gold-400/10 rounded px-0.5' : ''
                            }`}
                          >
                            {word}{' '}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selection Menu */}
        {menuPos && selection && (
          <div
            className="fixed z-[100] flex items-center gap-1 bg-navy-900 border border-gold-400/30 rounded-xl shadow-2xl p-1 animate-fade-in-up"
            style={{
              left: `${menuPos.x}px`,
              top: `${menuPos.y - 50}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <button
              onClick={saveHighlight}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white hover:bg-gold-400/10 rounded-lg transition-colors border border-transparent hover:border-gold-400/20"
            >
              <Highlighter className="w-3.5 h-3.5 text-gold-400" />
              Highlight
            </button>
            <div className="w-px h-4 bg-navy-800 mx-1" />
            <button
              onClick={askAI}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800 rounded-lg transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              Ask AI
            </button>
          </div>
        )}
      </div>

      {/* Floating Speed Control on Mobile / Footer */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
        {/* Mobile controls if needed */}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 lg:bottom-8 right-6 p-3 bg-gold-400 text-navy-950 rounded-full shadow-2xl hover:bg-gold-300 transition-all hover:-translate-y-1 animate-fade-in z-50"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
