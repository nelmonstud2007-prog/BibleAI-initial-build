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
  ChevronDown,
  Type,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Check,
  Flame
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import BibleStudyPanel from '../../components/BibleStudyPanel';

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

  const handleVerseClick = (ref: string) => {
    const match = ref.match(/^(\d?\s*[a-zA-Z\s]+)\s+(\d+):(\d+)/);
    if (match) {
      const book = match[1].trim();
      const chapter = parseInt(match[2]);
      const verse = parseInt(match[3]);
      jumpToVerse(book, chapter, verse);
    }
  };
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentVerseIndex, setCurrentVerseIndex] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Theme state
  const [translation, setTranslation] = useState<'KJV' | 'NIV' | 'ESV' | 'NASB'>(() => {
    return (localStorage.getItem('bibleai_translation') as any) || 'KJV';
  });
  const [readingPlanOpen, setReadingPlanOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchChapter = useCallback(async (book: string, chapter: number, trans: string) => {
    setLoading(true);
    try {
      // Transitioning to Supabase as per IMP-01 requirement
      const { data, error } = await supabase
        .from('bible_verses')
        .select('*')
        .eq('book_name', book)
        .eq('chapter', chapter)
        .eq('translation', trans)
        .order('verse', { ascending: true });

      if (error) throw error;
      if (data) {
        setVerses(data);
      } else {
        // Fallback to API if Supabase table is empty/not populated yet
        const response = await fetch(`https://bible-api.com/${book}+${chapter}?translation=${trans.toLowerCase()}`);
        const apiData = await response.json();
        if (apiData.verses) setVerses(apiData.verses);
      }
    } catch (err) {
      console.error('Failed to fetch Bible text:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bibleai_translation', translation);
  }, [translation]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, [user]);

  const fetchHighlights = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('bible_highlights').select('id, verse_number, content').eq('user_id', user.id).eq('book', selectedBook).eq('chapter', selectedChapter);
    if (data) setHighlights(data);
  }, [user, selectedBook, selectedChapter]);

  const [theme, setTheme] = useState<'dark' | 'sepia' | 'classic'>('dark');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [sanctuaryMode, setSanctuaryMode] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selection, setSelection] = useState<{ text: string; verse: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetchChapter(selectedBook, selectedChapter, translation);
    fetchHighlights();
  }, [selectedBook, selectedChapter, translation, fetchChapter, fetchHighlights]);

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
      const foundBook = BOOKS.find(b => b.name.toLowerCase() === bookQuery || b.name.toLowerCase().startsWith(bookQuery));
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

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelection(null);
      setMenuPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    let node = range.startContainer.parentElement;
    while (node && !node.dataset.verse) node = node.parentElement;
    if (node && node.dataset.verse) {
      setSelection({ text: sel.toString().trim(), verse: parseInt(node.dataset.verse) });
      setMenuPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
    }
  };

  const themeColors = {
    dark: 'bg-navy-950 text-navy-100',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    classic: 'bg-white text-navy-900'
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-700 ${themeColors[theme]}`} onMouseUp={handleTextSelection}>
      
      {/* Premium Header */}
      {!sanctuaryMode && (
        <header className={`px-6 py-4 flex flex-wrap items-center gap-6 border-b transition-colors duration-500 ${theme === 'dark' ? 'bg-navy-900/50 border-white/5' : theme === 'sepia' ? 'bg-[#efe3c5] border-[#dcd0b0]' : 'bg-gray-50 border-gray-200'}`}>
           <div className="flex items-center gap-4">
              <div className="relative" ref={bookRef}>
                 <button onClick={() => setBookMenuOpen(!bookMenuOpen)} className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-navy-950 border-white/10 text-white' : 'bg-white border-black/10 text-current shadow-sm'}`}>
                    <BookIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-gold-400' : 'text-current'}`} />
                    <span className="text-sm font-black uppercase tracking-widest">{selectedBook}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${bookMenuOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {bookMenuOpen && (
                    <div className={`absolute top-full left-0 mt-3 w-80 max-h-[60vh] overflow-y-auto border rounded-[2rem] shadow-2xl p-4 z-50 animate-scale-in ${theme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}>
                       <input type="text" placeholder="Search books..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} className="w-full bg-black/5 rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none" />
                       {BOOK_SECTIONS.map(s => (
                         <div key={s.name} className="mb-6">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 mb-3 px-2">{s.name}</p>
                            <div className="grid grid-cols-2 gap-1">
                               {s.books.filter(b => b.toLowerCase().includes(bookSearch.toLowerCase())).map(b => (
                                 <button key={b} onClick={() => { setSelectedBook(b); setSelectedChapter(1); setBookMenuOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedBook === b ? 'bg-gold-400 text-navy-950 shadow-lg' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}>{b}</button>
                               ))}
                            </div>
                         </div>
                       ))}
                    </div>
                 )}
              </div>

              <div className="relative" ref={chapterRef}>
                 <button onClick={() => setChapterMenuOpen(!chapterMenuOpen)} className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-navy-950 border-white/10 text-white' : 'bg-white border-black/10 text-current shadow-sm'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">CH.</span>
                    <span className="text-sm font-black">{selectedChapter}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${chapterMenuOpen ? 'rotate-180' : ''}`} />
                 </button>
                 {chapterMenuOpen && (
                    <div className={`absolute top-full left-0 mt-3 w-64 border rounded-[2rem] shadow-2xl p-4 z-50 animate-scale-in ${theme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}>
                       <div className="grid grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto pr-2">
                          {Array.from({ length: BOOKS.find(b => b.name === selectedBook)?.chapters || 1 }, (_, i) => i + 1).map(c => (
                            <button key={c} onClick={() => { setSelectedChapter(c); setChapterMenuOpen(false); }} className={`h-10 w-10 rounded-xl text-xs font-black transition-all ${selectedChapter === c ? 'bg-gold-400 text-navy-950' : 'hover:bg-black/5 opacity-70'}`}>{c}</button>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>

           <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-navy-950 border-white/10' : 'bg-white border-black/10'}`}>
                 <Search className="w-4 h-4 opacity-40" />
                 <input type="text" placeholder="John 3:16..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="bg-transparent text-sm w-full focus:outline-none" />
              </div>
              {smartResults.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-3 border rounded-2xl shadow-2xl z-50 p-2 ${theme === 'dark' ? 'bg-navy-900 border-white/10' : 'bg-white border-black/10'}`}>
                   {smartResults.map((r, i) => (
                     <button key={i} onClick={() => jumpToVerse(r.bookName, r.chapter, r.verse)} className="w-full text-left p-3 rounded-xl hover:bg-black/5 flex items-center justify-between group">
                        <span className="text-xs font-black uppercase tracking-widest">{r.bookName} {r.chapter}{r.verse ? `:${r.verse}` : ''}</span>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                   ))}
                </div>
              )}
           </div>

            <div className="flex items-center gap-2">
               <button onClick={() => setReadingPlanOpen(true)} className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 text-navy-400 hover:text-white' : 'bg-black/5 text-current hover:bg-black/10'}`}>
                  <BookIcon className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Plans</span>
               </button>
               <button onClick={() => isPlaying ? pauseChapter() : playChapter()} className={`p-3 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 text-gold-400 hover:bg-white/10' : 'bg-black/5 text-current hover:bg-black/10'}`}>
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
               </button>
               <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 text-navy-400 hover:text-white' : 'bg-black/5 text-current hover:bg-black/10'}`}>
                  <Settings2 className="w-5 h-5" />
               </button>
               <button onClick={() => setSanctuaryMode(true)} className={`p-3 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 text-navy-400 hover:text-gold-400' : 'bg-black/5 text-current hover:text-blue-600'}`}>
                  <Maximize2 className="w-5 h-5" />
               </button>
            </div>
        </header>
      )}

      {/* Sanctuary Mode Exit Button */}
      {sanctuaryMode && (
        <button onClick={() => setSanctuaryMode(false)} className="fixed top-8 right-8 p-4 bg-black/20 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-black/40 transition-all z-50">
           <Minimize2 className="w-6 h-6" />
        </button>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className={`fixed top-24 right-8 w-80 border rounded-[2.5rem] shadow-2xl p-8 z-[60] animate-scale-in space-y-8 ${theme === 'dark' ? 'bg-navy-900 border-white/10 text-white' : 'bg-white border-black/10 text-navy-900'}`}>
            <div className="space-y-4">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Translation</p>
               <div className="grid grid-cols-2 gap-2">
                  {(['KJV', 'NIV', 'ESV', 'NASB'] as const).map(t => (
                    <button key={t} onClick={() => setTranslation(t)} className={`px-4 py-2.5 rounded-xl border text-[10px] font-black tracking-widest transition-all ${translation === t ? 'bg-gold-400 border-gold-400 text-navy-950' : 'border-white/10 opacity-50 hover:opacity-100'}`}>{t}</button>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Appearance</p>
              <div className="grid grid-cols-3 gap-2">
                 {[
                   { id: 'dark', icon: Moon, label: 'Night' },
                   { id: 'sepia', icon: Coffee, label: 'Paper' },
                   { id: 'classic', icon: Sun, label: 'Day' }
                 ].map(t => (
                   <button key={t.id} onClick={() => setTheme(t.id as any)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${theme === t.id ? 'bg-gold-400/10 border-gold-400/50 text-gold-400' : 'border-transparent hover:bg-black/5'}`}>
                      <t.icon className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase">{t.label}</span>
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Typography</p>
              <div className="flex gap-2">
                 <button onClick={() => setFontFamily('serif')} className={`flex-1 py-3 rounded-xl border text-xs font-serif font-bold ${fontFamily === 'serif' ? 'border-gold-400 text-gold-400' : 'border-transparent opacity-50'}`}>Serif</button>
                 <button onClick={() => setFontFamily('sans')} className={`flex-1 py-3 rounded-xl border text-xs font-sans font-bold ${fontFamily === 'sans' ? 'border-gold-400 text-gold-400' : 'border-transparent opacity-50'}`}>Sans</button>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-50">
                    <span>Size</span>
                    <span>{fontSize}px</span>
                 </div>
                 <input type="range" min="14" max="32" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-gold-400" />
              </div>
           </div>
        </div>
      )}

      {/* Reading Sanctuary */}
      <div className={`flex-1 overflow-y-auto px-6 sm:px-20 py-16 scroll-smooth scrollbar-none relative`}>
         <div className={`max-w-4xl mx-auto space-y-12 ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`} style={{ fontSize: `${fontSize}px` }}>
            <div className="text-center space-y-6 mb-20 animate-fade-in">
               <p className="text-[11px] font-black uppercase tracking-[0.5em] opacity-40">
                  Sacred Text &bull; {translation}
               </p>
               <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter italic">{selectedBook} {selectedChapter}</h1>
               <div className="w-24 h-1 bg-current opacity-10 mx-auto rounded-full" />
            </div>

            {profile?.reading_plan_id && (
               <div className="bg-navy-900/40 border border-white/5 rounded-3xl p-6 mb-12 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-gold-400/10 rounded-2xl flex items-center justify-center">
                        <Flame className="w-6 h-6 text-gold-400" />
                     </div>
                     <div>
                        <p className="text-xs font-black text-navy-500 uppercase tracking-widest">Active Plan Progress</p>
                        <h4 className="text-sm font-bold text-white">Day {profile.reading_plan_day} of 30</h4>
                     </div>
                  </div>
                  <div className="flex-1 w-full sm:max-w-xs h-2 bg-navy-950 rounded-full overflow-hidden">
                     <div className="h-full bg-gold-400 rounded-full" style={{ width: `${(profile.reading_plan_day / 30) * 100}%` }} />
                  </div>
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      const nextDay = (profile.reading_plan_day || 0) + 1;
                      await supabase.from('profiles').update({ reading_plan_day: nextDay }).eq('id', user.id);
                      setProfile({ ...profile, reading_plan_day: nextDay });
                    }}
                    className="px-6 py-2 bg-gold-400 text-navy-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gold-300 transition-all"
                  >
                    Mark Read
                  </button>
               </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                 <Loader2 className="w-10 h-10 animate-spin opacity-20" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20 animate-pulse">Lifting the Veil</p>
              </div>
            ) : (
              <div className="space-y-8 leading-[1.8]">
                 {verses.map((v, i) => {
                   const isSpoken = currentVerseIndex === i;
                   return (
                     <div key={v.verse} data-verse={v.verse} className={`relative group transition-all duration-500 rounded-3xl p-6 -mx-6 ${isSpoken ? 'bg-gold-400/5 shadow-2xl' : 'hover:bg-black/[0.02]'}`}>
                        <span className="absolute -left-12 top-8 text-[11px] font-black opacity-20 group-hover:opacity-100 transition-opacity">{v.verse}</span>
                        <p className="relative">
                           {v.text.split(' ').map((w, j) => {
                             const isWordSpoken = isSpoken && currentWordIndex === j;
                             return <span key={j} className={`transition-all ${isWordSpoken ? 'text-gold-400 font-black scale-110' : ''}`}>{w}{' '}</span>
                           })}
                        </p>
                     </div>
                   );
                 })}
              </div>
            )}

            <div className="h-64 flex flex-col items-center justify-center gap-6 opacity-30">
               <div className="w-px h-20 bg-current" />
               <Sparkles className="w-8 h-8" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em]">Peace be with you</p>
            </div>
         </div>
      </div>

      <BibleStudyPanel 
        isOpen={studyPanelOpen} 
        onClose={() => setStudyPanelOpen(false)}
        initialVerse={studyVerse}
        onVerseClick={handleVerseClick}
      />

      {/* Reading Plan Drawer */}
      {readingPlanOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] animate-fade-in" onClick={() => setReadingPlanOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-navy-950 border-l border-white/5 z-[90] shadow-2xl animate-slide-in-right p-8 space-y-8 flex flex-col">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-tight">Reading Plans</h3>
                <button onClick={() => setReadingPlanOpen(false)} className="p-2 text-navy-400 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 pr-2 bible-scrollbar">
                {[
                  { id: 'nt30', name: 'New Testament in 30 Days', totalDays: 30, desc: 'A quick journey through the life and letters of Jesus.' },
                  { id: 'psalms_proverbs', name: 'Psalms & Proverbs', totalDays: 30, desc: 'Wisdom and worship for your daily life.' },
                  { id: 'bible_year', name: 'Genesis to Revelation (1 Year)', totalDays: 365, desc: 'The complete story of God from beginning to end.' },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    onClick={async () => {
                      if (!user) return;
                      await supabase.from('profiles').update({ reading_plan_id: plan.id, reading_plan_day: 1 }).eq('id', user.id);
                      setProfile({ ...profile, reading_plan_id: plan.id, reading_plan_day: 1 });
                      setReadingPlanOpen(false);
                    }}
                    className={`w-full text-left p-6 rounded-[2rem] border transition-all ${profile?.reading_plan_id === plan.id ? 'bg-gold-400/10 border-gold-400/50' : 'bg-navy-900 border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                       <span className="text-[9px] font-black uppercase tracking-widest text-gold-400">{plan.totalDays} Days</span>
                       {profile?.reading_plan_id === plan.id && <Check className="w-4 h-4 text-gold-400" />}
                    </div>
                    <h4 className="font-bold text-white mb-2">{plan.name}</h4>
                    <p className="text-xs text-navy-400 leading-relaxed">{plan.desc}</p>
                  </button>
                ))}
             </div>

             {profile?.reading_plan_id && (
                <button 
                  onClick={async () => {
                    if (!user) return;
                    await supabase.from('profiles').update({ reading_plan_id: null, reading_plan_day: 0 }).eq('id', user.id);
                    setProfile({ ...profile, reading_plan_id: null, reading_plan_day: 0 });
                  }}
                  className="w-full py-4 rounded-2xl border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                >
                   Leave Current Plan
                </button>
             )}
          </div>
        </>
      )}
    </div>
  );
}

// Dummy audio helpers for UI demo
const playChapter = () => window.speechSynthesis.speak(new SpeechSynthesisUtterance("Reading the Word of God..."));
const pauseChapter = () => window.speechSynthesis.pause();
