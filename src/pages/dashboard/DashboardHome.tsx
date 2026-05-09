import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { MessageCircle, BookOpen, Sun, Flame } from 'lucide-react';
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
      const [prayersRes, streaksRes] = await Promise.all([
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
      ]);

      if (prayersRes.error) throw prayersRes.error;
      if (streaksRes.error) throw streaksRes.error;

      // Fetch profile for last_prayer_added_date
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_prayer_added_date')
        .eq('id', user.id)
        .single();

      if (profile?.last_prayer_added_date === today) {
        setPrayedToday(true);
      } else {
        setPrayedToday(false);
      }

      const streaks = streaksRes.data;
      setPrayerCount(prayersRes.count ?? 0);

      if (!streaks || streaks.length === 0 || streaks[0].date !== today) {
        setStreakDays(0);
        return;
      }

      let currentStreak = 1;
      const dates = streaks.map((s) => s.date);
      for (let i = 0; i < dates.length - 1; i++) {
        const curr = new Date(dates[i]);
        const prev = new Date(dates[i + 1]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (Math.abs(diff - 1) < 0.5) {
          currentStreak++;
        } else {
          break;
        }
      }
      setStreakDays(currentStreak);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setPrayerCount(0);
      setStreakDays(0);
    } finally {
      setLoadingData(false);
    }
  };

  const streakMessage = useMemo(() => {
    if (streakDays > 7) return "You're on fire! Keep leaning into prayer every day.";
    if (streakDays > 0) return 'Keep it going. Every day in prayer builds lasting faith.';
    return 'Start your streak today by visiting your journal or adding a prayer.';
  }, [streakDays]);

  const stats = [
    { label: 'Chat Messages', value: '0', icon: MessageCircle, color: 'text-blue-400' },
    { label: 'Prayers Logged', value: String(prayerCount), icon: BookOpen, color: 'text-emerald-400' },
    { label: 'Verses Reflected', value: '0', icon: Sun, color: 'text-amber-400' },
    { label: 'Day Streak', value: String(streakDays), icon: Flame, color: 'text-rose-400' },
  ];

  const quickActions = [
    { label: 'Start a Bible Chat', path: '/dashboard/bible-chat', icon: MessageCircle, description: 'Ask anything about scripture' },
    { label: 'Write a Prayer', path: '/dashboard/prayer-journal', icon: BookOpen, description: 'Lift your heart to God' },
    { label: "Today's Verse", path: '/dashboard/daily-verse', icon: Sun, description: 'Reflect on the Word' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            Hello, <span className="text-gold-400">{firstName}</span>
            {prayedToday && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-xs font-bold text-emerald-400 animate-fade-in">
                Prayed today ✓
              </span>
            )}
          </h1>
          <p className="mt-1 text-navy-300">Welcome back. How can we grow in faith today?</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loadingData
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-navy-900/50 border border-navy-800 rounded-xl p-4 sm:p-5 animate-pulse">
                <div className="w-5 h-5 rounded bg-navy-700 mb-3" />
                <div className="h-8 w-12 rounded bg-navy-700 mb-2" />
                <div className="h-3 w-20 rounded bg-navy-800" />
              </div>
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-navy-900/50 border border-navy-800 rounded-xl p-4 sm:p-5"
                >
                  <Icon className={`w-5 h-5 ${stat.color} mb-3`} />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{stat.label}</p>
                </div>
              );
            })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loadingData
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="bg-navy-900/50 border border-navy-800 rounded-xl p-5 animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-navy-700 mb-3" />
                  <div className="h-4 w-28 rounded bg-navy-700 mb-2" />
                  <div className="h-3 w-36 rounded bg-navy-800" />
                </div>
              ))
            : quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    to={action.path}
                    className="group bg-navy-900/50 border border-navy-800 rounded-xl p-5 hover:border-gold-400/30 hover:bg-navy-900/80 transition-all duration-200"
                  >
                    <div className="w-10 h-10 bg-gold-400/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gold-400/20 transition-colors">
                      <Icon className="w-5 h-5 text-gold-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{action.label}</h3>
                    <p className="text-xs text-navy-400 mt-1">{action.description}</p>
                  </Link>
                );
              })}
        </div>
      </div>

      {/* Prayer streak highlight */}
      <div className="mb-8 bg-navy-900/50 border border-amber-400/20 rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
          Prayer Streak
        </p>
        {loadingData ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 w-40 rounded bg-navy-700" />
            <div className="h-4 w-64 rounded bg-navy-800" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-white mb-1">🔥 {streakDays} day{streakDays === 1 ? '' : 's'}</p>
            <p className="text-sm text-navy-300">{streakMessage}</p>
          </>
        )}
      </div>

      {/* Verse of the Day Card */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-900/50 border border-gold-400/20 rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-medium text-gold-400 uppercase tracking-wider mb-3">Verse of the Day</p>
        <blockquote className="text-lg sm:text-xl text-white leading-relaxed italic">
          "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."
        </blockquote>
        <p className="mt-4 text-sm text-gold-400 font-medium">Jeremiah 29:11</p>
        <Link
          to="/dashboard/daily-verse"
          className="mt-4 inline-flex items-center text-sm text-navy-300 hover:text-white transition-colors"
        >
          Write a reflection
        </Link>
      </div>
    </div>
  );
}
