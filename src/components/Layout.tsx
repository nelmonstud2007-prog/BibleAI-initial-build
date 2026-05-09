import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  MessageCircle,
  BookOpen,
  Sun,
  BarChart3,
  Settings,
  LogOut,
  Cross,
  Crown,
  Book,
  Flame,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import OnboardingTour from './OnboardingTour';
import { supabase } from '../lib/supabase';

const navItems: Array<{
  path: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}> = [
  { path: '/dashboard', label: 'Sanctuary', icon: Home },
  { path: '/dashboard/bible', label: 'The Bible', icon: Book },
  { path: '/dashboard/bible-chat', label: 'Bible Chat', icon: MessageCircle },
  { path: '/dashboard/prayer-journal', label: 'Prayer Journal', icon: BookOpen },
  { path: '/dashboard/daily-verse', label: 'Daily Verse', icon: Sun },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, proOnly: true },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, signOut, isPro } = useAuth();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [streak, setStreak] = useState(0);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const visibleNavItems = navItems.filter((item) => !item.proOnly || isPro);

  useEffect(() => {
    if (user) {
      void fetchStreak();
    }
  }, [user?.id]);

  const fetchStreak = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: streaks } = await supabase
      .from('prayer_streaks')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);

    if (streaks && streaks.length > 0) {
      let count = 0;
      let checkDate = new Date();
      if (streaks[0].date !== today) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      const dateStrings = streaks.map(s => s.date);
      for (let i = 0; i < 30; i++) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (dateStrings.includes(dStr)) {
          count++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(count);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex selection:bg-gold-400/30 selection:text-white">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <OnboardingTour />

      {/* Premium Glass Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:static inset-y-0 left-0 z-50 w-72 bg-navy-950 border-r border-white/5 relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gold-400/5 blur-[80px] -translate-y-1/2 pointer-events-none" />

        <div className="flex flex-col h-full relative z-10">
          {/* Cinematic Logo */}
          <div className="px-6 py-8">
            <Link to="/dashboard" className="flex items-center gap-4 group">
              <div className="w-11 h-11 bg-gold-gradient rounded-2xl flex items-center justify-center shadow-xl shadow-gold-400/20 group-hover:scale-105 transition-transform duration-500">
                <Cross className="w-6 h-6 text-navy-950" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">BibleAI</h1>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-navy-500 uppercase tracking-[0.2em]">Live Presence</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Stats Section */}
          <div className="px-6 mb-8">
             <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-9 h-9 bg-amber-400/10 rounded-xl flex items-center justify-center group-hover:bg-amber-400/20 transition-colors">
                      <Flame className="w-4 h-4 text-amber-500" />
                   </div>
                   <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">{streak} Day Streak</p>
                      <p className="text-[9px] text-navy-500 font-medium uppercase tracking-[0.2em]">Spiritual Growth</p>
                   </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-navy-700 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all" />
             </div>
          </div>

          {/* Premium Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-none">
            <p className="px-4 text-[9px] font-black text-navy-600 uppercase tracking-[0.3em] mb-4">Journey Tools</p>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden ${
                    active
                      ? 'bg-white/5 text-gold-400 border border-white/10 shadow-lg'
                      : 'text-navy-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-gold-gradient rounded-r-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                  )}
                  <Icon className={`w-5 h-5 transition-transform duration-500 ${active ? 'scale-110 rotate-0' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Upgrade Section */}
          {!isPro && (
            <div className="px-4 py-6">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full relative group p-4 bg-navy-900/60 border border-gold-400/20 rounded-[1.5rem] overflow-hidden transition-all hover:border-gold-400/40"
              >
                <div className="absolute top-0 right-0 p-3 opacity-20">
                   <Sparkles className="w-8 h-8 text-gold-400" />
                </div>
                <div className="relative flex items-center gap-4">
                   <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20">
                      <Crown className="w-5 h-5 text-navy-950" />
                   </div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Go Unlimited</p>
                      <p className="text-[8px] text-gold-400/70 font-black uppercase tracking-[0.2em]">Unlock Pro</p>
                   </div>
                </div>
              </button>
            </div>
          )}

          {/* User & Out */}
          <div className="px-4 py-6 border-t border-white/5 bg-navy-950/50">
            <div className="flex items-center gap-4 px-4 py-2 mb-4">
              <div className="w-10 h-10 bg-gold-gradient rounded-2xl flex items-center justify-center text-navy-950 font-black text-sm shadow-lg shadow-gold-400/10">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-white truncate uppercase tracking-tighter">{user?.email}</p>
                <div className="flex items-center gap-1.5">
                  {isPro ? (
                    <span className="text-[8px] font-black text-gold-400 uppercase tracking-[0.3em]">Pro Disciple</span>
                  ) : (
                    <span className="text-[8px] font-black text-navy-500 uppercase tracking-[0.3em]">Seeker Plan</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="group flex items-center gap-4 px-4 py-3.5 w-full rounded-2xl text-[10px] font-black uppercase tracking-widest text-navy-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-navy-950">
        {/* Top bar for mobile */}
        <header className="lg:hidden flex items-center justify-between px-6 py-5 bg-navy-950 border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-gradient rounded-xl flex items-center justify-center">
               <Cross className="w-5 h-5 text-navy-950" />
            </div>
            <span className="text-white font-black uppercase tracking-tighter text-lg italic">BibleAI</span>
          </div>
          {isPro && (
            <div className="w-8 h-8 bg-gold-400/10 rounded-lg flex items-center justify-center text-gold-400">
               <Crown className="w-4 h-4" />
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 scroll-smooth">
          {user && !user.email_confirmed_at && (
            <div className="bg-gold-400/5 border-b border-gold-400/10 px-6 py-3 flex items-center justify-between animate-slide-up-fade">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold-400/10 rounded-lg flex items-center justify-center">
                     <Mail className="w-4 h-4 text-gold-400" />
                  </div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">
                     Confirm your presence &bull; <span className="text-gold-400">Please verify your email</span>
                  </p>
               </div>
               <button onClick={() => window.location.reload()} className="text-[9px] font-black text-navy-500 uppercase tracking-widest hover:text-white transition-colors">
                  I&apos;ve Verified
               </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Premium Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-950/90 backdrop-blur-2xl border-t border-white/5 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className={`flex items-center justify-around gap-2`}>
          {visibleNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center rounded-2xl py-2 flex-1 transition-all ${
                  active ? 'text-gold-400 bg-white/5 shadow-lg' : 'text-navy-500'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? 'scale-110' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
