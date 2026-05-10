import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  BookOpen,
  Check,
  X,
  Heart,
  Flame,
  ChevronDown,
  Loader2,
  Share2,
  MessageSquare,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  Filter,
  Edit2,
  Search as SearchIcon,
  Download,
} from 'lucide-react';
import UpgradeModal from '../../components/UpgradeModal';
import { trackEvent } from '../../lib/analytics';
import ShareImageModal from '../../components/ShareImageModal';

interface PrayerEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'praying' | 'answered';
  created_at: string;
}

const CATEGORIES = ['Health', 'Family', 'Finance', 'Guidance', 'Gratitude', 'Other'] as const;

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  Health: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: 'H' },
  Family: { color: 'text-rose-400', bg: 'bg-rose-400/10', icon: 'F' },
  Finance: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '$' },
  Guidance: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: 'G' },
  Gratitude: { color: 'text-gold-400', bg: 'bg-gold-400/10', icon: '+' },
  Other: { color: 'text-navy-300', bg: 'bg-navy-700/50', icon: 'O' },
};

// Confetti particle system
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const spawnConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];
    const newParticles: Particle[] = [];

    for (let i = 0; i < 80; i++) {
      newParticles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 1) * 14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        life: 1,
      });
    }

    particlesRef.current = newParticles;
  }, []);

  useEffect(() => {
    if (!active) return;
    spawnConfetti();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.life -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, spawnConfetti]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

export default function PrayerJournal() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PrayerEntry[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const entriesPerPage = 10;
const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Other');
  const [status, setStatus] = useState<'praying' | 'answered'>('praying');
  const [streak, setStreak] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);
  const [justAnsweredId, setJustAnsweredId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareHeading, setShareHeading] = useState('');
  const [shareContent, setShareContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'praying' | 'answered'>('all');
  const [editingEntry, setEditingEntry] = useState<PrayerEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      fetchEntries();
      trackPrayerActivity('visit').then(() => fetchStreak());
    }
  }, [user]);

  const trackPrayerActivity = async (type: 'visit' | 'prayer') => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const { data: existingStreak } = await supabase
      .from('prayer_streaks')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!existingStreak) {
      const { error: streakError } = await supabase
        .from('prayer_streaks')
        .insert({ user_id: user.id, date: today });
      if (streakError) {
        console.error('Failed to track prayer streak activity:', streakError);
      }
    }

    const updates: { last_journal_visit_date?: string; last_prayer_added_date?: string } = {
      last_journal_visit_date: today,
    };

    if (type === 'prayer') {
      updates.last_prayer_added_date = today;
    }

    const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (profileError) {
      console.error('Failed to update prayer activity profile fields:', profileError);
    }
  };

  const fetchEntries = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('prayer_journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to fetch prayer entries:', error);
      setEntries([]);
      setLoading(false);
      return;
    }
    setEntries(data ?? []);
    setLoading(false);
  };

  const fetchStreak = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const { data: streaks, error } = await supabase
      .from('prayer_streaks')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(365);
    if (error) {
      console.error('Failed to fetch prayer streak:', error);
      setStreak(0);
      return;
    }

    if (!streaks || streaks.length === 0) {
      setStreak(0);
      return;
    }

    if (streaks[0].date !== today) {
      setStreak(0);
      return;
    }

    let count = 1;
    const dates = streaks.map((s) => s.date);
    for (let i = 0; i < dates.length - 1; i++) {
      const curr = new Date(dates[i]);
      const prev = new Date(dates[i + 1]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.5) {
        count++;
      } else {
        break;
      }
    }
    setStreak(count);
  };

  const saveEntry = async () => {
    if (!user || !title.trim() || savingEntry) return;

    if (!editingEntry && !isPro && entries.length >= 10) {
      setShowUpgrade(true);
      return;
    }

    setSavingEntry(true);
    try {
      if (editingEntry) {
        const { data, error } = await supabase
          .from('prayer_journal_entries')
          .update({ title: title.trim(), content: content.trim(), category })
          .eq('id', editingEntry.id)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setEntries(entries.map(e => e.id === editingEntry.id ? (data as PrayerEntry) : e));
          setEditingEntry(null);
        }
      } else {
        const { data, error } = await supabase
          .from('prayer_journal_entries')
          .insert({ user_id: user.id, title: title.trim(), content: content.trim(), category, status })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setEntries([data as PrayerEntry, ...entries]);
          trackEvent('prayer_added', { category, status });
          await trackPrayerActivity('prayer');
          fetchStreak();
        }
      }
      
      setTitle('');
      setContent('');
      setCategory('Other');
      setStatus('praying');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to save prayer entry:', err);
    } finally {
      setSavingEntry(false);
    }
  };

  const markAnswered = async (entry: PrayerEntry) => {
    if (entry.status === 'answered' || answeringId) return;
    setAnsweringId(entry.id);
    try {
      const { data, error } = await supabase
        .from('prayer_journal_entries')
        .update({ status: 'answered' })
        .eq('id', entry.id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setEntries(entries.map((e) => (e.id === entry.id ? (data as PrayerEntry) : e)));
        trackEvent('prayer_marked_answered', { prayer_id: entry.id });
        setJustAnsweredId(entry.id);
        setConfettiActive(true);
        setTimeout(() => {
          setConfettiActive(false);
          setJustAnsweredId(null);
        }, 2500);
      }
    } catch (err) {
      console.error('Failed to mark prayer as answered:', err);
    } finally {
      setAnsweringId(null);
    }
  };

  const handleEdit = (entry: PrayerEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-gold-400/20 text-gold-300 rounded px-0.5">{part}</mark>
      ) : part
    );
  };

  const filteredEntries = entries.filter(e => {
    const matchesFilter = filter === 'all' || e.status === filter;
    const matchesSearch = 
      e.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      e.content.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPrayers = entries.length;
  const answeredPrayers = entries.filter((e) => e.status === 'answered').length;

  const openShare = (entry: PrayerEntry) => {
    setShareHeading(entry.title);
    setShareContent(entry.content || 'A prayer from my BibleAI journal');
    setShareOpen(true);
  };

  const talkToAI = (entry: PrayerEntry) => {
    const prompt = `I have been praying about ${entry.title}: ${entry.content}. Can you give me Bible verses and guidance about this?`;
    navigate('/dashboard/bible-chat', { state: { initialMessage: prompt } });
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const rows = entries.map(e => `
      <div style="margin-bottom:24px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0;font-size:16px;color:#111827">${e.title}</h3>
          <span style="font-size:12px;padding:4px 10px;border-radius:20px;background:${e.status === 'answered' ? '#d1fae5' : '#fef3c7'};color:${e.status === 'answered' ? '#065f46' : '#92400e'}">${e.status === 'answered' ? '✓ Answered' : '🙏 Praying'}</span>
        </div>
        <p style="margin:4px 0;font-size:12px;color:#6b7280">${e.category} &bull; ${new Date(e.created_at).toLocaleDateString()}</p>
        ${e.content ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6">${e.content}</p>` : ''}
      </div>
    `).join('');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Prayer Journal Export</title>
      <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#111827;}
      h1{font-size:28px;margin-bottom:4px;}p.sub{color:#6b7280;margin-bottom:32px;}
      @media print{body{margin:20px;}}</style></head>
      <body><h1>Sacred Prayer Journal</h1><p class="sub">Exported on ${date} &bull; ${entries.length} petition${entries.length !== 1 ? 's' : ''}</p>${rows}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-10 animate-slide-up-fade">
      <ConfettiCanvas active={confettiActive} />
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        limitType="prayers"
        limitDetail={`${entries.length} of 10 prayers created`}
      />
      <ShareImageModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        heading={shareHeading}
        content={shareContent}
      />

      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="relative space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Sacred Journal</h1>
          <p className="text-navy-300 font-medium">Record your heart&apos;s cries and watch God&apos;s faithful hand move.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToPDF}
            title="Export journal as PDF"
            className="flex items-center gap-2 px-4 py-3 bg-navy-800 border border-white/10 text-navy-300 hover:text-white hover:border-white/20 font-bold rounded-2xl transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline uppercase tracking-widest text-xs">Export PDF</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="relative group bg-gold-gradient text-navy-950 font-black px-8 py-4 rounded-2xl shadow-xl shadow-gold-400/10 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Plus className="w-5 h-5 relative z-10" />
            <span className="relative z-10 uppercase tracking-widest text-xs">New Petition</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-slide-up-fade [animation-delay:100ms]">
         {[
           { label: 'Petitions', val: totalPrayers, icon: BookOpen, color: 'text-gold-400', bg: 'bg-gold-400/10' },
           { label: 'Answered', val: answeredPrayers, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
           { label: 'Day Streak', val: streak, icon: Flame, color: 'text-amber-400', bg: 'bg-amber-400/10' }
         ].map((stat, i) => (
           <div key={i} className="bg-navy-900/40 border border-white/5 rounded-3xl p-6 flex items-center gap-6 group hover:border-white/10 transition-colors">
              <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                 <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                 <p className="text-3xl font-black text-white">{stat.val}</p>
                 <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Form & List Container */}
      <div className="grid lg:grid-cols-12 gap-10">
        
        {/* Main Section */}
        <div className="lg:col-span-8 space-y-8">
           
           {/* Search & Filters */}
           <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex-1 w-full">
                 <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600" />
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search petitions..."
                    className="w-full bg-navy-900/40 border border-white/5 rounded-2xl pl-12 pr-12 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all"
                 />
                 {searchQuery && (
                   <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-navy-600 hover:text-white transition-colors"
                   >
                      <X className="w-3.5 h-3.5" />
                   </button>
                 )}
              </div>

              <div className="flex items-center gap-2 bg-navy-900/40 border border-white/5 p-1.5 rounded-2xl w-fit">
                 {(['all', 'praying', 'answered'] as const).map((f) => (
                   <button
                     key={f}
                     onClick={() => setFilter(f)}
                     className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                       filter === f 
                         ? 'bg-gold-gradient text-navy-950 shadow-lg' 
                         : 'text-navy-400 hover:text-white'
                     }`}
                   >
                     {f}
                   </button>
                 ))}
              </div>
           </div>

           {debouncedSearch && (
              <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest ml-1">
                 Found {filteredEntries.length} results for "{debouncedSearch}"
              </p>
           )}

           {/* Prayer List */}
           {loading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-gold-400 animate-spin" />
                <p className="text-xs font-black text-navy-500 uppercase tracking-widest">Opening the scrolls...</p>
             </div>
           ) : filteredEntries.length === 0 ? (
             <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-16 text-center space-y-6">
                <div className="w-20 h-20 bg-navy-950/50 rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-inner">
                   <Target className="w-8 h-8 text-navy-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Silence is a season, not a state.</h3>
                  <p className="text-navy-400 text-sm max-w-xs mx-auto italic">Capture your first petition to begin tracking your spiritual journey.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="text-gold-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:text-white transition-colors">
                  Create First Entry <ArrowRight className="w-4 h-4" />
                </button>
             </div>
           ) : (
             <div className="grid gap-6">
                {filteredEntries.map((entry) => {
                  const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.Other;
                  const isAnswered = entry.status === 'answered';
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`group bg-navy-900/40 border rounded-[2rem] p-8 transition-all duration-500 relative overflow-hidden hover:shadow-2xl hover:shadow-gold-400/5 ${
                        isAnswered ? 'border-emerald-400/10' : 'border-white/5 hover:border-gold-400/20'
                      }`}
                    >
                      {isAnswered && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 blur-[40px] -translate-y-1/2 translate-x-1/2" />}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${catConfig.bg} rounded-xl flex items-center justify-center text-xs font-black ${catConfig.color}`}>
                               {catConfig.icon}
                            </div>
                            <div className="space-y-0.5">
                               <h3 className="font-bold text-white group-hover:text-gold-400 transition-colors text-lg">
                                 {highlightText(entry.title, debouncedSearch)}
                               </h3>
                               <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest">{entry.category}</p>
                            </div>
                         </div>
                         <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                           isAnswered ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                         }`}>
                            {entry.status}
                         </div>
                      </div>

                      <p className="text-navy-300 text-sm leading-relaxed mb-8 line-clamp-2 italic">
                        "{entry.content ? highlightText(entry.content, debouncedSearch) : 'Seeking God\'s wisdom and intervention...'}"
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/5">
                         <p className="text-[10px] font-bold text-navy-600 uppercase tracking-widest">
                           Logged {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                         </p>
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleEdit(entry)}
                              className="p-3 bg-navy-950/50 text-navy-400 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                              title="Edit Petition"
                            >
                               <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => talkToAI(entry)}
                              className="p-3 bg-navy-950/50 text-gold-400 rounded-xl hover:bg-gold-400/10 transition-colors border border-white/5"
                              title="Ask AI for verses"
                            >
                               <MessageSquare className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openShare(entry)}
                              className="p-3 bg-navy-950/50 text-navy-400 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
                              title="Share as Image"
                            >
                               <Share2 className="w-4 h-4" />
                            </button>
                            {!isAnswered && (
                              <button 
                                onClick={() => markAnswered(entry)}
                                className="bg-emerald-400 text-navy-950 font-black px-6 py-2.5 rounded-xl hover:bg-emerald-300 transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"
                              >
                                {answeringId === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Answered
                              </button>
                            )}
                         </div>
                      </div>
                    </div>
                  );
                })}
             </div>
           )}
        </div>

        {/* Sidebar: Entry Form */}
        <div className="lg:col-span-4">
           <div className={`sticky top-8 space-y-8 transition-all duration-700 ${showForm ? 'opacity-100 translate-y-0' : 'opacity-60 grayscale-[0.5]'}`}>
              <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient" />
                 <div className="space-y-1">
                     <h2 className="text-xl font-bold text-white">{editingEntry ? 'Refine Petition' : 'Add Petition'}</h2>
                     <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest">{editingEntry ? 'Updating the legacy' : 'A dedicated space for your heart'}</p>
                 </div>

                 <div className="space-y-5">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Petition Title</label>
                       <input 
                         type="text" 
                         value={title}
                         onChange={(e) => setTitle(e.target.value)}
                         placeholder="e.g. Strength for the week"
                         className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all placeholder:text-navy-700" 
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Category</label>
                       <div className="relative group">
                          <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full appearance-none bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all cursor-pointer"
                          >
                             {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 pointer-events-none group-hover:text-gold-400 transition-colors" />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Detailed Cry (Optional)</label>
                       <textarea 
                         value={content}
                         onChange={(e) => setContent(e.target.value)}
                         placeholder="Pour out your heart..."
                         rows={4}
                         className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all resize-none placeholder:text-navy-700"
                       />
                    </div>

                    <button 
                      onClick={saveEntry}
                      disabled={!title.trim() || savingEntry}
                      className="w-full bg-gold-gradient text-navy-950 font-black py-4 rounded-2xl shadow-xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
                    >
                       {savingEntry ? <Loader2 className="w-5 h-5 animate-spin" /> : editingEntry ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                       {savingEntry ? 'Saving to Journal...' : editingEntry ? 'Update Petition' : 'Seal with Amen'}
                    </button>
                 </div>
              </div>

              {/* Usage Hint */}
              {!isPro && (
                <div className="p-8 bg-navy-950/50 border border-navy-800 rounded-[2.5rem] space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Journal Capacity</span>
                      <span className="text-[10px] font-black text-gold-400 uppercase tracking-widest">{entries.length}/10 Used</span>
                   </div>
                   <div className="h-1.5 w-full bg-navy-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gold-400 rounded-full transition-all duration-1000" style={{ width: `${(entries.length / 10) * 100}%` }} />
                   </div>
                   <p className="text-[10px] text-navy-500 text-center italic">Upgrade to Pro for unlimited journaling.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
