import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, MessageCircle, BookOpen, Sun, BarChart3, Settings, LogOut,
  Crown, Book, Flame, ChevronRight, Sparkles, Mail, Bookmark, Users,
  Moon, SunMedium, Shield, Award, Menu, X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import OnboardingTour from './OnboardingTour';
import OnboardingQuiz from './OnboardingQuiz';
import { supabase } from '../lib/supabase';
import { useStreak } from '../lib/useStreak';

const navItems: Array<{ path: string; label: string; icon: LucideIcon; proOnly?: boolean }> = [
  { path: '/dashboard',                  label: 'Home',      icon: Home },
  { path: '/dashboard/bible',            label: 'Bible',     icon: Book },
  { path: '/dashboard/bible-chat',       label: 'Chat',      icon: MessageCircle },
  { path: '/dashboard/prayer-journal',   label: 'Journal',   icon: BookOpen },
  { path: '/dashboard/daily-verse',      label: 'Daily',     icon: Sun },
  { path: '/dashboard/bookmarks',        label: 'Saved',     icon: Bookmark },
  { path: '/dashboard/community',        label: 'Community', icon: Users },
  { path: '/dashboard/analytics',        label: 'Stats',     icon: BarChart3, proOnly: true },
  { path: '/dashboard/settings',         label: 'Settings',  icon: Settings },
];

// Bottom nav shows 5 most important items on mobile
const MOBILE_NAV_ITEMS = ['/dashboard', '/dashboard/bible', '/dashboard/bible-chat', '/dashboard/prayer-journal', '/dashboard/community'];

export default function DashboardLayout() {
  const { user, signOut, isPro } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { streak } = useStreak(user?.id);

  const isActive = (path: string) => location.pathname === path;

  const handleResendEmail = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    setResendStatus('idle');
    try {
      const { data, error } = await supabase.functions.invoke('resend-confirmation', {
        body: { email: user.email },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setResendStatus('success');
      setTimeout(() => setResendStatus('idle'), 5000);
    } catch (err) {
      console.error('Resend failed:', err);
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 5000);
    } finally {
      setResending(false);
    }
  };
  const visibleNavItems = navItems.filter(item => !(item.proOnly && !isPro));
  const mobileNavItems = navItems.filter(item => MOBILE_NAV_ITEMS.includes(item.path));

  return (
    <div className={`min-h-screen flex selection:bg-gold-400/30 selection:text-white transition-colors duration-300 ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <OnboardingTour />
      <OnboardingQuiz />

      {/* ── Desktop Sidebar ── */}
      <aside className={`hidden lg:flex lg:flex-col w-64 border-r relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-navy-900 border-white/5' : 'bg-white border-slate-200'}`}
        role="navigation" aria-label="Main navigation">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-8">
            <Link to="/dashboard" className="flex items-center gap-3 group" aria-label="BibleAI Home">
              <div className="w-9 h-9 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <span className="text-navy-950 font-bold text-base">✝</span>
              </div>
              <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>BibleAI</h1>
            </Link>
          </div>

          {/* Streak */}
          <div className="px-4 mb-6">
            <div className={`border rounded-2xl p-4 flex items-center justify-between transition-colors ${isDark ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{streak} Day Streak</p>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-navy-700' : 'text-slate-400'}`} aria-hidden="true" />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
                    active
                      ? isDark ? 'bg-white/5 text-gold-400' : 'bg-gold-50 text-gold-600'
                      : isDark ? 'text-navy-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-current={active ? 'page' : undefined}>
                  <Icon className={`w-5 h-5 ${active ? (isDark ? 'text-gold-400' : 'text-gold-600') : ''}`} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Upgrade CTA */}
          {!isPro && (
            <div className="px-3 py-4">
              <button onClick={() => setShowUpgrade(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gold-gradient text-navy-950 font-bold rounded-xl hover:scale-105 transition-all text-sm justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">
                <Crown className="w-4 h-4" aria-hidden="true" />
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* Bottom: theme toggle + user */}
          <div className={`px-3 py-4 border-t ${isDark ? 'border-white/5 bg-navy-900/50' : 'border-slate-200 bg-slate-50'}`}>
            {/* Dark mode toggle */}
            <button onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold mb-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${isDark ? 'text-navy-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <SunMedium className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>

            {/* User info */}
            <div className={`flex items-center gap-3 px-4 py-2 mb-2 rounded-xl ${isDark ? '' : ''}`}>
              <div className="w-9 h-9 bg-gold-gradient rounded-full flex items-center justify-center text-navy-950 font-bold text-sm flex-shrink-0" aria-hidden="true">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.email}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-navy-500' : 'text-slate-400'}`}>{isPro ? 'Pro Member' : 'Free Plan'}</p>
              </div>
            </div>
            <button onClick={signOut}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${isDark ? 'text-navy-500 hover:text-red-400 hover:bg-red-400/5' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Overlay Menu ── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className={`relative w-72 h-full flex flex-col shadow-2xl animate-slide-in-left ${isDark ? 'bg-navy-900' : 'bg-white'}`}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-xl ${isDark ? 'text-navy-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`} aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? (isDark ? 'bg-white/5 text-gold-400' : 'bg-gold-50 text-gold-600') : (isDark ? 'text-navy-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className={`px-3 py-4 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
              <button onClick={toggleTheme}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold mb-2 transition-all ${isDark ? 'text-navy-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                {isDark ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={signOut}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${isDark ? 'text-navy-500 hover:text-red-400 hover:bg-red-400/5' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-colors duration-300 ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
        {/* Mobile top bar */}
        <header className={`lg:hidden flex items-center justify-between px-5 py-4 border-b sticky top-0 z-30 transition-colors duration-300 ${isDark ? 'bg-navy-950/90 border-white/5 backdrop-blur-sm' : 'bg-white/90 border-slate-200 backdrop-blur-sm'}`}
          role="banner">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center">
              <span className="text-navy-950 font-bold text-sm">✝</span>
            </div>
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>BibleAI</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-navy-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isPro && (
              <div className="w-7 h-7 bg-gold-400/10 rounded-lg flex items-center justify-center text-gold-400" aria-label="Pro member">
                <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            )}
            <button onClick={() => setMobileMenuOpen(true)}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-navy-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
              aria-label="Open menu" aria-expanded={mobileMenuOpen}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Email verification banner */}
        {user && !user.email_confirmed_at && (
          <div className="bg-gold-400/5 border-b border-gold-400/10 px-5 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gold-400" aria-hidden="true" />
              <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                {resendStatus === 'success' ? 'Email Sent!' : resendStatus === 'error' ? 'Failed to send' : 'Please verify your email address'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleResendEmail} 
                disabled={resending}
                className="text-[9px] font-bold text-gold-400 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Email'}
              </button>
              <button onClick={() => window.location.reload()} className="text-[9px] font-bold text-navy-500 uppercase tracking-widest hover:text-white transition-colors">
                I've Verified
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0 scroll-smooth" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] transition-colors duration-300 ${isDark ? 'bg-navy-950/95 border-white/5 backdrop-blur-2xl' : 'bg-white/95 border-slate-200 backdrop-blur-2xl'}`}
        role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center justify-center rounded-xl py-2 flex-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${active ? (isDark ? 'text-gold-400 bg-white/5' : 'text-gold-600 bg-gold-50') : (isDark ? 'text-navy-500' : 'text-slate-400')}`}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}>
                <Icon className={`w-5 h-5 mb-1 transition-transform ${active ? 'scale-110' : ''}`} aria-hidden="true" />
                <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
