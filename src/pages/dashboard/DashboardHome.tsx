import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  MessageCircle, BookOpen, Sun, Flame, ChevronRight, Sparkles,
  Trophy, Calendar, ArrowRight, Quote, Award, Users, Book
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics';
import { useStreak } from '../../lib/useStreak';
import AchievementBadges from '../../components/AchievementBadges';
import SmartVerseRecommendations from '../../components/SmartVerseRecommendations';

// ── Skeleton components ───────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="bg-navy-900/40 border border-navy-800/50 rounded-3xl p-6 h-32 overflow-hidden relative">
      <div className="skeleton absolute inset-0 rounded-3xl" />
    </div>
  );
}

function ActionSkeleton() {
  return (
    <div className="bg-navy-900/40 border border-navy-800/50 rounded-2xl h-40 overflow-hidden relative">
      <div className="skeleton absolute inset-0 rounded-2xl" />
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span className="animate-counter">{display}</span>;
}

export default function DashboardHome() {
  const { user, isPro } = useAuth();
  const { isDark } = useTheme();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const { streak: streakDays, prayedToday, loading: streakLoading } = useStreak(user?.id);
  const [prayerCount, setPrayerCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [verseOfTheDay, setVerseOfTheDay] = useState<{ text: string; ref: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchDashboardData();
    trackEvent('dashboard_viewed', {});
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoadingData(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const [prayersRes, devotionalRes, communityRes] = await Promise.all([
        supabase.from('prayer_journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('daily_devotionals').select('verse, verse_ref').eq('date', today).maybeSingle(),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }),
      ]);
      if (devotionalRes.data) setVerseOfTheDay({ text: devotionalRes.data.verse, ref: devotionalRes.data.verse_ref });
      setPrayerCount(prayersRes.count ?? 0);
      setCommunityCount(communityRes.count ?? 0);
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const streakMessage = useMemo(() => {
    if (streakDays >= 30) return 'Incredible! 30+ days of faithfulness. You are an inspiration.';
    if (streakDays >= 7) return "You're on fire! Keep leaning into prayer every day.";
    if (streakDays > 0) return 'Keep it going. Every day in prayer builds lasting faith.';
    return 'Start your streak today by adding a prayer entry.';
  }, [streakDays]);

  const stats = [
    { label: 'Prayers Logged', value: prayerCount, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Day Streak', value: streakDays, icon: Flame, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Community', value: communityCount, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ];

  const quickActions = [
    { label: 'Bible Chat', path: '/dashboard/bible-chat', icon: MessageCircle, description: 'Ask about scripture', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Prayer Journal', path: '/dashboard/prayer-journal', icon: BookOpen, description: 'Write a prayer', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Bible Reader', path: '/dashboard/bible', icon: Book, description: 'Read the Word', color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Community', path: '/dashboard/community', icon: Users, description: 'Share verses', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-navy-300' : 'text-slate-600';
  const cardBg = isDark ? 'bg-navy-900/40 border-navy-800/50' : 'bg-white border-slate-200';

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      {/* ── Greeting ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-slide-up-fade">
        <div className="space-y-1">
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${textPrimary}`}>
            Hello, <span className="text-gold-gradient bg-clip-text text-transparent">{firstName}</span>
          </h1>
          <p className={`text-lg ${textSecondary}`}>Welcome back. How can we help today?</p>
        </div>
        {prayedToday ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-sm font-bold text-emerald-400 shadow-xl shadow-emerald-500/5 animate-glow-pulse"
            role="status" aria-label="Daily goal reached">
            <Trophy className="w-4 h-4" aria-hidden="true" />
            Daily goal reached
          </div>
        ) : (
          <Link to="/dashboard/prayer-journal"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${isDark ? 'bg-navy-800 border border-navy-700 text-white hover:border-gold-400/50 hover:bg-navy-700' : 'bg-slate-100 border border-slate-200 text-slate-900 hover:border-gold-400/50 hover:bg-slate-50'}`}>
            <Calendar className="w-4 h-4 text-gold-400" aria-hidden="true" />
            Log today's prayer
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column ── */}
        <div className="lg:col-span-7 space-y-8">

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 animate-stagger-in" style={{ animationDelay: '0.1s' }}>
            {loadingData || streakLoading
              ? Array.from({ length: 3 }).map((_, idx) => <StatSkeleton key={idx} />)
              : stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label}
                      className={`group border rounded-3xl p-5 hover:border-gold-400/20 transition-all duration-300 relative overflow-hidden ${cardBg}`}>
                      <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl rounded-full -translate-y-12 translate-x-12 opacity-50`} />
                      <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                      </div>
                      <p className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                        <AnimatedCounter value={stat.value} />
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-navy-400' : 'text-slate-400'}`}>{stat.label}</p>
                    </div>
                  );
                })}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-navy-400' : 'text-slate-400'}`}>Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger-in" style={{ animationDelay: '0.2s' }}>
              {loadingData
                ? Array.from({ length: 4 }).map((_, idx) => <ActionSkeleton key={idx} />)
                : quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.label} to={action.path}
                        className={`group border rounded-2xl p-4 hover:border-gold-400/30 transition-all duration-300 flex flex-col justify-between h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${cardBg}`}>
                        <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-5 h-5 ${action.color}`} aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold group-hover:text-gold-400 transition-colors ${textPrimary}`}>{action.label}</h3>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-navy-400' : 'text-slate-400'}`}>{action.description}</p>
                        </div>
                      </Link>
                    );
                  })}
            </div>
          </div>

          {/* Streak Banner */}
          {!loadingData && streakDays > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 rounded-r-2xl p-6 animate-slide-up-fade" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center animate-glow-pulse" aria-hidden="true">
                  <Flame className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className={`font-bold ${textPrimary}`}>{streakDays} Day Streak!</h3>
                  <p className={`text-sm ${textSecondary}`}>{streakMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className={`border rounded-3xl p-6 animate-slide-up-fade ${cardBg}`} style={{ animationDelay: '0.4s' }}>
            <AchievementBadges />
          </div>

          {/* Smart Verse Recommendations */}
          <div className="animate-slide-up-fade" style={{ animationDelay: '0.5s' }}>
            <SmartVerseRecommendations />
          </div>
        </div>

        {/* ── Right Column: Verse of the Day ── */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-6 animate-slide-up-fade" style={{ animationDelay: '0.4s' }}>
            <div className={`group relative border rounded-[2.5rem] p-8 sm:p-10 overflow-hidden shadow-2xl transition-all duration-500 ${isDark ? 'bg-navy-900 border-gold-400/20 hover:border-gold-400/40' : 'bg-white border-gold-400/30 hover:border-gold-400/50'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-gold-400/15 transition-all duration-700" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-400/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full min-h-[300px]">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-gold-400" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-bold text-gold-400 uppercase tracking-[0.2em]">Verse of the Day</span>
                </div>

                <div className="flex-1">
                  <Quote className="w-10 h-10 text-gold-400/20 mb-4 -ml-2" aria-hidden="true" />
                  {loadingData ? (
                    <div className="space-y-3">
                      <div className="skeleton h-4 rounded w-full" />
                      <div className="skeleton h-4 rounded w-5/6" />
                      <div className="skeleton h-4 rounded w-4/6" />
                      <div className="skeleton h-3 rounded w-1/3 mt-6" />
                    </div>
                  ) : verseOfTheDay ? (
                    <>
                      <blockquote className={`text-xl sm:text-2xl font-serif leading-tight italic ${textPrimary}`}>
                        &ldquo;{verseOfTheDay.text}&rdquo;
                      </blockquote>
                      <p className="mt-6 text-gold-400 font-bold tracking-wide flex items-center gap-2">
                        <span className="h-px w-8 bg-gold-400/30" />
                        {verseOfTheDay.ref}
                      </p>
                    </>
                  ) : (
                    <>
                      <blockquote className={`text-xl sm:text-2xl font-serif leading-tight italic ${textPrimary}`}>
                        &ldquo;For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.&rdquo;
                      </blockquote>
                      <p className="mt-6 text-gold-400 font-bold tracking-wide flex items-center gap-2">
                        <span className="h-px w-8 bg-gold-400/30" />
                        Jeremiah 29:11
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-8">
                  <Link to="/dashboard/daily-verse"
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-gold-400 hover:text-navy-950 hover:border-gold-400 transition-all duration-300 group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${isDark ? 'bg-navy-800/50 backdrop-blur-md border border-gold-400/20 text-white' : 'bg-slate-50 border border-gold-400/30 text-slate-900'}`}>
                    Reflect on this Word
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Daily Goal Progress */}
            <div className={`border rounded-3xl p-6 ${cardBg}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-navy-400' : 'text-slate-400'}`}>Your Daily Goal</span>
                <span className="text-xs font-bold text-emerald-400">{prayedToday ? '100%' : '0%'}</span>
              </div>
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={prayedToday ? 100 : 0} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full transition-all duration-1000 ease-out ${prayedToday ? 'w-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'w-0'}`} />
              </div>
              <p className={`text-[11px] mt-3 text-center ${isDark ? 'text-navy-400' : 'text-slate-400'}`}>
                {prayedToday
                  ? "Excellent! You've built your spiritual foundation for today."
                  : 'A simple prayer can change everything. Why not log one now?'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
