import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { MessageCircle, BookOpen, Sun, Flame, ChevronRight, Sparkles, Trophy, Calendar, ArrowRight, Quote } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics';

export default function DashboardHome() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const [prayerCount, setPrayerCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [prayedToday, setPrayedToday] = useState(false);
  const [verseOfTheDay, setVerseOfTheDay] = useState<{ text: string; ref: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchDashboardData();
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('upgraded') === 'true') {
      trackEvent('subscription_purchase_completed');
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoadingData(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const [prayersRes, streaksRes, devotionalRes] = await Promise.all([
        supabase
          .from('prayer_journal_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('prayer_streaks')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(365),
        supabase
          .from('daily_devotionals')
          .select('verse, verse_ref')
          .eq('date', today)
          .maybeSingle(),
      ]);

      if (prayersRes.error) throw prayersRes.error;
      if (streaksRes.error) throw streaksRes.error;

      if (devotionalRes.data) {
        setVerseOfTheDay({ text: devotionalRes.data.verse, ref: devotionalRes.data.verse_ref });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('last_prayer_added_date')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.last_prayer_added_date === today) {
        setPrayedToday(true);
      } else {
        setPrayedToday(false);
      }

      const streaks = streaksRes.data;
      setPrayerCount(prayersRes.count ?? 0);

      if (!streaks || streaks.length === 0 || streaks[0].date !== today) {
        // Check if the streak was active yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (streaks && streaks[0]?.date === yesterdayStr) {
           // Streak is still "active" but today hasn't been completed yet
           // I'll keep the streak count but show a "don't forget" message
        } else {
          setStreakDays(0);
          return;
        }
      }

      let currentStreak = streaks?.[0]?.date === today ? 1 : 0;
      const dates = streaks?.map((s) => s.date) || [];
      
      // Calculate streak logic...
      let streak = 0;
      if (dates.length > 0) {
        let checkDate = new Date();
        // If they haven't prayed today, start checking from yesterday
        if (dates[0] !== today) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        
        for (let i = 0; i < dates.length; i++) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (dates.includes(dStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      setStreakDays(streak);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setPrayerCount(0);
      setStreakDays(0);
    } finally {
      setLoadingData(false);
    }
  };

  const streakMessage = useMemo(() => {
    if (streakDays >= 7) return "You're on fire! Keep leaning into prayer every day.";
    if (streakDays > 0) return 'Keep it going. Every day in prayer builds lasting faith.';
    return 'Start your streak today by adding a prayer entry.';
  }, [streakDays]);

  const stats = [
    { label: 'Prayers Logged', value: String(prayerCount), icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Day Streak', value: String(streakDays), icon: Flame, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  const quickActions = [
    { label: 'Bible Chat', path: '/dashboard/bible-chat', icon: MessageCircle, description: 'Ask about scripture', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Prayer Journal', path: '/dashboard/prayer-journal', icon: BookOpen, description: 'Write a prayer', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: "Bible Reader", path: '/dashboard/bible', icon: Sun, description: 'Read the Word', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-10">
      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-slide-up-fade">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Hello, <span className="text-gold-gradient bg-clip-text text-transparent">{firstName}</span>
          </h1>
          <p className="text-navy-300 text-lg">Welcome back. How can we grow in faith today?</p>
        </div>
        {prayedToday ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-sm font-bold text-emerald-400 shadow-xl shadow-emerald-500/5 animate-glow-pulse">
            <Trophy className="w-4 h-4" />
            Daily goal reached
          </div>
        ) : (
          <Link 
            to="/dashboard/prayer-journal"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-800 border border-navy-700 rounded-2xl text-sm font-semibold text-white hover:border-gold-400/50 hover:bg-navy-700 transition-all shadow-lg"
          >
            <Calendar className="w-4 h-4 text-gold-400" />
            Log today&apos;s prayer
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Actions */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 animate-stagger-in" style={{ animationDelay: '0.1s' }}>
            {loadingData
              ? Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="bg-navy-900/40 border border-navy-800/50 rounded-3xl p-6 animate-pulse h-32" />
                ))
              : stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="group bg-navy-900/40 backdrop-blur-sm border border-navy-800/50 rounded-3xl p-6 hover:border-navy-700 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl rounded-full -translate-y-12 translate-x-12 opacity-50`} />
                      <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                        <p className="text-xs font-bold text-navy-400 uppercase tracking-widest mt-1">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider text-[11px] text-navy-400">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger-in" style={{ animationDelay: '0.2s' }}>
              {loadingData
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="bg-navy-900/40 border border-navy-800/50 rounded-2xl h-40 animate-pulse" />
                  ))
                : quickActions.map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.label}
                        to={action.path}
                        className="group bg-navy-900/40 backdrop-blur-sm border border-navy-800/50 rounded-2xl p-5 hover:bg-navy-800/60 hover:border-gold-400/30 transition-all duration-300 flex flex-col justify-between h-full"
                      >
                        <div className={`w-12 h-12 ${action.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3`}>
                          <Icon className={`w-6 h-6 ${action.color}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors">{action.label}</h3>
                          <p className="text-xs text-navy-400 mt-1 line-clamp-1">{action.description}</p>
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
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center animate-glow-pulse">
                  <Flame className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{streakDays} Day Streak!</h3>
                  <p className="text-sm text-navy-300">{streakMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Verse of the Day (Premium Card) */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-6 animate-slide-up-fade" style={{ animationDelay: '0.4s' }}>
            <div className="group relative bg-navy-900 border border-gold-400/20 rounded-[2.5rem] p-8 sm:p-10 overflow-hidden shadow-2xl transition-all duration-500 hover:border-gold-400/40">
              
              {/* Premium Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-gold-400/15 transition-all duration-700" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-400/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-gold-400/[0.03] to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full min-h-[320px]">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-gold-400" />
                  </div>
                  <span className="text-[10px] font-bold text-gold-400 uppercase tracking-[0.2em]">Verse of the Day</span>
                </div>

                <div className="flex-1">
                  <Quote className="w-10 h-10 text-gold-400/20 mb-4 -ml-2" />
                  {verseOfTheDay ? (
                    <>
                      <blockquote className="text-2xl sm:text-3xl text-white font-serif leading-tight italic">
                        &ldquo;{verseOfTheDay.text}&rdquo;
                      </blockquote>
                      <p className="mt-8 text-gold-400 font-bold tracking-wide flex items-center gap-2">
                        <span className="h-px w-8 bg-gold-400/30" />
                        {verseOfTheDay.ref}
                      </p>
                    </>
                  ) : (
                    <>
                      <blockquote className="text-2xl sm:text-3xl text-white font-serif leading-tight italic">
                        &ldquo;For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.&rdquo;
                      </blockquote>
                      <p className="mt-8 text-gold-400 font-bold tracking-wide flex items-center gap-2">
                        <span className="h-px w-8 bg-gold-400/30" />
                        Jeremiah 29:11
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-10">
                  <Link
                    to="/dashboard/daily-verse"
                    className="w-full bg-navy-800/50 backdrop-blur-md border border-gold-400/20 py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-bold hover:bg-gold-400 hover:text-navy-950 hover:border-gold-400 transition-all duration-300 group/btn"
                  >
                    Reflect on this Word
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Daily Goal Progress */}
            <div className="bg-navy-900/40 border border-navy-800/50 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-navy-400 uppercase tracking-wider">Your Daily Goal</span>
                <span className="text-xs font-bold text-emerald-400">{prayedToday ? '100%' : '0%'}</span>
              </div>
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${prayedToday ? 'w-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'w-0'}`}
                />
              </div>
              <p className="text-[11px] text-navy-400 mt-3 text-center">
                {prayedToday 
                  ? 'Excellent! You’ve built your spiritual foundation for today.'
                  : 'A simple prayer can change everything. Why not log one now?'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
