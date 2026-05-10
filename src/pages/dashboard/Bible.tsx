import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Book as BookIcon, ChevronRight, Play, Pause,
  Highlighter, MessageSquare, Loader2, ChevronLeft, Settings2,
  ArrowUp, ChevronDown, Type, Sun, Moon, Coffee, Sparkles,
  Maximize2, Minimize2, X, Check, Flame, Bookmark, Share2,
  Image as ImageIcon, ChevronUp, BookOpen
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import BibleStudyPanel from '../../components/BibleStudyPanel';
import VerseImageModal from '../../components/VerseImageModal';

interface Verse {
  book_id?: string;
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

interface SmartResult {
  type: 'book' | 'verse';
  bookName: string;
  chapter: number;
  verse?: number;
  text?: string;
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

const BOOK_SECTIONS = [
  { name: 'Law', books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'] },
  { name: 'History', books: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther'] },
  { name: 'Poetry', books: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'] },
  { name: 'Major Prophets', books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'] },
  { name: 'Minor Prophets', books: ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'] },
  { name: 'Gospels', books: ['Matthew', 'Mark', 'Luke', 'John'] },
  { name: 'History (NT)', books: ['Acts'] },
  { name: 'Epistles', books: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'] },
  { name: 'Prophecy', books: ['Revelation'] },
];

function VerseSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2 px-6">
          <div className="skeleton h-4 rounded w-full" />
          <div className="skeleton h-4 rounded w-5/6" />
          {i % 3 === 0 && <div className="skeleton h-4 rounded w-3/4" />}
        </div>
      ))}
    </div>
  );
}

export default function Bible() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBook, setSelectedBook] = useState('Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [smartResults, setSmartResults] = useState<SmartResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [studyVerse, setStudyVerse] = useState<{ reference: string; text: string } | null>(null);
  const [studyPanelOpen, setStudyPanelOpen] = useState(false);
  const [imageVerse, setImageVerse] = useState<{ text: string; reference: string } | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Reader settings
  const [translation, setTranslation] = useState<'KJV' | 'NIV' | 'ESV' | 'NASB'>(() =>
    (localStorage.getItem('bibleai_translation') as any) || 'KJV'
  );
  const [readerTheme, setReaderTheme] = useState<'dark' | 'sepia' | 'classic'>('dark');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [sanctuaryMode, setSanctuaryMode] = useState(false);
  const [readingPlanOpen, setReadingPlanOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selection, setSelection] = useState<{ text: string; verse: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<number>>(new Set());

  const currentBook = useMemo(() => BOOKS.find(b => b.name === selectedBook), [selectedBook]);
  const totalChapters = currentBook?.chapters || 1;

  const themeColors: Record<string, string> = {
    dark:    'bg-navy-950 text-navy-100',
    sepia:   'bg-[#f4ecd8] text-[#5b4636]',
    classic: 'bg-white text-navy-900',
  };

  const headerColors: Record<string, string> = {
    dark:    'bg-navy-900/80 border-white/5 backdrop-blur-xl',
    sepia:   'bg-[#efe3c5] border-[#dcd0b0]',
    classic: 'bg-white/90 border-gray-200 backdrop-blur-sm',
  };

  // Fetch chapter
  const fetchChapter = useCallback(async (book: string, chapter: number, trans: string) => {
    setLoading(true);
    setVerses([]);
    try {
      const { data, error } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_name', book)
        .eq('chapter', chapter)
        .eq('translation', trans)
        .order('verse', { ascending: true });

      if (!error && data && data.length > 0) {
        setVerses(data);
      } else {
        // Fallback to public API
        // Map common translation names to bible-api.com supported ones
        const apiTrans = trans.toLowerCase() === 'niv' ? 'web' : trans.toLowerCase();
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${apiTrans}`);
        if (!response.ok) throw new Error('API response not ok');
        const apiData = await response.json();
        if (apiData.verses) {
          setVerses(apiData.verses.map((v: any) => ({
            book_name: book, chapter, verse: v.verse, text: v.text.trim()
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch Bible text:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHighlights = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('bible_highlights').select('id, verse_number, content')
      .eq('user_id', user.id).eq('book', selectedBook).eq('chapter', selectedChapter);
    if (data) setHighlights(data);
  }, [user, selectedBook, selectedChapter]);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('verse_bookmarks').select('verse_number')
      .eq('user_id', user.id).eq('book_name', selectedBook).eq('chapter', selectedChapter);
    if (data) setBookmarkedVerses(new Set(data.map((b: any) => b.verse_number)));
  }, [user, selectedBook, selectedChapter]);

  useEffect(() => {
    localStorage.setItem('bibleai_translation', translation);
  }, [translation]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, [user]);

  useEffect(() => {
    fetchChapter(selectedBook, selectedChapter, translation);
    fetchHighlights();
    fetchBookmarks();
  }, [selectedBook, selectedChapter, translation, fetchChapter, fetchHighlights, fetchBookmarks]);

  // Handle location state for jump-to
  useEffect(() => {
    const state = location.state as { jumpTo?: { book: string; chapter: number; verse: number } } | null;
    if (state?.jumpTo) {
      const { book, chapter, verse } = state.jumpTo;
      setSelectedBook(book);
      setSelectedChapter(chapter);
      if (verse) {
        setTimeout(() => {
          const el = document.querySelector(`[data-verse="${verse}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 600);
      }
    }
  }, [location.state]);

  // Scroll tracking
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => setShowBackToTop(el.scrollTop > 300);
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    const results: SmartResult[] = [];
    const refRegex = /^(\d?\s*[a-zA-Z\s]+)\s+(\d+)(?::(\d+))?$/;
    const match = query.match(refRegex);
    if (match) {
      const bookQuery = match[1].trim();
      const chapter = parseInt(match[2]);
      const verse = match[3] ? parseInt(match[3]) : undefined;
      const foundBook = BOOKS.find(b =>
        b.name.toLowerCase() === bookQuery || b.name.toLowerCase().startsWith(bookQuery)
      );
      if (foundBook) results.push({ type: 'book', bookName: foundBook.name, chapter, verse });
    }
    setSmartResults(results);
    setSelectedIndex(results.length > 0 ? 0 : -1);
  };

  const jumpToVerse = (book: string, chapter: number, verse?: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSearchQuery('');
    setSmartResults([]);
    if (verse) {
      setTimeout(() => {
        const el = document.querySelector(`[data-verse="${verse}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  };

  const handleVerseClick = (ref: string) => {
    const match = ref.match(/^(\d?\s*[a-zA-Z\s]+)\s+(\d+):(\d+)/);
    if (match) jumpToVerse(match[1].trim(), parseInt(match[2]), parseInt(match[3]));
  };

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null); setMenuPos(null); return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    let node = range.startContainer.parentElement as HTMLElement | null;
    while (node && !node.dataset.verse) node = node.parentElement;
    if (node?.dataset.verse) {
      setSelection({ text: sel.toString().trim(), verse: parseInt(node.dataset.verse) });
      setMenuPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 60 });
    }
  };

  const toggleBookmark = async (verse: Verse) => {
    if (!user) return;
    const verseRef = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    if (bookmarkedVerses.has(verse.verse)) {
      await supabase.from('verse_bookmarks').delete()
        .eq('user_id', user.id).eq('verse_ref', verseRef);
      setBookmarkedVerses(prev => { const n = new Set(prev); n.delete(verse.verse); return n; });
    } else {
      await supabase.from('verse_bookmarks').insert({
        user_id: user.id, verse_ref: verseRef, verse_text: verse.text,
        book_name: verse.book_name, chapter: verse.chapter, verse_number: verse.verse, translation,
      });
      setBookmarkedVerses(prev => new Set([...prev, verse.verse]));
    }
  };

  const openImageModal = (verse: Verse) => {
    setImageVerse({ text: verse.text, reference: `${verse.book_name} ${verse.chapter}:${verse.verse}` });
    setImageModalOpen(true);
    setSelection(null); setMenuPos(null);
  };

  const openStudyPanel = (verse: Verse) => {
    setStudyVerse({ reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`, text: verse.text });
    setStudyPanelOpen(true);
    setSelection(null); setMenuPos(null);
  };

  const playChapter = () => {
    if (!verses.length) return;
    window.speechSynthesis.cancel();
    let i = 0;
    const speakVerse = () => {
      if (i >= verses.length) { setIsPlaying(false); setCurrentVerseIndex(null); return; }
      setCurrentVerseIndex(i);
      const utt = new SpeechSynthesisUtterance(verses[i].text);
      utt.rate = 0.9;
      utt.onend = () => { i++; speakVerse(); };
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    };
    setIsPlaying(true);
    speakVerse();
  };

  const pauseChapter = () => {
    if (isPlaying) { window.speechSynthesis.pause(); setIsPlaying(false); }
    else { window.speechSynthesis.resume(); setIsPlaying(true); }
  };

  const stopChapter = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentVerseIndex(null);
  };

  const goToPrevChapter = () => {
    if (selectedChapter > 1) setSelectedChapter(c => c - 1);
    else {
      const idx = BOOKS.findIndex(b => b.name === selectedBook);
      if (idx > 0) { setSelectedBook(BOOKS[idx - 1].name); setSelectedChapter(BOOKS[idx - 1].chapters); }
    }
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextChapter = () => {
    if (selectedChapter < totalChapters) setSelectedChapter(c => c + 1);
    else {
      const idx = BOOKS.findIndex(b => b.name === selectedBook);
      if (idx < BOOKS.length - 1) { setSelectedBook(BOOKS[idx + 1].name); setSelectedChapter(1); }
    }
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-500 ${themeColors[readerTheme]}`}
      onMouseUp={handleTextSelection}>

      {/* ── Image Modal ── */}
      {imageModalOpen && imageVerse && (
        <VerseImageModal
          open={imageModalOpen}
          verseText={imageVerse.text}
          verseRef={imageVerse.reference}
          onClose={() => setImageModalOpen(false)}
        />
      )}

      {/* ── Header ── */}
      {!sanctuaryMode && (
        <header className={`px-4 py-3 flex flex-wrap items-center gap-3 border-b transition-colors duration-500 sticky top-0 z-30 ${headerColors[readerTheme]}`}
          role="banner">
          {/* Book selector */}
          <div className="relative" ref={bookRef}>
            <button onClick={() => { setBookMenuOpen(!bookMenuOpen); setChapterMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10 text-white hover:border-white/20' : 'bg-white border-black/10 text-current shadow-sm hover:border-black/20'}`}
              aria-label={`Select book, currently ${selectedBook}`}
              aria-expanded={bookMenuOpen}>
              <BookIcon className={`w-4 h-4 ${readerTheme === 'dark' ? 'text-gold-400' : 'text-current'}`} aria-hidden="true" />
              <span className="uppercase tracking-wide">{selectedBook}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${bookMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {bookMenuOpen && (
              <div className={`absolute top-full left-0 mt-2 w-80 max-h-[60vh] overflow-y-auto border rounded-2xl shadow-2xl p-3 z-50 animate-scale-in ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}
                role="listbox" aria-label="Select a book">
                <input type="text" placeholder="Search books..." value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold-400 ${readerTheme === 'dark' ? 'bg-white/5 text-white placeholder-navy-500' : 'bg-black/5 text-current'}`}
                  aria-label="Search books" />
                {BOOK_SECTIONS.map(s => (
                  <div key={s.name} className="mb-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mb-2 px-2">{s.name}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {s.books.filter(b => b.toLowerCase().includes(bookSearch.toLowerCase())).map(b => (
                        <button key={b} role="option" aria-selected={selectedBook === b}
                          onClick={() => { setSelectedBook(b); setSelectedChapter(1); setBookMenuOpen(false); setBookSearch(''); }}
                          className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${selectedBook === b ? 'bg-gold-400 text-navy-950 shadow-lg' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chapter selector */}
          <div className="relative" ref={chapterRef}>
            <button onClick={() => { setChapterMenuOpen(!chapterMenuOpen); setBookMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10 text-white hover:border-white/20' : 'bg-white border-black/10 text-current shadow-sm'}`}
              aria-label={`Select chapter, currently ${selectedChapter}`}
              aria-expanded={chapterMenuOpen}>
              <span className="text-[10px] font-black uppercase tracking-wide opacity-50">Ch.</span>
              <span>{selectedChapter}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${chapterMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {chapterMenuOpen && (
              <div className={`absolute top-full left-0 mt-2 w-56 border rounded-2xl shadow-2xl p-3 z-50 animate-scale-in ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}>
                <div className="grid grid-cols-5 gap-1.5 max-h-[40vh] overflow-y-auto pr-1">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map(c => (
                    <button key={c} onClick={() => { setSelectedChapter(c); setChapterMenuOpen(false); }}
                      className={`h-9 w-9 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${selectedChapter === c ? 'bg-gold-400 text-navy-950' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                      aria-label={`Chapter ${c}`} aria-current={selectedChapter === c ? 'true' : undefined}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[160px] max-w-xs relative" ref={searchRef}>
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}>
              <Search className="w-3.5 h-3.5 opacity-40 flex-shrink-0" aria-hidden="true" />
              <input type="text" placeholder="John 3:16..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-transparent text-sm w-full focus:outline-none"
                aria-label="Search Bible references" />
            </div>
            {smartResults.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-2xl z-50 p-2 ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}
                role="listbox">
                {smartResults.map((r, i) => (
                  <button key={i} role="option" onClick={() => jumpToVerse(r.bookName, r.chapter, r.verse)}
                    className="w-full text-left p-3 rounded-lg hover:bg-black/5 flex items-center justify-between group text-sm font-bold">
                    {r.bookName} {r.chapter}{r.verse ? `:${r.verse}` : ''}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={() => setReadingPlanOpen(true)} title="Reading Plans"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${readerTheme === 'dark' ? 'bg-white/5 text-navy-400 hover:text-white' : 'bg-black/5 text-current hover:bg-black/10'}`}
              aria-label="Reading plans">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Plans</span>
            </button>
            <button onClick={() => isPlaying ? pauseChapter() : playChapter()} title={isPlaying ? 'Pause' : 'Play chapter'}
              className={`p-2.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${readerTheme === 'dark' ? 'bg-white/5 text-gold-400 hover:bg-white/10' : 'bg-black/5 text-current hover:bg-black/10'}`}
              aria-label={isPlaying ? 'Pause reading' : 'Play chapter aloud'}>
              {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button onClick={() => setShowSettings(!showSettings)} title="Reader settings"
              className={`p-2.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${readerTheme === 'dark' ? 'bg-white/5 text-navy-400 hover:text-white' : 'bg-black/5 text-current hover:bg-black/10'}`}
              aria-label="Reader settings" aria-expanded={showSettings}>
              <Settings2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={() => setSanctuaryMode(true)} title="Full screen"
              className={`p-2.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${readerTheme === 'dark' ? 'bg-white/5 text-navy-400 hover:text-gold-400' : 'bg-black/5 text-current hover:text-blue-600'}`}
              aria-label="Enter sanctuary mode (full screen)">
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </header>
      )}

      {/* ── Sanctuary Mode Exit ── */}
      {sanctuaryMode && (
        <button onClick={() => setSanctuaryMode(false)}
          className="fixed top-6 right-6 p-3 bg-black/30 backdrop-blur-md rounded-full text-white/60 hover:text-white hover:bg-black/50 transition-all z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label="Exit sanctuary mode">
          <Minimize2 className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      {/* ── Settings Panel ── */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setShowSettings(false)} />
          <div className={`fixed top-20 right-4 w-72 border rounded-2xl shadow-2xl p-6 z-[60] animate-scale-in space-y-6 ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10 text-white' : 'bg-white border-black/10 text-navy-900'}`}
            role="dialog" aria-label="Reader settings">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Reader Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 opacity-50 hover:opacity-100" aria-label="Close settings">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Translation</p>
              <div className="grid grid-cols-2 gap-2">
                {(['KJV', 'NIV', 'ESV', 'NASB'] as const).map(t => (
                  <button key={t} onClick={() => setTranslation(t)}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black tracking-widest transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${translation === t ? 'bg-gold-400 border-gold-400 text-navy-950' : 'border-white/10 opacity-50 hover:opacity-100'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Appearance</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'dark', icon: Moon, label: 'Night' }, { id: 'sepia', icon: Coffee, label: 'Paper' }, { id: 'classic', icon: Sun, label: 'Day' }].map(t => (
                  <button key={t.id} onClick={() => setReaderTheme(t.id as any)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${readerTheme === t.id ? 'bg-gold-400/10 border-gold-400/50 text-gold-400' : 'border-transparent hover:bg-black/5'}`}>
                    <t.icon className="w-4 h-4" aria-hidden="true" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Typography</p>
              <div className="flex gap-2">
                <button onClick={() => setFontFamily('serif')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-serif font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${fontFamily === 'serif' ? 'border-gold-400 text-gold-400' : 'border-transparent opacity-50'}`}>Serif</button>
                <button onClick={() => setFontFamily('sans')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-sans font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${fontFamily === 'sans' ? 'border-gold-400 text-gold-400' : 'border-transparent opacity-50'}`}>Sans</button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-50">
                  <span>Font Size</span><span>{fontSize}px</span>
                </div>
                <input type="range" min="14" max="32" value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-gold-400" aria-label="Font size" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Chapter Navigation Bar ── */}
      {!sanctuaryMode && (
        <div className={`flex items-center justify-between px-4 py-2 border-b text-xs font-bold ${readerTheme === 'dark' ? 'bg-navy-900/50 border-white/5 text-navy-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <button onClick={goToPrevChapter} disabled={selectedBook === 'Genesis' && selectedChapter === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-all disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
            aria-label="Previous chapter">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Prev
          </button>
          <span className="uppercase tracking-widest text-[10px]">{selectedBook} {selectedChapter} / {totalChapters}</span>
          <button onClick={goToNextChapter} disabled={selectedBook === 'Revelation' && selectedChapter === 22}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-black/5 transition-all disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
            aria-label="Next chapter">
            Next <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Reading Area ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-20 py-12 scroll-smooth scrollbar-none relative"
        role="main" aria-label={`${selectedBook} chapter ${selectedChapter}`}>
        <div className={`max-w-3xl mx-auto ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`} style={{ fontSize: `${fontSize}px` }}>
          {/* Chapter title */}
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
              Sacred Text &bull; {translation}
            </p>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter italic">
              {selectedBook} {selectedChapter}
            </h1>
            <div className="w-16 h-0.5 bg-current opacity-10 mx-auto rounded-full" />
          </div>

          {/* Reading plan progress */}
          {profile?.reading_plan_id && (
            <div className={`border rounded-2xl p-5 mb-12 flex flex-col sm:flex-row items-center justify-between gap-4 ${readerTheme === 'dark' ? 'bg-navy-900/40 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-400/10 rounded-xl flex items-center justify-center">
                  <Flame className="w-5 h-5 text-gold-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Active Plan</p>
                  <h4 className="text-sm font-bold">Day {profile.reading_plan_day} of 30</h4>
                </div>
              </div>
              <div className="flex-1 w-full sm:max-w-xs h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold-400 rounded-full transition-all" style={{ width: `${(profile.reading_plan_day / 30) * 100}%` }} />
              </div>
              <button onClick={async () => {
                if (!user) return;
                const nextDay = (profile.reading_plan_day || 0) + 1;
                await supabase.from('profiles').update({ reading_plan_day: nextDay }).eq('id', user.id);
                setProfile({ ...profile, reading_plan_day: nextDay });
              }} className="px-5 py-2 bg-gold-400 text-navy-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gold-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
                Mark Read
              </button>
            </div>
          )}

          {/* Verses */}
          {loading ? (
            <VerseSkeleton />
          ) : (
            <div className="space-y-1 leading-[1.9]">
              {verses.map((v, i) => {
                const isSpoken = currentVerseIndex === i;
                const isHighlighted = highlights.some(h => h.verse_number === v.verse);
                const isBookmarked = bookmarkedVerses.has(v.verse);
                return (
                  <div key={v.verse} data-verse={v.verse}
                    className={`relative group transition-all duration-300 rounded-2xl px-4 py-3 -mx-4 ${isSpoken ? 'bg-gold-400/8 shadow-lg' : 'hover:bg-black/[0.03]'} ${isHighlighted ? 'bg-yellow-400/10' : ''}`}
                    role="paragraph" aria-label={`Verse ${v.verse}`}>
                    {/* Verse number */}
                    <span className="inline-flex items-center justify-center w-6 h-6 text-[10px] font-black opacity-30 group-hover:opacity-70 transition-opacity mr-2 align-top mt-1 flex-shrink-0"
                      aria-label={`Verse ${v.verse}`}>
                      {v.verse}
                    </span>
                    <span className={`${isSpoken ? 'text-gold-400' : ''} transition-colors`}>{v.text}</span>

                    {/* Verse action buttons (appear on hover) */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                      <button onClick={() => toggleBookmark(v)}
                        className={`p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 ${isBookmarked ? 'text-gold-400 bg-gold-400/10' : 'text-current opacity-40 hover:opacity-100 hover:bg-black/5'}`}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}>
                        <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
                      </button>
                      <button onClick={() => openStudyPanel(v)}
                        className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-black/5 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
                        aria-label="Study this verse" title="Study">
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button onClick={() => openImageModal(v)}
                        className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-black/5 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
                        aria-label="Create verse image" title="Create image">
                        <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chapter end */}
          {!loading && verses.length > 0 && (
            <div className="mt-16 flex flex-col items-center gap-6 opacity-30">
              <div className="w-px h-16 bg-current" />
              <Sparkles className="w-6 h-6" aria-hidden="true" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Peace be with you</p>
              <div className="flex gap-4 mt-4 opacity-100">
                <button onClick={goToPrevChapter}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-current opacity-50 hover:opacity-100 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                  aria-label="Previous chapter">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button onClick={goToNextChapter}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-current opacity-50 hover:opacity-100 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                  aria-label="Next chapter">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Text Selection Context Menu ── */}
      {selection && menuPos && (
        <div className="fixed z-[70] animate-scale-in" style={{ left: menuPos.x, top: menuPos.y, transform: 'translateX(-50%)' }}>
          <div className={`flex items-center gap-1 p-1.5 rounded-2xl border shadow-2xl ${readerTheme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}
            role="menu" aria-label="Verse actions">
            <button onClick={() => {
              const v = verses.find(v => v.verse === selection.verse);
              if (v) openStudyPanel(v);
            }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
              role="menuitem" aria-label="Study this verse">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Study
            </button>
            <button onClick={() => {
              const v = verses.find(v => v.verse === selection.verse);
              if (v) openImageModal(v);
            }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
              role="menuitem" aria-label="Create verse image">
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> Image
            </button>
            <button onClick={() => {
              const v = verses.find(v => v.verse === selection.verse);
              if (v) toggleBookmark(v);
              setSelection(null); setMenuPos(null);
            }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/5 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
              role="menuitem" aria-label="Bookmark verse">
              <Bookmark className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" /> Save
            </button>
            <button onClick={() => { setSelection(null); setMenuPos(null); }}
              className="p-2 rounded-xl hover:bg-black/5 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
              role="menuitem" aria-label="Close menu">
              <X className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Back to Top ── */}
      {showBackToTop && (
        <button onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-28 right-6 lg:bottom-8 p-3 bg-gold-400 text-navy-950 rounded-full shadow-xl hover:scale-110 transition-all z-40 animate-scale-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          aria-label="Back to top">
          <ChevronUp className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      {/* ── Bible Study Panel ── */}
      <BibleStudyPanel
        isOpen={studyPanelOpen}
        onClose={() => setStudyPanelOpen(false)}
        initialVerse={studyVerse}
        onVerseClick={handleVerseClick}
      />

      {/* ── Reading Plan Drawer ── */}
      {readingPlanOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] animate-fade-in" onClick={() => setReadingPlanOpen(false)} />
          <div className={`fixed inset-y-0 right-0 w-full sm:w-96 border-l z-[90] shadow-2xl animate-slide-in-right p-6 space-y-6 flex flex-col ${readerTheme === 'dark' ? 'bg-navy-950 border-white/5' : 'bg-white border-gray-200'}`}
            role="dialog" aria-label="Reading plans">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Reading Plans</h3>
              <button onClick={() => setReadingPlanOpen(false)} className="p-2 opacity-50 hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400" aria-label="Close reading plans">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {[
                { id: 'nt30', name: 'New Testament in 30 Days', totalDays: 30, desc: 'A quick journey through the life and letters of Jesus.' },
                { id: 'psalms_proverbs', name: 'Psalms & Proverbs', totalDays: 30, desc: 'Wisdom and worship for your daily life.' },
                { id: 'bible_year', name: 'Genesis to Revelation (1 Year)', totalDays: 365, desc: 'The complete story of God from beginning to end.' },
              ].map((plan) => (
                <button key={plan.id} onClick={async () => {
                  if (!user) return;
                  await supabase.from('profiles').update({ reading_plan_id: plan.id, reading_plan_day: 1 }).eq('id', user.id);
                  setProfile({ ...profile, reading_plan_id: plan.id, reading_plan_day: 1 });
                  setReadingPlanOpen(false);
                }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${profile?.reading_plan_id === plan.id ? 'bg-gold-400/10 border-gold-400/50' : readerTheme === 'dark' ? 'bg-navy-900 border-white/5 hover:border-white/20' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gold-400">{plan.totalDays} Days</span>
                    {profile?.reading_plan_id === plan.id && <Check className="w-4 h-4 text-gold-400" aria-hidden="true" />}
                  </div>
                  <h4 className="font-bold text-sm mb-1">{plan.name}</h4>
                  <p className="text-xs opacity-50 leading-relaxed">{plan.desc}</p>
                </button>
              ))}
            </div>
            {profile?.reading_plan_id && (
              <button onClick={async () => {
                if (!user) return;
                await supabase.from('profiles').update({ reading_plan_id: null, reading_plan_day: 0 }).eq('id', user.id);
                setProfile({ ...profile, reading_plan_id: null, reading_plan_day: 0 });
              }} className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                Leave Current Plan
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
