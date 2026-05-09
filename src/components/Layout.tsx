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
  Sparkles,
  Mail
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import OnboardingTour from './OnboardingTour';
import { supabase } from '../lib/supabase';
import { useStreak } from '../lib/useStreak';

const navItems: Array<{
  path: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}> = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/dashboard/bible', label: 'Bible', icon: Book },
  { path: '/dashboard/bible-chat', label: 'Chat', icon: MessageCircle },
  { path: '/dashboard/prayer-journal', label: 'Journal', icon: BookOpen },
  { path: '/dashboard/daily-verse', label: 'Daily', icon: Sun },
  { path: '/dashboard/analytics', label: 'Stats', icon: BarChart3, proOnly: true },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, signOut, isPro } = useAuth();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { streak, loading: streakLoading } = useStreak(user?.id);

  return (
    <div className="min-h-screen bg-navy-950 flex selection:bg-gold-400/30 selection:text-white">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <OnboardingTour />

      {/* Modern Minimalist Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:static inset-y-0 left-0 z-50 w-64 bg-navy-900 border-r border-white/5 relative overflow-hidden">
        
        <div className="flex flex-col h-full relative z-10">
          {/* Clean Logo */}
          <div className="px-6 py-8">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <Cross className="w-5 h-5 text-navy-950" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">BibleAI</h1>
            </Link>
          </div>

          {/* Minimal Streak Display */}
          <div className="px-4 mb-6">
             <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                   <Flame className="w-4 h-4 text-amber-500" />
                   <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">{streak} Day Streak</p>
                   </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-navy-700" />
             </div>
          </div>

          {/* Direct Navigation */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-white/5 text-gold-400 shadow-sm'
                      : 'text-navy-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-gold-400' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Simple Upgrade CTA */}
          {!isPro && (
            <div className="px-3 py-6">
              <button
                onClick={() => setShowUpgrade(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gold-gradient text-navy-950 font-bold rounded-xl hover:scale-105 transition-all text-sm justify-center"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* User Section */}
          <div className="px-3 py-4 border-t border-white/5 bg-navy-900/50">
            <div className="flex items-center gap-3 px-4 py-2 mb-3">
              <div className="w-9 h-9 bg-gold-gradient rounded-full flex items-center justify-center text-navy-950 font-bold text-sm">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.email}</p>
                <p className="text-[10px] text-navy-500 font-bold uppercase tracking-wider">{isPro ? 'Pro Member' : 'Free Plan'}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="group flex items-center gap-3 px-4 py-3 w-full rounded-xl text-xs font-bold text-navy-500 hover:text-red-400 hover:bg-red-400/5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-navy-950">
        {/* Top bar for mobile */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-navy-950 border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center">
               <Cross className="w-4 h-4 text-navy-950" />
            </div>
            <span className="text-white font-bold text-lg">BibleAI</span>
          </div>
          {isPro && (
            <div className="w-7 h-7 bg-gold-400/10 rounded-lg flex items-center justify-center text-gold-400">
               <Crown className="w-3.5 h-3.5" />
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 scroll-smooth">
          {user && !user.email_confirmed_at && (
            <div className="bg-gold-400/5 border-b border-gold-400/10 px-6 py-3 flex items-center justify-between animate-slide-up-fade">
               <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gold-400" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                     Please verify your email address
                  </p>
               </div>
               <button onClick={() => window.location.reload()} className="text-[9px] font-bold text-navy-500 uppercase tracking-widest hover:text-white transition-colors">
                  I&apos;ve Verified
               </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Minimal Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-950/90 backdrop-blur-2xl border-t border-white/5 px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className={`flex items-center justify-around gap-1`}>
          {visibleNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center rounded-xl py-2 flex-1 transition-all ${
                  active ? 'text-gold-400 bg-white/5' : 'text-navy-500'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? 'scale-110' : ''}`} />
                <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
