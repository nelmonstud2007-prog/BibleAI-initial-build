import { useEffect, useMemo, useState } from 'react';
import { Crown, Flame, PieChart, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import UpgradeModal from '../../components/UpgradeModal';

interface PrayerEntry {
  created_at: string;
  status: 'praying' | 'answered';
  category: string;
}

interface StreakRow {
  date: string;
}

type MonthlyRow = { label: string; count: number };

const CATEGORY_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];

export default function PrayerAnalytics() {
  const { user, isPro } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PrayerEntry[]>([]);
  const [streakRows, setStreakRows] = useState<StreakRow[]>([]);

  useEffect(() => {
    if (!user || !isPro) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const [{ data: prayerData }, { data: streakData }] = await Promise.all([
        supabase
          .from('prayer_journal_entries')
          .select('created_at, status, category')
          .eq('user_id', user.id)
          .gte('created_at', sixMonthsAgo.toISOString()),
        supabase
          .from('prayer_streaks')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: true }),
      ]);

      setEntries((prayerData as PrayerEntry[]) ?? []);
      setStreakRows((streakData as StreakRow[]) ?? []);
      setLoading(false);
    };

    void fetchAnalytics();
  }, [user?.id, isPro]);

  const monthlyData = useMemo<MonthlyRow[]>(() => {
    const now = new Date();
    const keys: string[] = [];
    const labels: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      keys.push(key);
      labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }

    const counts = new Map<string, number>(keys.map((k) => [k, 0]));
    entries.forEach((entry) => {
      const d = new Date(entry.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return keys.map((k, i) => ({ label: labels[i], count: counts.get(k) ?? 0 }));
  }, [entries]);

  const { answeredCount, activeCount, answeredPct } = useMemo(() => {
    const answered = entries.filter((e) => e.status === 'answered').length;
    const active = entries.filter((e) => e.status !== 'answered').length;
    const total = answered + active;
    return {
      answeredCount: answered,
      activeCount: active,
      answeredPct: total > 0 ? Math.round((answered / total) * 100) : 0,
    };
  }, [entries]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => counts.set(e.category, (counts.get(e.category) ?? 0) + 1));
    const sorted = Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    return sorted;
  }, [entries]);

  const pieChartBackground = useMemo(() => {
    const total = categoryStats.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return 'conic-gradient(#334155 0 100%)';
    let start = 0;
    const segments = categoryStats.map((item, idx) => {
      const pct = (item.count / total) * 100;
      const end = start + pct;
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      const seg = `${color} ${start}% ${end}%`;
      start = end;
      return seg;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [categoryStats]);

  const longestStreak = useMemo(() => {
    if (streakRows.length === 0) return 0;
    let max = 1;
    let current = 1;
    for (let i = 1; i < streakRows.length; i++) {
      const prev = new Date(streakRows[i - 1].date);
      const next = new Date(streakRows[i].date);
      const diff = (next.getTime() - prev.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.5) {
        current++;
        if (current > max) max = current;
      } else {
        current = 1;
      }
    }
    return max;
  }, [streakRows]);

  const maxMonthCount = Math.max(...monthlyData.map((m) => m.count), 1);

  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
        <div className="bg-navy-900/60 border border-gold-400/20 rounded-3xl p-8 sm:p-10 text-center">
          <div className="w-16 h-16 bg-gold-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Prayer Analytics is Pro only</h1>
          <p className="text-sm text-navy-300 mb-7 max-w-xl mx-auto">
            Upgrade to unlock insights about your prayer journey, category trends, and long-term spiritual growth.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="inline-flex items-center gap-2 bg-gold-400 text-navy-950 font-semibold px-6 py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Prayer Analytics</h1>
        <p className="mt-1 text-sm text-navy-300">Track patterns in your prayer life and celebrate growth.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-semibold text-white">Prayers Added (Last 6 Months)</h2>
              </div>
              <div className="h-52 flex items-end gap-3">
                {monthlyData.map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-gold-400/70 to-gold-300"
                      style={{ height: `${Math.max((item.count / maxMonthCount) * 100, item.count > 0 ? 12 : 4)}%` }}
                    />
                    <span className="text-[11px] text-navy-400">{item.label}</span>
                    <span className="text-[11px] font-semibold text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-gold-400" />
                <h2 className="text-base font-semibold text-white">Prayer Categories</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-40 h-40 rounded-full border border-navy-700" style={{ background: pieChartBackground }} />
                <div className="space-y-2 w-full">
                  {categoryStats.length === 0 ? (
                    <p className="text-sm text-navy-400">No category data yet.</p>
                  ) : (
                    categoryStats.slice(0, 5).map((item, idx) => (
                      <div key={item.category} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                          />
                          <span className="text-navy-200">{item.category}</span>
                        </div>
                        <span className="text-white font-medium">{item.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-navy-400 mb-2">Answered vs Active</p>
              <p className="text-3xl font-bold text-white">{answeredPct}%</p>
              <p className="text-sm text-navy-300 mt-1">{answeredCount} answered / {activeCount} active</p>
            </div>
            <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-navy-400 mb-2">Longest Streak</p>
              <p className="text-3xl font-bold text-white flex items-center gap-2">
                <Flame className="w-6 h-6 text-amber-400" />
                {longestStreak} days
              </p>
              <p className="text-sm text-navy-300 mt-1">Your best consecutive prayer rhythm.</p>
            </div>
            <div className="bg-gradient-to-br from-navy-900 to-navy-900/50 border border-gold-400/20 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-gold-400 mb-2">Your Faith Journey</p>
              <p className="text-sm text-navy-200 leading-relaxed">
                You&apos;ve logged <span className="text-white font-semibold">{entries.length}</span> prayers in the last 6 months
                and <span className="text-white font-semibold">{answeredCount}</span> have been marked answered. Keep showing up,
                one prayer at a time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
