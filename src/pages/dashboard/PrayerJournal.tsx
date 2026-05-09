import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [entries, setEntries] = useState<PrayerEntry[]>([]);
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

  useEffect(() => {
    if (user) {
      fetchEntries();
      trackPrayerActivity('visit').then(() => fetchStreak());
    }
  }, [user]);

  const trackPrayerActivity = async (type: 'visit' | 'prayer') => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    // Check if streak already exists for today to avoid 403 on upsert without UPDATE policy
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

    // Count consecutive days ending today
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

  const addEntry = async () => {
    if (!user || !title.trim() || savingEntry) return;

    // Check prayer limit for free users
    if (!isPro && entries.length >= 10) {
      setShowUpgrade(true);
      return;
    }

    setSavingEntry(true);
    try {
      const { data, error } = await supabase
        .from('prayer_journal_entries')
        .insert({ user_id: user.id, title: title.trim(), content: content.trim(), category, status })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setEntries([data as PrayerEntry, ...entries]);
        trackEvent('prayer_added', { category, status });
        setTitle('');
        setContent('');
        setCategory('Other');
        setStatus('praying');
        setShowForm(false);
        await trackPrayerActivity('prayer');
        fetchStreak();
      }
    } catch (err) {
      console.error('Failed to add prayer entry:', err);
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

  const totalPrayers = entries.length;
  const answeredPrayers = entries.filter((e) => e.status === 'answered').length;

  const openShare = (entry: PrayerEntry) => {
    setShareHeading(entry.title);
    setShareContent(entry.content || 'A prayer from my BibleAI journal');
    setShareOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Prayer Journal</h1>
          <p className="mt-1 text-sm text-navy-300">Record your prayers and watch God move</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gold-400 text-navy-950 font-semibold px-4 py-2.5 rounded-xl hover:bg-gold-300 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Prayer</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-navy-900/50 border border-navy-800 rounded-xl p-4 text-center">
          <BookOpen className="w-5 h-5 text-gold-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{totalPrayers}</p>
          <p className="text-xs text-navy-400 mt-0.5">Total Prayers</p>
        </div>
        <div className="bg-navy-900/50 border border-navy-800 rounded-xl p-4 text-center">
          <Check className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{answeredPrayers}</p>
          <p className="text-xs text-navy-400 mt-0.5">Answered</p>
        </div>
        <div className="bg-navy-900/50 border border-navy-800 rounded-xl p-4 text-center">
          <Flame className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{streak}</p>
          <p className="text-xs text-navy-400 mt-0.5">Day Streak</p>
        </div>
      </div>

      {/* New Prayer Form */}
      {showForm && (
        <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6 mb-8">
          <h2 className="text-base font-semibold text-white mb-4">New Prayer</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you praying for?"
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Description</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your heart with God..."
                rows={3}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Status</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('praying')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      status === 'praying'
                        ? 'bg-amber-400/15 border border-amber-400/30 text-amber-400'
                        : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    Praying
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('answered')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      status === 'answered'
                        ? 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-400'
                        : 'bg-navy-800 border border-navy-700 text-navy-400 hover:text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Answered
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={addEntry}
                disabled={!title.trim() || savingEntry}
                className="bg-gold-400 text-navy-950 font-semibold px-6 py-2.5 rounded-xl hover:bg-gold-300 transition-colors text-sm disabled:opacity-40"
              >
                {savingEntry ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Prayer'
                )}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-navy-800 text-navy-300 font-medium px-6 py-2.5 rounded-xl hover:text-white transition-colors text-sm border border-navy-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prayer Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="mx-auto w-full max-w-lg bg-gradient-to-br from-navy-900/70 to-navy-900/40 border border-gold-400/20 rounded-3xl p-8 sm:p-10">
            <div className="w-20 h-20 rounded-2xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl" role="img" aria-label="Praying hands">
                🙏
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Your first prayer starts here</h3>
            <p className="text-sm text-navy-300 mb-7">
              Capture what is on your heart and begin your prayer journey with faith.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-gold-400 text-navy-950 font-semibold px-6 py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add Prayer
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => {
            const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.Other;
            const isAnswered = entry.status === 'answered';
            const isJustAnswered = justAnsweredId === entry.id;

            return (
              <div
                key={entry.id}
                className={`group bg-navy-900/50 border rounded-2xl p-5 transition-all duration-300 relative overflow-hidden ${
                  isJustAnswered
                    ? 'border-emerald-400/50 shadow-lg shadow-emerald-400/10 scale-[1.02]'
                    : isAnswered
                      ? 'border-emerald-400/20'
                      : 'border-navy-800 hover:border-navy-700'
                }`}
              >
                {/* Answered glow effect */}
                {isJustAnswered && (
                  <div className="absolute inset-0 bg-emerald-400/5 animate-pulse" />
                )}

                <div className="relative">
                  {/* Category badge + status */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${catConfig.bg} ${catConfig.color}`}
                    >
                      {entry.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                        isAnswered
                          ? 'bg-emerald-400/15 text-emerald-400'
                          : 'bg-amber-400/15 text-amber-400'
                      }`}
                    >
                      {isAnswered ? (
                        <>
                          <Check className="w-3 h-3" />
                          Answered
                        </>
                      ) : (
                        <>
                          <Heart className="w-3 h-3" />
                          Praying
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-base font-semibold mb-1.5 ${
                      isAnswered ? 'text-emerald-300' : 'text-white'
                    }`}
                  >
                    {entry.title}
                  </h3>

                  {/* Description */}
                  {entry.content && (
                    <p className="text-sm text-navy-300 leading-relaxed line-clamp-3 mb-3">
                      {entry.content}
                    </p>
                  )}

                  {/* Date */}
                  <p className="text-xs text-navy-500 mb-3">
                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>

                  {/* Mark answered button */}
                  {!isAnswered && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openShare(entry)}
                        className="w-full flex items-center justify-center gap-2 bg-navy-800 border border-navy-700 text-navy-200 font-medium py-2 rounded-xl hover:text-white hover:border-navy-600 transition-all text-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                      <button
                        onClick={() => markAnswered(entry)}
                        disabled={Boolean(answeringId)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 font-medium py-2 rounded-xl hover:bg-emerald-400/20 transition-all text-sm disabled:opacity-60"
                      >
                        {answeringId === entry.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Answered
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Answered celebration indicator */}
                  {isAnswered && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openShare(entry)}
                        className="w-full flex items-center justify-center gap-2 bg-navy-800 border border-navy-700 text-navy-200 font-medium py-2 rounded-xl hover:text-white hover:border-navy-600 transition-all text-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                      <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium py-2">
                        <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-navy-950" strokeWidth={3} />
                        </div>
                        Answered
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
