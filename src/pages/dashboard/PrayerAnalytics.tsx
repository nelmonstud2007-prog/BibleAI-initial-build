import { useEffect, useMemo, useState } from 'react';
import { Crown, Flame, PieChart, TrendingUp, Loader2, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
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
      try {
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
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, [user?.id, isPro]);

  // Heatmap Logic (Last 12 weeks)
  const heatmapData = useMemo(() => {
    const data: { date: string; level: number }[] = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 83); // 12 weeks back

    const prayerDates = new Set(entries.map(e => new Date(e.created_at).toDateString()));
    const streakDates = new Set(streakRows.map(s => new Date(s.date).toDateString()));

    for (let i = 0; i < 84; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toDateString();
      
      let level = 0;
      if (prayerDates.has(dateStr)) level = 2;
      if (streakDates.has(dateStr)) level = 3;
      if (prayerDates.has(dateStr) && streakDates.has(dateStr)) level = 4;
      
      data.push({ date: d.toISOString(), level });
    }
    return data;
  }, [entries, streakRows]);

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
        <div className="bg-navy-900/60 border border-gold-400/20 rounded-[3rem] p-12 sm:p-20 text-center space-y-8 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold-400/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
          
          <div className="w-20 h-20 bg-gold-gradient rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-gold-400/20 animate-glow-pulse relative z-10">
            <Crown className="w-10 h-10 text-navy-950" />
          </div>
          
          <div className="space-y-4 relative z-10">
            <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">The Insightful Disciple</h1>
            <p className="text-navy-300 text-lg max-w-xl mx-auto leading-relaxed">
              Visualize your spiritual rhythm. Unlock deep insights into your prayer life, category trends, and long-term growth.
            </p>
          </div>

          <button
            onClick={() => setShowUpgrade(true)}
            className="relative z-10 inline-flex items-center gap-3 bg-gold-gradient text-navy-950 font-black px-10 py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-gold-400/20 active:scale-95 text-lg"
          >
            <Crown className="w-5 h-5" />
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 lg:p-12 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">Faith Insights</h1>
          <p className="text-navy-400 font-medium italic">"The prayer of a righteous person is powerful and effective." — James 5:16</p>
        </div>
        <div className="flex items-center gap-3 bg-navy-900/50 border border-white/5 px-6 py-4 rounded-[2rem] shadow-xl backdrop-blur-md">
           <CalendarIcon className="w-5 h-5 text-gold-400" />
           <span className="text-xs font-black text-navy-200 uppercase tracking-[0.2em]">Live Journal Tracking</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <Loader2 className="w-12 h-12 text-gold-400 animate-spin" />
          <p className="text-xs font-black text-navy-500 uppercase tracking-widest">Consulting the scrolls...</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Heatmap Section */}
          <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient opacity-30 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">Spiritual Rhythm</h2>
                  <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em]">Consistency across the last 12 weeks</p>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 bg-navy-800 rounded-sm" />
                     <span className="text-[9px] font-bold text-navy-600 uppercase">None</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 bg-gold-400/90 rounded-sm" />
                     <span className="text-[9px] font-bold text-navy-600 uppercase">Daily</span>
                  </div>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
               {heatmapData.map((item, i) => (
                  <div 
                    key={i}
                    title={new Date(item.date).toLocaleDateString()}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md transition-all duration-500 hover:scale-125 cursor-help ${
                      item.level === 0 ? 'bg-navy-800/40 border border-white/5' :
                      item.level === 2 ? 'bg-gold-400/20 border border-gold-400/10' :
                      item.level === 3 ? 'bg-gold-400/50' :
                      'bg-gold-gradient shadow-lg shadow-gold-400/20'
                    }`}
                  />
               ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Bar Chart */}
            <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-8 hover:border-gold-400/20 transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center">
                   <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Prayer Growth</h2>
              </div>
              <div className="h-64 flex items-end gap-4 px-2">
                {monthlyData.map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-4 group">
                    <div
                      className="w-full rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden group-hover:border-gold-400/30 transition-all duration-500"
                      style={{ height: `100%` }}
                    >
                       <div 
                        className="absolute bottom-0 left-0 w-full bg-gold-gradient shadow-2xl group-hover:brightness-125 transition-all duration-1000 ease-out"
                        style={{ height: `${(item.count / maxMonthCount) * 100}%` }}
                       />
                    </div>
                    <div className="space-y-0.5 text-center">
                       <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest">{item.label}</p>
                       <p className="text-sm font-bold text-white">{item.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories Pie */}
            <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-8 hover:border-emerald-400/20 transition-all duration-500">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center">
                     <PieChart className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Focus Areas</h2>
               </div>
               <div className="flex flex-col sm:flex-row items-center gap-12">
                  <div className="relative">
                     <div className="w-48 h-48 rounded-full border-8 border-navy-950/50 shadow-2xl relative z-10" style={{ background: pieChartBackground }} />
                     <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl opacity-20" />
                  </div>
                  <div className="space-y-4 w-full">
                     {categoryStats.length === 0 ? (
                        <p className="text-sm text-navy-400 italic">Pour out your heart to see patterns here.</p>
                     ) : (
                        categoryStats.slice(0, 5).map((item, idx) => (
                           <div key={item.category} className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                              <div className="flex items-center gap-3">
                                 <div
                                    className="w-2.5 h-2.5 rounded-full shadow-lg shadow-black/50"
                                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                                 />
                                 <span className="text-xs font-bold text-navy-200 uppercase tracking-widest">{item.category}</span>
                              </div>
                              <span className="text-white font-black text-xs">{item.count}</span>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-4 hover:bg-emerald-400/[0.02] hover:border-emerald-400/10 transition-all group">
              <div className="flex items-center justify-between">
                 <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em]">Fulfillment Rate</p>
                 <CheckCircle2 className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                 <p className="text-5xl font-bold text-white tracking-tighter">{answeredPct}%</p>
                 <p className="text-xs font-medium text-navy-400">{answeredCount} petitions answered</p>
              </div>
            </div>

            <div className="bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-4 hover:bg-amber-400/[0.02] hover:border-amber-400/10 transition-all group">
              <div className="flex items-center justify-between">
                 <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em]">Consecutive Devotion</p>
                 <Flame className="w-5 h-5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                 <p className="text-5xl font-bold text-white tracking-tighter">{longestStreak}</p>
                 <p className="text-xs font-medium text-navy-400">Day maximum streak</p>
              </div>
            </div>

            <div className="bg-gold-gradient rounded-[2.5rem] p-10 space-y-4 shadow-2xl shadow-gold-400/10 hover:scale-[1.02] transition-transform cursor-default">
              <p className="text-[10px] font-black text-navy-950/60 uppercase tracking-[0.2em]">Total Legacy</p>
              <div className="space-y-1">
                 <p className="text-5xl font-black text-navy-950 tracking-tighter">{entries.length}</p>
                 <p className="text-xs font-bold text-navy-950/70 uppercase tracking-widest">Prayers lifted to heaven</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
